# Free Storage Capacity Change

Applied live on October 19, 2026, only to the existing Supabase project
`gadaedripljsjfxwukkq` in the dedicated PujaPath Photos organization. The owner's
Free plan remains unchanged; this adds no provider space and is not unlimited
hosting. No billing, paid feature, new provider, or additional account was used.

## Capacity

| Limit | Live value |
| --- | --- |
| Album reserved bytes / `maxBytes` | 800,000,000, previously 500,000,000 |
| Album photo records / `maxPhotos` | 500, previously 50 |
| Shared project reserved bytes | 900,000,000, unchanged |
| Original file bytes / `maxFileBytes` | 40,000,000, unchanged |
| Preview reservation per record | 200,000, unchanged |
| Charged download budget | 4,000,000,000 with existing month/rolling-window guards |
| Binary uploads | One project-wide at a time, unchanged |

The 900 MB project cap remains inside the existing Free 1 GB storage allowance.
Reservations, unfinished uploads, and removed members' photos still count.
At 500 records, preview allowances consume 100 MB, leaving at most 700 MB for
originals in an 800 MB album. Other albums share the project cap. Downloads still
charge twice their bytes; failed/interrupted downloads retain their charges.

## Backend Capacity Evidence

- Existing official CLI authentication succeeded. Its organization listing has
  no plan field; the user approved a read-only dashboard exception. The exact
  dedicated project/organization navigation showed `Free` at
  `2026-10-19T08:43:59.262Z`, without opening private records or billing.
- The guarded incremental migration completed at `2026-10-19T08:45:47.188Z`.
  Quotas are function configuration, not settings-table columns. It accepts only
  the verified old or already-updated contract/definitions, uses the existing
  advisory lock, and atomically changes only the album cap constants and aliases.
  Initial migrations were not replayed. The final already-applied guard passed
  at `2026-10-19T08:52:48.216Z` inside a live read-only transaction, with both
  function fingerprints unchanged and no writes. An earlier probe wrapper
  stopped before SQL execution because it assumed a trailing file newline;
  the corrected wrapper produced this read-only result.
- Only `trip-photos` was deployed: version **3**, `ACTIVE`, updated at
  `2026-10-19T08:46:41.453Z`, with `verify_jwt = false` preserved. Explicit
  `auth.getUser()` checks still protect every private route.
- At `2026-10-19T08:46:47.743Z`, **3 live endpoint checks passed**: health HTTP 200
  with the exact limits above and `ready`, `uploadsEnabled`, `privateStorage`
  all true; unauthenticated `GET /albums` and `POST /albums` both HTTP 401
  `AuthenticationRequired`. Origin and private/no-store headers also matched.
- At `2026-10-19T08:47:58.238Z`, **15 read-only metadata assertions passed**:
  quota gates, original advisory lock, private bounded bucket, RLS, no client
  policies/table grants, service-only RPC access, and unchanged upload setting.
  Normalizing only the changed constants reproduced both pre-change function
  fingerprints, confirming all other SQL behavior remained unchanged.

## Published UI Verification

The capacity and lazy-preview release was already published before the interrupted
verification resumed. Fresh CLI reconciliation confirmed the full source and
artifact SHAs and the actual successful built-in Pages run:

- Application source: `1479757125d3adbbf2d7dd689a48fcdd1ce1e714`
  (`Expand free album capacity and lazy-load previews`).
- Published artifact: `61ab2255e0b8e4138c77ec56bbe10dbbeaaf1c7d`.
- [Pages run 39228453832](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39228453832):
  **success**, deployment completed `2026-10-19T09:14:04Z`.
- Live entry: [Trip albums](https://arindamchatterjee007.github.io/kolkata-puja-guide/photos.html).
- Executed public bundle: `assets/photos-23RF1AIU.js`, SHA-256
  `98943a3a00631d2140f7bed548dffb908c19dd469363b88179d7d6c800e25e28`.

The resumed live-only harness ran from `2026-10-19T09:34:56.592Z` to
`2026-10-19T09:35:17.046Z`: **33 checks passed, 0 failed**. It loaded the actual
published HTML, JavaScript, CSS and assets, while every browser Auth and album API
was fulfilled by in-memory fixtures. All 58 public static responses, covering 18
distinct paths, matched the existing artifact hashes. Service workers were blocked.

A separate credential-free public `GET /health` at `2026-10-19T09:34:59.794Z`
returned HTTP 200 with `ready`, `uploadsEnabled`, and
`configuration.privateStorage` true and every exact limit in the table above.
This was the only real provider request in the resumed verification. No JWT,
private record, project dashboard, or billing route was used.

The browser had DNS resolution denied for every host except the Pages host;
unintercepted Supabase and unrelated-host probes both failed with
`ERR_NAME_NOT_RESOLVED`. Every provider response in the UI flows had no remote
server address. Exactly two mock identities were used; neither was created in
real Supabase Auth.

### Capacity And Preview Results

- One folder contained 500 ready metadata records, each with a generated valid
  1,000-byte PNG preview and a matching 100,000-byte original. Its reserved total
  was 150,000,000 bytes, including the full 200,000-byte preview reservation per
  record. These were fixtures, not uploaded photos.
- The authoritative summary displayed **500 of 500 photos** and used the server's
  800,000,000-byte cap. The existing 1024-based formatter labels this **763 MB**;
  that displayed value is not a reduced server cap or a hardcoded 50-photo limit.
- Initial preview GETs were **20 at 1440px**, **6 at 390px**, and **8 at 320px**.
  More than 400 tiles remained idle. Held responses proved a maximum of **6**
  unfinished preview requests; scrolling fetched only newly needed subsets.
- Returning within the resident cache caused no duplicate requests. After visiting
  enough tiles to exercise eviction, 160 preview blobs remained resident, 120 had
  been revoked, and 20 evicted previews were fetched again. Visible images decoded
  successfully and still referenced resident, non-revoked URLs; image errors: **0**.
- Mounting, scrolling and opening the preview viewer fetched **0 originals**.
  One explicit **Download original** action fetched exactly one 100,000-byte
  fixture with filename `synthetic-500.png`, unchanged EXIF and SHA-256
  `07c2492ae5d4fb36e8a40ecc25a8e6efaf0814ca48656a8698d918f51bd10452`.
- English and Bengali headers at **320, 390 and 1440px** had at least **44px**
  targets, no overlapping header controls and no horizontal gallery overflow.
  Two captures were visually inspected: desktop English and 320px Bengali night.
- The full-album mock rejected another reservation before a binary PUT. There
  were no page errors, real browser provider responses, or private cache entries.

The earlier 47/47 counter/focus fixture pass and initial real two-person original
download checks remain separate historical evidence; they were not rerun or
counted as new real-server acceptance. The earlier capacity reports are preserved.
Current redacted evidence is in the ignored
`test-results/live-free-capacity/live-ui-resume-report.json` with two new captures.

## Scope And Completion

New identities: **0**. New albums: **0**. Uploads: **0**. Private record rows read:
**0**. Originals, metadata, invites, UUID memberships, ACLs, and the two previously
data-free QA identities were untouched. The three-identity QA cap remains.
Hidden anonymous SDK identity remains necessary for name-only create/join;
no Google/email/end-user login was added and authentication was not bypassed.

`GET /albums/:id` still returns all admitted metadata, bounded by 500 underlying
photo records and 250 members; ready/pending arrays can overlap. Folder counts
remain authoritative and untruncated. No real populated-album payload size was
measured. The published frontend now gates preview requests by visibility, with
six concurrent downloads and a bounded, visible-entry-pinned memory cache. This
capacity release changed only the preview hook/cache, folder tiles and album
folder-card loading on the frontend; the existing lightbox was unchanged.

This verifies quota metadata, historical unauthenticated gates, and current
mocked-provider live UI behavior, **not 500 actual uploads** or a new real sharing
or upload acceptance pass. Physical-device behavior remains unverified. The two
old empty real QA identities were left untouched; the three-identity cap remains.

No application bug was found during the resumed pass, so no application edit,
build, backend deployment, migration replay or second Pages artifact was needed.
Only this receipt and the README are finalized on the source branch. No local
tests, lint, typecheck, local server or backend acceptance runner was run. The two
existing Vite processes were left alone. Four protected untracked files remained
unread, and all 17 traced protected metadata entries were unchanged. Requested
GPT-6 Astra runtime remains unverified; no fallback model or subagents were used.