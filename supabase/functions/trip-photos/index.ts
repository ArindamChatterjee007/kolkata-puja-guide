import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { fileTypeFromBuffer } from 'npm:file-type@22.2.0'
import { imageSize } from 'npm:image-size@2.0.4'

const allowedOrigin = 'https://arindamchatterjee007.github.io'
const bucket = 'trip-photos'
const maximumOriginalBytes = 40_000_000
const maximumPreviewBytes = 200_000
const fallbackLimits = {
  fileBytes: maximumOriginalBytes, previewBytes: maximumPreviewBytes,
  projectBytes: 900_000_000, albumBytes: 500_000_000, photosPerAlbum: 50,
  albumsPerProject: 20, membersPerAlbum: 250, monthlyDownloadBudget: 4_000_000_000,
  downloadChargeMultiplier: 2, previewMaxDimension: 1600, simultaneousBinaryUploads: 1,
  maxBytes: 500_000_000, maxPhotos: 50, maxFileBytes: maximumOriginalBytes,
}
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])
const allowedHeaders = ['authorization', 'apikey', 'content-type', 'x-client-info', 'x-client-request-id', 'x-content-sha256']
const encoder = new TextEncoder()
const projectUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const admin = projectUrl && serviceKey ? createClient(projectUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
}) : null

type Payload = Record<string, unknown>
type Upload = {
  id: string
  albumId: string
  memberId: string
  filename: string
  bytes: number
  sha256: string
  contentType: string
  status: 'reserved' | 'uploading' | 'ready' | 'cleanupRequired'
  needsCleanup: boolean
  preview: { bytes: number; contentType: string } | null
}
type UploadResult = { upload: Upload }
type ClaimResult = UploadResult & { claim?: string; complete: boolean }

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly retryAfter?: number) {
    super(code)
  }
}

function backend() {
  if (!admin) throw new ApiError(503, 'BackendNotReady')
  return admin
}

async function rpc<Result>(action: string, actor: string | null = null, payload: Payload = {}): Promise<Result> {
  const { data, error } = await backend().rpc('trip_photos', {
    p_action: action, p_actor: actor, p_payload: payload,
  })
  if (error) {
    const match = /^PT([45]\d{2})$/.exec(error.code)
    if (match && /^[A-Za-z]{1,64}$/.test(error.message)) throw new ApiError(Number(match[1]), error.message)
    throw new ApiError(503, 'BackendUnavailable')
  }
  return data as Result
}

async function rate(subject: string, scope: string) {
  const { data, error } = await backend().rpc('trip_photos_rate', { p_subject: subject, p_scope: scope })
  if (error || !data) throw new ApiError(503, 'BackendUnavailable')
  if (!data.allowed) throw new ApiError(429, 'RateLimit', Number(data.retryAfter))
}

async function authenticatedUser(request: Request): Promise<string> {
  const authorization = request.headers.get('authorization')
  if (!authorization || !/^Bearer [^\s]+$/i.test(authorization) || authorization.length > 8192) {
    throw new ApiError(401, 'AuthenticationRequired')
  }
  const { data, error } = await backend().auth.getUser(authorization.slice(7))
  if (error || !data.user) throw new ApiError(401, 'AuthenticationRequired')
  return data.user.id
}

async function readBounded(request: Request, maximum: number, exact?: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get('content-length')
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
    throw new ApiError(413, 'BodyTooLarge')
  }
  if (!request.body) throw new ApiError(400, 'EmptyBody')
  const buffer = new Uint8Array(maximum)
  const reader = request.body.getReader()
  let offset = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (offset + value.byteLength > maximum) {
        await reader.cancel()
        throw new ApiError(413, 'BodyTooLarge')
      }
      buffer.set(value, offset)
      offset += value.byteLength
    }
  } finally {
    reader.releaseLock()
  }
  if (!offset || (exact !== undefined && offset !== exact)) throw new ApiError(422, 'ByteCountMismatch')
  return buffer.subarray(0, offset)
}

async function jsonBody(request: Request): Promise<Payload> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new ApiError(415, 'JsonRequired')
  }
  const bytes = await readBounded(request, 12_000)
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value as Payload
  } catch {
    throw new ApiError(400, 'InvalidJson')
  }
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.isWellFormed()) throw new ApiError(400, 'InvalidText')
  return value
}

function label(value: unknown, maximum: number): string {
  const normalized = text(value).normalize('NFC')
    .replace(/[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu, '')
    .replace(/\s+/gu, ' ').trim()
  if (!normalized || Array.from(normalized).length > maximum) throw new ApiError(400, 'InvalidName')
  return normalized
}

function filename(value: unknown): string {
  const original = text(value)
  if (!original.trim() || ['.', '..'].includes(original) || encoder.encode(original).byteLength > 255 ||
    /[\/\\\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(original)) {
    throw new ApiError(400, 'InvalidFilename')
  }
  return original
}

function sha256Text(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw new ApiError(400, 'InvalidChecksum')
  return value.toLowerCase()
}

async function digest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const checksum = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(checksum, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function inviteHash(value: unknown): Promise<string> {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw new ApiError(400, 'InvalidInvite')
  return digest(encoder.encode(value.toLowerCase()))
}

async function newInvite(): Promise<{ invite: string; inviteHash: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32))
  const invite = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')
  return { invite, inviteHash: await inviteHash(invite) }
}

function id(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, 'InvalidId')
  }
  return value.toLowerCase()
}

async function sniff(bytes: Uint8Array<ArrayBuffer>, preview: boolean): Promise<string> {
  try {
    const result = await fileTypeFromBuffer(bytes.subarray(0, Math.min(bytes.byteLength, 65_536)))
    if (!result || !acceptedTypes.has(result.mime) || (preview && !['image/jpeg', 'image/png'].includes(result.mime))) {
      throw new ApiError(415, 'UnsupportedImage')
    }
    if (preview) {
      const dimensions = imageSize(bytes)
      if (!dimensions.width || !dimensions.height || dimensions.width > 1600 || dimensions.height > 1600) {
        throw new ApiError(413, 'PreviewDimensionsExceeded')
      }
    }
    return result.mime
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(415, 'UnsupportedImage')
  }
}

async function upload(request: Request, actor: string, photoId: string, preview: boolean): Promise<UploadResult> {
  await rate(actor, 'binary')
  const requestedSha = preview ? sha256Text(request.headers.get('x-content-sha256')) : undefined
  const kind = preview ? 'preview' : 'original'
  const started = await rpc<ClaimResult>(`begin_${kind}`, actor, { photoId, sha256: requestedSha })
  if (started.complete) return { upload: started.upload }
  if (!started.claim) throw new ApiError(503, 'BackendUnavailable')
  let staged = false
  try {
    const expectedBytes = preview ? undefined : started.upload.bytes
    const bytes = await readBounded(request, expectedBytes ?? maximumPreviewBytes, expectedBytes)
    const computedSha = await digest(bytes)
    if (computedSha !== (requestedSha ?? started.upload.sha256)) throw new ApiError(422, 'ChecksumMismatch')
    const contentType = await sniff(bytes, preview)
    const prepared = await rpc<{ path: string }>(`stage_${kind}`, actor, {
      photoId, claim: started.claim, bytes: bytes.byteLength, sha256: computedSha, contentType,
    })
    staged = true
    const { error } = await backend().storage.from(bucket).upload(prepared.path, bytes, {
      contentType, cacheControl: '0', upsert: false, metadata: { sha256: computedSha },
    })
    if (error) throw new ApiError(503, 'UploadOutcomeUnknown')
    return await rpc<UploadResult>(`finish_${kind}`, actor, { photoId, claim: started.claim })
  } catch (error) {
    await rpc(staged ? 'mark_uncertain' : 'abort_unwritten', actor, { photoId, claim: started.claim }).catch(() => undefined)
    if (error instanceof ApiError) throw error
    throw new ApiError(503, 'UploadOutcomeUnknown')
  }
}

function disposition(original: string): string {
  const ascii = original.replace(/[^\x20-\x7e]|["\\%]/g, '_').slice(0, 180) || 'photo'
  const encoded = encodeURIComponent(original).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

async function download(actor: string, photoId: string, preview: boolean, headers: Headers): Promise<Response> {
  const permitted = await rpc<{ path: string; bytes: number; contentType: string; filename: string }>('download', actor, {
    photoId, kind: preview ? 'preview' : 'original',
  })
  const encodedPath = permitted.path.split('/').map(encodeURIComponent).join('/')
  const stored = await fetch(`${projectUrl}/storage/v1/object/authenticated/${bucket}/${encodedPath}`, {
    headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    signal: AbortSignal.timeout(120_000),
    redirect: 'error',
  })
  if (!stored.ok || !stored.body || Number(stored.headers.get('content-length')) !== permitted.bytes) {
    await stored.body?.cancel()
    throw new ApiError(503, 'DownloadUnavailable')
  }
  headers.set('Content-Type', preview ? permitted.contentType : 'application/octet-stream')
  headers.set('Content-Length', String(permitted.bytes))
  if (!preview) headers.set('Content-Disposition', disposition(permitted.filename))
  return new Response(stored.body, { status: 200, headers })
}

async function removeObjects(paths: string[]): Promise<number> {
  let count = 0
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { data, error } = await backend().storage.from(bucket).remove(paths.slice(offset, offset + 100))
    if (error) throw new ApiError(503, 'CleanupRequired')
    count += data?.length ?? 0
  }
  return count
}

async function handle(request: Request, headers: Headers): Promise<Response> {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const start = segments.indexOf('trip-photos')
  const route = start < 0 ? [] : segments.slice(start + 1)
  if (start < 0 || url.search) throw new ApiError(400, 'InvalidRoute')
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
  if (request.method === 'GET' && route.join('/') === 'health') {
    try {
      return response(await rpc('health'))
    } catch {
      return response({ ready: false, uploadsEnabled: false,
        configuration: { state: 'provisioning-required' }, limits: fallbackLimits }, 503)
    }
  }
  if (request.method === 'POST' && route.join('/') === 'invites/inspect') {
    await rate('public', 'inspect')
    const body = await jsonBody(request)
    return response(await rpc('inspect', null, { inviteHash: await inviteHash(body.invite) }))
  }

  const actor = await authenticatedUser(request)
  await rate(actor, 'request')

  if (route.join('/') === 'albums') {
    if (request.method === 'GET') return response(await rpc('list_albums', actor))
    if (request.method === 'POST') {
      await rate(actor, 'create')
      const body = await jsonBody(request)
      const capability = await newInvite()
      const created = await rpc<Payload>('create_album', actor, {
        title: label(body.title, 80), displayName: label(body.displayName, 40), inviteHash: capability.inviteHash,
      })
      return response({ ...created, invite: capability.invite }, 201)
    }
  }
  if (route.join('/') === 'albums/join' && request.method === 'POST') {
    await rate(actor, 'join')
    const body = await jsonBody(request)
    return response(await rpc('join_album', actor, {
      displayName: label(body.displayName, 40), inviteHash: await inviteHash(body.invite),
    }))
  }
  if (route[0] === 'albums' && route[1]) {
    const albumId = id(route[1])
    if (route.length === 2 && request.method === 'GET') return response(await rpc('get_album', actor, { albumId }))
    if (route.length === 2 && request.method === 'DELETE') {
      const prepared = await rpc<{ paths: string[] }>('close_album', actor, { albumId })
      const objectsDeleted = await removeObjects(prepared.paths)
      await rpc('finish_album_delete', actor, { albumId })
      return response({ deleted: true, objectsDeleted })
    }
    if (route.length === 3 && route[2] === 'uploads' && request.method === 'POST') {
      await rate(actor, 'reserve')
      const body = await jsonBody(request)
      const bytes = body.bytes
      if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes <= 0) throw new ApiError(400, 'InvalidByteCount')
      if (bytes > maximumOriginalBytes) throw new ApiError(413, 'FileTooLarge')
      const contentType = text(body.contentType)
      if (!acceptedTypes.has(contentType)) throw new ApiError(415, 'UnsupportedImage')
      const idempotencyKey = text(body.idempotencyKey)
      if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw new ApiError(400, 'InvalidIdempotencyKey')
      return response(await rpc('reserve', actor, {
        albumId, filename: filename(body.filename), bytes, sha256: sha256Text(body.sha256), contentType, idempotencyKey,
      }), 201)
    }
    if (route.length === 4 && route[2] === 'invite' && route[3] === 'rotate' && request.method === 'POST') {
      const capability = await newInvite()
      await rpc('rotate_invite', actor, { albumId, inviteHash: capability.inviteHash })
      return response({ invite: capability.invite, existingMembersRetained: true })
    }
    if (route.length === 4 && route[2] === 'members' && request.method === 'DELETE') {
      return response(await rpc('remove_member', actor, { albumId, memberId: id(route[3]) }))
    }
  }
  if (route[0] === 'uploads' && route[1]) {
    const photoId = id(route[1])
    if (route.length === 2 && request.method === 'GET') return response(await rpc('get_upload', actor, { photoId }))
    if (route.length === 2 && request.method === 'PUT') return response(await upload(request, actor, photoId, false))
    if (route.length === 3 && route[2] === 'preview' && request.method === 'POST') {
      return response(await upload(request, actor, photoId, true))
    }
  }
  if (route[0] === 'photos' && route[1]) {
    const photoId = id(route[1])
    if (route.length === 3 && ['original', 'preview'].includes(route[2]) && request.method === 'GET') {
      return download(actor, photoId, route[2] === 'preview', headers)
    }
    if (route.length === 2 && request.method === 'DELETE') {
      const prepared = await rpc<{ paths: string[]; claim: string }>('prepare_delete', actor, { photoId })
      const objectsDeleted = await removeObjects(prepared.paths)
      await rpc('finish_delete', actor, { photoId, claim: prepared.claim })
      return response({ deleted: true, objectsDeleted })
    }
  }
  throw new ApiError(404, 'RouteNotFound')
}

Deno.serve(async (request: Request) => {
  const headers = new Headers({
    'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
  })
  const origin = request.headers.get('origin')
  if (origin && origin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: { code: 'OriginDenied' } }), { status: 403, headers })
  }
  if (origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin)
    headers.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type, Retry-After')
  }
  try {
    if (request.method === 'OPTIONS') {
      const requestedHeaders = request.headers.get('access-control-request-headers')?.toLowerCase().split(',').map(value => value.trim()) ?? []
      if (requestedHeaders.some(value => !allowedHeaders.includes(value))) throw new ApiError(403, 'HeaderDenied')
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
      return new Response(null, { status: 204, headers })
    }
    return await handle(request, headers)
  } catch (error) {
    const failure = error instanceof ApiError ? error : new ApiError(503, 'BackendUnavailable')
    if (failure.retryAfter) headers.set('Retry-After', String(failure.retryAfter))
    headers.delete('Content-Disposition')
    headers.delete('Content-Length')
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ error: { code: failure.code } }), { status: failure.status, headers })
  }
})