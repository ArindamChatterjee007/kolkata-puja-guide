import { useMemo, useState } from 'react'
import { ChevronRight, FolderOpen, KeyRound, Trash2, Users } from 'lucide-react'
import type { Language } from '../types'
import { resolveSelf, toApiError } from './api'
import type { AlbumDetail, ApiError, Member, Photo } from './api'
import type { AuthSnapshot } from './auth'
import { tp } from './i18n'
import type { DetailState } from './PhotosApp'
import { useInView, usePreviewUrl } from './previews'
import { ALBUMS_HASH } from './route'
import type { PhotoServices } from './services'
import { folderLabels, formatBytes, formatNumber, initials } from './text'
import { ConfirmDialog, Notice, describeError } from './ui'

interface AlbumViewProps {
  language: Language
  services: PhotoServices
  albumId: string
  auth: AuthSnapshot
  state: DetailState
  reload: () => void
  update: (updater: (detail: AlbumDetail) => AlbumDetail) => void
  onInvite: (token: string, title: string) => void
  onDeleted: (albumId: string) => void
  onToast: (message: string) => void
}

export function DetailFailure({ language, error, reload }: { language: Language; error: ApiError; reload: () => void }) {
  const membership = error.kind === 'unauthorized' || error.kind === 'forbidden' || error.kind === 'session-lost'
  return (
    <section className="page page--narrow" aria-labelledby="detail-failure-title">
      <h1 id="detail-failure-title" className="page__title">{membership ? tp(language, 'notMemberTitle') : tp(language, 'notFoundTitle')}</h1>
      <p className="page__lead">{membership ? tp(language, 'notMemberBody') : describeError(language, error)}</p>
      <div className="page__actions">
        <a className="btn" href={ALBUMS_HASH}>{tp(language, 'goToAlbums')}</a>
        {!membership && error.kind !== 'not-found' && (
          <button type="button" className="btn btn--primary" onClick={reload}>{tp(language, 'tryAgain')}</button>
        )}
      </div>
    </section>
  )
}

export function Breadcrumb({ language, items }: { language: Language; items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="crumbs" aria-label={tp(language, 'albums')}>
      <ol>
        <li>
          <a href={ALBUMS_HASH}>{tp(language, 'albums')}</a>
        </li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} aria-current={index === items.length - 1 ? 'page' : undefined}>
            <ChevronRight size={14} aria-hidden="true" />
            {item.href && index !== items.length - 1 ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function albumBytes(detail: AlbumDetail): number {
  return detail.usage.bytes ?? detail.album.bytes ?? detail.members.reduce((sum, member) => sum + member.bytes, 0)
}

export function AlbumView({ language, services, albumId, state, reload, onInvite, onDeleted, onToast }: AlbumViewProps) {
  const [confirm, setConfirm] = useState<'rotate' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  if (state.status === 'error') return <DetailFailure language={language} error={state.error} reload={reload} />
  if (state.status !== 'ready') {
    return (
      <section className="page" aria-busy="true">
        <Breadcrumb language={language} items={[{ label: '…' }]} />
        <p className="page__status" role="status">{tp(language, 'loading')}</p>
      </section>
    )
  }

  const { detail } = state
  const self = resolveSelf(detail, services.memberships.get(albumId))
  const isCreator = self?.role === 'creator'
  // Removed members keep a folder only while their photos remain (creator cleanup); otherwise they are hidden.
  const visibleMembers = detail.members.filter((member) => !member.removed || detail.photos.some((photo) => photo.memberId === member.id))
  const labels = folderLabels(visibleMembers)
  const members = sortMembers(visibleMembers, self?.memberId ?? null)
  const photoCount = detail.usage.photos ?? detail.album.photoCount ?? detail.photos.length
  const bytes = albumBytes(detail)
  const reserved = Math.max(detail.album.reservedBytes ?? 0, bytes)
  const maxBytes = detail.usage.maxBytes
  const maxPhotos = detail.usage.maxPhotos

  const run = async (action: 'rotate' | 'delete') => {
    setBusy(true)
    setConfirmError(null)
    try {
      if (action === 'rotate') {
        const token = await services.api.rotateInvite(albumId)
        setConfirm(null)
        onInvite(token, detail.album.title)
      } else {
        await services.api.deleteAlbum(albumId)
        setConfirm(null)
        onToast(tp(language, 'deleteAlbum'))
        onDeleted(albumId)
      }
    } catch (reason) {
      setConfirmError(describeError(language, toApiError(reason)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page" aria-labelledby="album-title">
      <Breadcrumb language={language} items={[{ label: detail.album.title }]} />
      <div className="page__head">
        <div>
          <h1 id="album-title" className="page__title">{detail.album.title}</h1>
          <p className="page__meta">
            <span>
              <Users size={16} aria-hidden="true" /> {tp(language, 'foldersCount', { n: formatNumber(language, members.length) })}
            </span>
            <span>{maxPhotos ? tp(language, 'photosOfMax', { n: formatNumber(language, photoCount), max: formatNumber(language, maxPhotos) }) : tp(language, 'photosCount', { n: formatNumber(language, photoCount) })}</span>
            <span>{maxBytes ? tp(language, 'usage', { used: formatBytes(language, reserved), max: formatBytes(language, maxBytes) }) : tp(language, 'usageOpen', { used: formatBytes(language, bytes) })}</span>
          </p>
          {maxBytes ? (
            <div className="usage-bar" aria-hidden="true">
              <span className="usage-bar__fill" style={{ width: `${Math.min(100, Math.round((reserved / maxBytes) * 100))}%` }} />
            </div>
          ) : null}
        </div>
        <div className="page__actions">
          {self && (
            <a className="btn btn--primary" href={`#/a/${albumId}/f/${self.memberId}`}>
              <FolderOpen size={18} aria-hidden="true" />
              <span>{tp(language, 'yourFolder')}</span>
            </a>
          )}
          {isCreator && (
            <button type="button" className="btn" onClick={() => setConfirm('rotate')}>
              <KeyRound size={18} aria-hidden="true" />
              <span>{tp(language, 'newInvite')}</span>
            </button>
          )}
          {isCreator && (
            <button type="button" className="btn btn--danger-text" onClick={() => setConfirm('delete')}>
              <Trash2 size={18} aria-hidden="true" />
              <span>{tp(language, 'deleteAlbum')}</span>
            </button>
          )}
        </div>
      </div>
      {state.error && (
        <Notice tone="warn" live actions={<button type="button" className="btn btn--small" onClick={reload}>{tp(language, 'tryAgain')}</button>}>
          {describeError(language, state.error)}
        </Notice>
      )}
      <p className="page__note">{tp(language, 'exifNotice')}</p>
      <h2 className="section-title">{tp(language, 'folders')}</h2>
      <p className="page__lead page__lead--tight">{tp(language, 'foldersLead')}</p>
      <ul className="folder-grid">
        {members.map((member) => (
          <li key={member.id}>
            <FolderCard
              language={language}
              services={services}
              albumId={albumId}
              member={member}
              label={labels.get(member.id) ?? member.displayName}
              isSelf={member.id === self?.memberId}
              photos={detail.photos}
            />
          </li>
        ))}
      </ul>
      <ConfirmDialog
        language={language}
        open={confirm === 'rotate'}
        title={tp(language, 'rotateTitle')}
        body={<p>{tp(language, 'rotateBody')}</p>}
        confirmLabel={tp(language, 'rotate')}
        busy={busy}
        error={confirmError}
        onConfirm={() => void run('rotate')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        language={language}
        open={confirm === 'delete'}
        title={tp(language, 'deleteAlbumTitle')}
        body={<p>{tp(language, 'deleteAlbumBody', { title: detail.album.title })}</p>}
        confirmLabel={tp(language, 'delete')}
        danger
        busy={busy}
        error={confirmError}
        onConfirm={() => void run('delete')}
        onClose={() => setConfirm(null)}
      />
    </section>
  )
}

function sortMembers(members: readonly Member[], selfId: string | null): Member[] {
  return [...members].sort((a, b) => {
    if (a.id === selfId) return -1
    if (b.id === selfId) return 1
    if (a.role !== b.role) return a.role === 'creator' ? -1 : 1
    const joined = (a.joinedAt ?? '').localeCompare(b.joinedAt ?? '')
    return joined !== 0 ? joined : a.displayName.localeCompare(b.displayName)
  })
}

interface FolderCardProps {
  language: Language
  services: PhotoServices
  albumId: string
  member: Member
  label: string
  isSelf: boolean
  photos: readonly Photo[]
}

function FolderCard({ language, services, albumId, member, label, isSelf, photos }: FolderCardProps) {
  const [cardRef, inView] = useInView()
  const sheet = useMemo(() => {
    const own = photos.filter((photo) => photo.memberId === member.id)
    const withPreview = own.filter((photo) => photo.hasPreview).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return { count: Math.max(member.count, own.length), bytes: Math.max(member.bytes, own.reduce((sum, photo) => sum + photo.bytes, 0)), tiles: withPreview.slice(0, 4) }
  }, [photos, member])

  return (
    <a ref={cardRef} className={`folder-card${isSelf ? ' folder-card--self' : ''}`} href={`#/a/${albumId}/f/${member.id}`} aria-label={`${tp(language, 'folderOf', { name: label })} · ${tp(language, 'photosCount', { n: formatNumber(language, sheet.count) })}`}>
      <span className="sheet" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => {
          const photo = sheet.tiles[index]
          return photo ? <SheetTile key={photo.id} services={services} photo={photo} enabled={inView} /> : <span key={`blank-${index}`} className="sheet__tile sheet__tile--blank">{index === 0 && sheet.tiles.length === 0 ? initials(member.displayName) : ''}</span>
        })}
      </span>
      <span className="folder-card__body">
        <span className="folder-card__name">
          <span className="folder-card__label">{label}</span>
          {isSelf && <span className="chip chip--accent">{tp(language, 'you')}</span>}
          {member.role === 'creator' && <span className="chip">{tp(language, 'creator')}</span>}
          {member.removed && <span className="chip">{tp(language, 'removedMember')}</span>}
        </span>
        <span className="folder-card__meta">
          <span>{tp(language, 'photosCount', { n: formatNumber(language, sheet.count) })}</span>
          <span>{formatBytes(language, sheet.bytes)}</span>
        </span>
      </span>
    </a>
  )
}

function SheetTile({ services, photo, enabled }: { services: PhotoServices; photo: Photo; enabled: boolean }) {
  const preview = usePreviewUrl(services.previews, photo.id, photo.hasPreview, enabled)
  if (preview.status === 'ready') return <img className="sheet__tile" src={preview.url} alt="" decoding="async" />
  return <span className={`sheet__tile sheet__tile--blank${preview.status === 'loading' ? ' is-loading' : ''}`} />
}
