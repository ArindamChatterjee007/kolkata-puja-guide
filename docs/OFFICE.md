# Public Project Office

## Scope And Attribution

[office.html](../office.html) is the independent PujaPath engineering task register. Its implementation is in [office.ts](../src/office.ts) and [office.css](../src/office.css); its public snapshot is [board.json](../public/office/board.json). It does not read any other office, private preview, account, message, or personal document.

Product and Design request **Claude Fable 5.1**. Architecture, Routing, Data, Platform, QA and Release request **GPT-6 Astra**. The QA/release request is GPT-6 Astra (Copilot); actual model/provider runtime remains unverified. These are requested assignments, not proof of execution by a particular model. Eight role rows do not establish eight live agents, meetings, unattended work or deployment. No model fallback or subdelegation was used in this release-record pass.

Architecture and design review are complete to the scoped local evidence in [RELEASE_CHECKS.md](RELEASE_CHECKS.md). Native-language and real-device acceptance are not implied. The original handoff reported Domain 22 PASS, Storage 44 PASS and Data 6 PASS separately; those historical rows remain distinct. Do not add their counts into a fresh aggregate. Only an actual completed full-suite command may populate `fullSuite` with its result and observation time.

Candidate coverage is 33/33 sourced entries, 24 metro nodes, 8 start points, and 4 example routes. This describes the source-backed catalogue, not a verified current 2026 festival timetable. The planner interface is owned by the UI workstream; its integrated review must not be inferred from office checks.

## Snapshot Contract

The schema version is 1. IDs must be unique stable slugs. Each task refers to a defined role and one of `backlog`, `in-progress`, `review`, `verified`, or `blocked`. A verified task must have at least one evidence link; a link is supporting evidence, not an automatic test execution or reviewer signature. Every task's summary must distinguish handoff results from locally executed checks.

`snapshotAt` is a real ISO timestamp captured with `new Date().toISOString()` when the snapshot is authored or updated. It is not refreshed just because a page is opened. The current value is `2026-10-14T22:44:26.167Z` (October 15 IST). Statistics are derived from task records, not invented percentages.

Publication is a discriminated contract: `publication: "pending"` requires `release: null`; `publication: "deployed"` requires exactly five release fields. The current board remains pending. Unsupported runtime attribution and top-level/task commit fields are still rejected.

| Release field | Required value or validation |
| --- | --- |
| `url` | `https://arindamchatterjee007.github.io/kolkata-puja-guide/`; hostname case equivalents are accepted, but the path is exact. |
| `repository` | `https://github.com/ArindamChatterjee007/kolkata-puja-guide` |
| `commit` | The actual published `gh-pages` artifact commit, exactly 40 hexadecimal characters; record its source `main` SHA separately in the release record. |
| `runUrl` | `https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/` followed only by the actual numeric run ID. |
| `deployedAt` | The observed deployment timestamp in canonical ISO form, as produced by `toISOString()`. |

Credentials, query strings, fragments, unexpected hosts/paths, traversal, extra fields and malformed values are rejected. Validation establishes format and scope, not that a remote deployment occurred. The header, evidence-link provenance, quality note and footer derive from the validated board; a failed refresh retains the previous valid state. A deployed footer exposes the recorded Pages URL, repository, commit, run and timestamp without fetching those external links.

Task evidence permits only documentation and test paths in this repository, or their exact public `https://github.com/ArindamChatterjee007/kolkata-puja-guide/blob/main/` equivalents. It rejects query parameters, traversal, unexpected schemes, unrelated hosts and non-line fragments. Links may not resolve until publication. Ignored screenshots and machine receipts are described in public documentation, not linked from the board. Rendered text uses typed DOM nodes and `textContent`; snapshot HTML is never interpreted. Evidence links use `noopener noreferrer` and do not carry private tracking data.

The office fetches only `office/board.json` on its own origin, omitting credentials and rejecting redirects. It polls 30 seconds after a completed request only while visible. Hiding the document aborts its request and timer; showing it initiates a check. Requests have an eight-second timeout. A network, MIME, size, or schema failure retains the last valid rendered snapshot and shows an error. The displayed checked time is the last successful local fetch, not evidence of new upstream activity.

There is no office `localStorage` state, account session, analytics beacon, or write endpoint. Search, role/status filters, and List/Board selection remain within the open page. The initial offline snapshot is provided by the service worker, not by a hidden live service.

## Offline Build

Both `index.html` and `office.html` are Vite inputs. The base, manifest scope, start URL, and worker registration scope are relative, supporting GitHub project Pages rather than assuming the domain root.

Workbox precaches same-origin HTML, JavaScript, CSS, JSON, manifest, fonts, and bitmap/vector assets produced by the build. It has no runtime caching routes and no offline analytics. External OpenStreetMap or other map tiles are neither cached nor prefetched. The main navigation fallback excludes `/office.html`; the office's exact precached HTML is served by the precache route before any planner fallback. Release verification must test the built application under `/kolkata-puja-guide/`, not only `/`.

The plugin uses `registerType: 'autoUpdate'` with `injectRegister: 'script-defer'`. Explicit `skipWaiting: false` and `clientsClaim: false` retain the normal worker lifecycle. There is no page reload callback. The injected registration script checks for worker updates, but a waiting worker activates only after existing clients close. This prevents an update from interrupting an unsaved route. Recheck the generated worker if upgrading the plugin; its automatic defaults differ for other registration modes.

## Icon Provenance

The app icons are original geometric route-marker artwork created for PujaPath by `scripts/generate-icons.mjs`, using only Canvas 2D fills, curves, and strokes. They contain no copied logo, external image, or font glyph. The project makes these icon assets available under CC0-1.0. This does not change the separate source photograph's license or any dependency license.

The checked-in PNGs are `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and the 180-pixel `apple-touch-icon.png`, all under `public/icons/`. Each is opaque on white. The 512 maskable icon keeps the foreground inside the central safe circle with radius 40% of the image width. The generator requires the existing Playwright package and locally installed Google Chrome; no browser or extra package is installed by the build.

## Current Local Verification

**Local gates passed; office publication sign-off pending.** The following is the pre-recovery baseline; fresh branch-publishing checks are recorded separately in [RELEASE_CHECKS.md](RELEASE_CHECKS.md#deployment-recovery). The full unit run at `2026-10-14T22:41:55.245Z` to `22:41:55.675Z` passed 151 tests in 8 files, including 57 office tests. The office additions are 26 cases beyond the original 31, covering valid scoped releases, case-equivalent Pages hosts, pending/null requirements, missing/extra fields, malicious URLs, invalid SHA and invalid dates. Injection, filters and configuration checks still pass. The board's `fullSuite.checkedAt` records that completed command, not a handoff sum.

The current production TypeScript/Vite build passed before the 10-check office run completed at `2026-10-14T22:40:33.751Z`, using Node 25.5.0 and isolated Chrome 155.0.8059.41. The existing browser injection check now also renders synthetic deployed evidence, rejects a malicious release refresh while retaining valid state, and restores the real snapshot. Its synthetic SHA/run ID are test data only and never entered the public board. All existing polling, accessibility, asset, worker and offline checks pass. The generated report now derives publication from the tested snapshot; office checks do not grant planner acceptance.

The separately saved planner receipt started `2026-10-14T22:31:51.782Z` and reports 23/23 passes, 36.59649 seconds, no failures/skips/flaky tests. It uses controlled GPS/tiles and was not rerun by this record pass. R1-R4 were resolved by the owning engineer; the precise regressions and earlier real-OSM evidence are separated in [RELEASE_CHECKS.md](RELEASE_CHECKS.md). Lint exits zero with six existing warnings. Node 24 deployment CI, live Pages, native Bengali, actual OS/GPS and iOS checks remain unverified.

After the updated board was authored, the full production build passed again and all 10 office checks completed at `2026-10-14T22:49:50.009Z`. The subsequent full unit run passed 151/151 in 8 files (57 office tests) from `2026-10-14T22:49:50.766Z` to `22:49:51.328Z`. The tested artifact's board was compared with the source JSON and matched, including snapshot `2026-10-14T22:44:26.167Z`, pending publication and null release. This later run is recorded separately; it does not rewrite the earlier completed run referenced by `fullSuite.checkedAt`.

Updated desktop and 320-pixel office screenshots were inspected. The existing narrow board uses horizontal lane scrolling; its screenshot does not show every lane at once, and List view remains available. Browser checks cover 1440, 390 and 320 pixels, but they do not replace screen-reader or real-device testing. Local documentation validation passed 143 links/anchors at `2026-10-14T22:50:57.118Z` after repairing a missing final newline; that count belongs to the document revision checked then.

## Historical Local Verification - 2026-10-14

The following initial-platform record is superseded by the current verification above. Its build blockers, pending counts and older artifact sizes are history, not current release conditions.

- `npm run test:unit` passed 103 tests in 7 files at `2026-10-14T18:40:20.277Z`, including 31 office/schema/config tests. This is an executed full-suite result, separate from the original handoff counts.
- The office/platform-only TypeScript check passed, and Oxlint passed for the owned office, config, scripts, and test files. Local tooling was Node 25.5.0; the workflow is configured for Node 24, which has not been executed here.
- `npm exec -- vite build` generated the latest checked two-page artifact with 40 precache entries, including fonts, the source image and its public attribution, icons, and office JSON. An earlier build had 43 entries before concurrent UI changes; entry counts are build-specific, not a progress metric. This artifact command does not replace the full TypeScript build gate.
- `npm run test:office` passed 10 scoped checks at `2026-10-14T18:43:03.020Z` in isolated Chrome 155.0.8059.40. It checked search/filters/views, derived counts, refresh failure retention, untrusted text and evidence handling, a simulated hidden-document abort and 30-second timer, PNG dimensions/safe area, same-origin precaching, waiting worker updates without reload, and separate offline office/planner HTML under `/kolkata-puja-guide/`.
- Office screenshots at 1440, 390 and 320 pixels were inspected. Automated axe WCAG A/AA checks returned no violations in those office states; the keyboard skip target worked. This is not full application, assistive-technology, real-device, or security sign-off. Screenshots and the browser report are generated under ignored `test-results/` by `scripts/verify-office.mjs`.
- `npm run build` remains blocked by two other-workstream errors: TS6133, unused `now` in `src/components/RouteTab.tsx:91`; TS2322, `SavedPlan` assigned to `Record<string, unknown>` in `tests/unit/storage.test.ts:104`. Neither file was edited in this platform pass. The owning workstreams must resolve these and rerun the full build after their changes settle.
- No repository was initialized or created, and no Git staging, commit, push, Pages dispatch, or deployment was performed. Requested model attribution remains unverified. No fallback or delegation was used.

## Recording A Deployment

1. The parent must verify the built-in Pages run/environment deployment from `gh-pages` at `/` for the approved repository and check the actual public planner, office, assets, manifest and offline project path. Repository approval or a successful push alone is insufficient.
2. Obtain the real 40-hex artifact commit, numeric Actions run URL and deployment timestamp from that evidence; retain the source `main` SHA separately. Keep `publication: "pending"` and `release: null` until the parent's live-browser sign-off and metadata update. The browser/unit fixture values are never release evidence.
3. Use a scoped patch on [board.json](../public/office/board.json): set `publication` to `deployed`, supply the exact five-field `release` object from the table, capture a new `snapshotAt` with `new Date().toISOString()`, and update the `public-release` task to `verified` with a factual summary and documentation evidence. Record the observed deployment and live checks in [RELEASE_CHECKS.md](RELEASE_CHECKS.md).
4. Rerun `npm run test:unit`, `npm run build` and `npm run test:office`, then let the parent publish the updated static artifact through the same branch-publishing path. The referenced commit must be the artifact commit actually evidenced by the named run; a later source/metadata commit is not automatically that deployment. The office renders the new status without another HTML/code edit. Recheck the published record after its update; local validation does not prove remote publication.

The earlier office-only pass performed no Git or account actions. The separately authorized deployment recovery and its observed results are recorded in [RELEASE_CHECKS.md](RELEASE_CHECKS.md#deployment-recovery).

## Release Gates

- Run the complete unit suite and production build after all workstreams stop changing files. Keep each handoff suite count separate until that run finishes.
- Verify both HTML pages under the real project prefix, with all script, font, image, manifest, and icon requests resolving there.
- After one online visit and worker installation, close and reopen offline. The planner must load its shell; the office must show its actual cached snapshot, timestamp, and task register. Map tiles may be absent.
- Verify search, combined role/status filters, empty results, List/Board selection, failed-refresh retention, and visible-only polling. No office fetch should contain credentials or private parameters.
- Inspect narrow/mobile and desktop screenshots, keyboard access, contrast, long content, zoom, and screen-reader announcements. An automated axe result covers only the checked office states; it is not full planner accessibility acceptance.
- Preserve the distinction between passing automated planner/geolocation-consent/persistence/sharing/accessibility/security checks and unverified native Bengali, real permissions/GPS, iOS and assistive-technology behavior. The local automated gates are complete; they are not unrestricted real-world acceptance.
- Confirm the approved public repository is the actual isolated Git root and its remote is correct. Review the public-only file list and dependency/image/icon licenses. Never stage the parent worktree.
- Use **Deploy from a branch**, `gh-pages`, `/(root)` with API `build_type: "legacy"` and an empty `.nojekyll` in the verified prebuilt artifact. Obtain the successful built-in Pages run/environment receipt. Check the published planner, office, manifest, offline behavior, and project-relative assets before changing publication status. The [custom Actions example](github-pages-actions.example.yml) is inactive and optional; appropriate permission and separate approval are required before activation, not for this initial release path.

Android and iOS can suspend the application, evict storage, or restrict installation/background timers. Neither the office nor the PWA provides continuous unattended monitoring. A fresh browser or evicted cache needs an online visit again. Do not present offline shell availability as offline maps or live festival data.

Project files and retained browser app state survive a network interruption; office view/filter state remains page-local. The assistant is not an unattended daemon, and reconnecting the network does not promise automatic model reconnection or continued execution. Resume from recorded evidence and freshly verify actual tool/network state.
