import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { FileImage, Images, LoaderCircle, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import type { Language } from '../types'
import { resolveSelf, toApiError } from './api'
import type { AlbumDetail, PendingUpload, Photo } from './api'
import type { AuthSnapshot } from './auth'
import { Breadcrumb, DetailFailure } from './AlbumView'
import { tp } from './i18n'
import { Lightbox } from './Lightbox'
import type { DetailState } from './PhotosApp'
import { usePreviewUrl } from './previews'
import type { PhotoServices } from './services'
import { ACCEPT_ATTRIBUTE, MAX_FILE_MB, folderLabels, formatBytes, formatNumber } from './text'
import { UploadQueue, defaultConcurrency, isActiveUpload } from './uploads'
import type { UploadItem } from './uploads'
import { EmptyState, Notice, describeError } from './ui'

interface FolderViewProps {
  language: Language
  services: PhotoServices
  albumId: string
  memberId: string
  auth: AuthSnapshot
  state: DetailState
  reload: () => void
  update: (updater: (detail: AlbumDetail) => AlbumDetail) => void
  online: boolean
  uploadsEnabled: boolean
  healthChecking: boolean
  onRecheckUploads: () => void
  onToast: (message: string) => void
}

const MAX_MB = MAX_FILE_MB

function addPhoto(detail: AlbumDetail, photo: Photo): AlbumDetail {
  if (detail.photos.some((existing) => existing.id === photo.id)) return detail
  return {
    ...detail,
    photos: [photo, ...detail.photos],
    members: detail.members.map((member) => (member.id === photo.memberId ? { ...member, count: member.count + 1, bytes: member.bytes + photo.bytes } : member)),
    usage: { ...detail.usage, bytes: detail.usage.bytes === null ? null : detail.usage.bytes + photo.bytes, photos: detail.usage.photos === null ? null : detail.usage.photos + 1 },
  }
}

function removePhoto(detail: AlbumDetail, photo: Photo): AlbumDetail {
  if (!detail.photos.some((existing) => existing.id === photo.id)) return detail
  return {
    ...detail,
    photos: detail.photos.filter((existing) => existing.id !== photo.id),
    members: detail.members.map((member) => (member.id === photo.memberId ? { ...member, count: Math.max(0, member.count - 1), bytes: Math.max(0, member.bytes - photo.bytes) } : member)),
    usage: { ...detail.usage, bytes: detail.usage.bytes === null ? null : Math.max(0, detail.usage.bytes - photo.bytes), photos: detail.usage.photos === null ? null : Math.max(0, detail.usage.photos - 1) },
  }
}

export function FolderView({ language, services, albumId, memberId, state, reload, update, online, uploadsEnabled, healthChecking, onRecheckUploads, onToast }: FolderViewProps) {
  const [items, setItems] = useState<readonly UploadItem[]>([])
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [removingPending, setRemovingPending] = useState<string | null>(null)
  const dragDepth = useRef(0)
  const queueRef = useRef<UploadQueue | null>(null)
  const shasRef = useRef<ReadonlySet<string>>(new Set())

  const detail = state.status === 'ready' ? state.detail : null
  const member = detail?.members.find((entry) => entry.id === memberId) ?? null
  const self = detail ? resolveSelf(detail, services.memberships.get(albumId)) : null
  const isOwn = self !== null && self.memberId === memberId
  const isCreator = self?.role === 'creator'

  const photos = useMemo(() => {
    if (!detail) return []
    return detail.photos.filter((photo) => photo.memberId === memberId).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }, [detail, memberId])

  const shas = useMemo(() => new Set(photos.map((photo) => photo.sha256).filter((sha): sha is string => sha !== null)), [photos])
  useEffect(() => {
    shasRef.current = shas
  }, [shas])

  const labels = useMemo(() => (detail ? folderLabels(detail.members) : new Map<string, string>()), [detail])
  const ownerLabel = useCallback((id: string) => labels.get(id) ?? '—', [labels])

  useEffect(() => {
    if (!isOwn || !uploadsEnabled) return
    const queue = new UploadQueue({
      api: services.api,
      albumId,
      concurrency: defaultConcurrency(),
      existingShas: () => shasRef.current,
      onChange: setItems,
      onPhotoReady: (photo) => {
        update((current) => addPhoto(current, photo))
        reload()
      },
    })
    queueRef.current = queue
    setItems([])
    return () => {
      queue.dispose()
      queueRef.current = null
      setItems([])
    }
  }, [services, albumId, memberId, isOwn, uploadsEnabled, update, reload])

  useEffect(() => {
    queueRef.current?.setOnline(online)
  }, [online])

  const pendingUploads = items.some((item) => isActiveUpload(item.status) || item.status === 'queued')
  useEffect(() => {
    if (!pendingUploads) return
    // Queued File handles cannot survive a reload, so the browser asks before leaving mid-upload.
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [pendingUploads])

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || !queueRef.current) return
    const files = Array.from(list)
    if (files.length > 0) queueRef.current.add(files)
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files)
    // Reset so choosing the same file again re-queues it after a cancel.
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const deletePhoto = async (photo: Photo) => {
    await services.api.deletePhoto(photo.id)
    services.previews.forget(photo.id)
    update((current) => removePhoto(current, photo))
    reload()
    setLightbox((current) => {
      if (current === null) return null
      const remaining = photos.length - 1
      if (remaining <= 0) return null
      return Math.min(current, remaining - 1)
    })
  }

  const removePending = async (pending: PendingUpload) => {
    setRemovingPending(pending.id)
    try {
      // The reservation id is the photo id; deleting it cancels an unwritten upload and frees its quota.
      await services.api.deletePhoto(pending.id)
      update((current) => ({ ...current, pendingUploads: current.pendingUploads.filter((entry) => entry.id !== pending.id) }))
    } catch (reason) {
      onToast(describeError(language, toApiError(reason)))
    } finally {
      setRemovingPending(null)
    }
  }

  if (state.status === 'error') return <DetailFailure language={language} error={state.error} reload={reload} />
  if (!detail) {
    return (
      <section className="page" aria-busy="true">
        <Breadcrumb language={language} items={[{ label: '…' }]} />
        <p className="page__status" role="status">{tp(language, 'loading')}</p>
      </section>
    )
  }
  if (!member) {
    return (
      <section className="page page--narrow" aria-labelledby="folder-missing">
        <Breadcrumb language={language} items={[{ label: detail.album.title, href: `#/a/${albumId}` }, { label: '…' }]} />
        <h1 id="folder-missing" className="page__title">{tp(language, 'notFoundTitle')}</h1>
        <p className="page__lead">{tp(language, 'errNotFound')}</p>
        <a className="btn" href={`#/a/${albumId}`}>{detail.album.title}</a>
      </section>
    )
  }

  const label = labels.get(member.id) ?? member.displayName
  const bytes = Math.max(member.bytes, photos.reduce((sum, photo) => sum + photo.bytes, 0))
  const count = Math.max(member.count, photos.length)
  const activeUploads = items.filter((item) => isActiveUpload(item.status) || item.status === 'queued').length

  return (
    <section className="page" aria-labelledby="folder-title">
      <Breadcrumb language={language} items={[{ label: detail.album.title, href: `#/a/${albumId}` }, { label }]} />
      <div className="page__head">
        <div>
          <h1 id="folder-title" className="page__title">
            <span>{tp(language, 'folderOf', { name: label })}</span>
            {isOwn && <span className="chip chip--accent">{tp(language, 'you')}</span>}
            {member.role === 'creator' && <span className="chip">{tp(language, 'creator')}</span>}
            {member.removed && <span className="chip">{tp(language, 'removedMember')}</span>}
          </h1>
          <p className="page__meta">
            <span>{tp(language, 'photosCount', { n: formatNumber(language, count) })}</span>
            <span>{formatBytes(language, bytes)}</span>
          </p>
        </div>
      </div>
      {state.status === 'ready' && state.error && (
        <Notice tone="warn" live actions={<button type="button" className="btn btn--small" onClick={reload}>{tp(language, 'tryAgain')}</button>}>
          {describeError(language, state.error)}
        </Notice>
      )}
      {isOwn ? (
        <section className="upload" aria-labelledby="upload-title">
          <h2 id="upload-title" className="section-title">{tp(language, 'addPhotos')}</h2>
          {uploadsEnabled ? (
            <div
              className={`dropzone${dragging ? ' is-dragging' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault()
                dragDepth.current += 1
                setDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1)
                if (dragDepth.current === 0) setDragging(false)
              }}
              onDrop={onDrop}
            >
              <Upload size={28} aria-hidden="true" className="dropzone__icon" />
              <p className="dropzone__hint">{tp(language, 'dropHint')}</p>
              <label className="btn btn--primary dropzone__pick">
                <Images size={18} aria-hidden="true" />
                <span>{tp(language, 'choosePhotos')}</span>
                <input className="sr-only" type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={onInputChange} />
              </label>
              <p className="dropzone__types">{tp(language, 'acceptedTypes', { mb: formatNumber(language, MAX_MB) })}</p>
            </div>
          ) : (
            <Notice
              tone="warn"
              live
              actions={
                <button type="button" className="btn btn--small" onClick={onRecheckUploads} disabled={healthChecking} aria-busy={healthChecking || undefined}>
                  <RefreshCw size={16} aria-hidden="true" />
                  <span>{healthChecking ? tp(language, 'loading') : tp(language, 'checkAgain')}</span>
                </button>
              }
            >
              {tp(language, 'uploadsOff')}
            </Notice>
          )}
          {detail.pendingUploads.length > 0 && (
            <div className="queue queue--pending">
              <div className="queue__head">
                <h3 className="queue__title">{tp(language, 'pendingTitle')}</h3>
              </div>
              <p className="queue__warn">{tp(language, 'pendingHint')}</p>
              <ul className="queue__list">
                {detail.pendingUploads.map((pending) => (
                  <li key={pending.id} className="upload-row upload-row--muted" data-status={pending.status}>
                    <span className="upload-row__thumb" aria-hidden="true">
                      <FileImage size={20} />
                    </span>
                    <span className="upload-row__body">
                      <span className="upload-row__name" title={pending.filename}>{pending.filename || '—'}</span>
                      <span className="upload-row__meta">
                        <span>{formatBytes(language, pending.bytes)}</span>
                        <span className="upload-row__status">{tp(language, pending.status === 'uploading' ? 'pendUploading' : pending.status === 'cleanupRequired' ? 'pendCleanup' : 'pendReserved')}</span>
                      </span>
                    </span>
                    <span className="upload-row__actions">
                      <button type="button" className="btn btn--small" onClick={() => void removePending(pending)} disabled={removingPending === pending.id} aria-busy={removingPending === pending.id || undefined}>
                        <Trash2 size={16} aria-hidden="true" />
                        <span>{tp(language, 'removeReservation')}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {items.length > 0 && (
            <div className="queue">
              <div className="queue__head">
                <h3 className="queue__title">
                  {tp(language, 'uploads')}
                  {activeUploads > 0 && <LoaderCircle size={16} aria-hidden="true" className="spin" />}
                </h3>
                <button type="button" className="btn btn--small" onClick={() => queueRef.current?.clearFinished()}>{tp(language, 'clearFinished')}</button>
              </div>
              {!online && <Notice tone="warn" live>{tp(language, 'pausedOffline')}</Notice>}
              <p className="queue__warn">{tp(language, 'queueWarn')}</p>
              <ul className="queue__list">
                {items.map((item) => (
                  <UploadRow key={item.id} language={language} item={item} onRetry={() => queueRef.current?.retry(item.id)} onCancel={() => queueRef.current?.cancel(item.id)} onRemove={() => queueRef.current?.remove(item.id)} />
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <p className="page__note">{tp(language, 'readOnlyFolder', { name: label })}</p>
      )}
      <h2 className="section-title">{tp(language, 'photos')}</h2>
      {photos.length === 0 ? (
        <EmptyState icon={<Images size={28} />} title={tp(language, 'emptyFolder')} hint={isOwn ? tp(language, 'emptyFolderOwn') : undefined} />
      ) : (
        <ul className="photo-grid">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <PhotoTile language={language} services={services} photo={photo} onOpen={() => setLightbox(index)} />
            </li>
          ))}
        </ul>
      )}
      <Lightbox
        language={language}
        services={services}
        photos={photos}
        index={lightbox}
        ownerLabel={ownerLabel}
        canDelete={(photo) => isCreator || (self !== null && photo.memberId === self.memberId)}
        onIndex={setLightbox}
        onClose={() => setLightbox(null)}
        onDelete={deletePhoto}
        onToast={onToast}
      />
    </section>
  )
}

function PhotoTile({ language, services, photo, onOpen }: { language: Language; services: PhotoServices; photo: Photo; onOpen: () => void }) {
  const preview = usePreviewUrl(services.previews, photo.id, photo.hasPreview)
  const type = photo.contentType.replace('image/', '').toUpperCase()
  return (
    <button type="button" className="photo-tile" onClick={onOpen} aria-label={tp(language, 'openPhoto', { name: photo.filename })} title={photo.filename}>
      {preview.status === 'ready' ? (
        <img className="photo-tile__img" src={preview.url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className={`photo-tile__blank${preview.status === 'loading' ? ' is-loading' : ''}`} aria-hidden="true">
          <FileImage size={26} />
          {preview.status !== 'loading' && <span className="photo-tile__type">{type}</span>}
        </span>
      )}
      <span className="photo-tile__caption">
        <span className="photo-tile__name">{photo.filename}</span>
        <span className="photo-tile__size">{formatBytes(language, photo.bytes)}</span>
      </span>
    </button>
  )
}

function statusText(language: Language, item: UploadItem): string {
  switch (item.status) {
    case 'queued':
      return tp(language, 'stQueued')
    case 'hashing':
      return tp(language, 'stHashing')
    case 'uploading':
      return tp(language, 'stUploading', { pct: formatNumber(language, item.progress) })
    case 'processing':
      return tp(language, 'stProcessing')
    case 'checking':
      return tp(language, 'stChecking')
    case 'uploaded':
      return tp(language, 'stUploaded')
    case 'duplicate':
      return tp(language, 'stDuplicate')
    case 'cancelled':
      return tp(language, 'stCancelled')
    case 'rejected':
      return item.rejection === 'too-large' ? tp(language, 'rejTooLarge', { mb: formatNumber(language, MAX_MB) }) : item.rejection === 'empty' ? tp(language, 'rejEmpty') : tp(language, 'rejUnsupported')
    default:
      return tp(language, 'stFailed')
  }
}

function UploadRow({ language, item, onRetry, onCancel, onRemove }: { language: Language; item: UploadItem; onRetry: () => void; onCancel: () => void; onRemove: () => void }) {
  const active = isActiveUpload(item.status)
  const tone = item.status === 'uploaded' || item.status === 'duplicate' ? 'ok' : item.status === 'failed' || item.status === 'rejected' ? 'error' : item.status === 'cancelled' ? 'muted' : 'busy'
  const errorText = item.status === 'failed' && item.error ? describeError(language, { kind: item.error, status: 0 }) : null
  return (
    <li className={`upload-row upload-row--${tone}`} data-status={item.status}>
      <span className="upload-row__thumb" aria-hidden="true">
        {item.localPreviewUrl ? <img src={item.localPreviewUrl} alt="" /> : <FileImage size={20} />}
      </span>
      <span className="upload-row__body">
        <span className="upload-row__name" title={item.filename}>{item.filename}</span>
        <span className="upload-row__meta">
          <span>{formatBytes(language, item.bytes)}</span>
          <span className="upload-row__status" role="status">{statusText(language, item)}</span>
        </span>
        {errorText && <span className="upload-row__error">{errorText}</span>}
        {(item.status === 'uploading' || item.status === 'processing') && (
          <span className="upload-row__bar" aria-hidden="true">
            <span className="upload-row__fill" style={{ width: `${item.progress}%` }} />
          </span>
        )}
      </span>
      <span className="upload-row__actions">
        {(item.status === 'failed' || item.status === 'cancelled') && (
          <button type="button" className="icon-btn" onClick={onRetry} aria-label={`${tp(language, 'retry')}: ${item.filename}`} title={tp(language, 'retry')}>
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        )}
        {(active || item.status === 'queued') && (
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={`${tp(language, 'cancelUpload')}: ${item.filename}`} title={tp(language, 'cancelUpload')}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
        {!active && item.status !== 'queued' && (
          <button type="button" className="icon-btn" onClick={onRemove} aria-label={`${tp(language, 'removeRow')}: ${item.filename}`} title={tp(language, 'removeRow')}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </span>
    </li>
  )
}
