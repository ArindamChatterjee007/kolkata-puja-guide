import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const projectRef = 'gadaedripljsjfxwukkq'
const organizationId = 'ldlghpbdtgpkflmuuppl'
const projectUrl = `https://${projectRef}.supabase.co`
const base = `${projectUrl}/functions/v1/trip-photos`
const origin = 'https://arindamchatterjee007.github.io'
const extended = process.argv.includes('--extended')
const runId = randomUUID()
const users = []
const albums = new Map()
const probes = []
const checks = []
let currentCheck = 'setup'

function cli(args) {
  const result = spawnSync('supabase', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000, maxBuffer: 2 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error('ScopedCliOperationFailed')
  return JSON.parse(result.stdout)
}

function sql(query) {
  const result = cli(['db', 'query', '--linked', '--project-ref', projectRef, query, '--output', 'json'])
  return result.rows ?? result
}

function assertCheck(name, condition) {
  currentCheck = name
  if (!condition) throw new Error(name)
  checks.push(name)
  console.log(JSON.stringify({ check: name, pass: true }))
}

const projects = cli(['projects', 'list', '--output', 'json']).filter(project => project.organization_id === organizationId)
assertCheck('dedicated-project-guard', projects.length === 1 && (projects[0].ref ?? projects[0].id) === projectRef &&
  projects[0].name === 'pujapath-photos' && projects[0].region === 'ap-south-1' && projects[0].status === 'ACTIVE_HEALTHY')
const keyRows = cli(['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'])
const publicKey = (keyRows.find(key => key.type === 'publishable') ?? keyRows.find(key => key.name === 'anon'))?.api_key
const serviceKey = keyRows.find(key => key.name === 'service_role')?.api_key
if (!publicKey || !serviceKey) throw new Error('ProjectKeysUnavailable')
const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })

async function api(path, actor, method = 'GET', body, extraHeaders = {}) {
  currentCheck = `${method} ${path.replace(/[0-9a-f-]{36}/g, ':id')}`
  const binary = body instanceof Uint8Array
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin, apikey: publicKey,
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(150_000),
  })
  if (path.endsWith('/original') || (path.endsWith('/preview') && method === 'GET')) {
    return { status: response.status, headers: response.headers, bytes: new Uint8Array(await response.arrayBuffer()) }
  }
  let data
  try { data = await response.json() } catch { data = null }
  return { status: response.status, headers: response.headers, data }
}

function success(result) {
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Http${result.status}:${result.data?.error?.code ?? 'Unknown'}`)
  }
  return result.data
}

async function anonymous() {
  currentCheck = 'synthetic-anonymous-signup'
  const client = createClient(projectUrl, publicKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data, error } = await client.auth.signInAnonymously()
  if (error || !data.user || !data.session) throw new Error('AnonymousSignupBlocked')
  const actor = { id: data.user.id, token: data.session.access_token }
  users.push(actor)
  return actor
}

async function createAlbum(actor, suffix, displayName = 'Same Name') {
  const result = success(await api('/albums', actor, 'POST', {
    title: `Synthetic acceptance ${runId.slice(0, 8)} ${suffix}`, displayName,
    userId: users.find(user => user !== actor)?.id,
  }))
  albums.set(result.album.id, actor)
  return result
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function png(targetBytes, width = 2, height = 2) {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index++) {
    let remainder = index
    for (let bit = 0; bit < 8; bit++) remainder = remainder & 1 ? 0xedb88320 ^ (remainder >>> 1) : remainder >>> 1
    table[index] = remainder >>> 0
  }
  const chunk = (type, data) => {
    const result = Buffer.alloc(data.length + 12)
    result.writeUInt32BE(data.length, 0)
    result.write(type, 4, 4, 'ascii')
    data.copy(result, 8)
    let checksum = 0xffffffff
    for (let index = 4; index < result.length - 4; index++) checksum = table[(checksum ^ result[index]) & 255] ^ (checksum >>> 8)
    result.writeUInt32BE((checksum ^ 0xffffffff) >>> 0, result.length - 4)
    return result
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const imageHeader = chunk('IHDR', header)
  const raster = Buffer.alloc((width * 4 + 1) * height)
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const offset = row * (width * 4 + 1) + 1 + column * 4
      raster[offset] = 230
      raster[offset + 1] = 60
      raster[offset + 2] = 90
      raster[offset + 3] = 255
    }
  }
  const pixels = chunk('IDAT', deflateSync(raster))
  const ending = chunk('IEND', Buffer.alloc(0))
  const minimum = signature.length + imageHeader.length + pixels.length + ending.length
  if (!targetBytes) return Buffer.concat([signature, imageHeader, pixels, ending])
  if (targetBytes < minimum + 12) throw new Error('InvalidSyntheticSize')
  return Buffer.concat([signature, imageHeader, chunk('npAD', Buffer.alloc(targetBytes - minimum - 12)), pixels, ending])
}

async function reserve(actor, albumId, bytes, overrides = {}) {
  return api(`/albums/${albumId}/uploads`, actor, 'POST', {
    filename: 'synthetic.png', bytes: typeof bytes === 'number' ? bytes : bytes.length,
    sha256: typeof bytes === 'number' ? '0'.repeat(64) : sha256(bytes),
    contentType: 'image/png', idempotencyKey: randomUUID(), ...overrides,
  })
}

async function removeAlbum(albumId, actor) {
  success(await api(`/albums/${albumId}`, actor, 'DELETE'))
  albums.delete(albumId)
}

async function storageDenied(path, actor, method = 'GET', body) {
  const response = await fetch(`${projectUrl}/storage/v1/${path}`, {
    method, headers: { apikey: publicKey, ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...(body ? { 'Content-Type': 'image/png' } : {}) }, body, signal: AbortSignal.timeout(30_000),
  })
  await response.body?.cancel()
  return response.status >= 400 && response.status < 500
}

const baseline = sql("select (select count(*) from photo_private.albums) as albums, (select count(*) from storage.objects where bucket_id='trip-photos') as objects, (select count(*) from auth.users) as users, (select uploads_enabled from photo_private.settings) as enabled")[0]
assertCheck('empty-gated-project-before-synthetic-run', baseline.albums === 0 && baseline.objects === 0 && baseline.users === 0 && baseline.enabled === false)

let failure = null
try {
  const preflight = await fetch(`${base}/uploads/${randomUUID()}/preview`, {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-content-sha256' },
    signal: AbortSignal.timeout(30_000),
  })
  assertCheck('preview-cors-preflight', preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === origin &&
    preflight.headers.get('access-control-allow-headers')?.includes('x-content-sha256') && !preflight.headers.has('access-control-allow-credentials'))
  const owner = await anonymous()
  const member = await anonymous()
  const outsider = await anonymous()
  const primary = await createAlbum(owner, 'primary', '  Same\u202e  Name\u0000 ')
  const joined = success(await api('/albums/join', member, 'POST', { invite: primary.invite, displayName: 'Same Name' }))
  const joinedAgain = success(await api('/albums/join', member, 'POST', { invite: primary.invite, displayName: 'Different label' }))
  const other = await createAlbum(outsider, 'other')
  assertCheck('same-name-distinct-members-and-verified-owner', primary.member.displayName === 'Same Name' &&
    joined.member.displayName === 'Same Name' && primary.member.id !== joined.member.id && primary.member.userId === owner.id)
  assertCheck('idempotent-membership', joinedAgain.member.id === joined.member.id && joinedAgain.member.displayName === 'Same Name')
  assertCheck('outsider-album-denied', (await api(`/albums/${primary.album.id}`, outsider)).status === 403)
  const list = success(await api('/albums', outsider))
  assertCheck('list-is-membership-scoped', list.albums.length === 1 && list.albums[0].id === other.album.id)
  assertCheck('public-key-is-not-user-auth', (await api('/albums', { token: publicKey })).status === 401)
  assertCheck('forged-user-jwt-denied', (await api('/albums', { token: 'invalid.invalid.invalid' })).status === 401)
  const direct = await fetch(`${projectUrl}/rest/v1/rpc/trip_photos`, {
    method: 'POST', headers: { apikey: publicKey, Authorization: `Bearer ${member.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_action: 'get_album', p_actor: owner.id, p_payload: { albumId: primary.album.id } }),
    signal: AbortSignal.timeout(30_000),
  })
  await direct.body?.cancel()
  assertCheck('authenticated-direct-rpc-denied', [401, 403, 404].includes(direct.status))
  const table = await fetch(`${projectUrl}/rest/v1/albums?select=id`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${member.token}`, 'Accept-Profile': 'photo_private' },
    signal: AbortSignal.timeout(30_000),
  })
  await table.body?.cancel()
  assertCheck('private-tables-not-exposed', [401, 403, 404, 406].includes(table.status))
  const small = png()
  const probe = `synthetic-denied/${randomUUID()}.png`
  probes.push(probe)
  assertCheck('direct-anon-storage-upload-denied', await storageDenied(`object/trip-photos/${probe}`, null, 'POST', small))
  assertCheck('direct-authenticated-storage-upload-denied', await storageDenied(`object/trip-photos/${probe}`, member, 'POST', small))
  const closed = await reserve(owner, primary.album.id, small)
  assertCheck('private-uploads-disabled-before-auth-gates', closed.status === 503 && closed.data.error.code === 'UploadsDisabled')
  sql('update photo_private.settings set uploads_enabled=true where singleton')
  assertCheck('live-upload-gate-enabled-after-auth-gates', success(await api('/health')).uploadsEnabled === true)

  assertCheck('oversized-reservation-denied', (await reserve(owner, primary.album.id, 40_000_001)).status === 413)
  assertCheck('svg-reservation-denied', (await reserve(owner, primary.album.id, small, { contentType: 'image/svg+xml' })).status === 415)
  const invalid = success(await reserve(owner, primary.album.id, small, { sha256: '0'.repeat(64) })).upload
  assertCheck('checksum-mismatch-rejected', (await api(`/uploads/${invalid.id}`, owner, 'PUT', small)).status === 422)
  assertCheck('failed-checksum-not-a-receipt', success(await api(`/uploads/${invalid.id}`, owner)).upload.status === 'reserved')
  success(await api(`/photos/${invalid.id}`, owner, 'DELETE'))
  const mismatched = success(await reserve(owner, primary.album.id, small)).upload
  assertCheck('oversized-binary-body-rejected', (await api(`/uploads/${mismatched.id}`, owner, 'PUT', Buffer.concat([small, Buffer.from([0])]))).status === 413)
  assertCheck('truncated-binary-body-rejected', (await api(`/uploads/${mismatched.id}`, owner, 'PUT', small.subarray(0, small.length - 1))).status === 422)
  success(await api(`/photos/${mismatched.id}`, owner, 'DELETE'))
  const forbidden = Buffer.from('<html>not an image</html>')
  const forbiddenUpload = success(await reserve(owner, primary.album.id, forbidden)).upload
  assertCheck('html-signature-rejected', (await api(`/uploads/${forbiddenUpload.id}`, owner, 'PUT', forbidden)).status === 415)
  success(await api(`/photos/${forbiddenUpload.id}`, owner, 'DELETE'))
  const originalName = '\u09aa\u09c2\u099c\u09be-original.png'
  const reservationKey = randomUUID()
  const prepared = success(await reserve(owner, primary.album.id, small, {
    filename: originalName, contentType: 'image/jpeg', idempotencyKey: reservationKey,
  })).upload
  const uploaded = success(await api(`/uploads/${prepared.id}`, owner, 'PUT', small)).upload
  assertCheck('original-ready-only-after-storage-receipt', uploaded.status === 'ready' && uploaded.contentType === 'image/png')
  const repeat = success(await reserve(owner, primary.album.id, small, {
    filename: originalName, contentType: 'image/jpeg', idempotencyKey: reservationKey,
  })).upload
  assertCheck('idempotency-survives-canonical-mime', repeat.id === prepared.id)
  assertCheck('live-storage-status-reconciled', success(await api(`/uploads/${prepared.id}`, owner)).upload.status === 'ready')
  const downloaded = await api(`/photos/${prepared.id}/original`, member)
  assertCheck('member-original-byte-fidelity', downloaded.status === 200 && sha256(downloaded.bytes) === sha256(small) && downloaded.bytes.length === small.length)
  const filenameHeader = downloaded.headers.get('content-disposition') ?? ''
  assertCheck('original-utf8-download-filename', filenameHeader.includes(`filename*=UTF-8''${encodeURIComponent(originalName)}`))
  assertCheck('original-private-attachment-headers', filenameHeader.startsWith('attachment;') &&
    downloaded.headers.get('cache-control') === 'private, no-store' && downloaded.headers.get('x-content-type-options') === 'nosniff')
  assertCheck('outsider-original-denied', (await api(`/photos/${prepared.id}/original`, outsider)).status === 403)
  assertCheck('cross-member-delete-denied', (await api(`/photos/${prepared.id}`, member, 'DELETE')).status === 403)
  assertCheck('cross-member-upload-status-denied', (await api(`/uploads/${prepared.id}`, member)).status === 403)
  const storagePath = `${primary.album.id}/${primary.member.id}/${prepared.id}.png`
  assertCheck('actual-original-direct-anon-storage-denied', await storageDenied(`object/authenticated/trip-photos/${storagePath}`))
  assertCheck('actual-original-direct-member-storage-denied', await storageDenied(`object/authenticated/trip-photos/${storagePath}`, member))
  assertCheck('actual-original-public-storage-denied', await storageDenied(`object/public/trip-photos/${storagePath}`))
  const memberPhoto = success(await reserve(member, primary.album.id, small)).upload
  success(await api(`/uploads/${memberPhoto.id}`, member, 'PUT', small))
  const oversizedPreview = png(200_001)
  assertCheck('preview-byte-cap-enforced', (await api(`/uploads/${memberPhoto.id}/preview`, member, 'POST', oversizedPreview,
    { 'X-Content-SHA256': sha256(oversizedPreview) })).status === 413)
  const widePreview = png(undefined, 1601, 1)
  assertCheck('preview-dimension-cap-enforced', (await api(`/uploads/${memberPhoto.id}/preview`, member, 'POST', widePreview,
    { 'X-Content-SHA256': sha256(widePreview) })).status === 413)
  assertCheck('invalid-preview-preserves-original', success(await api(`/uploads/${memberPhoto.id}`, member)).upload.status === 'ready')
  const objects = sql(`select name from storage.objects where bucket_id='trip-photos' and starts_with(name, '${primary.album.id}/')`)
  assertCheck('stored-object-folders-use-distinct-member-uuids', objects.some(object => object.name.startsWith(`${primary.album.id}/${primary.member.id}/`)) &&
    objects.some(object => object.name.startsWith(`${primary.album.id}/${joined.member.id}/`)))
  success(await api(`/uploads/${prepared.id}/preview`, owner, 'POST', small, { 'X-Content-SHA256': sha256(small) }))
  const preview = await api(`/photos/${prepared.id}/preview`, member)
  assertCheck('separate-preview-byte-fidelity', preview.status === 200 && sha256(preview.bytes) === sha256(small))
  const afterPreview = await api(`/photos/${prepared.id}/original`, member)
  assertCheck('preview-does-not-alter-original', afterPreview.status === 200 && sha256(afterPreview.bytes) === sha256(small))
  if (extended) {
    const large = png(32_000_000)
    const largePhoto = success(await reserve(owner, primary.album.id, large)).upload
    const receipt = success(await api(`/uploads/${largePhoto.id}`, owner, 'PUT', large))
    assertCheck('synthetic-32mb-upload-receipt', receipt.upload.status === 'ready' && receipt.upload.bytes === 32_000_000)
    const largeDownload = await api(`/photos/${largePhoto.id}/original`, member)
    assertCheck('synthetic-32mb-download-byte-fidelity', largeDownload.status === 200 && largeDownload.bytes.length === 32_000_000 && sha256(largeDownload.bytes) === sha256(large))
  }
  const rotated = success(await api(`/albums/${primary.album.id}/invite/rotate`, owner, 'POST'))
  assertCheck('rotated-invite-invalidates-old', (await api('/invites/inspect', null, 'POST', { invite: primary.invite })).status === 404)
  assertCheck('new-invite-inspects', (await api('/invites/inspect', null, 'POST', { invite: rotated.invite })).status === 200)
  assertCheck('rotation-preserves-current-members', (await api(`/albums/${primary.album.id}`, member)).status === 200)
  success(await api(`/albums/${primary.album.id}/members/${joined.member.id}`, owner, 'DELETE'))
  assertCheck('revoked-member-old-jwt-denied', (await api(`/photos/${prepared.id}/original`, member)).status === 403)
  assertCheck('revoked-member-cannot-rejoin', (await api('/albums/join', member, 'POST', { invite: rotated.invite, displayName: 'Same Name' })).status === 403)
  success(await api(`/photos/${memberPhoto.id}`, owner, 'DELETE'))
  assertCheck('creator-can-clean-revoked-members-photo', success(await api(`/albums/${primary.album.id}`, owner)).readyPhotos.every(photo => photo.id !== memberPhoto.id))

  if (extended) {
    const memberAlbum = await createAlbum(member, 'quota')
    const targets = [[owner, primary.album.id], [member, memberAlbum.album.id], [outsider, other.album.id]]
    currentCheck = 'concurrent-project-quota-reservations'
    const attempts = await Promise.all(Array.from({ length: 30 }, (_, index) => {
      const [actor, albumId] = targets[index % targets.length]
      return reserve(actor, albumId, 40_000_000)
    }))
    const quota = sql('select coalesce(sum(reserved_bytes),0)::bigint as reserved from photo_private.photos')[0]
    assertCheck('40mb-reservations-accepted', attempts.some(result => result.status === 201))
    assertCheck('concurrent-project-storage-cap-enforced', quota.reserved <= 900_000_000 && quota.reserved > 850_000_000 &&
      attempts.some(result => result.status === 507 && result.data.error.code === 'StorageFull') &&
      attempts.every(result => result.status === 201 || (result.status === 507 && result.data.error.code === 'StorageFull')))
    for (const [albumId, actor] of [...albums]) await removeAlbum(albumId, actor)
    assertCheck('reservation-only-quota-released-after-delete', sql('select count(*) as photos from photo_private.photos')[0].photos === 0)
    const capOwner = await anonymous()
    const photoCapAlbum = await createAlbum(capOwner, 'photo-count')
    for (let index = 0; index < 50; index++) success(await reserve(capOwner, photoCapAlbum.album.id, 1))
    const photoLimit = await reserve(capOwner, photoCapAlbum.album.id, 1)
    assertCheck('50-photo-cap-includes-reservations', photoLimit.status === 507 && photoLimit.data.error.code === 'PhotoLimit')
    await removeAlbum(photoCapAlbum.album.id, capOwner)
    const byteOwner = await anonymous()
    const byteCapAlbum = await createAlbum(byteOwner, 'album-bytes')
    for (let index = 0; index < 12; index++) success(await reserve(byteOwner, byteCapAlbum.album.id, 40_000_000))
    const albumLimit = await reserve(byteOwner, byteCapAlbum.album.id, 40_000_000)
    assertCheck('500mb-album-cap-enforced', albumLimit.status === 507 && albumLimit.data.error.code === 'AlbumFull')
  }
} catch (error) {
  failure = { check: currentCheck, code: /^[A-Za-z0-9 :/.-]{1,160}$/.test(error.message) ? error.message : 'LiveAcceptanceFailed' }
} finally {
  try { sql('update photo_private.settings set uploads_enabled=false where singleton') } catch { failure ??= { check: 'close-upload-gate', code: 'Unverified' } }
  for (const path of probes) await admin.storage.from('trip-photos').remove([path]).catch(() => undefined)
  for (const [albumId, actor] of [...albums]) {
    try { await removeAlbum(albumId, actor) } catch { failure ??= { check: 'synthetic-album-cleanup', code: 'CleanupPending' } }
  }
  let removedUsers = 0
  if (albums.size === 0) {
    for (const actor of users) {
      const { error } = await admin.auth.admin.deleteUser(actor.id)
      if (!error) removedUsers++
      else failure ??= { check: 'synthetic-user-cleanup', code: 'CleanupPending' }
    }
  }
  sql("delete from photo_private.rate_windows rate where rate.subject <> 'public' and not exists(select 1 from auth.users where id::text=rate.subject)")
  const final = sql("select (select count(*) from photo_private.albums) as albums, (select count(*) from photo_private.photos) as photos, (select count(*) from storage.objects where bucket_id='trip-photos') as objects, (select uploads_enabled from photo_private.settings) as uploads_enabled")[0]
  if (final.albums !== 0 || final.photos !== 0 || final.objects !== 0 || final.uploads_enabled !== false) failure ??= { check: 'final-cleanup', code: 'CleanupPending' }
  console.log(JSON.stringify({ finishedAt: new Date().toISOString(), mode: extended ? 'extended' : 'core', projectRef,
    passedChecks: checks.length, failure, syntheticUsersCreated: users.length, syntheticUsersRemoved: removedUsers,
    pendingSyntheticAlbumIds: [...albums.keys()], final, localTestsRun: false }))
  if (failure) process.exitCode = 1
}