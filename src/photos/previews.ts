import { useEffect, useState } from 'react'
import { ApiError, toApiError } from './api'
import type { PhotoApi } from './api'
import { BROWSER_RENDERABLE } from './text'

export const PREVIEW_LONG_EDGE = 480
// Server cap is 200,000 bytes (decimal), not 200 KiB.
export const PREVIEW_MAX_BYTES = 200_000

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}

async function drawScaled(bitmap: ImageBitmap, longEdge: number): Promise<HTMLCanvasElement | null> {
  const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Derives a small JPEG for grids from formats the browser can decode. The source file is read only;
 * HEIC/HEIF (or any decode failure) yields null and the original still uploads without a preview.
 */
export async function makePreview(file: Blob, contentType: string): Promise<Blob | null> {
  if (!BROWSER_RENDERABLE.has(contentType) || typeof createImageBitmap !== 'function') return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  try {
    const attempts: Array<[number, number]> = [[PREVIEW_LONG_EDGE, 0.7], [PREVIEW_LONG_EDGE, 0.5], [360, 0.6], [240, 0.5]]
    for (const [edge, quality] of attempts) {
      const canvas = await drawScaled(bitmap, edge)
      if (!canvas) return null
      const blob = await toBlob(canvas, quality)
      if (blob && blob.size <= PREVIEW_MAX_BYTES) return blob
    }
    return null
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}

interface CacheEntry {
  url: string
  bytes: number
}

interface PendingLoad {
  promise: Promise<string>
  resolve: (url: string) => void
  reject: (reason: unknown) => void
  started: boolean
}

export interface PreviewCacheOptions {
  /** Hard count bound; pinned (currently displayed) entries are never evicted, so a huge viewport may exceed it. */
  maxEntries?: number
  /** Byte bound applied only above `minEntries`, so a short grid never thrashes. */
  maxBytes?: number
  minEntries?: number
  /** Concurrent preview downloads; further requests wait in view order and are dropped if their tile scrolls away first. */
  maxInFlight?: number
}

/**
 * Bounded in-memory object-URL cache for server previews. Nothing is written to Cache Storage or disk;
 * URLs are revoked on eviction and when the album view unmounts. Downloads that already started are left
 * to finish (the server charges them anyway) and kept for reuse; only unstarted requests are dropped.
 */
export class PreviewCache {
  private readonly api: PhotoApi
  private readonly maxEntries: number
  private readonly maxBytes: number
  private readonly minEntries: number
  private readonly maxInFlight: number
  private readonly entries = new Map<string, CacheEntry>()
  private readonly pins = new Map<string, number>()
  private readonly pending = new Map<string, PendingLoad>()
  private bytes = 0
  private inFlight = 0
  private disposed = false

  constructor(api: PhotoApi, options: PreviewCacheOptions = {}) {
    this.api = api
    this.maxEntries = options.maxEntries ?? 160
    this.maxBytes = options.maxBytes ?? 32_000_000
    this.minEntries = Math.min(options.minEntries ?? 64, this.maxEntries)
    this.maxInFlight = Math.max(1, options.maxInFlight ?? 6)
  }

  peek(photoId: string): string | null {
    const entry = this.entries.get(photoId)
    if (!entry) return null
    // Re-insert to keep recently used entries at the tail (Map preserves insertion order).
    this.entries.delete(photoId)
    this.entries.set(photoId, entry)
    return entry.url
  }

  put(photoId: string, blob: Blob): string {
    const existing = this.entries.get(photoId)
    if (existing) {
      URL.revokeObjectURL(existing.url)
      this.bytes -= existing.bytes
    }
    const url = URL.createObjectURL(blob)
    this.entries.delete(photoId)
    this.entries.set(photoId, { url, bytes: blob.size })
    this.bytes += blob.size
    this.trim()
    return url
  }

  load(photoId: string): Promise<string> {
    const cached = this.peek(photoId)
    if (cached) return Promise.resolve(cached)
    if (this.disposed) return Promise.reject(new ApiError('aborted'))
    let entry = this.pending.get(photoId)
    if (!entry) {
      let resolve: (url: string) => void = () => undefined
      let reject: (reason: unknown) => void = () => undefined
      const promise = new Promise<string>((res, rej) => {
        resolve = res
        reject = rej
      })
      entry = { promise, resolve, reject, started: false }
      this.pending.set(photoId, entry)
      this.pump()
    }
    return entry.promise
  }

  /** Marks a photo as currently displayed: it stays cached and its queued download keeps its place. */
  retain(photoId: string): void {
    this.pins.set(photoId, (this.pins.get(photoId) ?? 0) + 1)
    this.peek(photoId)
  }

  release(photoId: string): void {
    const count = (this.pins.get(photoId) ?? 0) - 1
    if (count > 0) {
      this.pins.set(photoId, count)
      return
    }
    this.pins.delete(photoId)
    const entry = this.pending.get(photoId)
    if (entry && !entry.started) {
      this.pending.delete(photoId)
      entry.reject(new ApiError('aborted'))
    }
  }

  forget(photoId: string): void {
    const entry = this.entries.get(photoId)
    if (entry) {
      URL.revokeObjectURL(entry.url)
      this.bytes -= entry.bytes
      this.entries.delete(photoId)
    }
    const queued = this.pending.get(photoId)
    if (queued && !queued.started) {
      this.pending.delete(photoId)
      queued.reject(new ApiError('aborted'))
    }
  }

  private pump(): void {
    for (const [photoId, entry] of this.pending) {
      if (this.inFlight >= this.maxInFlight) return
      if (entry.started) continue
      entry.started = true
      this.inFlight += 1
      this.api
        .fetchPreview(photoId)
        .then(
          (blob) => {
            this.pending.delete(photoId)
            if (this.disposed) entry.reject(new ApiError('aborted'))
            else entry.resolve(this.put(photoId, blob))
          },
          (reason: unknown) => {
            this.pending.delete(photoId)
            entry.reject(reason)
          },
        )
        .finally(() => {
          this.inFlight -= 1
          this.pump()
        })
    }
  }

  private trim(): void {
    for (const photoId of this.entries.keys()) {
      const overCount = this.entries.size > this.maxEntries
      const overBytes = this.bytes > this.maxBytes && this.entries.size > this.minEntries
      if (!overCount && !overBytes) return
      if (!this.pins.has(photoId)) this.forget(photoId)
    }
  }

  dispose(): void {
    this.disposed = true
    for (const entry of this.entries.values()) URL.revokeObjectURL(entry.url)
    this.entries.clear()
    this.bytes = 0
    this.pins.clear()
    for (const entry of this.pending.values()) if (!entry.started) entry.reject(new ApiError('aborted'))
    this.pending.clear()
  }
}

export type PreviewState = { status: 'none' } | { status: 'idle' } | { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' }

function sameState(a: PreviewState, b: PreviewState): boolean {
  return a.status === b.status && (a.status !== 'ready' || b.status !== 'ready' || a.url === b.url)
}

/**
 * Preview object URL for one photo. `none` = no preview exists; `idle` = waiting until `enabled` (tile off-screen);
 * the download starts only while `enabled` is true and is shared with any other consumer of the same photo.
 */
export function usePreviewUrl(cache: PreviewCache | null, photoId: string, hasPreview: boolean, enabled = true): PreviewState {
  const [state, setState] = useState<PreviewState>(() => {
    if (!hasPreview || !cache) return { status: 'none' }
    const url = cache.peek(photoId)
    if (url) return { status: 'ready', url }
    return enabled ? { status: 'loading' } : { status: 'idle' }
  })

  useEffect(() => {
    const apply = (next: PreviewState) => setState((previous) => (sameState(previous, next) ? previous : next))
    if (!hasPreview || !cache) {
      apply({ status: 'none' })
      return
    }
    const cached = cache.peek(photoId)
    if (!enabled) {
      // An evicted URL must not linger in state; the tile reloads when it scrolls back into view.
      apply(cached ? { status: 'ready', url: cached } : { status: 'idle' })
      return
    }
    cache.retain(photoId)
    let active = true
    if (cached) apply({ status: 'ready', url: cached })
    else {
      apply({ status: 'loading' })
      cache.load(photoId).then(
        (url) => {
          if (active) setState({ status: 'ready', url })
        },
        (reason: unknown) => {
          if (active && toApiError(reason).kind !== 'aborted') setState({ status: 'error' })
        },
      )
    }
    return () => {
      active = false
      cache.release(photoId)
    }
  }, [cache, photoId, hasPreview, enabled])

  return state
}

const VIEW_MARGIN = '200px 0px'
const inViewCallbacks = new WeakMap<Element, (inView: boolean) => void>()
let sharedObserver: IntersectionObserver | null = null

function viewportObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver !== 'function') return null
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (records) => {
        for (const record of records) inViewCallbacks.get(record.target)?.(record.isIntersecting)
      },
      { rootMargin: VIEW_MARGIN },
    )
  }
  return sharedObserver
}

/**
 * Whether the element is inside the viewport plus a 200px vertical prefetch margin. One observer is shared by
 * every tile. Without IntersectionObserver support the value is always true (eager, as before).
 */
export function useInView(): [(node: Element | null) => void, boolean] {
  const [node, setNode] = useState<Element | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver !== 'function')

  useEffect(() => {
    if (!node) return
    const observer = viewportObserver()
    if (!observer) return
    inViewCallbacks.set(node, setInView)
    observer.observe(node)
    return () => {
      observer.unobserve(node)
      inViewCallbacks.delete(node)
    }
  }, [node])

  return [setNode, inView]
}
