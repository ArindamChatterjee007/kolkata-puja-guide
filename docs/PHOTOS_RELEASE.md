# Trip Albums Release

## Status

19 October 2026: the final published static frontend passed **47/47 live
fixture cases with fully mocked APIs**. Counter transitions, original-view and
download keyboard focus, retry/cancellation, and responsive touch targets passed.
The initial frontend's real two-person sharing and byte-integrity results remain
separate historical evidence. The three-identity QA cap is retained; no fresh
real-backend upload regression or physical-device acceptance is claimed.

The dedicated Free Mumbai backend was already deployed with uploads enabled.
This release made no backend changes or new server-health verification. Its
separate 53-check live receipt ended at `2026-10-18T23:01:08.211Z`; those checks
are historical backend evidence, not frontend passes or a rerun.

Each application version was published to main and Pages before its live
checks. Only the normal packaging build ran locally. No local tests, lint,
preview server, fallback model or subagents were used. The requested GPT-6 Astra
(Copilot) runtime is not independently verified.

Public entry: https://arindamchatterjee007.github.io/kolkata-puja-guide/photos.html

## Deployment Receipts

Final application source: `8bd3980939126165df3926a4f9e04b6149831731`.
Pages artifact: `eddf023a2af5ecb8516b0c544cf36f87550a5b42`.
[Pages run 39220496533](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39220496533)
succeeded; its deploy job completed at `2026-10-19T08:07:40Z`.
Final static-UI fixture checks ran from `2026-10-19T08:12:18.850Z` through
`2026-10-19T08:12:35.227Z`. The executed photo bundle's SHA-256 was
`d7b2fac3ffb3ad635618f1595a66e25f488b790bd009bd0ae09719ff4efb62ce`.
The subsequent documentation-only commit does not change this static artifact.

Previous counter-fix source: `75c10b660dad525bb694af8e859f04faadf6b9b9`.
Previous artifact: `1c73cc7260972bc9f8a3c5c2d6f17b897dee937d`.
[Pages run 39214512046](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39214512046)
succeeded; its deploy job completed at `2026-10-19T07:13:01Z`.
That artifact's signed-out live checks ended at `2026-10-19T07:14:05.470Z`.

Initial source: `12557ce46b941428077b91aeb6ba7e8d36568d29`.
Initial artifact: `ef6c2d967efe4d48689750a6d5040158e962b7a8`.
[Pages run 39176047705](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39176047705)
succeeded at `2026-10-18T23:20:11Z`. Its sharing checks ran from
`23:30:27.271Z` through `23:39:13.739Z`; focused layout checks ended at
`23:42:12.644Z`. Cleanup resumed on 19 October as described below.

## Use And Privacy

1. Open the planner's More menu and choose Trip albums.
2. Create an album with a title and display name. Share its invite privately.
3. Invite holders enter their own display name to join. Distinct member IDs
   identify folders; matching names do not merge contributors.
4. Add photos in your own folder. Open another member's folder to view previews
   or download the unchanged original with its original filename.
5. Contributors can delete their own photos. The creator can remove photos,
   rotate the invite, and delete the album. Member revocation is supported by
   the backend API but is not exposed as a control in this frontend.

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

The initial publication allowlist included the photo entry/client, public backend configuration,
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

This fix committed only `src/photos/Lightbox.tsx` and `src/photos.css` before
publication. The follow-up documentation commit updates only this record and
the README. The existing public office board is not updated. The artifact has
129 allowlisted generated/public files plus `.nojekyll`; only the two obsolete
tracked hashed photo assets were removed.

## Final Static UI With Mocked API

The existing fixture harness retained all 47 cases, strengthening the original
viewer checks to exercise held responses and focus before button disabling.
Its earlier 46/47 result exposed the focus defect; the new run passed 47/47.
These counts are not added to the earlier backend or real two-person results.

Chrome 155 loaded the actual public Pages app. All Auth, album, upload, download
and delete API requests were fulfilled or aborted in process. Host resolver
rules were `MAP * ~NOTFOUND, EXCLUDE arindamchatterjee007.github.io`; unmocked
provider and unrelated-host probes failed with `ERR_NAME_NOT_RESOLVED` before
fixture account flows ran. Dummy sessions existed only in isolated contexts.

| Scope | Result | Evidence |
| --- | --- | --- |
| Published resources | PASS | Seven HTML/JS/CSS resources matched artifact hashes and MIME types. Both browser contexts executed the exact final photo bundle without a service worker. |
| Authoritative counter refresh | PASS, mocked API | Album summary and folder card followed 0 -> 1 -> 2 -> 1 -> 0 after fixture upload/deletion receipts and detail GETs, without reload. The held PUT produced no optimistic count. |
| Original-view keyboard focus | PASS | Focus reached the dialog before the action disabled. It stayed there during the held response and after the button unmounted; ArrowRight changed both filename and counter. |
| Download-first keyboard focus | PASS | Held HEIC-shaped fixture download retained dialog focus before/during/after transfer; exact synthetic bytes and filename matched, and ArrowLeft returned to the first photo. This is not a real HEIC decode or native download UX test. |
| Error, retry and dismissal | PASS | Injected original 503 and retry retained modal focus. Escape restored the grid trigger and folder route. Closing a held original request aborted it without late reopening. |
| Layout and touch targets | PASS | Brand height was 44 px at 390/1440 and 46.375 px at 320, with a 44 px minimum. English/day and Bengali/night views had no horizontal overflow or covered controls. Four screenshots captured; desktop album and 320 px viewer reviewed. |
| Interception boundary | PASS | All 42 provider-origin requests handled in process; 39 responses had no remote server address and three requests were intentionally aborted. Zero real provider responses, backend writes or new real identities; two synthetic sessions only. |
| Upload bytes and runtime | PASS, intercepted only | Three completed PUT bodies and three preview bodies matched client SHA-256 declarations; previews stayed below 200,000 bytes. Zero page errors or unexpected console errors; the failed PUT and injected 503 were expected. |

The two remaining data-free real QA identities and all persistent users/photos
were untouched. No signup, create/join, admin cleanup, migration, backend setting
change or server deployment reached the real provider. No new server counter
verification or complete final server acceptance is claimed.

## Historical Live Acceptance

| Scope | Result | Evidence |
| --- | --- | --- |
| Initial public entry and planner menu | PASS | HTTP 200, exact HTML hash, working Trip albums link, no automatic Auth request, no planner JS or road worker in the photo entry. |
| Same-name contributors | PASS | Two fresh anonymous users named Photo QA received distinct IDs, folder suffixes and ownership. Invite inspection created no identity; joining replaced the fragment route. |
| Uploads and previews | PASS | Three valid synthetic JPEGs finalized server-side. Separate previews rendered; records, byte counts and SHA-256 matched the generated originals. |
| Cross-member originals | PASS | Actual browser downloads in both directions retained exact bytes, SHA-256 and ASCII/Bengali filenames. Two different originals with the same filename did not overwrite each other. |
| Viewer and controls | PASS | Full-resolution originals decoded, Escape retained the folder, member upload/delete controls were absent in the other person's folder, and creator controls were present. |
| Offline and invalid inputs | PASS | A queued upload was cancelled before reservation/PUT; reconciliation returned ready. Duplicate bytes, a 43 MB file and SVG produced no new upload request. |
| Private access and transport | PASS, initial checks | Signed-out outsider UI/API access was denied. Invite capabilities did not appear in request URLs/referrers; original responses had attachment/UTF-8 filename and no-store headers. |
| Service-worker boundary | PASS | One cache held 127 public entries and zero private API, Auth, Storage or original entries. |
| Desktop and phone layout | PASS after QA-selector correction | 1440 px desktop and 390/320 px Bengali/dark layouts fit without horizontal overflow or covered control centers. Three screenshots were reviewed. Viewer pixels, arrows, Escape and own-delete control passed. |
| Album summary after upload | FAIL observed; later fixture regression PASS | A screenshot showed two folder photos but a stale zero-photo album summary. The counter fix reloads authoritative album detail after upload and deletion. The final static UI now passes the mocked-API regression above; a new real-backend upload regression remains unverified. |
| Previous counter artifact's signed-out checks | PASS, historical | Nine HTML/JS/CSS files matched that artifact's hashes and MIME types; page, create-dialog fields and planner link worked at 390 px with zero Auth requests and page errors. Health was ready with uploads enabled at that earlier check. |

The main trace retains 49 passing assertions and three failed records: one
incorrect button-role selector, followed later by a cleanup-denial assertion
and its enclosing phase failure. The toolbar uses radio roles. The corrected,
focused layout pass has 16 passing assertions and zero failures. These counts
are not a single clean suite and are not added to the earlier 53 backend checks.

The three cross-member download checks used these synthetic sizes:

| Sample | Original bytes | Separate preview bytes | Original SHA-256 matched |
| --- | ---: | ---: | --- |
| Creator JPEG | 568,748 | 41,157 | Yes |
| Member JPEG with Bengali filename | 568,749 | 40,548 | Yes |
| Member JPEG with repeated ASCII filename | 568,865 | 41,091 | Yes |

No real user photos, workspace photo files, other albums, or provider datasets
were used. The additional layout pass used two small generated JPEGs and the
third anonymous identity within the retained QA cap. No invite, member JWT, cookie,
private object URL, service key or user-data identifier is in this record.

## Cleanup And Limits

The layout album's two photos and four objects were deleted through the UI at
`2026-10-18T23:42:10.261Z`; its one anonymous user was deleted and absence
verified at `23:42:12.644Z`. The sharing album's three photos and six objects
were deleted through the creator UI at `2026-10-19T07:08:27.957Z`; the album
card disappeared. Total: two QA albums, five originals and five previews removed.

The sharing cleanup's next access check did not return the expected 403/404
pair. Its final trace records one request without Auth after the long session
pause; a fresh member-page reload showed lost-session/access-denied and zero
photo or folder cards. The cleanup assertion stopped before the two original
anonymous Auth identities were deleted. Those two data-free QA identities
remain; do not claim all QA users were removed. No broad Auth listing, global
database-empty assertion, rate-counter wipe or other-user cleanup was performed.
Charged download usage was not reset. Both QA browsers/controllers are closed.

Physical iPhone/Android behavior and native download UX were not tested. The
fresh frontend originals were JPEGs; other formats and 32 MB byte-integrity
coverage retain the separately dated backend evidence. Cancellation was before
network transfer, not an uncertain in-flight lease. The production backend was
not disabled to test unconfigured/read-only states, quotas were not exhausted,
and member revocation/invite rotation were not exercised through this UI.

The final counter and focus regressions passed against the published static
app with fully intercepted APIs. A fresh real-backend upload regression and
physical-device acceptance remain unverified; the three-identity QA cap is
retained. The two remaining data-free identities were not cleaned up. No extra
real identity, paid upgrade, migration replay or backend redeployment occurred.
At 320 px a long filename can still wrap inside its extension; this cosmetic
limitation was observed and is outside the two-file fix.

The existing office board and its older application receipts are unchanged;
they do not certify this feature. Local redacted evidence remains in the ignored
`test-results/live-photos-release/` and `test-results/live-photos-focus-release/`
directories, not in either published branch. The previous 46/47 fixture receipt
is retained separately in `test-results/live-photos-ui-final/report.json`.