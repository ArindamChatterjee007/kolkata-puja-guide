import type { StreetEndpoint, StreetHotspot, StreetRouteResult } from '../domain/streets'

export type StreetLoadError = 'network' | 'timeout' | 'too-large' | 'invalid-data' | 'worker'

export interface StreetRouteInput {
  origin: StreetEndpoint
  destination: StreetEndpoint
  hotspots: readonly StreetHotspot[]
}

export type StreetWorkerRequest =
  | ({ type: 'route'; requestId: number; dataUrl: string } & StreetRouteInput)
  | { type: 'cancel'; requestId: number }

export type StreetWorkerResponse =
  | { type: 'progress'; requestId: number; loadedBytes: number }
  | { type: 'result'; requestId: number; result: StreetRouteResult }
  | { type: 'error'; requestId: number; code: StreetLoadError }

export type StreetNavigationState =
  | { status: 'idle' }
  | { status: 'loading'; loadedBytes: number }
  | { status: 'ready'; result: StreetRouteResult }
  | { status: 'error'; code: StreetLoadError }

export interface StreetWorkerPort {
  postMessage: (message: StreetWorkerRequest) => void
  addEventListener: (type: 'message' | 'error', listener: (event: MessageEvent<StreetWorkerResponse>) => void) => void
  removeEventListener: (type: 'message' | 'error', listener: (event: MessageEvent<StreetWorkerResponse>) => void) => void
  terminate: () => void
}

export function streetDataUrl(base: string, documentBase: string): string {
  const url = new URL('data/kolkata-walking.json', new URL(base, documentBase))
  if (url.origin !== new URL(documentBase).origin || url.search || url.hash || url.username || url.password) {
    throw new RangeError('Street data must be a fixed same-origin asset')
  }
  return url.href
}

export class StreetWorkerClient {
  private requestId = 0
  private disposed = false
  private responded = false
  private startupTimeout: ReturnType<typeof setTimeout> | null = null
  private worker: StreetWorkerPort
  private dataUrl: string
  private update: (state: StreetNavigationState) => void

  constructor(
    worker: StreetWorkerPort,
    dataUrl: string,
    update: (state: StreetNavigationState) => void,
  ) {
    this.worker = worker
    this.dataUrl = dataUrl
    this.update = update
    worker.addEventListener('message', this.onMessage)
    worker.addEventListener('error', this.onError)
  }

  get isDisposed() {
    return this.disposed
  }

  private clearStartupTimeout() {
    if (this.startupTimeout !== null) clearTimeout(this.startupTimeout)
    this.startupTimeout = null
  }

  private onMessage = ({ data }: MessageEvent<StreetWorkerResponse>) => {
    if (this.disposed || data.requestId !== this.requestId) return
    this.responded = true
    this.clearStartupTimeout()
    if (data.type === 'progress') this.update({ status: 'loading', loadedBytes: data.loadedBytes })
    if (data.type === 'result') this.update({ status: 'ready', result: data.result })
    if (data.type === 'error') this.update({ status: 'error', code: data.code })
  }

  private onError = () => {
    if (this.disposed) return
    this.dispose()
    this.update({ status: 'error', code: 'worker' })
  }

  route(input: StreetRouteInput) {
    if (this.disposed) return
    this.requestId += 1
    this.update({ status: 'loading', loadedBytes: 0 })
    if (!this.responded && this.startupTimeout === null) {
      this.startupTimeout = setTimeout(() => {
        this.dispose()
        this.update({ status: 'error', code: 'timeout' })
      }, 25_000)
    }
    this.worker.postMessage({ ...input, type: 'route', requestId: this.requestId, dataUrl: this.dataUrl })
  }

  invalidate() {
    if (this.disposed) return
    this.clearStartupTimeout()
    this.requestId += 1
    this.worker.postMessage({ type: 'cancel', requestId: this.requestId })
    this.update({ status: 'idle' })
  }

  dispose() {
    this.disposed = true
    this.clearStartupTimeout()
    this.worker.removeEventListener('message', this.onMessage)
    this.worker.removeEventListener('error', this.onError)
    this.worker.terminate()
  }
}