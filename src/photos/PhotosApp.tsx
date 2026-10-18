import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Check, CloudOff, Copy, FolderOpen, Images, KeyRound, Plus, UserRoundPlus } from 'lucide-react'
import type { Language } from '../types'
import { Modal } from '../components/Modal'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useTheme } from '../hooks/useTheme'
import { toApiError } from './api'
import type { AlbumDetail, AlbumMembership, ApiError, HealthInfo, InviteInfo } from './api'
import type { AuthSnapshot } from './auth'
import { backendState } from './config'
import { tp } from './i18n'
import { ALBUMS_HASH, navigate, useRoute } from './route'
import type { PhotoRoute } from './route'
import { createServices } from './services'
import type { PhotoServices } from './services'
import { MAX_NAME_LENGTH, MAX_TITLE_LENGTH, formatBytes, formatNumber, validDisplayName, validTitle } from './text'
import { EmptyArt, EmptyState, Field, Notice, PhotoHeader, describeError } from './ui'
import { AlbumView } from './AlbumView'
import { FolderView } from './FolderView'

const LANGUAGE_KEY = 'kolkata-puja-guide:photos:language:v1'
const NAME_KEY = 'kolkata-puja-guide:photos:display-name:v1'
const PLAN_KEY = 'kolkata-puja-guide:plan:v1'

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable; the preference then lasts for this page only.
  }
}

function initialLanguage(): Language {
  const stored = readLocal(LANGUAGE_KEY)
  if (stored === 'en' || stored === 'bn') return stored
  // Read-only peek at the planner's language so both pages agree; the planner key is never written here.
  try {
    const plan = readLocal(PLAN_KEY)
    if (plan) {
      const parsed = JSON.parse(plan) as { language?: unknown }
      if (parsed.language === 'en' || parsed.language === 'bn') return parsed.language
    }
  } catch {
    // Ignore unreadable planner state.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn') ? 'bn' : 'en'
}

const NO_AUTH: AuthSnapshot = { signedIn: false, userId: null, lostEarlierSession: false }
const noopSubscribe = () => () => undefined
const noAuthSnapshot = () => NO_AUTH

export type DetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; detail: AlbumDetail; refreshing: boolean; error: ApiError | null }
  | { status: 'error'; error: ApiError }

const detailCache = new Map<string, AlbumDetail>()

function fatalKind(error: ApiError): boolean {
  return error.kind === 'unauthorized' || error.kind === 'forbidden' || error.kind === 'not-found' || error.kind === 'session-lost'
}

function useAlbumDetail(services: PhotoServices | null, albumId: string | null, signedIn: boolean) {
  const [state, setState] = useState<DetailState>({ status: 'idle' })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    if (!services || !albumId || !signedIn) {
      setState({ status: 'idle' })
      return
    }
    const cached = detailCache.get(albumId)
    setState(cached ? { status: 'ready', detail: cached, refreshing: true, error: null } : { status: 'loading' })
    const controller = new AbortController()
    services.api.getAlbum(albumId, controller.signal).then(
      (detail) => {
        detailCache.set(albumId, detail)
        setState({ status: 'ready', detail, refreshing: false, error: null })
      },
      (reason: unknown) => {
        const error = toApiError(reason)
        if (error.kind === 'aborted') return
        if (fatalKind(error)) {
          detailCache.delete(albumId)
          setState({ status: 'error', error })
          return
        }
        setState((previous) => (previous.status === 'ready' ? { ...previous, refreshing: false, error } : { status: 'error', error }))
      },
    )
    return () => controller.abort()
  }, [services, albumId, signedIn, version])

  const update = useCallback((updater: (detail: AlbumDetail) => AlbumDetail) => {
    setState((previous) => {
      if (previous.status !== 'ready') return previous
      const detail = updater(previous.detail)
      detailCache.set(detail.album.id, detail)
      return { ...previous, detail }
    })
  }, [])

  const forget = useCallback((id: string) => {
    detailCache.delete(id)
  }, [])

  return { state, reload, update, forget }
}

// Deep links (album/folder opened after a reload) need the caller's own membership even when the detail
// payload omits `self`; one list call fills the page-session map and re-renders the open view.
function useEnsureMembership(services: PhotoServices | null, albumId: string | null, signedIn: boolean): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!services || !albumId || !signedIn || services.memberships.has(albumId)) return
    const controller = new AbortController()
    services.api.listAlbums(controller.signal).then(
      (albums) => {
        for (const membership of albums) services.memberships.set(membership.album.id, membership)
        setTick((value) => value + 1)
      },
      () => undefined,
    )
    return () => controller.abort()
  }, [services, albumId, signedIn])
  return tick
}

type HealthState = { status: 'checking' } | { status: 'ready'; info: HealthInfo } | { status: 'error'; error: ApiError }

// Public readiness flags from the gateway. Until it reports `uploadsEnabled`, every file input stays off
// even though viewing works; a failed check keeps uploads off and offers a manual re-check.
function useHealth(services: PhotoServices | null): [HealthState, () => void] {
  const [state, setState] = useState<HealthState>({ status: 'checking' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!services) return
    const controller = new AbortController()
    setState({ status: 'checking' })
    services.api.health(controller.signal).then(
      (info) => setState({ status: 'ready', info }),
      (reason: unknown) => {
        const error = toApiError(reason)
        if (error.kind !== 'aborted') setState({ status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [services, version])
  const recheck = useCallback(() => setVersion((value) => value + 1), [])
  return [state, recheck]
}

export function PhotosApp() {
  // Subscribing at the root applies a stored Day/Night choice even while no theme control is mounted.
  useTheme()
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const backend = useMemo(backendState, [])
  const services = useMemo(() => (backend.status === 'ready' ? createServices(backend.backend) : null), [backend])
  const auth = useSyncExternalStore(services?.auth.subscribe ?? noopSubscribe, services?.auth.getSnapshot ?? noAuthSnapshot, noAuthSnapshot)
  const route = useRoute()
  const online = useOnlineStatus()
  const [health, recheckHealth] = useHealth(services)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [invite, setInvite] = useState<{ title: string; token: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  const albumId = route.kind === 'album' || route.kind === 'folder' ? route.albumId : null
  const detail = useAlbumDetail(services, albumId, auth.signedIn)
  useEnsureMembership(services, albumId, auth.signedIn)

  const setLanguage = (next: Language) => {
    setLanguageState(next)
    writeLocal(LANGUAGE_KEY, next)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (window.location.hash === '' || window.location.hash === '#') window.location.replace(ALBUMS_HASH)
  }, [])

  useEffect(() => {
    const title = detail.state.status === 'ready' && albumId ? `${detail.state.detail.album.title} · ${tp(language, 'brandSub')}` : `PujaPath | ${tp(language, 'brandSub')}`
    document.title = title
  }, [detail.state, albumId, language])

  useEffect(() => () => services?.previews.dispose(), [services])

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const rememberMembership = useCallback((membership: AlbumMembership) => {
    services?.memberships.set(membership.album.id, membership)
  }, [services])

  const onCreated = (result: { membership: AlbumMembership; invite: string }) => {
    rememberMembership(result.membership)
    setCreateOpen(false)
    setInvite({ title: result.membership.album.title, token: result.invite })
    navigate({ kind: 'album', albumId: result.membership.album.id })
  }

  let content: ReactNode
  if (!services || backend.status !== 'ready' || (health.status === 'ready' && !health.info.ready)) {
    content = <UnconfiguredView language={language} route={route} />
  } else if (route.kind === 'unknown') {
    content = <NotFoundView language={language} />
  } else if (route.kind === 'join') {
    content = <JoinView language={language} services={services} auth={auth} token={route.token} onJoined={rememberMembership} />
  } else if (route.kind === 'albums') {
    content = <AlbumsView language={language} services={services} auth={auth} onCreate={() => setCreateOpen(true)} onMemberships={rememberMembership} />
  } else if (!auth.signedIn) {
    content = <NotMemberView language={language} lostEarlier={auth.lostEarlierSession} />
  } else if (route.kind === 'album') {
    content = (
      <AlbumView
        language={language}
        services={services}
        albumId={route.albumId}
        auth={auth}
        state={detail.state}
        reload={detail.reload}
        update={detail.update}
        onInvite={(token, title) => setInvite({ title, token })}
        onDeleted={(id) => {
          detail.forget(id)
          services.memberships.delete(id)
          navigate({ kind: 'albums' }, { replace: true })
        }}
        onToast={showToast}
      />
    )
  } else {
    content = (
      <FolderView
        language={language}
        services={services}
        albumId={route.albumId}
        memberId={route.memberId}
        auth={auth}
        state={detail.state}
        reload={detail.reload}
        update={detail.update}
        online={online}
        uploadsEnabled={health.status === 'ready' && health.info.uploadsEnabled}
        healthChecking={health.status === 'checking'}
        onRecheckUploads={recheckHealth}
        onToast={showToast}
      />
    )
  }

  return (
    <div className="photos-app" data-backend={backend.status} data-route={route.kind} data-health={health.status === 'ready' ? (health.info.ready ? (health.info.uploadsEnabled ? 'uploads' : 'read-only') : 'not-ready') : health.status}>
      <a
        className="skip-link"
        href="#photos-main"
        onClick={(event) => {
          // Focus directly: letting the hash change would be read as an (unknown) album route.
          event.preventDefault()
          mainRef.current?.focus()
        }}
      >
        {tp(language, 'skipToContent')}
      </a>
      <PhotoHeader language={language} configured={backend.status === 'ready'} onLanguage={setLanguage} onPrivacy={() => setPrivacyOpen(true)} />
      {!online && (
        <div className="offline-bar" role="status">
          <CloudOff size={16} aria-hidden="true" />
          <span>{tp(language, 'offline')}</span>
        </div>
      )}
      <main id="photos-main" className="photos-main" ref={mainRef} tabIndex={-1}>
        {content}
      </main>
      <div className="photos-toast" role="status" aria-live="polite">{toast && <span className="photos-toast__pill">{toast}</span>}</div>
      <PrivacyDialog language={language} open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      {services && (
        <CreateAlbumDialog language={language} services={services} auth={auth} open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />
      )}
      <InviteDialog language={language} invite={invite} onClose={() => setInvite(null)} onToast={showToast} />
    </div>
  )
}

function UnconfiguredView({ language, route }: { language: Language; route: PhotoRoute }) {
  return (
    <section className="page page--narrow page--center" aria-labelledby="unconfigured-title">
      <EmptyArt icon={<Images size={28} />} />
      <h1 id="unconfigured-title" className="page__title">{tp(language, 'unconfiguredTitle')}</h1>
      <p className="page__lead">{tp(language, 'unconfiguredBody')}</p>
      {route.kind === 'join' && <Notice tone="info">{tp(language, 'unconfiguredInvite')}</Notice>}
      <p className="page__lead">{tp(language, 'albumsLead')}</p>
    </section>
  )
}

function NotFoundView({ language }: { language: Language }) {
  return (
    <section className="page page--narrow" aria-labelledby="notfound-title">
      <h1 id="notfound-title" className="page__title">{tp(language, 'notFoundTitle')}</h1>
      <p className="page__lead">{tp(language, 'notFoundBody')}</p>
      <a className="btn btn--primary" href={ALBUMS_HASH}>{tp(language, 'goToAlbums')}</a>
    </section>
  )
}

function NotMemberView({ language, lostEarlier }: { language: Language; lostEarlier: boolean }) {
  return (
    <section className="page page--narrow" aria-labelledby="notmember-title">
      <h1 id="notmember-title" className="page__title">{tp(language, 'notMemberTitle')}</h1>
      <p className="page__lead">{tp(language, 'notMemberBody')}</p>
      {lostEarlier && <Notice tone="warn">{tp(language, 'sessionLost')}</Notice>}
      <a className="btn" href={ALBUMS_HASH}>{tp(language, 'goToAlbums')}</a>
    </section>
  )
}

type ListState = { status: 'loading' } | { status: 'ready'; albums: AlbumMembership[] } | { status: 'error'; error: ApiError }

interface AlbumsViewProps {
  language: Language
  services: PhotoServices
  auth: AuthSnapshot
  onCreate: () => void
  onMemberships: (membership: AlbumMembership) => void
}

function AlbumsView({ language, services, auth, onCreate, onMemberships }: AlbumsViewProps) {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!auth.signedIn) return
    const controller = new AbortController()
    setState({ status: 'loading' })
    services.api.listAlbums(controller.signal).then(
      (albums) => {
        const active = albums.filter(({ album }) => album.state !== 'deleting')
        for (const membership of active) onMemberships(membership)
        setState({ status: 'ready', albums: active })
      },
      (reason: unknown) => {
        const error = toApiError(reason)
        if (error.kind !== 'aborted') setState({ status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [services, auth.signedIn, version, onMemberships])

  const createButton = (
    <button type="button" className="btn btn--primary" onClick={onCreate}>
      <Plus size={18} aria-hidden="true" />
      <span>{tp(language, 'createAlbum')}</span>
    </button>
  )

  return (
    <section className="page" aria-labelledby="albums-title">
      <div className="page__head">
        <div>
          <h1 id="albums-title" className="page__title">{tp(language, 'albumsTitle')}</h1>
          <p className="page__lead">{tp(language, 'albumsLead')}</p>
        </div>
        {auth.signedIn && <div className="page__actions">{createButton}</div>}
      </div>
      {auth.lostEarlierSession && <Notice tone="warn">{tp(language, 'sessionLost')}</Notice>}
      {!auth.signedIn && (
        <EmptyState icon={<Images size={28} />} title={tp(language, 'noAlbums')} hint={tp(language, 'noAlbumsHint')} action={createButton} />
      )}
      {auth.signedIn && state.status === 'loading' && <p className="page__status" role="status">{tp(language, 'loading')}</p>}
      {auth.signedIn && state.status === 'error' && (
        <Notice
          tone="error"
          live
          actions={
            <button type="button" className="btn btn--small" onClick={() => setVersion((value) => value + 1)}>
              {tp(language, 'tryAgain')}
            </button>
          }
        >
          {describeError(language, state.error)}
        </Notice>
      )}
      {auth.signedIn && state.status === 'ready' && state.albums.length === 0 && (
        <EmptyState icon={<Images size={28} />} title={tp(language, 'noAlbums')} hint={tp(language, 'noAlbumsHint')} />
      )}
      {auth.signedIn && state.status === 'ready' && state.albums.length > 0 && (
        <ul className="album-grid">
          {state.albums.map(({ album, member }) => (
            <li key={album.id}>
              <a className="album-card" href={`#/a/${album.id}`} aria-label={`${tp(language, 'openAlbum')}: ${album.title}`}>
                <span className="album-card__icon" aria-hidden="true">
                  <FolderOpen size={22} />
                </span>
                <span className="album-card__body">
                  <span className="album-card__title">{album.title}</span>
                  <span className="album-card__meta">
                    {album.memberCount !== null && <span>{tp(language, 'foldersCount', { n: formatNumber(language, album.memberCount) })}</span>}
                    {album.photoCount !== null && <span>{tp(language, 'photosCount', { n: formatNumber(language, album.photoCount) })}</span>}
                    {album.bytes !== null && <span>{formatBytes(language, album.bytes)}</span>}
                  </span>
                  <span className="album-card__me">
                    {member.displayName && <span className="chip">{member.displayName}</span>}
                    {member.role === 'creator' && <span className="chip chip--accent">{tp(language, 'creator')}</span>}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type JoinState =
  | { status: 'checking' }
  | { status: 'ready'; info: InviteInfo }
  | { status: 'invalid' }
  | { status: 'error'; error: ApiError }

interface JoinViewProps {
  language: Language
  services: PhotoServices
  auth: AuthSnapshot
  token: string | null
  onJoined: (membership: AlbumMembership) => void
}

function JoinView({ language, services, auth, token, onJoined }: JoinViewProps) {
  const [state, setState] = useState<JoinState>({ status: 'checking' })
  const [version, setVersion] = useState(0)
  const [name, setName] = useState(() => readLocal(NAME_KEY) ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [alreadyIn, setAlreadyIn] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setState({ status: 'checking' })
    services.api.inspectInvite(token, controller.signal).then(
      (info) => setState({ status: 'ready', info }),
      (reason: unknown) => {
        const error = toApiError(reason)
        if (error.kind === 'aborted') return
        setState(error.kind === 'not-found' || error.kind === 'forbidden' || error.kind === 'unsupported' ? { status: 'invalid' } : { status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [services, token, version])

  if (!token) {
    return (
      <section className="page page--narrow" aria-labelledby="join-title">
        <h1 id="join-title" className="page__title">{tp(language, 'joinTitle')}</h1>
        <Notice tone="warn">{tp(language, 'joinIncomplete')}</Notice>
        <a className="btn" href={ALBUMS_HASH}>{tp(language, 'goToAlbums')}</a>
      </section>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (state.status !== 'ready') return
    const displayName = validDisplayName(name)
    if (!displayName) {
      setNameError(tp(language, 'nameRequired'))
      return
    }
    setNameError(null)
    setJoinError(null)
    setBusy(true)
    try {
      if (!auth.signedIn) await services.auth.signInAnonymously()
      const membership = await services.api.joinAlbum({ invite: token, displayName })
      writeLocal(NAME_KEY, displayName)
      onJoined(membership)
      // Replace the invite entry so the token leaves session history once consumed.
      navigate({ kind: 'album', albumId: membership.album.id }, { replace: true })
    } catch (reason) {
      const error = toApiError(reason)
      if (error.kind === 'conflict') setAlreadyIn(state.info.albumId)
      else if (error.kind === 'not-found') setState({ status: 'invalid' })
      else setJoinError(describeError(language, error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page page--narrow" aria-labelledby="join-title">
      <h1 id="join-title" className="page__title">{tp(language, 'joinTitle')}</h1>
      {state.status === 'checking' && <p className="page__status" role="status">{tp(language, 'joinChecking')}</p>}
      {state.status === 'invalid' && (
        <>
          <Notice tone="error">{tp(language, 'joinInvalid')}</Notice>
          <a className="btn" href={ALBUMS_HASH}>{tp(language, 'goToAlbums')}</a>
        </>
      )}
      {state.status === 'error' && (
        <Notice
          tone="error"
          live
          actions={
            <button type="button" className="btn btn--small" onClick={() => setVersion((value) => value + 1)}>
              {tp(language, 'tryAgain')}
            </button>
          }
        >
          {describeError(language, state.error)}
        </Notice>
      )}
      {state.status === 'ready' && alreadyIn && (
        <Notice tone="info" actions={<a className="btn btn--small btn--primary" href={`#/a/${alreadyIn}`}>{tp(language, 'openAlbum')}</a>}>
          {tp(language, 'alreadyMember')}
        </Notice>
      )}
      {state.status === 'ready' && !alreadyIn && (
        <form className="card form" onSubmit={submit} noValidate>
          <p className="page__lead">{tp(language, 'joinLead', { title: state.info.title })}</p>
          {state.info.memberCount !== null && <p className="form__meta">{tp(language, 'foldersCount', { n: formatNumber(language, state.info.memberCount) })}</p>}
          {auth.lostEarlierSession && <Notice tone="warn">{tp(language, 'sessionLost')}</Notice>}
          <Field
            label={tp(language, 'yourName')}
            hint={tp(language, 'yourNameHint')}
            error={nameError}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME_LENGTH * 2}
            autoComplete="nickname"
            required
          />
          <Notice tone="info">{tp(language, 'joinNotice')}</Notice>
          {joinError && <Notice tone="error" live>{joinError}</Notice>}
          <div className="dialog-actions">
            <a className="btn" href={ALBUMS_HASH}>{tp(language, 'cancel')}</a>
            <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
              <UserRoundPlus size={18} aria-hidden="true" />
              <span>{busy ? tp(language, 'joining') : tp(language, 'join')}</span>
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

interface CreateAlbumDialogProps {
  language: Language
  services: PhotoServices
  auth: AuthSnapshot
  open: boolean
  onClose: () => void
  onCreated: (result: { membership: AlbumMembership; invite: string }) => void
}

function CreateAlbumDialog({ language, services, auth, open, onClose, onCreated }: CreateAlbumDialogProps) {
  const [title, setTitle] = useState('')
  const [name, setName] = useState(() => readLocal(NAME_KEY) ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setTitleError(null)
      setNameError(null)
      setError(null)
      setName((current) => current || (readLocal(NAME_KEY) ?? ''))
    }
  }, [open])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cleanTitle = validTitle(title)
    const displayName = validDisplayName(name)
    setTitleError(cleanTitle ? null : tp(language, 'titleRequired'))
    setNameError(displayName ? null : tp(language, 'nameRequired'))
    if (!cleanTitle || !displayName) return
    setBusy(true)
    setError(null)
    try {
      if (!auth.signedIn) await services.auth.signInAnonymously()
      const result = await services.api.createAlbum({ title: cleanTitle, displayName })
      writeLocal(NAME_KEY, displayName)
      setTitle('')
      onCreated({ membership: { album: result.album, member: result.member }, invite: result.invite })
    } catch (reason) {
      setError(describeError(language, toApiError(reason)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={tp(language, 'createAlbum')} closeLabel={tp(language, 'close')}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label={tp(language, 'albumTitle')} hint={tp(language, 'albumTitleHint')} error={titleError} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={MAX_TITLE_LENGTH * 2} autoComplete="off" required />
        <Field label={tp(language, 'yourName')} hint={tp(language, 'yourNameHint')} error={nameError} value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_NAME_LENGTH * 2} autoComplete="nickname" required />
        <Notice tone="info">{tp(language, 'createNotice')}</Notice>
        {error && <Notice tone="error" live>{error}</Notice>}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>{tp(language, 'cancel')}</button>
          <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy || undefined}>
            {busy ? tp(language, 'creating') : tp(language, 'create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function inviteLink(token: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/join/${encodeURIComponent(token)}`
}

interface InviteDialogProps {
  language: Language
  invite: { title: string; token: string } | null
  onClose: () => void
  onToast: (message: string) => void
}

function InviteDialog({ language, invite, onClose, onToast }: InviteDialogProps) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const link = invite ? inviteLink(invite.token) : ''

  useEffect(() => {
    setCopied('idle')
  }, [invite])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied('done')
      onToast(tp(language, 'copied'))
    } catch {
      setCopied('failed')
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }

  return (
    <Modal open={invite !== null} onClose={onClose} title={tp(language, 'inviteTitle')} closeLabel={tp(language, 'close')}>
      {invite && (
        <>
          <p className="dialog__lead">
            <strong>{invite.title}</strong>
          </p>
          <p>{tp(language, 'inviteReady')}</p>
          <div className="invite-row">
            <KeyRound size={18} aria-hidden="true" className="invite-row__icon" />
            <input ref={inputRef} className="field__input invite-row__input" type="text" readOnly value={link} aria-label={tp(language, 'inviteTitle')} onFocus={(event) => event.currentTarget.select()} />
          </div>
          <Notice tone="warn">{tp(language, 'inviteWarn')}</Notice>
          {copied === 'failed' && <Notice tone="error" live>{tp(language, 'copyFailed')}</Notice>}
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>{tp(language, 'done')}</button>
            <button type="button" className="btn btn--primary" onClick={copy}>
              {copied === 'done' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              <span>{copied === 'done' ? tp(language, 'copied') : tp(language, 'copyInvite')}</span>
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function PrivacyDialog({ language, open, onClose }: { language: Language; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={tp(language, 'privacyTitle')} closeLabel={tp(language, 'close')}>
      <ul className="privacy-list">
        <li>{tp(language, 'privacyAccess')}</li>
        <li>{tp(language, 'privacyExif')}</li>
        <li>{tp(language, 'privacyRights')}</li>
        <li>{tp(language, 'privacySession')}</li>
        <li>{tp(language, 'privacyTransport')}</li>
      </ul>
      <div className="dialog-actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>{tp(language, 'close')}</button>
      </div>
    </Modal>
  )
}
