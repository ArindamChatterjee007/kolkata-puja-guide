import { ApiError, toApiError, type ApiErrorKind, type Photo, type PhotoApi, type UploadTicket } from './api'
import { makePreview } from './previews'
import { contentTypeFor, displayFilename, limitUtf8, rejectFile, secureContextAvailable, sha256Hex, type FileRejection } from './text'

export type UploadStatus =
  | 'rejected'
  | 'queued'
  | 'hashing'
  | 'uploading'
  | 'processing'
  | 'checking'
  | 'uploaded'
  | 'duplicate'
  | 'failed'
  | 'cancelled'

export interface UploadItem {
  readonly id: string
  readonly file: File
  readonly filename: string
  readonly bytes: number
  readonly contentType: string
  status: UploadStatus
  /** 0..100 while uploading. */
  progress: number
  rejection: FileRejection | null
  error: ApiErrorKind | null
  sha256: string | null
  uploadId: string | null
  photo: Photo | null
  /** Derived JPEG kept for the queue thumbnail and reused as the server preview; never replaces the file. */
  localPreview: Blob | null
  /** Local thumbnail for the queue row; revoked when the row is removed. */
  localPreviewUrl: string | null
}

export interface UploadQueueOptions {
  api: PhotoApi
  albumId: string
  concurrency: number
  /** Photos already in the folder, so byte-identical files are reported instead of re-sent. */
  existingShas: () => ReadonlySet<string>
  onChange: (items: readonly UploadItem[]) => void
  onPhotoReady: (photo: Photo) => void
}

interface Running {
  controller: AbortController
  cancelled: boolean
}

const ACTIVE: ReadonlySet<UploadStatus> = new Set<UploadStatus>(['hashing', 'uploading', 'processing', 'checking'])

export function isActiveUpload(status: UploadStatus): boolean {
  return ACTIVE.has(status)
}

/**
 * Sequential per-file pipeline: hash -> ticket -> PUT (progress) -> optional preview. A file only counts as
 * uploaded when the server returns the ready photo. Cancel aborts the transfer and then asks the server for the
 * ticket status, so a request that completed during the abort is never reported as lost.
 */
export class UploadQueue {
  private readonly options: UploadQueueOptions
  private items: UploadItem[] = []
  private readonly running = new Map<string, Running>()
  private online = typeof navigator === 'undefined' ? true : navigator.onLine
  private disposed = false
  private counter = 0

  constructor(options: UploadQueueOptions) {
    this.options = options
  }

  get snapshot(): readonly UploadItem[] {
    return this.items
  }

  private emit(): void {
    this.items = [...this.items]
    this.options.onChange(this.items)
  }

  private patch(id: string, changes: Partial<UploadItem>): void {
    const index = this.items.findIndex((item) => item.id === id)
    if (index === -1) return
    this.items[index] = { ...this.items[index], ...changes }
    this.emit()
  }

  add(files: readonly File[]): void {
    if (this.disposed) return
    const secure = secureContextAvailable()
    for (const file of files) {
      const rejection = rejectFile(file)
      const contentType = contentTypeFor(file) ?? (file.type || 'application/octet-stream')
      this.counter += 1
      const item: UploadItem = {
        id: `u${this.counter}-${Date.now().toString(36)}`,
        file,
        filename: limitUtf8(displayFilename(file.name), 255),
        bytes: file.size,
        contentType,
        status: rejection ? 'rejected' : 'queued',
        progress: 0,
        rejection,
        error: rejection || secure ? null : 'secure-context',
        sha256: null,
        uploadId: null,
        photo: null,
        localPreview: null,
        localPreviewUrl: null,
      }
      if (!rejection && !secure) item.status = 'failed'
      this.items.push(item)
    }
    this.emit()
    this.pump()
  }

  setOnline(online: boolean): void {
    this.online = online
    if (online) this.pump()
  }

  retry(id: string): void {
    const item = this.items.find((entry) => entry.id === id)
    if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return
    if (!secureContextAvailable()) return
    this.patch(id, { status: 'queued', progress: 0, error: null })
    this.pump()
  }

  cancel(id: string): void {
    const running = this.running.get(id)
    if (running) {
      running.cancelled = true
      running.controller.abort()
      return
    }
    const item = this.items.find((entry) => entry.id === id)
    if (item && item.status === 'queued') this.patch(id, { status: 'cancelled' })
  }

  remove(id: string): void {
    const item = this.items.find((entry) => entry.id === id)
    if (!item || isActiveUpload(item.status)) return
    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl)
    this.items = this.items.filter((entry) => entry.id !== id)
    this.emit()
  }

  clearFinished(): void {
    for (const item of this.items) {
      if ((item.status === 'uploaded' || item.status === 'duplicate' || item.status === 'rejected') && item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl)
    }
    this.items = this.items.filter((item) => item.status !== 'uploaded' && item.status !== 'duplicate' && item.status !== 'rejected')
    this.emit()
  }

  dispose(): void {
    this.disposed = true
    for (const running of this.running.values()) {
      running.cancelled = true
      running.controller.abort()
    }
    for (const item of this.items) if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl)
    this.items = []
  }

  private pump(): void {
    if (this.disposed || !this.online) return
    for (const item of this.items) {
      if (this.running.size >= this.options.concurrency) break
      if (item.status !== 'queued') continue
      const running: Running = { controller: new AbortController(), cancelled: false }
      this.running.set(item.id, running)
      void this.process(item.id, running).finally(() => {
        this.running.delete(item.id)
        this.pump()
      })
    }
  }

  private async process(id: string, running: Running): Promise<void> {
    const item = this.items.find((entry) => entry.id === id)
    if (!item) return
    const { signal } = running.controller
    try {
      this.patch(id, { status: 'hashing', progress: 0, error: null })
      let sha = item.sha256
      if (!sha) {
        const buffer = await item.file.arrayBuffer()
        sha = await sha256Hex(buffer)
        this.patch(id, { sha256: sha })
      }
      if (!item.localPreview) {
        const local = await makePreview(item.file, item.contentType)
        if (local && !this.disposed) this.patch(id, { localPreview: local, localPreviewUrl: URL.createObjectURL(local) })
      }
      if (signal.aborted) throw new ApiError('aborted')
      if (this.options.existingShas().has(sha)) {
        this.patch(id, { status: 'duplicate', progress: 100 })
        return
      }
      const ticket = await this.options.api.createUpload(this.options.albumId, {
        filename: item.filename,
        bytes: item.bytes,
        sha256: sha,
        contentType: item.contentType,
        // Same key for every retry of this exact file (ASCII letters, digits, hyphens only).
        idempotencyKey: `${sha}-${item.bytes}`,
      })
      this.patch(id, { uploadId: ticket.id })
      if (ticket.status === 'ready' && ticket.photo) {
        this.finish(id, ticket.photo)
        return
      }
      if (ticket.status === 'uploading') {
        // An earlier attempt is still marked in progress: never send bytes blindly over it.
        this.patch(id, { status: 'checking' })
        const reconciled = await this.reconcile(ticket.id)
        if (reconciled) {
          this.finish(id, reconciled)
          return
        }
        throw new ApiError('conflict')
      }
      if (ticket.status === 'failed' || ticket.status === 'expired') throw new ApiError('conflict')
      if (signal.aborted) throw new ApiError('aborted')
      this.patch(id, { status: 'uploading', progress: 0 })
      let result: UploadTicket
      try {
        result = await this.options.api.putUpload(
          ticket.id,
          item.file,
          item.contentType,
          (loaded, total) => this.patch(id, { progress: total > 0 ? Math.min(99, Math.floor((loaded / total) * 100)) : 0 }),
          signal,
        )
      } catch (error) {
        const apiError = toApiError(error)
        // The transfer may have completed while the connection dropped or the abort landed: ask before retrying.
        if (apiError.kind === 'network' || apiError.kind === 'aborted') {
          this.patch(id, { status: 'checking' })
          const reconciled = await this.reconcile(ticket.id)
          if (reconciled) {
            this.finish(id, reconciled)
            return
          }
        }
        throw apiError
      }
      this.patch(id, { status: 'processing', progress: 100 })
      let photo = result.photo
      if (!photo || result.status !== 'ready') {
        const reconciled = await this.reconcile(ticket.id)
        if (!reconciled) throw new ApiError('bad-response')
        photo = reconciled
      }
      await this.sendPreview(id, ticket.id, photo)
      this.finish(id, photo)
    } catch (error) {
      const apiError = toApiError(error)
      if (running.cancelled || apiError.kind === 'aborted') this.patch(id, { status: 'cancelled', progress: 0 })
      else this.patch(id, { status: 'failed', error: apiError.kind })
    }
  }

  private async reconcile(uploadId: string): Promise<Photo | null> {
    try {
      const status = await this.options.api.getUpload(uploadId)
      return status.status === 'ready' && status.photo ? status.photo : null
    } catch {
      return null
    }
  }

  private async sendPreview(id: string, uploadId: string, photo: Photo): Promise<void> {
    if (photo.hasPreview) return
    const item = this.items.find((entry) => entry.id === id)
    if (!item) return
    try {
      const preview = item.localPreview ?? (await makePreview(item.file, item.contentType))
      if (!preview || this.disposed) return
      const checksum = await sha256Hex(await preview.arrayBuffer())
      const updated = await this.options.api.putPreview(uploadId, preview, checksum)
      photo.hasPreview = updated?.hasPreview ?? true
    } catch {
      // Grids fall back to the format icon; the original is already safe on the server.
    }
  }

  private finish(id: string, photo: Photo): void {
    this.patch(id, { status: 'uploaded', progress: 100, photo, error: null })
    this.options.onPhotoReady(photo)
  }
}

export function defaultConcurrency(): number {
  if (typeof window === 'undefined') return 1
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse ? 1 : 3
}
