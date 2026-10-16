import { afterEach, describe, expect, it, vi } from 'vitest'
import { StreetWorkerClient, streetDataUrl } from '../../src/hooks/streetWorkerClient'
import type { StreetNavigationState, StreetWorkerPort, StreetWorkerRequest, StreetWorkerResponse } from '../../src/hooks/streetWorkerClient'
import { PANDALS } from '../../src/data/pandals'
import { REPORT_TTL_MS } from '../../src/domain/crowd'
import { isStreetPoint, needsLocationWatch, streetCrowdSnapshot, streetCrowdStale, streetFixIssue, streetWalkingTime } from '../../src/components/streetNavigation'

function setup() {
  const listeners = new Map<string, (event: MessageEvent<StreetWorkerResponse>) => void>()
  const sent: StreetWorkerRequest[] = []
  const states: StreetNavigationState[] = []
  let terminated = false
  const worker: StreetWorkerPort = {
    postMessage: (message) => { sent.push(message) },
    addEventListener: (type, listener) => { listeners.set(type, listener) },
    removeEventListener: (type) => { listeners.delete(type) },
    terminate: () => { terminated = true },
  }
  const client = new StreetWorkerClient(worker, streetDataUrl('/puja/', 'https://local.test/puja/'), (state) => states.push(state))
  const reply = (data: StreetWorkerResponse) => listeners.get('message')?.({ data } as MessageEvent<StreetWorkerResponse>)
  return { client, sent, states, reply, listeners, isTerminated: () => terminated }
}

const input = { origin: { lat: 22.601313, lng: 88.372586 }, destination: { lat: 22.6047, lng: 88.36613 }, hotspots: [] }

describe('street worker boundary', () => {
  afterEach(() => vi.useRealTimers())

  it('resolves only the fixed static asset against the main document base', () => {
    expect(streetDataUrl('/puja/', 'https://local.test/puja/')).toBe('https://local.test/puja/data/kolkata-walking.json')
    expect(streetDataUrl('./', 'https://local.test/puja/')).toBe('https://local.test/puja/data/kolkata-walking.json')
    expect(() => streetDataUrl('https://remote.test/', 'https://local.test/')).toThrow(RangeError)
  })

  it('clears the old result immediately and accepts only the latest response', () => {
    const { client, sent, states, reply } = setup()
    client.route(input)
    reply({ type: 'error', requestId: 1, code: 'network' })
    client.route({ ...input, origin: { lat: 22.57, lng: 88.36 } })
    expect(states.at(-1)).toEqual({ status: 'loading', loadedBytes: 0 })
    reply({ type: 'result', requestId: 1, result: { status: 'unavailable', reason: 'disconnected', warnings: [] } })
    expect(states.at(-1)?.status).toBe('loading')
    reply({ type: 'progress', requestId: 2, loadedBytes: 2000 })
    expect(states.at(-1)).toEqual({ status: 'loading', loadedBytes: 2000 })
    reply({ type: 'result', requestId: 2, result: { status: 'unavailable', reason: 'no-nearby-street', warnings: [] } })
    expect(states.at(-1)?.status).toBe('ready')
    expect(sent.map((message) => message.type === 'route' && message.dataUrl)).toEqual([
      'https://local.test/puja/data/kolkata-walking.json', 'https://local.test/puja/data/kolkata-walking.json',
    ])
  })

  it('invalidates a pending request when the draft changes', () => {
    const { client, states, reply } = setup()
    client.route(input)
    client.invalidate()
    reply({ type: 'error', requestId: 1, code: 'timeout' })
    expect(states.at(-1)).toEqual({ status: 'idle' })
  })

  it('retires a failed worker across invalidation and ignores captured late callbacks', () => {
    const { client, sent, states, listeners, isTerminated } = setup()
    client.route(input)
    const lateMessage = listeners.get('message')!
    listeners.get('error')!({} as MessageEvent<StreetWorkerResponse>)
    expect(states.at(-1)).toEqual({ status: 'error', code: 'worker' })
    expect(client.isDisposed).toBe(true)
    expect(isTerminated()).toBe(true)
    expect(listeners.size).toBe(0)
    client.invalidate()
    client.route(input)
    lateMessage({ data: { type: 'progress', requestId: 1, loadedBytes: 100 } } as MessageEvent<StreetWorkerResponse>)
    expect(sent).toHaveLength(1)
    expect(states.at(-1)).toEqual({ status: 'error', code: 'worker' })
  })

  it('bounds a worker that never responds or raises an error to 25 seconds', () => {
    vi.useFakeTimers()
    const { client, states, isTerminated } = setup()
    client.route(input)
    vi.advanceTimersByTime(24_999)
    expect(states.at(-1)?.status).toBe('loading')
    vi.advanceTimersByTime(1)
    expect(states.at(-1)).toEqual({ status: 'error', code: 'timeout' })
    expect(client.isDisposed).toBe(true)
    expect(isTerminated()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('disarms the startup deadline after a response and cancels it on invalidation', () => {
    vi.useFakeTimers()
    const { client, states, reply } = setup()
    client.route(input)
    client.invalidate()
    vi.advanceTimersByTime(25_000)
    expect(states.at(-1)).toEqual({ status: 'idle' })
    client.route(input)
    reply({ type: 'progress', requestId: 3, loadedBytes: 100 })
    vi.advanceTimersByTime(25_000)
    expect(states.at(-1)).toEqual({ status: 'loading', loadedBytes: 100 })
    expect(client.isDisposed).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    client.dispose()
  })

  it.each(['network', 'invalid-data'] as const)('keeps a responding worker reusable after %s without misclassifying its data error', (code) => {
    const { client, states, reply, isTerminated } = setup()
    client.route(input)
    reply({ type: 'error', requestId: 1, code })
    expect(states.at(-1)).toEqual({ status: 'error', code })
    expect(client.isDisposed).toBe(false)
    expect(isTerminated()).toBe(false)
    client.route(input)
    expect(states.at(-1)).toEqual({ status: 'loading', loadedBytes: 0 })
    client.dispose()
  })

  it('terminates and detaches listeners without accepting later work', () => {
    const { client, sent, listeners, isTerminated } = setup()
    client.route(input)
    client.dispose()
    client.route(input)
    expect(sent).toHaveLength(1)
    expect(listeners.size).toBe(0)
    expect(isTerminated()).toBe(true)
  })
})

describe('street navigation UI policy', () => {
  const at = Date.parse('2026-10-15T05:00:00Z')

  it('uses explicit estimated hotspot weights and excludes light reports', () => {
    const reports = [
      { pandalId: PANDALS[0].id, level: 'light' as const, reportedAt: at },
      { pandalId: PANDALS[1].id, level: 'moderate' as const, reportedAt: at },
      { pandalId: PANDALS[2].id, level: 'heavy' as const, reportedAt: at },
    ]
    const snapshot = streetCrowdSnapshot(PANDALS.slice(0, 3), reports, at)
    expect(snapshot.hotspots.map(({ id, radiusMetres, penaltyPerMetre }) => ({ id, radiusMetres, penaltyPerMetre }))).toEqual([
      { id: PANDALS[1].id, radiusMetres: 180, penaltyPerMetre: 1 },
      { id: PANDALS[2].id, radiusMetres: 180, penaltyPerMetre: 3 },
    ])
  })

  it('invalidates estimates on report changes, expiry and elapsed time', () => {
    const report = { pandalId: PANDALS[0].id, level: 'light' as const, reportedAt: at - REPORT_TTL_MS + 5000 }
    const snapshot = streetCrowdSnapshot(PANDALS, [report], at)
    expect(streetCrowdStale(snapshot, snapshot.key, at)).toBe(false)
    expect(streetCrowdStale(snapshot, snapshot.key, at + 5000)).toBe(true)
    const changed = streetCrowdSnapshot(PANDALS, [{ ...report, level: 'heavy' }], at)
    expect(streetCrowdStale(snapshot, changed.key, at)).toBe(true)
    const ordinary = streetCrowdSnapshot(PANDALS, [], at)
    expect(streetCrowdStale(ordinary, ordinary.key, at + 15 * 60_000)).toBe(true)
  })

  it('rejects poor, stale, future and outside GPS without substituting a start', () => {
    const sample = { lat: 22.601313, lng: 88.372586, accuracyMetres: 8, at }
    expect(streetFixIssue(sample, at)).toBeNull()
    expect(streetFixIssue({ ...sample, accuracyMetres: 61 }, at)).toBe('inaccurate')
    expect(streetFixIssue({ ...sample, accuracyMetres: Number.NaN }, at)).toBe('inaccurate')
    expect(streetFixIssue(sample, at + 30_001)).toBe('stale')
    expect(streetFixIssue({ ...sample, at: at + 1 }, at)).toBe('stale')
    expect(streetFixIssue({ ...sample, lat: 28.61 }, at)).toBe('outside')
    expect(isStreetPoint({ lat: 22.4, lng: 88.36 })).toBe(false)
  })

  it('estimates walking time from real metres without a straight-line detour multiplier', () => {
    expect(streetWalkingTime(1000, 'steady')).toEqual({ min: 18, max: 20 })
    expect(streetWalkingTime(1000, 'relaxed')).toEqual({ min: 20, max: 24 })
    expect(streetWalkingTime(0, 'steady')).toEqual({ min: 0, max: 0 })
  })

  it.each([
    [false, false, false, false], [true, false, false, false], [false, true, false, false],
    [true, true, false, true], [false, false, true, true], [true, true, true, true],
  ])('combines journey=%s, auto=%s, guidance=%s into watch=%s', (journey, auto, following, expected) => {
    expect(needsLocationWatch(journey, auto, following)).toBe(expected)
  })
})

describe('worker static-data loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  async function harness(fetcher: typeof fetch) {
    const messages: StreetWorkerResponse[] = []
    let listener: (event: MessageEvent<StreetWorkerRequest>) => void = () => undefined
    const fetchMock = vi.fn(fetcher)
    vi.stubGlobal('self', {
      location: { origin: 'https://local.test' },
      postMessage: (message: StreetWorkerResponse) => messages.push(message),
      addEventListener: (_type: string, callback: typeof listener) => { listener = callback },
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    await import('../../src/workers/streets.worker')
    return {
      messages, fetchMock,
      send: (data: StreetWorkerRequest) => listener({ data } as MessageEvent<StreetWorkerRequest>),
    }
  }

  const request = { ...input, type: 'route' as const, requestId: 1, dataUrl: 'https://local.test/puja/data/kolkata-walking.json' }

  it('refuses foreign origins and coordinate-bearing data URLs before fetching', async () => {
    const worker = await harness(async () => new Response('{}'))
    worker.send({ ...request, dataUrl: 'https://remote.test/data/kolkata-walking.json' })
    worker.send({ ...request, requestId: 2, dataUrl: `${request.dataUrl}?lat=22.6` })
    await vi.waitFor(() => expect(worker.messages.at(-1)).toMatchObject({ type: 'error', code: 'invalid-data' }))
    expect(worker.fetchMock).not.toHaveBeenCalled()
  })

  it('uses a credential-free fixed GET and reports unavailable network data', async () => {
    const worker = await harness(async () => { throw new TypeError('Offline') })
    worker.send(request)
    await vi.waitFor(() => expect(worker.messages.at(-1)).toEqual({ type: 'error', requestId: 1, code: 'network' }))
    const [url, options] = worker.fetchMock.mock.calls[0]
    expect(String(url)).toBe(request.dataUrl)
    expect(options).toMatchObject({ credentials: 'omit', mode: 'same-origin', redirect: 'error', referrerPolicy: 'no-referrer' })
    expect(options?.body).toBeUndefined()
  })

  it('rejects an oversized declared response before reading or parsing it', async () => {
    const worker = await harness(async () => new Response('{}', { headers: { 'content-length': String(8 * 1024 * 1024 + 1) } }))
    worker.send(request)
    await vi.waitFor(() => expect(worker.messages.at(-1)).toEqual({ type: 'error', requestId: 1, code: 'too-large' }))
  })

  it('enforces the byte cap even without a content-length header', async () => {
    const worker = await harness(async () => new Response(new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new Uint8Array(8 * 1024 * 1024))
        stream.enqueue(Uint8Array.of(32))
        stream.close()
      },
    })))
    worker.send(request)
    await vi.waitFor(() => expect(worker.messages.at(-1)).toEqual({ type: 'error', requestId: 1, code: 'too-large' }))
  })

  it('times out a stalled fetch and aborts it', async () => {
    vi.useFakeTimers()
    let aborted = false
    const worker = await harness(async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')) })
    }))
    worker.send(request)
    await vi.advanceTimersByTimeAsync(25_001)
    expect(aborted).toBe(true)
    expect(worker.messages.at(-1)).toEqual({ type: 'error', requestId: 1, code: 'timeout' })
  })

  it('aborts cancelled loading without turning cancellation into a new error', async () => {
    let aborted = false
    const worker = await harness(async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')) })
    }))
    worker.send(request)
    worker.send({ type: 'cancel', requestId: 2 })
    await vi.waitFor(() => expect(aborted).toBe(true))
    expect(worker.messages).toEqual([])
  })
})