# Trip Albums Release

## Status

19 October 2026: frontend publication and live acceptance are pending. The
dedicated Free Mumbai backend is already deployed and uploads are enabled.
Its separate 53-check live receipt ended at `2026-10-18T23:01:08.211Z`; those
checks are historical backend evidence, not frontend passes or a rerun.

Publish the approved source and packaged Pages artifact before checking the
frontend. Only the normal packaging build is allowed locally. No local tests,
lint, preview server, fallback model or subagents are used. The requested
GPT-6 Astra (Copilot) runtime is not independently verified.

Public entry: https://arindamchatterjee007.github.io/kolkata-puja-guide/photos.html

## Use And Privacy

1. Open the planner's More menu and choose Trip albums.
2. Create an album with a title and display name. Share its invite privately.
3. Invite holders enter their own display name to join. Distinct member IDs
   identify folders; matching names do not merge contributors.
4. Add photos in your own folder. Open another member's folder to view previews
   or download the unchanged original with its original filename.
5. Contributors can delete their own photos. The creator can remove photos,
   revoke members, rotate the invite, and delete the album.

Display names are labels, not verified identities. Anyone holding a live invite
can join. Rotation prevents new joins with the old link but retains existing
members. Revocation cannot retract bytes already downloaded. The anonymous
membership is tied to this device/browser's stored session; a name alone cannot
restore access after storage is cleared. No account-recovery promise is made.

Original EXIF and possible location metadata are preserved. All album members
can download those originals. Originals and thumbnails remain in a private
Supabase bucket; none are public Git files, Pages assets or service-worker cache
entries. Invites use URL fragments. Auth tokens stay in the browser's Auth
storage and Authorization headers, not URLs, analytics or release evidence.

## Capacity And Availability

- Original formats: JPEG, PNG, WebP, HEIC, HEIF and AVIF. No SVG or HTML uploads.
- Maximum original: 40,000,000 bytes. Separate previews: at most 200,000 bytes.
- Album: 500,000,000 reserved bytes and 50 photos, including reservations.
- Project: 900,000,000 reserved bytes, 20 albums and 250 members per album.
- Downloads: 4,000,000,000 charged bytes per calendar month, also bounded by a
  rolling window. Each original/preview request reserves twice its full size;
  failures and deletions do not refund bandwidth. Provider quota is shared
  within the dedicated Free organization; overhead consumes remaining headroom.
- Free projects may pause after one week of inactivity. No paid upgrade,
  uninterrupted availability, unlimited capacity or offline-original support.
- A finalized server record is the upload receipt. Uncertain transfers retain
  reservations for reconciliation; the ten-minute lease is not a success.

## Publication Review

The allowlist includes the photo entry/client, public backend configuration,
header/i18n wiring, package manifest/lock, Vite inputs, ignore rules, these docs,
and reviewed Supabase configuration, migrations, Edge function and guarded
synthetic acceptance source. The existing project is not recreated and its
migrations are not replayed. The guarded backend acceptance runner is not run
against this enabled project.

Browser configuration contains only the public project URL and one publishable
key. Static secret-signature review found no private credential in the approved
sources. Added frontend packages declare MIT or 0BSD licenses; the pinned Edge
image parsers declare MIT. Credential files, CLI state, protected untracked
workflow/assets, user data, QA output and screenshots are excluded. Pages ships
only the generated static artifact, with no backend SQL or Edge source.

## Live Acceptance

Pending: deployed-entry and main-menu checks; two fresh anonymous contributors
with the same display name; original upload/finalization and cross-member
download byte/hash/filename equality; separate previews; outsider and delete
controls; mobile Bengali/dark and desktop layout; viewer/back/offline states;
private-response cache boundaries; and cleanup restricted to this run's
synthetic album and identities. No real user photos or other albums are used.

The existing office board and its older application receipts are unchanged;
they do not certify this feature. Source/artifact/run IDs and exact live results
will be recorded here after the deployed frontend is checked.