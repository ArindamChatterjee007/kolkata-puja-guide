# Photo Backend

## Release Gate

The gateway and schema are deployed. Final live acceptance passed 53/53 checks
at `2026-10-18T23:01:08.211Z`; all synthetic data and users were removed. Uploads
were enabled after the final live release gates. At `2026-10-18T23:03:09.992Z`,
health returned HTTP 200 with `ready: true`, `uploadsEnabled: true`, and private
Storage; unauthenticated album access still returned HTTP 401.
The frontend is not released in this backend task.
Final check at `2026-10-18T23:05:30.700Z` confirmed health ready, uploads enabled,
zero albums/photos/objects/Auth users/orphaned user-rate rows, and 128,001,452
charged download bytes retained. The live QA runner's enabled-project guard also
passed without changing the release state. No local tests, Git operations,
frontend publishing, paid upgrades, fallback model, or subagents were used;
the requested model runtime was not independently verified.

Provider: Supabase. Dedicated organization: `PujaPath Photos`, ID
`ldlghpbdtgpkflmuuppl`. Project: `pujapath-photos`, ref `gadaedripljsjfxwukkq`,
Mumbai (`ap-south-1`). The dedicated organization's `FREE` badge and an available
active-project slot were verified before one creation submission. The CLI then
confirmed this sole dedicated project `ACTIVE_HEALTHY`. No existing project data
was read or changed, and no GitHub integration was connected.

Public URL: `https://gadaedripljsjfxwukkq.supabase.co`.
Gateway: `https://gadaedripljsjfxwukkq.supabase.co/functions/v1/trip-photos`.
Live `/health` returned HTTP 200, exact-origin CORS, `privateStorage: true`, and
the declared limits. The dedicated project dashboard independently showed
`PujaPath Photos / FREE` after project creation.

CLI 2.115.0 `config push` is not a preview: stdin `n` did not prevent partial
updates. Its implicit vector-bucket setting was rejected with HTTP 402; no upgrade
was taken. Explicitly disabling vector and analytics buckets and restoring email
confirmation produced a successful configuration push. Never use missing config
sections as evidence that optional paid features will remain off.

Local tests, lint, local servers, and local end-to-end checks are not authorized.

## Frontend Ownership

The frontend owner controls `src/photos/` and its API client. The backend owner
pins `@supabase/supabase-js` to stable `2.118.0`. No service credential belongs in
frontend configuration. `src/photos/backend-config.ts` now exports
`photoBackendConfig` with this project's public URL, publishable key, and gateway
base, matching the UI owner's existing optional-module contract. The UI must keep
file inputs disabled unless live health has both `ready` and `uploadsEnabled` true.
No API-client, auth-client, page, or styling file was changed by this backend task.

Create an anonymous Auth session only on an explicit create/join gesture, never
on an album landing or invite inspection. Validate persisted sessions using
`auth.getUser()`. Display names are labels, not verified identities.

The intended gateway is `/functions/v1/trip-photos`. Its only browser origin is
`https://arindamchatterjee007.github.io`. Invite capabilities belong in URL
fragments, never query strings or logs.

## API Contract

All private routes require `Authorization: Bearer <Auth access token>`.
Send the public project key as `apikey`. JSON requests use `application/json`.
Errors are `{ "error": { "code": "MachineReadableLabel" } }`; no server stack,
token, filename, or underlying provider error is returned. No query parameters
are accepted. Only the public publishable key is present in the frontend module.

| Method and path | Input | Success body |
| --- | --- | --- |
| `GET /health` | Public | `{ready, uploadsEnabled, configuration, limits}` |
| `POST /invites/inspect` | Public JSON `{invite}` | `{albumId, title, limits}` |
| `POST /albums` | `{title, displayName}` | 201 `{album, member, invite}`; invite returned once |
| `POST /albums/join` | `{invite, displayName}` | `{album, member}`; existing membership is stable |
| `GET /albums` | Auth | `{albums: Album[]}`; current memberships only |
| `GET /albums/:id` | Current member | `{album, member, members, readyPhotos, pendingUploads, limits}` |
| `POST /albums/:id/uploads` | `{filename, bytes, sha256, contentType, idempotencyKey}` | 201 `{upload: Photo}` |
| `PUT /uploads/:id` | Owner, original raw bytes | `{upload: Photo}` with `status: "ready"` only after storage verification |
| `GET /uploads/:id` | Owner | `{upload: Photo}`; reconciles actual storage metadata |
| `POST /uploads/:id/preview` | Owner, raw JPEG/PNG, `X-Content-SHA256` header | `{upload: Photo}` |
| `GET /photos/:id/original` | Current member | Original byte stream, attachment, UTF-8 filename |
| `GET /photos/:id/preview` | Current member | Separate JPEG/PNG byte stream, or 404 |
| `DELETE /photos/:id` | Owner or creator | `{deleted: true, objectsDeleted}`; also cancels an unwritten reservation |
| `POST /albums/:id/invite/rotate` | Creator | `{invite, existingMembersRetained: true}` |
| `DELETE /albums/:id/members/:memberId` | Creator | `{removed: true}` |
| `DELETE /albums/:id` | Creator | `{deleted: true, objectsDeleted}` after storage cleanup |

`Album`: `id`, `title`, `createdAt`, `state` (`active` or `deleting`),
`isCreator`, `myMemberId`, `creatorMemberId`, `photoCount` (ready),
`totalPhotoCount` (including reservations), `bytes` (ready originals), and
`reservedBytes` (original declarations plus thumbnail allowance).

The caller's `member` is `{id, displayName, userId}`. Other member summaries
contain only `{id, displayName, removed, photoCount, bytes}`. Member IDs, not
display names, identify folders. Duplicate names are allowed; the UI may show a
short member-ID suffix. Joining twice preserves both the member ID and first
display name. A removed Auth identity cannot rejoin using a retained invite, and
cannot read with its still-valid Auth JWT. This does not identify a person: someone
holding a still-valid invite can obtain a new anonymous identity. Rotate the invite
when removing someone; old members retain access, while the old capability stops
new joins. Removed members' photos remain for creator cleanup.

`Photo`: `id`, `albumId`, `memberId`, `filename`, `bytes`, `sha256`,
`contentType` (detected MIME), `status`, `createdAt`, `needsCleanup`, and
`preview` (`null` or `{bytes, contentType}`). Original status is one of
`reserved`, `uploading`, `ready`, `cleanupRequired`. Preview state is independent;
a failed preview need not hide a sound original. `pendingUploads` contains only
the caller's unfinished or cleanup-needed records. Album responses are bounded
by the 50-photo and 250-member caps; there is no unbounded photo listing.

Names are NFC-normalized, stripped of controls/bidi overrides, whitespace
collapsed, and limited to 40 Unicode code points. Titles allow 80. Original
filenames are preserved, limited to 255 UTF-8 bytes, and reject separators,
controls, bidi overrides, and dot path components. Downloads use RFC 5987
`filename*` plus a safe ASCII fallback. All responses are `private, no-store`;
originals are `application/octet-stream` with `nosniff` and attachment headers.

## Uploads and Quotas

- Originals: 1 to 40,000,000 bytes; JPEG, PNG, WebP, HEIC, HEIF, AVIF only.
- Limit aliases for the existing UI are `maxFileBytes = fileBytes`,
  `maxBytes = albumBytes`, and `maxPhotos = photosPerAlbum`.
- Preview: optional, at most 200,000 bytes and 1600 pixels per dimension;
  actual JPEG/PNG signature and dimensions are parsed server-side.
- Reservation: original declaration plus 200,000 bytes, retained even when no
  thumbnail is uploaded. The original is never resized, recompressed, or stripped
  of EXIF. A thumbnail is a separate derived object, never the original.
- Project: 900,000,000 reserved bytes and 20 albums, including deleting albums.
- Album: 500,000,000 reserved bytes, 50 photo records including reservations,
  and 250 membership records including removed members.
- Downloads: 4,000,000,000 charged bytes per UTC calendar month. An additional
  window including today and the previous 31 UTC dates prevents a provider-cycle
  boundary from doubling the allowance. Every original/preview request reserves
  twice its full byte size before streaming. Failed/interrupted requests remain
  charged; deletes do not refund bandwidth. Metadata/auth/provider overhead uses
  the remaining headroom. This is finite download capacity, not unlimited hosting.

Database advisory locks serialize quota checks and membership mutations. Only
one original/preview binary upload is admitted project-wide at a time. Limits
include 120 private requests/minute/user, 3 creates/hour/user, 30 joins/hour/user,
60 reservations/hour/user, 120 binary attempts/hour/user, and 60 public invite
inspections/minute/project. Rate counters commit separately from operations so
failed operations do not erase their rate charge. Limits return 429, 413, or 507
with labels such as `RateLimit`, `FileTooLarge`, `StorageFull`, or `AlbumFull`.

An idempotency key is 16-128 ASCII letters, digits, hyphens, or underscores;
`crypto.randomUUID()` works. Reuse it with the exact same reservation fields.
Do not blindly retry a failed PUT: first `GET /uploads/:id`. A ready response is
the receipt; bytes selected, XHR progress, or a completed client upload are not.
`reserved` can be retried; `uploading` must be reconciled; `cleanupRequired`
keeps its quota until verified deletion. Uncertain operations retain a ten-minute
lease before deletion is allowed, longer than a Free Edge request's execution
window. No timed process frees reservations without checking storage.

On create/join gestures use the SDK to obtain an anonymous user, then use that
user's JWT. Do not treat an `anon`/publishable API key as a user JWT. The provider's
anonymous sign-in limit remains 30/IP/hour. Supabase recommends CAPTCHA for
anonymous signup abuse protection. No CAPTCHA account, credential, bypass, or
paid feature is configured here; if the provider demands a challenge, stop for
the user. Losing an anonymous session loses that membership's access; the display
name cannot recover it. Clearing local auth should not be presented as sign-in
with the same identity.

## Security and Deployment

All application tables live in the unexposed `photo_private` schema with RLS
enabled and no client policies or grants. Supabase owns its Storage tables and
retains platform-managed client table grants; RLS is enabled with no client
policies, so those grants do not authorize object access. The second migration
asserts these defaults without trying to change managed-table ownership (which
the provider rejects with SQLSTATE 42501). UUID paths are generated only on the server. No client
storage-write token, public object URL, or signed download URL is issued.

Only `service_role` may execute `public.trip_photos` and
`public.trip_photos_rate`; both use an empty `search_path` and verify the caller's
role. Every private gateway route first calls `auth.getUser(token)` and derives
the actor from that result. Client-supplied user/member ownership is ignored.
Every data request rechecks active membership. Rotation blocks old invites for
future joins, not existing members. Revocation cannot retract already downloaded
bytes or a stream admitted before revocation.

The function has `verify_jwt = false` only to permit public health and invite
inspection; private routes explicitly verify real users. Browser CORS allows the
exact Pages origin, named methods/headers, and no credential wildcard. The
service role and project URL come only from Supabase's built-in Edge environment.
The source never reads CLI credential files or logs request bodies, JWTs, invites,
service keys, or passwords.

Deployment procedure:

The current project already exists and is live. Do not create it again or replay
its initial migration. The setup steps below apply only to a separately approved
fresh deployment; incremental changes must target the verified existing ref.

1. Verify this organization's Free plan and an available account-wide Free slot.
	Create only `pujapath-photos` in Mumbai (`ap-south-1`). No add-ons or upgrades.
	Keep any generated database password inside the provisioning process only;
	never place it in command text, source, output, or notes. If interactive secret
	entry is necessary, the user enters it directly, not through chat.
2. Use the CLI's authenticated Management API SQL route for the migration:
	`supabase db query --linked --project-ref <verified-new-ref> --file supabase/migrations/20261019000100_trip_photos.sql`.
	It needs no database-password export. Do not rerun the migration after an
	uncertain response without checking this project's schema state first. Apply
	`20261019000200_storage_access.sql` to assert the managed Storage security gates.
	`20261019000300_limit_contract.sql` adds the public UI limit aliases.
3. Push this configuration only to the verified new ref. Review any config diff;
	do not disable an existing provider-enforced CAPTCHA. Confirm anonymous Auth
	is enabled at its default rate, the bucket is private, and uploads remain off.
4. Deploy only `trip-photos` using `supabase functions deploy trip-photos
	--project-ref <verified-new-ref> --use-api --no-verify-jwt`. Check the actual
	live `/health` and public invite endpoint before any binary upload.
5. Pass the live authorization gates below with synthetic users/data. Only then
	set `photo_private.settings.uploads_enabled` true through the authenticated
	project-scoped CLI for synthetic upload acceptance. Keep the frontend disabled
	until the complete live pass and cleanup are recorded.
6. Return only the public project URL, gateway base, publishable/anon key, and
	release status to the frontend owner. Never return the service key. If any
	gate fails, keep uploads disabled and record the exact blocker.

## Live Acceptance

Final run: `/opt/homebrew/bin/node supabase/live-acceptance.mjs --extended` against
the deployed project only, finished `2026-10-18T23:01:08.211Z`, 53 passed checks,
zero failures. Five synthetic anonymous users were created and all five deleted.
Final live counts: zero albums, photo records, and Storage objects; uploads off
before release. Earlier core (40) and extended (47) runs also cleaned up, but are
not added to the final 53 count. Download budget charges are intentionally retained.
The runner refuses to mutate an enabled project or one containing any users,
albums, or objects. Do not run it against a populated production project. Deleted
synthetic users' orphaned rate counters are removed without resetting live users'
limits; bandwidth counters remain charged for bytes actually exercised.

Verified: same-name distinct folders, stable membership, verified caller ownership,
member-scoped lists, invalid JWT/public-key rejection, unexposed private tables,
direct anon/auth RPC and Storage denial, private bucket URLs, current-member
original reads, outsider/cross-member denial, server upload gate, checksum and
body-length failures, SVG/HTML rejection, preview CORS/byte/dimension bounds,
unchanged originals after preview, UTF-8 attachment names, canonical MIME
idempotency, stored-object reconciliation, 32,000,000-byte upload/download SHA-256,
invite rotation and existing access, revoked-JWT rejection, creator cleanup,
40,000,000-byte reservations, concurrent 900 MB project capacity, 500 MB album
capacity, 50-photo capacity including reservations, and verified quota cleanup.

Acceptance uses valid generated PNGs, including an actual 32 MB PNG. Original
JPEG/WebP/HEIC/HEIF/AVIF signature support is implemented through pinned
`file-type@22.2.0`, but each format has not been separately exercised live.
The 20-album and 250-member caps, ten-minute uncertain-write expiry, monthly
bandwidth-exhaustion response, and every rate-limit ceiling were not exhausted in
the final run. Those gates are implemented in service-only SQL; no provider billing
limit was approached or bypassed. Native-client frontend QA is a separate release.

The release checklist is: two anonymous users with the same name have distinct
member folders; current members can read each other's originals; outsiders and
cross-album callers cannot; direct anon/auth table, RPC, and Storage access is
denied; a non-creator cannot delete another member's photo; rotated invites fail
for new joins while existing members retain access; revocation denies the old
JWT; byte count, SHA-256, and original UTF-8 download filename match exactly;
invalid magic/checksum and oversized bodies fail; 40 MB reservations are accepted;
a real synthetic 32 MB PNG uploads/downloads intact; concurrent reservations stop
at the project/album/photo caps without uploading quota-test bodies; previews are
bounded and separate; deletion releases quota only after actual Storage removal.

Use newly generated valid PNG/JPEG bytes only, never workspace/user files.
Remove all synthetic objects, reservations, albums, and their anonymous Auth
users after acceptance. Preserve uncertain writes and their quota for
reconciliation instead of falsely claiming cleanup. Do not exercise the provider
billing limit or lower production constants through a public test control.