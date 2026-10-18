import { useCallback, useEffect, useRef, useState } from 'react'
import type { Coordinate } from '../types'
import type { DrivingRouteResult } from '../domain/driving'
import { createDrivingMatrixEstimator, DRIVING_PROFILE_HOURS, drivingPointKey } from '../domain/drivingAdapter'
import type { DrivingMatrices } from '../domain/drivingAdapter'
import type { DrivingWorkerProgress, DrivingWorkerRequest, DrivingWorkerResponse } from '../workers/driving.worker'

type WorkerLike = Pick<Worker, 'postMessage' | 'terminate' | 'addEventListener' | 'removeEventListener'>
type Request = DrivingWorkerRequest extends infer Item ? Item extends DrivingWorkerRequest ? Omit<Item, 'requestId'> : never : never
type TerminalResponse = Exclude<DrivingWorkerResponse, DrivingWorkerProgress>
export type DrivingLoadState = { status: 'idle' | 'ready' } | { status: 'loading'; progress: DrivingWorkerProgress | null }
  | { status: 'error'; message: string }

export class DrivingWorkerClient {
  private readonly worker: WorkerLike
  private readonly timeoutMs: number
  private nextId = 0
  private disposed = false
  private loaded: Promise<void> | null = null
  private pending = new Map<number, { resolve: (result: TerminalResponse) => void; reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>; progress?: (progress: DrivingWorkerProgress) => void }>()

  constructor(worker: WorkerLike, timeoutMs = 60_000) {
    this.worker = worker
    this.timeoutMs = timeoutMs
    worker.addEventListener('message', this.receive as EventListener)
    worker.addEventListener('error', this.failed)
    worker.addEventListener('messageerror', this.failed)
  }

  private receive = (event: MessageEvent<DrivingWorkerResponse>) => {
    const response = event.data
    const pending = this.pending.get(response?.requestId)
    if (!pending || this.disposed) return
    if (response.type === 'progress') { pending.progress?.(response); return }
    clearTimeout(pending.timer)
    this.pending.delete(response.requestId)
    if (response.type === 'error') pending.reject(new Error(`Car routing unavailable (${response.code}). Choose another point or use external directions.`))
    else pending.resolve(response)
  }

  private failed = () => this.dispose('Car worker unavailable. No geographic fallback was used.')

  get busy() { return this.pending.size > 0 }
  get isDisposed() { return this.disposed }

  send(request: Request, progress?: (progress: DrivingWorkerProgress) => void): Promise<TerminalResponse> {
    if (this.disposed) return Promise.reject(new Error('Car routing cancelled.'))
    const requestId = ++this.nextId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.dispose('Car routing timed out. The graph was released; no estimated substitute was used.'), this.timeoutMs)
      this.pending.set(requestId, { resolve, reject, timer, progress })
      try { this.worker.postMessage({ ...request, requestId }) } catch { this.failed() }
    })
  }

  async load(progress?: (progress: DrivingWorkerProgress) => void) {
    this.loaded ??= this.send({ type: 'load', progress: true }, progress).then((response) => {
      if (response.type !== 'loaded') throw new Error('Invalid car data response.')
    })
    await this.loaded
  }

  async matrices(points: Coordinate[], progress?: (progress: DrivingWorkerProgress) => void): Promise<DrivingMatrices> {
    await this.load(progress)
    const profiles: Partial<DrivingMatrices['profiles']> = {}
    for (const hour of DRIVING_PROFILE_HOURS) {
      const response = await this.send({ type: 'matrix', points, hour, progress: true }, progress)
      if (response.type !== 'matrix' || response.hour !== hour || response.unknownFallback !== false) throw new Error('Invalid car matrix response.')
      profiles[hour] = response.rows
    }
    const matrices: DrivingMatrices = { points, profiles: profiles as DrivingMatrices['profiles'] }
    createDrivingMatrixEstimator(matrices)
    return matrices
  }

  async route(origin: Coordinate, destination: Coordinate, departureTimestamp: number,
    progress?: (progress: DrivingWorkerProgress) => void): Promise<DrivingRouteResult> {
    await this.load(progress)
    const response = await this.send({ type: 'route', origin, destination, options: { departureTimestamp } })
    if (response.type !== 'route') throw new Error('Invalid car route response.')
    return response.result
  }

  dispose(message = 'Car routing cancelled.') {
    if (this.disposed) return
    this.disposed = true
    this.worker.removeEventListener('message', this.receive as EventListener)
    this.worker.removeEventListener('error', this.failed)
    this.worker.removeEventListener('messageerror', this.failed)
    this.worker.terminate()
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)) }
    this.pending.clear()
  }
}

export function useDrivingNavigation(enabled: boolean) {
  const client = useRef<DrivingWorkerClient | null>(null)
  const generation = useRef(0)
  const cached = useRef<{ key: string; matrices: DrivingMatrices } | null>(null)
  const [state, setState] = useState<DrivingLoadState>({ status: 'idle' })
  const [result, setResult] = useState<DrivingRouteResult | null>(null)

  const release = useCallback(() => {
    generation.current += 1
    client.current?.dispose()
    client.current = null
    cached.current = null
    setResult(null)
    setState({ status: 'idle' })
  }, [])

  useEffect(() => { if (!enabled) release() }, [enabled, release])
  useEffect(() => {
    const close = () => { generation.current += 1; client.current?.dispose(); client.current = null; cached.current = null }
    window.addEventListener('pagehide', close)
    return () => { window.removeEventListener('pagehide', close); close() }
  }, [])

  function beginRequest() {
    const requestGeneration = ++generation.current
    if (client.current?.busy || client.current?.isDisposed) { client.current.dispose(); client.current = null; cached.current = null }
    client.current ??= new DrivingWorkerClient(new Worker(new URL('../workers/driving.worker.ts', import.meta.url), { type: 'module' }))
    setState({ status: 'loading', progress: null })
    const progress = (next: DrivingWorkerProgress) => {
      if (requestGeneration === generation.current) setState({ status: 'loading', progress: next })
    }
    return { client: client.current, requestGeneration, progress }
  }

  async function prepare(input: readonly Coordinate[]): Promise<DrivingMatrices | null> {
    if (!enabled) return null
    const points = [...new Map(input.map((point) => [drivingPointKey(point), { lat: point.lat, lng: point.lng }])).values()]
      .sort((first, second) => drivingPointKey(first).localeCompare(drivingPointKey(second)))
    const key = points.map(drivingPointKey).join('|')
    if (cached.current?.key === key) return cached.current.matrices
    let requestGeneration = generation.current
    try {
      const request = beginRequest()
      requestGeneration = request.requestGeneration
      const matrices = await request.client.matrices(points, request.progress)
      if (requestGeneration !== generation.current) return null
      cached.current = { key, matrices }
      setState({ status: 'ready' })
      return matrices
    } catch (error) {
      if (requestGeneration === generation.current) {
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Car routing unavailable.' })
      }
      return null
    }
  }

  async function navigate(origin: Coordinate, destination: Coordinate, departureTimestamp: number) {
    let requestGeneration = generation.current
    setResult(null)
    try {
      const request = beginRequest()
      requestGeneration = request.requestGeneration
      const route = await request.client.route(origin, destination, departureTimestamp, request.progress)
      if (requestGeneration !== generation.current) return null
      setResult(route)
      setState({ status: 'ready' })
      return route
    } catch (error) {
      if (requestGeneration === generation.current) setState({ status: 'error', message: error instanceof Error ? error.message : 'Car routing unavailable.' })
      return null
    }
  }

  return { state, result, prepare, navigate, release, cachedMatrices: () => cached.current?.matrices ?? null }
}