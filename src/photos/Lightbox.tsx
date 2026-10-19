import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileImage, Maximize2, Trash2, X } from 'lucide-react'
import type { Language } from '../types'
import { toApiError } from './api'
import type { Photo } from './api'
import { tp } from './i18n'
import { usePreviewUrl } from './previews'
import type { PhotoServices } from './services'
import { BROWSER_RENDERABLE, downloadFilename, formatBytes, formatDateTime, formatNumber, percent } from './text'
import { ConfirmDialog, Notice, describeError } from './ui'

type OriginalState = { status: 'idle' } | { status: 'loading'; pct: number } | { status: 'ready'; url: string; blob: Blob } | { status: 'error'; message: string }
type DownloadState = { status: 'idle' } | { status: 'loading'; pct: number } | { status: 'done' } | { status: 'error'; message: string }

interface LightboxProps {
  language: Language
  services: PhotoServices
  photos: readonly Photo[]
  index: number | null
  ownerLabel: (memberId: string) => string
  canDelete: (photo: Photo) => boolean
  onIndex: (index: number) => void
  onClose: () => void
  onDelete: (photo: Photo) => Promise<void>
  onToast: (message: string) => void
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // The browser has started reading the blob; the temporary URL is not kept around for sharing.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function Lightbox({ language, services, photos, index, ownerLabel, canDelete, onIndex, onClose, onDelete, onToast }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = index !== null && index >= 0 && index < photos.length
  const photo = open ? photos[index] : null
  const photoId = photo?.id ?? ''
  const preview = usePreviewUrl(services.previews, photoId, photo?.hasPreview ?? false)
  const [original, setOriginal] = useState<OriginalState>({ status: 'idle' })
  const [download, setDownload] = useState<DownloadState>({ status: 'idle' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const originalRef = useRef<OriginalState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Switching photos releases the previous original bytes and cancels any transfer still running.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
      const current = originalRef.current
      if (current.status === 'ready') URL.revokeObjectURL(current.url)
      originalRef.current = { status: 'idle' }
      setOriginal({ status: 'idle' })
      setDownload({ status: 'idle' })
      setConfirmDelete(false)
      setDeleteError(null)
    }
  }, [photoId])

  const setOriginalState = (next: OriginalState) => {
    originalRef.current = next
    setOriginal(next)
  }

  const fetchOriginal = async (purpose: 'view' | 'download') => {
    if (!photo) return
    dialogRef.current?.focus({ preventScroll: true })
    const current = originalRef.current
    if (current.status === 'ready') {
      if (purpose === 'download') {
        triggerDownload(current.blob, downloadFilename(photo.filename, photo.contentType))
        setDownload({ status: 'done' })
        onToast(tp(language, 'downloadReady'))
      }
      return
    }
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    const onProgress = (loaded: number, total: number) => {
      const pct = percent(loaded, total || photo.bytes)
      if (purpose === 'view') setOriginalState({ status: 'loading', pct })
      else setDownload({ status: 'loading', pct })
    }
    if (purpose === 'view') setOriginalState({ status: 'loading', pct: 0 })
    else setDownload({ status: 'loading', pct: 0 })
    try {
      const blob = await services.api.fetchOriginal(photo.id, onProgress, controller.signal)
      if (abortRef.current !== controller) return
      const typed = blob.type ? blob : new Blob([blob], { type: photo.contentType })
      if (BROWSER_RENDERABLE.has(photo.contentType)) setOriginalState({ status: 'ready', url: URL.createObjectURL(typed), blob: typed })
      else setOriginalState({ status: 'idle' })
      if (purpose === 'download') {
        triggerDownload(typed, downloadFilename(photo.filename, photo.contentType))
        setDownload({ status: 'done' })
        onToast(tp(language, 'downloadReady'))
      }
    } catch (reason) {
      const error = toApiError(reason)
      if (error.kind === 'aborted') return
      const message = describeError(language, error)
      if (purpose === 'view') setOriginalState({ status: 'error', message })
      else setDownload({ status: 'error', message })
    }
  }

  const step = (delta: number) => {
    if (index === null || photos.length === 0) return
    onIndex((index + delta + photos.length) % photos.length)
  }

  const confirmRemoval = async () => {
    if (!photo) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(photo)
      setConfirmDelete(false)
      onToast(tp(language, 'deleted'))
    } catch (reason) {
      setDeleteError(describeError(language, toApiError(reason)))
    } finally {
      setDeleting(false)
    }
  }

  const renderable = photo ? BROWSER_RENDERABLE.has(photo.contentType) : false
  const stageUrl = original.status === 'ready' ? original.url : preview.status === 'ready' ? preview.url : null
  const stageBadge = original.status === 'ready' ? tp(language, 'originalBadge') : stageUrl ? tp(language, 'previewBadge') : null

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      tabIndex={-1}
      aria-label={photo ? tp(language, 'openPhoto', { name: photo.filename }) : undefined}
      onCancel={(event) => {
        event.preventDefault()
        if (!deleting) onClose()
      }}
      onClose={() => {
        if (open) onClose()
      }}
      onKeyDown={(event) => {
        if (confirmDelete) return
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          step(1)
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault()
          step(-1)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          if (!deleting) onClose()
        }
      }}
    >
      {photo && index !== null && (
        <div className="lightbox__frame">
          <div className="lightbox__bar">
            <span className="lightbox__counter" aria-live="polite">{tp(language, 'photoOf', { i: formatNumber(language, index + 1), n: formatNumber(language, photos.length) })}</span>
            <button type="button" className="icon-btn icon-btn--light" onClick={onClose} aria-label={tp(language, 'close')} title={tp(language, 'close')}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="lightbox__stage">
            {photos.length > 1 && (
              <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => step(-1)} aria-label={tp(language, 'prevPhoto')} title={tp(language, 'prevPhoto')}>
                <ChevronLeft size={28} aria-hidden="true" />
              </button>
            )}
            {stageUrl ? (
              <img key={stageUrl} className="lightbox__img" src={stageUrl} alt={photo.filename} decoding="async" />
            ) : (
              <div className="lightbox__placeholder">
                <FileImage size={48} aria-hidden="true" />
                <span>{renderable ? (preview.status === 'loading' ? tp(language, 'loading') : tp(language, 'previewBadge')) : tp(language, 'noPreview')}</span>
                <span className="lightbox__type">{photo.contentType.replace('image/', '').toUpperCase()}</span>
              </div>
            )}
            {stageBadge && <span className="lightbox__badge">{stageBadge}</span>}
            {photos.length > 1 && (
              <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => step(1)} aria-label={tp(language, 'nextPhoto')} title={tp(language, 'nextPhoto')}>
                <ChevronRight size={28} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="lightbox__panel">
            <div className="lightbox__meta">
              <p className="lightbox__name" title={photo.filename}>{photo.filename}</p>
              <p className="lightbox__details">
                <span>{formatBytes(language, photo.bytes)}</span>
                <span>{formatDateTime(language, photo.createdAt)}</span>
                <span>{tp(language, 'uploadedBy', { name: ownerLabel(photo.memberId) })}</span>
              </p>
            </div>
            {original.status === 'error' && <Notice tone="error" live>{original.message}</Notice>}
            {download.status === 'error' && <Notice tone="error" live>{download.message}</Notice>}
            <div className="lightbox__actions">
              {renderable && original.status !== 'ready' && (
                <button type="button" className="btn btn--light" onClick={() => void fetchOriginal('view')} disabled={original.status === 'loading'} aria-busy={original.status === 'loading' || undefined}>
                  <Maximize2 size={18} aria-hidden="true" />
                  <span>{original.status === 'loading' ? tp(language, 'loadingOriginal', { pct: formatNumber(language, original.pct) }) : tp(language, 'viewOriginal')}</span>
                </button>
              )}
              <button type="button" className="btn btn--primary" onClick={() => void fetchOriginal('download')} disabled={download.status === 'loading'} aria-busy={download.status === 'loading' || undefined}>
                <Download size={18} aria-hidden="true" />
                <span>{download.status === 'loading' ? tp(language, 'downloading', { pct: formatNumber(language, download.pct) }) : tp(language, 'download')}</span>
              </button>
              {canDelete(photo) && (
                <button type="button" className="btn btn--light btn--danger-light" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={18} aria-hidden="true" />
                  <span>{tp(language, 'deletePhoto')}</span>
                </button>
              )}
            </div>
          </div>
          <ConfirmDialog
            language={language}
            open={confirmDelete}
            title={tp(language, 'deletePhotoTitle')}
            body={<p>{tp(language, 'deletePhotoBody', { name: photo.filename })}</p>}
            confirmLabel={tp(language, 'delete')}
            danger
            busy={deleting}
            error={deleteError}
            onConfirm={() => void confirmRemoval()}
            onClose={() => setConfirmDelete(false)}
          />
        </div>
      )}
    </dialog>
  )
}
