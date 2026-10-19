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

## Live Evidence

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

## Scope And Handoff

New identities: **0**. New albums: **0**. Uploads: **0**. Private record rows read:
**0**. Originals, metadata, invites, UUID memberships, ACLs, and the two previously
data-free QA identities were untouched. The three-identity QA cap remains.
Hidden anonymous SDK identity remains necessary for name-only create/join;
no Google/email/end-user login was added and authentication was not bypassed.

`GET /albums/:id` still returns all admitted metadata, bounded by 500 underlying
photo records and 250 members; ready/pending arrays can overlap. Folder counts
remain authoritative and untruncated. No populated-album payload size was measured.
Frontend pagination/lazy thumbnails belong to the frontend owner and were not
implemented or published here.

This verifies quota metadata and unauthenticated gates, **not 500 actual uploads**
or a new full sharing/upload acceptance pass. Earlier 50-photo/500 MB acceptance
is historical. No local tests, lint, local server, acceptance runner, cleanup,
Git staging/commit/push, or GitHub publication was performed. Only remote Edge
packaging/deployment was used. Requested GPT-6 Astra runtime remains unverified;
no fallback model or subagents were used.