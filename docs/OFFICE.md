# Public Project Office

## Scope And Attribution

[office.html](../office.html) is the independent PujaPath engineering task register. Its implementation is in [office.ts](../src/office.ts) and [office.css](../src/office.css); its public snapshot is [board.json](../public/office/board.json). It does not read any other office, private preview, account, message, or personal document.

Product and Design request **Claude Fable 5.1**. Architecture, Routing, Data, Platform, QA and Release request **GPT-6 Astra**. The QA/release request is GPT-6 Astra (Copilot); actual model/provider runtime remains unverified. These are requested assignments, not proof of execution by a particular model. Eight role rows do not establish eight live agents, meetings, unattended work or deployment. No model fallback or subdelegation was used in this release-record pass.

Architecture and design review are complete to the scoped local evidence in [RELEASE_CHECKS.md](RELEASE_CHECKS.md). Native-language and real-device acceptance are not implied. The original handoff reported Domain 22 PASS, Storage 44 PASS and Data 6 PASS separately; those historical rows remain distinct. Do not add their counts into a fresh aggregate. Only an actual completed full-suite command may populate `fullSuite` with its result and observation time.

Candidate coverage is 33/33 sourced entries, 24 metro nodes, 8 start points, and 4 example routes. This describes the source-backed catalogue, not a verified current 2026 festival timetable. The planner interface is owned by the UI workstream; its integrated review must not be inferred from office checks.

## Navigation Update

The office now includes a locally verified **Next-stop and anywhere navigation** task under Architecture, with the related Design report referencing its accessibility review. It covers current-location and public-origin directions, encoded bilingual typed destinations, fresh-plan recommendations, open-dialog offline drafts and no automatic GPS or visit mutation. The accepted independent review remains handoff evidence, not exact model-runtime certification.

Fresh release execution passed **159/159 unit tests in 8 files** at `2026-10-15T06:35:40.020Z` to `06:35:40.483Z`, the production build, and **10/10 office browser checks** through `06:35:48.737Z`. All **33 planner E2E checks** passed on the unchanged full rerun started `06:38:22.302Z` (60,762.336 ms). The first run's empty-Leaflet-tooltip accessibility failure and successful focused rerun remain recorded in [Navigation Release](RELEASE_CHECKS.md#navigation-release); no assertion or code was changed to obtain the pass.

**Navigation is now publicly deployed and verified.** Build source `12ee45ebfe3b527b56ab8fe1aa5c19692cfa7e58` produced artifact `a6c90b7fb2302dfcc14a0cc72076eded0ece1bce`; built-in run [38694258417](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38694258417) succeeded at `2026-10-15T06:45:10.000Z`. All 62 served files matched the reviewed build. Public checks from `06:49:46.786Z` to `06:50:08.283Z` verified navigation at 1440/390/320 pixels, real OSM, no GPS calls or visit changes, and the fresh-controller offline navigation draft.

The visible office loaded the exact **12-task, 159-test, 8-role** snapshot at 1440 and 390 pixels. Navigation search, combined Architecture/Verified filters, empty results and List/Board passed. Offline office navigation served its separate cached shell and the same updated task. The public worker had 60 unique same-origin, project-scoped entries, including the new app bundle and no map tiles. The checked eight public axe states had zero violations; screenshots were inspected with no control overlap identified. These checks used new isolated Chrome contexts, not hidden integrated tabs or the user's accounts.

The snapshot retains its **first verified release checkpoint** unchanged. `fullSuite` uses the completed 159-test receipt, not a handoff or a sum of focused checks. [The navigation deployment receipt](RELEASE_CHECKS.md#navigation-publication) records the current artifact separately. This final documentation update is source-only and does not trigger a second static deployment merely to embed its own SHA.

## Snapshot Contract

The schema version is 1. IDs must be unique stable slugs. Each task refers to a defined role and one of `backlog`, `in-progress`, `review`, `verified`, or `blocked`. A verified task must have at least one evidence link; a link is supporting evidence, not an automatic test execution or reviewer signature. Every task's summary must distinguish handoff results from locally executed checks.

`snapshotAt` is a real ISO timestamp captured with `new Date().toISOString()` when the snapshot is authored or updated. It is not refreshed just because a page is opened. The current value is `2026-10-15T06:40:03.924Z`. Statistics are derived from task records, not invented percentages.

Publication is a discriminated contract: `publication: "pending"` requires `release: null`; `publication: "deployed"` requires exactly five release fields. The current board is deployed and records the first verified release checkpoint. Unsupported runtime attribution and top-level/task commit fields are still rejected.

| Release field | Required value or validation |
| --- | --- |
| `url` | `https://arindamchatterjee007.github.io/kolkata-puja-guide/`; hostname case equivalents are accepted, but the path is exact. |
| `repository` | `https://github.com/ArindamChatterjee007/kolkata-puja-guide` |
| `commit` | The actual `gh-pages` artifact commit evidenced by the recorded release checkpoint, exactly 40 hexadecimal characters; record its source `main` SHA separately. It is not the SHA of the later artifact carrying this metadata. |
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

## Public Release Checkpoint

This is the historical checkpoint intentionally retained in `office.release`. The navigation artifact and current public verification are recorded above and in [Navigation Publication](RELEASE_CHECKS.md#navigation-publication).

The first built-in Pages run [38653686670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38653686670) completed successfully at `2026-10-14T23:23:08.000Z`, publishing artifact `559dbda813354f57043ed4a76d0a7c87b87909a8` built from source `144663c05bf2e0cac75181620a00f7a0ca4fca9e`. The board records those observed values. Subsequent metadata publication carries this prior verified release checkpoint; it does not claim that its own artifact already existed when the board was authored.

Fresh public checks ran `2026-10-14T23:35:49.946Z` to `23:35:57.890Z` in installed headless Chrome 155.0.8059.41, Node 25.5.0, with an isolated context and actual `document.visibilityState === 'visible'`. The real public board loaded 151-test evidence, 11 tasks and 8 roles. Derived counts, matching search, combined role/status filters, empty results, List and Board passed with no office console errors, uncaught page errors or online HTTP errors. No visibility/API override was used. A hidden integrated-editor tab was not counted as a pass or an application defect.

The public planner loaded real decoded 256-pixel OSM tiles with 27 successful tile responses across this check, retained four stops after Optimize, switched EN/BN and had no page-width overflow. Actual CSS and screenshot dimensions were 1440x900 and 390x844 for both pages. The office desktop Board and mobile List screenshots were inspected. The ignored originals and timestamped receipt are under `test-results/public-final/`; they are local evidence, not uploaded site content.

The public HTTPS worker became ready and controlled the exact `/kolkata-puja-guide/` scope. After first online use, the offline planner retained its stored four-stop route and Bengali language; offline office navigation served the separate office shell and its 11-task cached snapshot. All 60 observed cache entries were same-origin and project-scoped, with no map tiles. English was restored before closing the isolated context. No user storage was cleared, GPS requested, visit marked, or account permission changed. This is desktop Chrome evidence, not iOS, real-device/GPS or native Bengali acceptance.

The recorded 23 planner E2E passes remain the earlier controlled-fixture run; this release-record change does not rerun or relabel them. The completed local gates and later publication receipt belong in [RELEASE_CHECKS.md](RELEASE_CHECKS.md#live-release-checkpoint), separately from the first release checkpoint stored in the board.

## Icon Provenance

The app icons are original geometric route-marker artwork created for PujaPath by `scripts/generate-icons.mjs`, using only Canvas 2D fills, curves, and strokes. They contain no copied logo, external image, or font glyph. The project makes these icon assets available under CC0-1.0. This does not change the separate source photograph's license or any dependency license.

The checked-in PNGs are `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and the 180-pixel `apple-touch-icon.png`, all under `public/icons/`. Each is opaque on white. The 512 maskable icon keeps the foreground inside the central safe circle with radius 40% of the image width. The generator requires the existing Playwright package and locally installed Google Chrome; no browser or extra package is installed by the build.

## Pre-Public-Check Local Verification

**Historical local baseline; public sign-off is now recorded above.** The following predates the live check and metadata update; branch-publishing checks are recorded separately in [RELEASE_CHECKS.md](RELEASE_CHECKS.md#deployment-recovery). The full unit run at `2026-10-14T22:41:55.245Z` to `22:41:55.675Z` passed 151 tests in 8 files, including 57 office tests. The office additions are 26 cases beyond the original 31, covering valid scoped releases, case-equivalent Pages hosts, pending/null requirements, missing/extra fields, malicious URLs, invalid SHA and invalid dates. Injection, filters and configuration checks still pass. The board's `fullSuite.checkedAt` retains that completed command, not a handoff sum or a new execution time.

The current production TypeScript/Vite build passed before the 10-check office run completed at `2026-10-14T22:40:33.751Z`, using Node 25.5.0 and isolated Chrome 155.0.8059.41. The existing browser injection check now also renders synthetic deployed evidence, rejects a malicious release refresh while retaining valid state, and restores the real snapshot. Its synthetic SHA/run ID are test data only and never entered the public board. All existing polling, accessibility, asset, worker and offline checks pass. The generated report now derives publication from the tested snapshot; office checks do not grant planner acceptance.

The separately saved planner receipt started `2026-10-14T22:31:51.782Z` and reports 23/23 passes, 36.59649 seconds, no failures/skips/flaky tests. It uses controlled GPS/tiles and was not rerun by this record pass. R1-R4 were resolved by the owning engineer; the precise regressions and earlier real-OSM evidence are separated in [RELEASE_CHECKS.md](RELEASE_CHECKS.md). Recorded lint exits zero with six existing warnings. Live Pages was unverified at this historical point and is now checked above; Node 24 source-build CI, native Bengali, actual OS/GPS and iOS remain unverified.

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
2. Obtain the real 40-hex artifact commit, numeric Actions run URL and deployment timestamp from that evidence; retain the source `main` SHA separately. The initial pending/null state ends only after live-browser sign-off and the metadata update. The current board has reached that verified checkpoint; browser/unit fixture values are never release evidence.
3. Use a scoped patch on [board.json](../public/office/board.json): set `publication` to `deployed`, supply the exact five-field `release` object from the table, capture a new `snapshotAt` with `new Date().toISOString()`, and update the `public-release` task to `verified` with a factual summary and documentation evidence. Record the observed deployment and live checks in [RELEASE_CHECKS.md](RELEASE_CHECKS.md).
4. Rerun `npm run test:unit`, `npm run build` and `npm run test:office`, then publish the updated static artifact through the same owned branch-publishing path. The referenced commit must be the artifact commit actually evidenced by the named run; a later source/metadata commit is not automatically that deployment. Keep the first release checkpoint stable, and record the metadata artifact's later SHA/run in documentation after it exists. No third artifact rebuild is needed merely to include its own receipt. The office renders the new status without an HTML/code edit; recheck the published record after updating it.

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
