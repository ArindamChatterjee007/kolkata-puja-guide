import { AuthError, type PhotoAuth } from './auth'
import type { ResolvedBackend } from './config'

// Typed client for the `trip-photos` edge function. Paths and payload shapes follow the agreed contract;
// response parsing is tolerant (fields may arrive under close aliases while the backend settles) but never
// trusts the server for anything the UI gates on without the server also enforcing it.

export type MemberRole = 'creator' | 'member'

export interface Album {
  id: string
  title: string
  createdAt: string | null
  creatorMemberId: string | null
  /** Caller's own member id when the server includes it on album rows (`myMemberId`). */
  myMemberId: string | null
  isCreator: boolean | null
  state: 'active' | 'deleting' | null
  memberCount: number | null
  photoCount: number | null
  bytes: number | null
  reservedBytes: number | null
}

export interface Member {
  id: string
  displayName: string
  role: MemberRole
  removed: boolean
  count: number
  bytes: number
  joinedAt: string | null
}

export interface Photo {
  id: string
  memberId: string
  filename: string
  bytes: number
  contentType: string
  sha256: string | null
  createdAt: string | null
  hasPreview: boolean
}

export type OriginalState = 'reserved' | 'uploading' | 'ready' | 'cleanupRequired' | 'unknown'

/** Caller's own unfinished reservation as listed by the server; still counts towards quota until removed. */
export interface PendingUpload {
  id: string
  filename: string
  bytes: number
  status: OriginalState
}

export interface Usage {
  bytes: number | null
  photos: number | null
  maxBytes: number | null
  maxPhotos: number | null
  maxFileBytes: number | null
}

export interface AlbumMembership {
  album: Album
  member: Member
}

export interface AlbumDetail {
  album: Album
  members: Member[]
  photos: Photo[]
  pendingUploads: PendingUpload[]
  usage: Usage
  /** The caller's own membership as reported by the server; null when the server did not identify it. */
  self: { memberId: string; role: MemberRole } | null
}

export interface HealthInfo {
  ready: boolean
  uploadsEnabled: boolean
  limits: Usage
}

export interface InviteInfo {
  albumId: string
  title: string
  memberCount: number | null
  limits: Usage
}

export interface SelfMembership {
  memberId: string
  role: MemberRole
}

/**
 * The caller's own folder, preferring what the server states in the detail payload and falling back to the
 * membership returned by list/create/join in this page session. Null means the UI must not assume a folder.
 */
export function resolveSelf(detail: AlbumDetail, membership: AlbumMembership | undefined): SelfMembership | null {
  const memberId = detail.self?.memberId ?? detail.album.myMemberId ?? membership?.member.id ?? null
  if (!memberId) return null
  const listed = detail.members.find((member) => member.id === memberId)
  const role: MemberRole = detail.self?.role
    ?? (detail.album.isCreator === true ? 'creator' : null)
    ?? (detail.album.creatorMemberId && detail.album.creatorMemberId === memberId ? 'creator' : null)
    ?? listed?.role
    ?? membership?.member.role
    ?? 'member'
  return { memberId, role }
}

export interface CreateAlbumResult extends AlbumMembership {
  /** Plaintext invite token, returned exactly once; never stored by the client. */
  invite: string
}

export type UploadState = 'pending' | 'uploading' | 'ready' | 'failed' | 'expired' | 'unknown'

export interface UploadTicket {
  id: string
  status: UploadState
  photo: Photo | null
}

export interface UploadRequest {
  filename: string
  bytes: number
  sha256: string
  contentType: string
  idempotencyKey: string
}

export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'too-large'
  | 'unsupported'
  | 'rate-limited'
  | 'storage-full'
  | 'album-full'
  | 'unavailable'
  | 'server'
  | 'bad-response'
  | 'session-lost'
  | 'anonymous-disabled'
  | 'captcha'
  | 'secure-context'
  | 'aborted'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  /** Machine-readable label from `{ error: { code } }` when the server sent one; never shown raw. */
  readonly code: string | null

  constructor(kind: ApiErrorKind, status = 0, code: string | null = null) {
    super(`api:${kind}`)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AuthError) {
    if (error.kind === 'anonymous-disabled') return new ApiError('anonymous-disabled', error.status)
    if (error.kind === 'captcha') return new ApiError('captcha', error.status)
    if (error.kind === 'session-lost') return new ApiError('session-lost', error.status)
    if (error.kind === 'rate-limited') return new ApiError('rate-limited', error.status)
    if (error.kind === 'network') return new ApiError('network')
    if (error.kind === 'bad-response') return new ApiError('bad-response')
    return new ApiError('server', error.status)
  }
  if (error instanceof DOMException && error.name === 'AbortError') return new ApiError('aborted')
  return new ApiError('network')
}

function kindForStatus(status: number, code: string | null = null): ApiErrorKind {
  if (code) {
    const label = code.toLowerCase()
    if (label === 'albumfull' || label === 'albumphotolimit' || label === 'albumbyteslimit') return 'album-full'
    if (label === 'storagefull' || label === 'projectfull' || label === 'downloadlimit' || label === 'bandwidthlimit') return 'storage-full'
    if (label === 'filetoolarge' || label === 'payloadtoolarge') return 'too-large'
    if (label === 'ratelimit' || label === 'ratelimited') return 'rate-limited'
    if (label === 'uploadsdisabled' || label === 'notready') return 'unavailable'
    if (label === 'unsupportedmediatype' || label === 'unsupportedtype' || label === 'invalidimage' || label === 'checksummismatch') return 'unsupported'
    if (label === 'invalidinvite' || label === 'invitenotfound' || label === 'inviterotated' || label === 'inviteexpired' || label === 'inviterevoked') return 'not-found'
    if (label === 'alreadymember' || label === 'conflict') return 'conflict'
    if (label === 'memberremoved' || label === 'notmember' || label === 'forbidden') return 'forbidden'
  }
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404 || status === 410) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 413) return 'too-large'
  if (status === 415) return 'unsupported'
  if (status === 429) return 'rate-limited'
  if (status === 507 || status === 402) return 'storage-full'
  if (status === 405 || status === 501 || status === 503) return 'unavailable'
  return 'server'
}

function errorCode(payload: unknown): string | null {
  const record = rec(payload)
  const error = record ? rec(record.error) : null
  const code = error ? error.code : record ? record.code : null
  return typeof code === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : null
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

type Rec = Record<string, unknown>

function rec(value: unknown): Rec | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function pick(record: Rec, ...keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key]
  return undefined
}

function roleOf(value: unknown): MemberRole {
  return value === 'creator' || value === 'owner' || value === 'admin' ? 'creator' : 'member'
}

function parseAlbum(raw: unknown): Album | null {
  const record = rec(raw)
  if (!record) return null
  const id = str(pick(record, 'id', 'albumId', 'album_id'))
  if (!isUuid(id)) return null
  const state = str(pick(record, 'state'))
  const myMemberId = str(pick(record, 'myMemberId', 'my_member_id'))
  const isCreator = pick(record, 'isCreator', 'is_creator')
  return {
    id,
    title: str(pick(record, 'title', 'name')) ?? '',
    createdAt: str(pick(record, 'createdAt', 'created_at')),
    creatorMemberId: str(pick(record, 'creatorMemberId', 'creator_member_id', 'ownerMemberId')),
    myMemberId: isUuid(myMemberId) ? myMemberId : null,
    isCreator: typeof isCreator === 'boolean' ? isCreator : null,
    state: state === 'active' || state === 'deleting' ? state : null,
    memberCount: num(pick(record, 'memberCount', 'member_count')),
    photoCount: num(pick(record, 'photoCount', 'photo_count', 'count')),
    bytes: num(pick(record, 'bytes', 'totalBytes', 'total_bytes')),
    reservedBytes: num(pick(record, 'reservedBytes', 'reserved_bytes')),
  }
}

function parseMember(raw: unknown): Member | null {
  const record = rec(raw)
  if (!record) return null
  const id = str(pick(record, 'id', 'memberId', 'member_id'))
  if (!isUuid(id)) return null
  return {
    id,
    displayName: str(pick(record, 'displayName', 'display_name', 'name')) ?? '',
    role: roleOf(pick(record, 'role')),
    removed: pick(record, 'removed') === true,
    count: num(pick(record, 'photoCount', 'photo_count', 'count', 'photos')) ?? 0,
    bytes: num(pick(record, 'bytes', 'totalBytes', 'total_bytes')) ?? 0,
    joinedAt: str(pick(record, 'joinedAt', 'joined_at', 'createdAt', 'created_at')),
  }
}

function originalState(value: unknown): OriginalState {
  return value === 'reserved' || value === 'uploading' || value === 'ready' || value === 'cleanupRequired' ? value : 'unknown'
}

function parsePhoto(raw: unknown): Photo | null {
  const record = rec(raw)
  if (!record) return null
  const id = str(pick(record, 'id', 'photoId', 'photo_id'))
  const memberId = str(pick(record, 'memberId', 'member_id'))
  if (!isUuid(id) || !isUuid(memberId)) return null
  const preview = pick(record, 'preview')
  return {
    id,
    memberId,
    filename: str(pick(record, 'filename', 'fileName', 'name')) ?? '',
    bytes: num(pick(record, 'bytes', 'size')) ?? 0,
    contentType: str(pick(record, 'contentType', 'content_type', 'mimeType', 'mime_type')) ?? 'application/octet-stream',
    sha256: str(pick(record, 'sha256')),
    createdAt: str(pick(record, 'createdAt', 'created_at', 'uploadedAt', 'uploaded_at')),
    hasPreview: pick(record, 'hasPreview', 'has_preview') === true || rec(preview) !== null,
  }
}

function parsePending(raw: unknown): PendingUpload | null {
  const record = rec(raw)
  if (!record) return null
  const id = str(pick(record, 'id', 'uploadId', 'upload_id'))
  if (!isUuid(id)) return null
  return {
    id,
    filename: str(pick(record, 'filename', 'fileName')) ?? '',
    bytes: num(pick(record, 'bytes', 'size')) ?? 0,
    status: originalState(pick(record, 'status')),
  }
}

function parseUsage(raw: unknown): Usage {
  const record = rec(raw) ?? {}
  return {
    bytes: num(pick(record, 'bytes', 'usedBytes', 'used_bytes', 'reservedBytes')),
    photos: num(pick(record, 'photos', 'count', 'photoCount', 'photo_count')),
    maxBytes: num(pick(record, 'maxBytes', 'max_bytes', 'albumMaxBytes', 'maxAlbumBytes', 'albumBytes', 'album_bytes', 'limitBytes')),
    maxPhotos: num(pick(record, 'maxPhotos', 'max_photos', 'albumPhotos', 'album_photos', 'maxAlbumPhotos', 'photoCap', 'limitPhotos')),
    maxFileBytes: num(pick(record, 'maxFileBytes', 'max_file_bytes', 'maxOriginalBytes', 'originalBytes', 'original_bytes', 'fileMaxBytes')),
  }
}

function parseTicket(raw: unknown): UploadTicket | null {
  const record = rec(raw)
  if (!record) return null
  const upload = rec(pick(record, 'upload')) ?? record
  const id = str(pick(upload, 'id', 'uploadId', 'upload_id'))
  if (!id) return null
  const statusRaw = str(pick(upload, 'status')) ?? str(pick(record, 'status')) ?? 'pending'
  const status: UploadState = statusRaw === 'ready' || statusRaw === 'uploading' || statusRaw === 'pending' ? statusRaw
    : statusRaw === 'reserved' ? 'pending'
      : statusRaw === 'failed' || statusRaw === 'cleanupRequired' ? 'failed'
        : statusRaw === 'expired' ? 'expired' : 'unknown'
  // The reservation record is the photo record: once ready, the same object describes the stored original.
  const photo = parsePhoto(pick(record, 'photo') ?? pick(upload, 'photo')) ?? (status === 'ready' ? parsePhoto(upload) : null)
  return { id, status, photo }
}

function parseMembership(raw: unknown): AlbumMembership | null {
  const record = rec(raw)
  if (!record) return null
  const album = parseAlbum(pick(record, 'album') ?? record)
  let member = parseMember(pick(record, 'member') ?? pick(record, 'self') ?? pick(record, 'me'))
  if (!member && album) {
    // Flattened album rows carry the caller's member id and creator flag directly.
    const memberId = album.myMemberId ?? str(pick(record, 'memberId', 'member_id'))
    if (isUuid(memberId)) {
      member = {
        id: memberId,
        displayName: str(pick(record, 'displayName', 'display_name')) ?? '',
        role: album.isCreator === true || (album.creatorMemberId !== null && album.creatorMemberId === memberId) ? 'creator' : roleOf(pick(record, 'role')),
        removed: false,
        count: 0,
        bytes: 0,
        joinedAt: str(pick(record, 'joinedAt', 'joined_at')),
      }
    }
  }
  if (!album || !member) return null
  return { album, member }
}

function parseDetail(raw: unknown): AlbumDetail | null {
  const record = rec(raw)
  if (!record) return null
  const album = parseAlbum(pick(record, 'album') ?? record)
  if (!album) return null
  const membersRaw = pick(record, 'members')
  const photosRaw = pick(record, 'readyPhotos', 'photos')
  const pendingRaw = pick(record, 'pendingUploads', 'pending_uploads')
  const members = (Array.isArray(membersRaw) ? membersRaw.map(parseMember).filter((member): member is Member => member !== null) : [])
    .map((member) => (album.creatorMemberId && member.id === album.creatorMemberId ? { ...member, role: 'creator' as const } : member))
  const photos = Array.isArray(photosRaw)
    ? photosRaw
      .filter((entry) => {
        const status = rec(entry)?.status
        return status === undefined || status === 'ready'
      })
      .map(parsePhoto)
      .filter((photo): photo is Photo => photo !== null)
    : []
  const pendingUploads = Array.isArray(pendingRaw)
    ? pendingRaw.map(parsePending).filter((entry): entry is PendingUpload => entry !== null && entry.status !== 'ready')
    : []
  const selfRecord = rec(pick(record, 'self', 'me', 'member', 'viewer'))
  const selfId = selfRecord ? str(pick(selfRecord, 'memberId', 'member_id', 'id')) : album.myMemberId
  let self: AlbumDetail['self'] = null
  if (isUuid(selfId)) {
    const listed = members.find((member) => member.id === selfId)
    const role: MemberRole = selfRecord && selfRecord.role !== undefined ? roleOf(selfRecord.role)
      : album.isCreator === true || (album.creatorMemberId !== null && album.creatorMemberId === selfId) ? 'creator'
        : listed?.role ?? 'member'
    self = { memberId: selfId, role }
  }
  return { album, members, photos, pendingUploads, usage: parseUsage(pick(record, 'usage', 'quota', 'limits')), self }
}

function parseInvite(raw: unknown): InviteInfo | null {
  const record = rec(raw)
  if (!record) return null
  const album = rec(pick(record, 'album'))
  const albumId = str(pick(record, 'albumId', 'album_id')) ?? (album ? str(pick(album, 'id')) : null)
  if (!isUuid(albumId)) return null
  return {
    albumId,
    title: str(pick(record, 'title')) ?? (album ? str(pick(album, 'title', 'name')) : null) ?? '',
    memberCount: num(pick(record, 'memberCount', 'member_count')) ?? (album ? num(pick(album, 'memberCount', 'member_count')) : null),
    limits: parseUsage(pick(record, 'limits', 'usage')),
  }
}

export interface ProgressHandler {
  (loaded: number, total: number): void
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** `member` sends the device session token; `public` sends only the anon key as bearer. */
  auth?: 'member' | 'public'
  signal?: AbortSignal
}

export class PhotoApi {
  private readonly backend: ResolvedBackend
  private readonly auth: PhotoAuth

  constructor(backend: ResolvedBackend, auth: PhotoAuth) {
    this.backend = backend
    this.auth = auth
  }

  private async headers(mode: 'member' | 'public'): Promise<Record<string, string>> {
    if (mode === 'public') return { apikey: this.backend.anonKey, Accept: 'application/json' }
    const token = await this.auth.accessToken()
    return { apikey: this.backend.anonKey, Authorization: `Bearer ${token}`, Accept: 'application/json' }
  }

  private async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const headers = await this.headers(options.auth ?? 'member')
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      mode: 'cors',
      signal: options.signal,
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(options.body)
    }
    let response: Response
    try {
      response = await fetch(`${this.backend.apiBase}${path}`, init)
    } catch (error) {
      throw toApiError(error)
    }
    if (response.status === 204) return null
    let payload: unknown = null
    const text = await response.text().catch(() => '')
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = null
      }
    }
    if (!response.ok) {
      const code = errorCode(payload)
      const kind = kindForStatus(response.status, code)
      if (kind === 'unauthorized' && (options.auth ?? 'member') === 'member') this.auth.invalidate()
      throw new ApiError(kind, response.status, code)
    }
    return payload
  }

  private async blobRequest(path: string, onProgress?: ProgressHandler, signal?: AbortSignal): Promise<Blob> {
    const headers = await this.headers('member')
    return new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${this.backend.apiBase}${path}`)
      xhr.responseType = 'blob'
      for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
      xhr.onprogress = (event) => {
        if (onProgress) onProgress(event.loaded, event.lengthComputable ? event.total : 0)
      }
      xhr.onerror = () => reject(new ApiError('network'))
      xhr.onabort = () => reject(new ApiError('aborted'))
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof Blob) resolve(xhr.response)
        else {
          const kind = kindForStatus(xhr.status)
          if (kind === 'unauthorized') this.auth.invalidate()
          reject(new ApiError(kind, xhr.status))
        }
      }
      if (signal) {
        if (signal.aborted) {
          reject(new ApiError('aborted'))
          return
        }
        signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
      xhr.send()
    })
  }

  /** Public readiness flags; `uploadsEnabled` gates every file input on the client as well as on the server. */
  async health(signal?: AbortSignal): Promise<HealthInfo> {
    const payload = await this.request('/health', { auth: 'public', signal })
    const record = rec(payload)
    if (!record) throw new ApiError('bad-response')
    return {
      ready: pick(record, 'ready') === true,
      uploadsEnabled: pick(record, 'uploadsEnabled', 'uploads_enabled') === true,
      limits: parseUsage(pick(record, 'limits')),
    }
  }

  inspectInvite(invite: string, signal?: AbortSignal): Promise<InviteInfo> {
    return this.request('/invites/inspect', { method: 'POST', body: { invite }, auth: 'public', signal }).then((payload) => {
      const info = parseInvite(payload)
      if (!info) throw new ApiError('bad-response')
      return info
    })
  }

  async listAlbums(signal?: AbortSignal): Promise<AlbumMembership[]> {
    const payload = await this.request('/albums', { signal })
    const record = rec(payload)
    const list = Array.isArray(payload) ? payload : record ? pick(record, 'albums', 'memberships', 'items') : null
    if (!Array.isArray(list)) throw new ApiError('bad-response')
    return list.map(parseMembership).filter((entry): entry is AlbumMembership => entry !== null)
  }

  async createAlbum(input: { title: string; displayName: string }): Promise<CreateAlbumResult> {
    const payload = await this.request('/albums', { method: 'POST', body: input })
    const membership = parseMembership(payload)
    const record = rec(payload)
    const invite = record ? str(pick(record, 'invite', 'inviteToken', 'invite_token')) : null
    if (!membership || !invite) throw new ApiError('bad-response')
    return { ...membership, invite }
  }

  async joinAlbum(input: { invite: string; displayName: string }): Promise<AlbumMembership> {
    const payload = await this.request('/albums/join', { method: 'POST', body: input })
    const membership = parseMembership(payload)
    if (!membership) throw new ApiError('bad-response')
    return membership
  }

  async getAlbum(albumId: string, signal?: AbortSignal): Promise<AlbumDetail> {
    const payload = await this.request(`/albums/${encodeURIComponent(albumId)}`, { signal })
    const detail = parseDetail(payload)
    if (!detail) throw new ApiError('bad-response')
    return detail
  }

  async deleteAlbum(albumId: string): Promise<void> {
    await this.request(`/albums/${encodeURIComponent(albumId)}`, { method: 'DELETE' })
  }

  async rotateInvite(albumId: string): Promise<string> {
    const payload = await this.request(`/albums/${encodeURIComponent(albumId)}/invite/rotate`, { method: 'POST', body: {} })
    const record = rec(payload)
    const invite = record ? str(pick(record, 'invite', 'inviteToken', 'invite_token')) : null
    if (!invite) throw new ApiError('bad-response')
    return invite
  }

  async createUpload(albumId: string, input: UploadRequest): Promise<UploadTicket> {
    const payload = await this.request(`/albums/${encodeURIComponent(albumId)}/uploads`, { method: 'POST', body: input })
    const ticket = parseTicket(payload)
    if (!ticket) throw new ApiError('bad-response')
    return ticket
  }

  async getUpload(uploadId: string, signal?: AbortSignal): Promise<UploadTicket> {
    const payload = await this.request(`/uploads/${encodeURIComponent(uploadId)}`, { signal })
    const ticket = parseTicket(payload)
    if (!ticket) throw new ApiError('bad-response')
    return ticket
  }

  /** Streams the untouched file bytes; resolves only once the server reports the photo ready. */
  async putUpload(uploadId: string, file: Blob, contentType: string, onProgress?: ProgressHandler, signal?: AbortSignal): Promise<UploadTicket> {
    const headers = await this.headers('member')
    return new Promise<UploadTicket>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', `${this.backend.apiBase}/uploads/${encodeURIComponent(uploadId)}`)
      xhr.responseType = 'text'
      for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.upload.onprogress = (event) => {
        if (onProgress) onProgress(event.loaded, event.lengthComputable ? event.total : file.size)
      }
      xhr.onerror = () => reject(new ApiError('network'))
      xhr.onabort = () => reject(new ApiError('aborted'))
      xhr.ontimeout = () => reject(new ApiError('network'))
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let payload: unknown = null
          try {
            payload = xhr.responseText ? JSON.parse(xhr.responseText) : null
          } catch {
            payload = null
          }
          const ticket = parseTicket(payload) ?? { id: uploadId, status: 'unknown' as const, photo: null }
          resolve(ticket)
        } else {
          const kind = kindForStatus(xhr.status)
          if (kind === 'unauthorized') this.auth.invalidate()
          reject(new ApiError(kind, xhr.status))
        }
      }
      if (signal) {
        if (signal.aborted) {
          reject(new ApiError('aborted'))
          return
        }
        signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
      xhr.send(file)
    })
  }

  /** Optional derived JPEG (<= 200 KB) for grids; the original is never replaced. */
  async putPreview(uploadId: string, preview: Blob, sha256: string, signal?: AbortSignal): Promise<Photo | null> {
    const headers = await this.headers('member')
    let response: Response
    try {
      response = await fetch(`${this.backend.apiBase}/uploads/${encodeURIComponent(uploadId)}/preview`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': preview.type || 'image/jpeg', 'X-Content-SHA256': sha256 },
        body: preview,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        mode: 'cors',
        signal,
      })
    } catch (error) {
      throw toApiError(error)
    }
    const text = await response.text().catch(() => '')
    let payload: unknown = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    if (!response.ok) {
      const code = errorCode(payload)
      throw new ApiError(kindForStatus(response.status, code), response.status, code)
    }
    const record = rec(payload)
    return record ? parsePhoto(pick(record, 'photo') ?? pick(record, 'upload') ?? record) : null
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.request(`/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' })
  }

  fetchPreview(photoId: string, signal?: AbortSignal): Promise<Blob> {
    return this.blobRequest(`/photos/${encodeURIComponent(photoId)}/preview`, undefined, signal)
  }

  fetchOriginal(photoId: string, onProgress?: ProgressHandler, signal?: AbortSignal): Promise<Blob> {
    return this.blobRequest(`/photos/${encodeURIComponent(photoId)}/original`, onProgress, signal)
  }
}
