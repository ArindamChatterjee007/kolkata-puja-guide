import { createStreetRouter } from '../domain/streets'
import type { StreetRouter } from '../domain/streets'
import type { StreetLoadError, StreetWorkerRequest, StreetWorkerResponse } from '../hooks/streetWorkerClient'

const MAX_BYTES = 8 * 1024 * 1024
const LOAD_TIMEOUT_MS = 25_000
let router: StreetRouter | null = null
let loading: Promise<StreetRouter> | null = null
let controller: AbortController | null = null
let currentRequestId = 0

class LoadFailure extends Error {
  readonly code: StreetLoadError

  constructor(code: StreetLoadError) {
    super(code)
    this.code = code
  }
}

function send(message: StreetWorkerResponse) {
  self.postMessage(message)
}

async function loadRouter(dataUrl: string): Promise<StreetRouter> {
  const url = new URL(dataUrl)
  if (url.origin !== self.location.origin || !url.pathname.endsWith('/data/kolkata-walking.json')
    || url.search || url.hash || url.username || url.password) throw new LoadFailure('invalid-data')
  const abort = new AbortController()
  controller = abort
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    abort.abort()
  }, LOAD_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: abort.signal, credentials: 'omit', mode: 'same-origin', redirect: 'error', referrerPolicy: 'no-referrer',
    })
    if (!response.ok || !response.body) throw new LoadFailure('network')
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new LoadFailure('too-large')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const chunks: string[] = []
    let loadedBytes = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        loadedBytes += value.byteLength
        if (loadedBytes > MAX_BYTES) throw new LoadFailure('too-large')
        chunks.push(decoder.decode(value, { stream: true }))
        send({ type: 'progress', requestId: currentRequestId, loadedBytes })
      }
      chunks.push(decoder.decode())
    } finally {
      reader.releaseLock()
    }
    try {
      return createStreetRouter(JSON.parse(chunks.join('')))
    } catch {
      throw new LoadFailure('invalid-data')
    }
  } catch (error) {
    abort.abort()
    if (timedOut) throw new LoadFailure('timeout')
    throw error instanceof LoadFailure ? error : new LoadFailure('network')
  } finally {
    clearTimeout(timeout)
    if (controller === abort) controller = null
  }
}

async function route(request: Extract<StreetWorkerRequest, { type: 'route' }>) {
  try {
    if (!router) {
      const pending = loading ??= loadRouter(request.dataUrl)
      try {
        const loaded = await pending
        if (loading === pending) router = loaded
      } finally {
        if (loading === pending) loading = null
      }
    }
    if (request.requestId !== currentRequestId || !router) return
    const result = router.route(request.origin, request.destination, { maxSnapMetres: 120, hotspots: request.hotspots })
    send({ type: 'result', requestId: request.requestId, result })
  } catch (error) {
    if (request.requestId !== currentRequestId) return
    send({ type: 'error', requestId: request.requestId, code: error instanceof LoadFailure ? error.code : 'invalid-data' })
  }
}

self.addEventListener('message', ({ data }: MessageEvent<StreetWorkerRequest>) => {
  currentRequestId = data.requestId
  if (data.type === 'cancel') {
    controller?.abort()
    loading = null
    return
  }
  void route(data)
})