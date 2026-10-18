import { useEffect, useState } from 'react'
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

/**
 * Bounded in-memory object-URL cache for server previews. Nothing is written to Cache Storage or disk;
 * URLs are revoked on eviction and when the album view unmounts.
 */
export class PreviewCache {
  private readonly api: PhotoApi
  private readonly max: number
  private readonly entries = new Map<string, CacheEntry>()
  private readonly inflight = new Map<string, Promise<string>>()

  constructor(api: PhotoApi, max = 160) {
    this.api = api
    this.max = max
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
    if (existing) URL.revokeObjectURL(existing.url)
    const url = URL.createObjectURL(blob)
    this.entries.delete(photoId)
    this.entries.set(photoId, { url, bytes: blob.size })
    this.trim()
    return url
  }

  load(photoId: string, signal?: AbortSignal): Promise<string> {
    const cached = this.peek(photoId)
    if (cached) return Promise.resolve(cached)
    let pending = this.inflight.get(photoId)
    if (!pending) {
      pending = this.api
        .fetchPreview(photoId, signal)
        .then((blob) => this.put(photoId, blob))
        .finally(() => {
          this.inflight.delete(photoId)
        })
      this.inflight.set(photoId, pending)
    }
    return pending
  }

  forget(photoId: string): void {
    const entry = this.entries.get(photoId)
    if (entry) {
      URL.revokeObjectURL(entry.url)
      this.entries.delete(photoId)
    }
  }

  private trim(): void {
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.forget(oldest)
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) URL.revokeObjectURL(entry.url)
    this.entries.clear()
  }
}

export type PreviewState = { status: 'none' } | { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' }

export function usePreviewUrl(cache: PreviewCache | null, photoId: string, hasPreview: boolean): PreviewState {
  const [state, setState] = useState<PreviewState>(() => {
    if (!hasPreview || !cache) return { status: 'none' }
    const url = cache.peek(photoId)
    return url ? { status: 'ready', url } : { status: 'loading' }
  })

  useEffect(() => {
    if (!hasPreview || !cache) {
      setState({ status: 'none' })
      return
    }
    const cached = cache.peek(photoId)
    if (cached) {
      setState({ status: 'ready', url: cached })
      return
    }
    let active = true
    setState({ status: 'loading' })
    // The request is shared between tiles and left to finish on unmount so a sibling can still use it.
    cache.load(photoId).then(
      (url) => {
        if (active) setState({ status: 'ready', url })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [cache, photoId, hasPreview])

  return state
}
