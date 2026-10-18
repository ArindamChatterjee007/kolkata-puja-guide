import { createDrivingRouter } from '../domain/driving'
import type { DrivingCoverage, DrivingData, DrivingMetrics, DrivingOptions, DrivingRouteResult,
  DrivingRouter, DrivingSource, DrivingSummary } from '../domain/driving'
import type { Coordinate } from '../types'
import { isCoordinate } from '../domain/geo'

export const DRIVING_CAPABILITIES = {
  mode: 'motorcar', geometryKind: 'car-network', routing: 'edge-state-ngraph-nba',
  maxSnapMetres: 120, maxMatrixPoints: 25, maxDirectedStates: 400_000,
  liveTraffic: false, parkingVerified: false, entranceVerified: false, unknownFallback: false,
  laneGuidance: 'source-tags-only', unsupportedRestrictions: 'conservative-blocks',
} as const

export type DrivingWorkerRequest =
  | { type: 'load'; requestId: number; progress?: boolean }
  | { type: 'route'; requestId: number; origin: Coordinate; destination: Coordinate; options?: DrivingOptions }
  | { type: 'metrics'; requestId: number; origin: Coordinate; destination: Coordinate; hour: number; options?: Omit<DrivingOptions, 'departureTimestamp'> }
  | { type: 'matrix'; requestId: number; points: Coordinate[]; hour: number; options?: Omit<DrivingOptions, 'departureTimestamp'>; progress?: boolean }
  | { type: 'reset'; requestId: number }

export type DrivingWorkerProgress =
  | { type: 'progress'; requestId: number; phase: 'static'; loadedBytes: number; totalBytes?: number }
  | { type: 'progress'; requestId: number; phase: 'matrix'; completedRows: number; totalRows: number; hour: number; row: DrivingMetrics[] }

export type DrivingWorkerResponse =
  | { type: 'loaded'; requestId: number; summary: DrivingSummary; source: DrivingSource; coverage: DrivingCoverage
      capabilities: typeof DRIVING_CAPABILITIES; loadMs: number; downloadBytes: number }
  | { type: 'route'; requestId: number; result: DrivingRouteResult; elapsedMs: number }
  | { type: 'metrics'; requestId: number; result: DrivingMetrics; elapsedMs: number }
  | { type: 'matrix'; requestId: number; rows: DrivingMetrics[][]; hour: number; elapsedMs: number; unknownFallback: false }
  | { type: 'reset'; requestId: number }
  | { type: 'error'; requestId: number; code: DrivingWorkerError; unknownFallback: false }
  | DrivingWorkerProgress

export type DrivingWorkerError = 'invalid-request' | 'invalid-data' | 'data-unavailable' | 'too-large' | 'cancelled' | 'routing-failed'
type Table = 'nodes' | 'names' | 'highways' | 'roads' | 'edges' | 'laneTags' | 'restrictions'
interface DataFile { file: string; bytes: number; sha256: string; table?: Table; offset?: number; count?: number }
interface Manifest {
  version: 1
  mode: 'motorcar'
  layout: 'single' | 'tables'
  datasetBytes: number
  datasetSha256: string
  sourceTimestamp: string
  header?: Record<string, unknown>
  files: DataFile[]
}
const TABLES: Table[] = ['nodes', 'names', 'highways', 'roads', 'edges', 'laneTags', 'restrictions']
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 48 * 1024 * 1024
const FILE_TIMEOUT_MS = 25_000
const LOAD_TIMEOUT_MS = 55_000
const MATRIX_TIMEOUT_MS = 55_000
const hashPattern = /^[a-f0-9]{64}$/

class LoadError extends Error {
  readonly code: DrivingWorkerError
  constructor(code: DrivingWorkerError) { super(code); this.code = code }
}

async function digest(bytes: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('')
}

function abortError(signal: AbortSignal) {
  return signal.reason instanceof LoadError ? signal.reason : new LoadError('cancelled')
}

async function readStaticFile(url: URL, limit: number, signal: AbortSignal,
  onBytes?: (loadedBytes: number) => void): Promise<Uint8Array<ArrayBuffer>> {
  if (signal.aborted) throw abortError(signal)
  const controller = new AbortController()
  const abort = () => controller.abort(abortError(signal))
  signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new LoadError('data-unavailable')), FILE_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', mode: 'same-origin', redirect: 'error', referrerPolicy: 'no-referrer' })
    if (!response.ok || !response.body) throw new LoadError('data-unavailable')
    if (Number(response.headers.get('content-length')) > limit) {
      await response.body.cancel()
      throw new LoadError('too-large')
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (controller.signal.aborted) throw abortError(controller.signal)
        if (done) break
        length += value.byteLength
        if (length > limit) { await reader.cancel(); throw new LoadError('too-large') }
        chunks.push(value)
        onBytes?.(length)
      }
    } finally {
      reader.releaseLock()
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
    return result
  } catch (error) {
    if (controller.signal.aborted) throw abortError(controller.signal)
    throw error instanceof LoadError ? error : new LoadError('data-unavailable')
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

function readManifest(value: unknown): Manifest {
  const manifest = value as Manifest
  if (!manifest || manifest.version !== 1 || manifest.mode !== 'motorcar' || !['single', 'tables'].includes(manifest.layout)
    || !Number.isSafeInteger(manifest.datasetBytes) || manifest.datasetBytes <= 0 || manifest.datasetBytes > MAX_TOTAL_BYTES
    || !hashPattern.test(manifest.datasetSha256) || typeof manifest.sourceTimestamp !== 'string'
    || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 32
    || manifest.layout === 'single' && manifest.files.length !== 1
    || manifest.layout === 'tables' && (!manifest.header || typeof manifest.header !== 'object' || Array.isArray(manifest.header)
      || TABLES.some((table) => table in manifest.header!))) throw new LoadError('invalid-data')
  let total = 0
  for (const [index, entry] of manifest.files.entries()) {
    if (!entry || entry.file !== (manifest.layout === 'single' ? 'bengal-driving.json' : `bengal-driving-${index}.json`)
      || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > MAX_FILE_BYTES || !hashPattern.test(entry.sha256)
      || manifest.layout === 'tables' && (!TABLES.includes(entry.table!) || !Number.isSafeInteger(entry.offset) || entry.offset! < 0
        || !Number.isSafeInteger(entry.count) || entry.count! <= 0 || entry.count! > 250_000)) throw new LoadError('invalid-data')
    total += entry.bytes
  }
  if (total > MAX_TOTAL_BYTES) throw new LoadError('too-large')
  return manifest
}

export async function loadDrivingStaticData(baseUrl: URL, signal: AbortSignal,
  onBytes?: (loadedBytes: number, totalBytes?: number) => void): Promise<{ data: DrivingData; downloadBytes: number }> {
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.search || baseUrl.hash || baseUrl.username || baseUrl.password
    || !baseUrl.pathname.endsWith('/')) throw new LoadError('invalid-data')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const manifestBytes = await readStaticFile(new URL('data/bengal-driving.manifest.json', baseUrl), 64 * 1024, signal, onBytes)
  const manifest = readManifest(JSON.parse(decoder.decode(manifestBytes)))
  let data: Record<string, unknown> = { ...manifest.header }
  if (manifest.layout === 'tables') for (const table of TABLES) data[table] = []
  let downloadBytes = manifestBytes.byteLength
  const totalBytes = downloadBytes + manifest.files.reduce((sum, entry) => sum + entry.bytes, 0)
  onBytes?.(downloadBytes, totalBytes)
  for (const entry of manifest.files) {
    if (signal.aborted) throw abortError(signal)
    const bytes = await readStaticFile(new URL(`data/${entry.file}`, baseUrl), entry.bytes, signal,
      (loadedBytes) => onBytes?.(downloadBytes + loadedBytes, totalBytes))
    downloadBytes += bytes.byteLength
    if (bytes.byteLength !== entry.bytes || await digest(bytes) !== entry.sha256) throw new LoadError('invalid-data')
    if (signal.aborted) throw abortError(signal)
    const chunk = JSON.parse(decoder.decode(bytes))
    if (manifest.layout === 'single') {
      data = chunk
    } else {
      if (chunk?.table !== entry.table || chunk.offset !== entry.offset || !Array.isArray(chunk.values)
        || chunk.values.length !== entry.count || (data[entry.table!] as unknown[]).length !== entry.offset) throw new LoadError('invalid-data')
      data[entry.table!] = (data[entry.table!] as unknown[]).concat(chunk.values)
    }
  }
  const canonical = new TextEncoder().encode(`${JSON.stringify(data)}\n`)
  if (canonical.byteLength !== manifest.datasetBytes || await digest(canonical) !== manifest.datasetSha256
    || (data.source as DrivingSource)?.timestamp !== manifest.sourceTimestamp) throw new LoadError('invalid-data')
  if (signal.aborted) throw abortError(signal)
  return { data: data as unknown as DrivingData, downloadBytes }
}

function parseRequest(value: unknown): DrivingWorkerRequest {
  if (!value || typeof value !== 'object') throw new LoadError('invalid-request')
  const request = value as DrivingWorkerRequest
  if (!Number.isSafeInteger(request.requestId) || request.requestId < 0 || !['load', 'route', 'metrics', 'matrix', 'reset'].includes(request.type)) {
    throw new LoadError('invalid-request')
  }
  const allowedKeys = request.type === 'reset' ? ['type', 'requestId'] : request.type === 'load' ? ['type', 'requestId', 'progress']
    : request.type === 'matrix' ? ['type', 'requestId', 'points', 'hour', 'options', 'progress']
      : ['type', 'requestId', 'origin', 'destination', 'options', ...(request.type === 'metrics' ? ['hour'] : [])]
  if (Object.keys(request).some((key) => !allowedKeys.includes(key))) throw new LoadError('invalid-request')
  if ('progress' in request && request.progress !== undefined && typeof request.progress !== 'boolean') throw new LoadError('invalid-request')
  if (request.type === 'route' || request.type === 'metrics') {
    if (!isCoordinate(request.origin) || !isCoordinate(request.destination)) throw new LoadError('invalid-request')
  }
  if (request.type === 'matrix') {
    if (!Array.isArray(request.points) || !request.points.length || request.points.length > DRIVING_CAPABILITIES.maxMatrixPoints
      || !request.points.every(isCoordinate)) throw new LoadError('invalid-request')
  }
  if (request.type === 'matrix' || request.type === 'metrics') {
    if (!Number.isInteger(request.hour) || request.hour < 0 || request.hour > 23) throw new LoadError('invalid-request')
  }
  if ('options' in request && request.options !== undefined
    && (!request.options || typeof request.options !== 'object' || Array.isArray(request.options))) throw new LoadError('invalid-request')
  return request
}

export function createDrivingWorkerController(baseUrl: URL) {
  let router: DrivingRouter | null = null
  let generation = 0
  let controller: AbortController | null = null
  let loading: Promise<DrivingRouter> | null = null
  let downloadBytes = 0
  let loadMs = 0
  const active = new Set<number>()
  const loadListeners = new Map<number, (loadedBytes: number, totalBytes?: number) => void>()
  const ensureRouter = async () => {
    if (router) return router
    if (!loading) {
      const epoch = generation
      const abort = new AbortController()
      controller = abort
      const started = performance.now()
      const timer = setTimeout(() => abort.abort(new LoadError('data-unavailable')), LOAD_TIMEOUT_MS)
      loading = loadDrivingStaticData(baseUrl, abort.signal, (loadedBytes, totalBytes) => {
        if (epoch === generation && !abort.signal.aborted) for (const notify of loadListeners.values()) notify(loadedBytes, totalBytes)
      }).then((loaded) => {
        if (epoch !== generation) throw new LoadError('cancelled')
        if (abort.signal.aborted) throw abortError(abort.signal)
        const prepared = createDrivingRouter(loaded.data)
        if (performance.now() - started >= LOAD_TIMEOUT_MS) throw new LoadError('data-unavailable')
        router = prepared
        downloadBytes = loaded.downloadBytes
        loadMs = performance.now() - started
        return prepared
      }).finally(() => {
        clearTimeout(timer)
        if (generation === epoch) { loading = null; controller = null }
      })
    }
    return loading
  }
  return {
    async dispatch(value: unknown, onProgress?: (progress: DrivingWorkerProgress) => void): Promise<DrivingWorkerResponse> {
      const suppliedId = value && typeof value === 'object' && 'requestId' in value ? value.requestId : undefined
      let requestId = typeof suppliedId === 'number' && Number.isSafeInteger(suppliedId) && suppliedId >= 0 ? suppliedId : 0
      let ownedRequest = false
      try {
        const request = parseRequest(value)
        requestId = request.requestId
        if (active.has(requestId)) throw new LoadError('invalid-request')
        active.add(requestId); ownedRequest = true
        if (request.type === 'reset') {
          generation += 1
          controller?.abort(new LoadError('cancelled')); controller = null; loading = null
          loadListeners.clear()
          router?.clearMetricCache(); router = null
          return { type: 'reset', requestId }
        }
        const epoch = generation
        const progress = (message: DrivingWorkerProgress) => {
          if ('progress' in request && request.progress && epoch === generation) onProgress?.(message)
        }
        if ('progress' in request && request.progress) loadListeners.set(requestId,
          (loadedBytes, totalBytes) => progress({ type: 'progress', requestId, phase: 'static', loadedBytes, ...(totalBytes === undefined ? {} : { totalBytes }) }))
        const network = await ensureRouter()
        loadListeners.delete(requestId)
        if (epoch !== generation) throw new LoadError('cancelled')
        if (request.type === 'load') return { type: 'loaded', requestId, summary: network.summary, source: network.source,
          coverage: network.coverage, capabilities: DRIVING_CAPABILITIES, loadMs, downloadBytes }
        const started = performance.now()
        if (request.type === 'route') return { type: 'route', requestId,
          result: network.route(request.origin, request.destination, request.options), elapsedMs: performance.now() - started }
        if (request.type === 'metrics') return { type: 'metrics', requestId,
          result: network.routeMetrics(request.origin, request.destination, request.hour, request.options), elapsedMs: performance.now() - started }
        const rows: DrivingMetrics[][] = []
        for (const origin of request.points) {
          const row: DrivingMetrics[] = []
          for (const destination of request.points) {
            if (epoch !== generation) throw new LoadError('cancelled')
            if (performance.now() - started >= MATRIX_TIMEOUT_MS) throw new LoadError('routing-failed')
            row.push(network.routeMetrics(origin, destination, request.hour, request.options))
            await new Promise<void>((resolveYield) => setTimeout(resolveYield, 0))
          }
          if (epoch !== generation) throw new LoadError('cancelled')
          if (performance.now() - started >= MATRIX_TIMEOUT_MS) throw new LoadError('routing-failed')
          rows.push(row)
          progress({ type: 'progress', requestId, phase: 'matrix', completedRows: rows.length,
            totalRows: request.points.length, hour: request.hour, row: structuredClone(row) })
        }
        if (epoch !== generation) throw new LoadError('cancelled')
        return { type: 'matrix', requestId, rows, hour: request.hour, elapsedMs: performance.now() - started, unknownFallback: false }
      } catch (error) {
        return { type: 'error', requestId, code: error instanceof LoadError ? error.code
          : error instanceof RangeError ? 'invalid-data' : error instanceof SyntaxError ? 'invalid-data' : 'routing-failed', unknownFallback: false }
      } finally {
        if (ownedRequest) { active.delete(requestId); loadListeners.delete(requestId) }
      }
    },
  }
}

if (typeof self !== 'undefined' && typeof document === 'undefined') {
  const baseUrl = new URL(import.meta.env.BASE_URL, self.location.origin)
  const controller = createDrivingWorkerController(baseUrl)
  self.addEventListener('message', (event: MessageEvent<unknown>) => {
    void controller.dispatch(event.data, (progress) => self.postMessage(progress)).then((response) => self.postMessage(response))
  })
}