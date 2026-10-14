# Final Release Checks

Review date: 2026-10-15 IST. UTC execution timestamps are on 2026-10-14. Office snapshot authored with `new Date().toISOString()`: `2026-10-14T22:44:26.167Z`.

**Decision: Hosting deployed successfully; office publication sign-off pending.** R1-R4 were fixed by the separate owning engineer and are resolved in the local regression record. The earlier office pass extended only the release contract. The separately authorized recovery below adapts deployment configuration and documentation, without changing planner code or the pending/null office snapshot. Historical HOLDs, reproductions and fingerprints are retained as history, not current blockers or current-build fingerprints.

## Deployment Recovery

Initial publication uses GitHub's built-in branch publisher: `gh-pages`, `/`, `build_type: "legacy"`, with an empty `.nojekyll` beside the prebuilt static files. The source checkout remains on `main`; an isolated new artifact worktree belongs only under ignored `.private/pages-publish`. Stage explicit approved files, never a wildcard or parent worktree.

The former active workflow is preserved byte-for-byte as [github-pages-actions.example.yml](github-pages-actions.example.yml). It is optional inactive documentation, not the initial release path. Future activation requires separate approval and appropriate workflow permission. The office configuration test now asserts that no active workflow exists and the example still describes its Node 24, `dist`-only build. The focused run passed **57/57** at `2026-10-14T23:12:50.516Z`, after catching and correcting a deletion-tool failure that had left the original file on disk.

Fresh recovery checks, using Node 25.5.0:

| Gate | Result | UTC execution evidence |
| --- | --- | --- |
| Full unit suite | 151/151 PASS, 8 files, including 57 office tests | `2026-10-14T23:15:23.873Z` to `2026-10-14T23:15:24.706Z` |
| Production build | PASS, TypeScript and Vite | `2026-10-14T23:15:24.719Z` to `2026-10-14T23:15:27.736Z` |
| Production office browser suite | 10/10 PASS, Chrome 155.0.8059.41 | `2026-10-14T23:15:27.747Z` to `2026-10-14T23:15:35.311Z`; suite receipt `2026-10-14T23:15:34.971Z` |
| Snapshot integrity | Source and built JSON byte-identical; pending/null unchanged | `2026-10-14T23:15:35.314Z` |
| Pre-amend repository check | Approved public repository, no remote refs, history HTTP 409 empty, Pages HTTP 404 absent | `2026-10-14T23:16:10.818Z`; repeat immediately before amendment |

Generated receipts are local and ignored: [deployment-recovery-validation.json](../test-results/deployment-recovery-validation.json) and [deployment-recovery-unit.json](../test-results/deployment-recovery-unit.json). These are fresh executions, not the older results below. The existing **23/23 planner E2E** receipt was not rerun: planner/runtime files are unchanged. Node 24 source-build execution, the parent's live-browser release check and the board's follow-up publication metadata remain separate requirements. The built-in Pages deployment does not execute the optional Node 24 workflow.

The approved source inventory is **72 files**: the earlier 71-path inventory plus [public/FONT_LICENSES.md](../public/FONT_LICENSES.md), with the active workflow replaced by the inactive example. Static publication permits only the generated HTML, manifest/registration/worker scripts, hashed JS/CSS/fonts, named public images/licenses/icons, office JSON and empty `.nojekyll`. Recheck exact regular-file paths and secret/private-path patterns before each explicit stage; pattern scanning is not a guarantee that every possible secret format is absent.

### Verified Deployment

| Evidence | Verified value |
| --- | --- |
| Public repository | [ArindamChatterjee007/kolkata-puja-guide](https://github.com/ArindamChatterjee007/kolkata-puja-guide) |
| Pages | [PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/) |
| Source commit used for the build | `144663c05bf2e0cac75181620a00f7a0ca4fca9e` |
| Published `gh-pages` artifact commit | `559dbda813354f57043ed4a76d0a7c87b87909a8` |
| Actual Pages Actions run | [38653686670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38653686670), `completed` / `success` |
| Actual jobs | `build`, `report-build-status` and `deploy`: all `completed` / `success`; confirmed with `gh run watch --exit-status` and the jobs API |
| Environment deployment | `7079675174`, `github-pages`, `success`, matching artifact SHA and Pages URL |
| Deployment completed | `2026-10-14T23:23:08.000Z` (October 15, 04:53:08 IST) |
| Pages API | `status: built`, `build_type: legacy`, `source: { branch: gh-pages, path: / }` |
| File counts | 72 reviewed source files; 63 artifact files: 62 generated files plus zero-byte `.nojekyll` |
| Public HTTP verification | 62/62 served files returned HTTP 200 and matched audited SHA-256 bytes under `/kolkata-puja-guide/`; expected PujaPath index and separate office HTML confirmed |
| HTTP check interval | `2026-10-14T23:25:14.191Z` to `2026-10-14T23:25:33.521Z`; combined receipt verified `2026-10-14T23:25:34.390Z` |

The matching Pages branch configuration already existed when the post-push API check ran, so no settings update was needed. Both branches were pushed normally, without replacing remote history. The old initial source commit was verified unpublished before amendment; public source history contains no active workflow file. The inactive example's content was preserved exactly. Source and artifact pattern scans passed without printing matches; the documentation check validated 153 local links before the receipt addition.

The generated [pages-deployment-receipt.json](../test-results/pages-deployment-receipt.json) is retained locally in ignored test output, with the individual public-file hashes and API observations. This is static delivery and hosting evidence, **not** the parent's interactive live-browser release sign-off, a new planner E2E run, or Node 24 source-build execution. The deployed and source boards remain `publication: "pending"` with `release: null`. A subsequent documentation-only receipt commit does not change the build source or deployed artifact identified above.

## Current Verification

| Gate | Result | Timestamp and scope |
| --- | --- | --- |
| Full unit suite | 151/151 PASS; 8 files | `2026-10-14T22:41:55.245Z` to `22:41:55.675Z`; includes 57 office tests, up from 31. Separate JSON receipt, not a sum of handoff counts. |
| Production build | PASS | TypeScript and Vite 8.3.4, Node 25.5.0; completed before the office receipt below. 65 precache declarations. Node 24 CI remains pending. |
| Production office browser suite | 10/10 PASS | Completed `2026-10-14T22:40:33.751Z`; isolated Chrome 155.0.8059.41 at the local `/kolkata-puja-guide/` prefix. |
| Lint | PASS exit 0; 6 warnings | Executed after the full unit run above. No new office errors; the same non-blocking React warnings remain. |
| Saved planner regression receipt | 23/23 PASS | Started `2026-10-14T22:31:51.782Z`, duration 36,596.49 ms, end derived from those values `2026-10-14T22:32:28.378Z`; 0 failed/skipped/flaky. Not rerun in this release-record pass. GPS and tiles are controlled fixtures. |

Machine receipts are local and ignored: [platform-unit-results.json](../test-results/platform-unit-results.json), [office-verification.json](../test-results/office-verification.json) and [planner-e2e-results.json](../test-results/planner-e2e-results.json). Later local executions can replace those files; the timestamps above identify these specific runs. They are not public-board evidence links. The pre-extension 125-test full-suite count is the owning-engineer handoff; the fresh 151-test command above includes the 26 added office cases and is the recorded current aggregate.

The office schema accepts `pending` only with `release: null`, or `deployed` only with a complete scoped Pages URL, repository, 40-hex commit, numeric workflow-run URL and canonical deployment date. Host/path/query/credential/traversal, missing/extra-field, SHA and timestamp negatives pass. The browser check renders a synthetic deployed fixture, rejects an unsafe replacement, retains valid state and restores the actual board. Those fixtures are not deployment evidence. The actual board stays pending/null, and header/footer provenance now follows the validated board rather than static publication text. See [OFFICE.md](OFFICE.md#recording-a-deployment) for the parent's post-deployment patch procedure.

Architecture/design review and integrated local quality execution are recorded complete within their limits. The catalogue is 33/33 sourced candidate pandals, 24 Metro nodes, 8 starts and 4 routes, not a current 2026 timetable. Six lint warnings remain: purity at [useNow.ts](../src/hooks/useNow.ts#L10), two refs warnings at [usePlanStore.ts](../src/hooks/usePlanStore.ts#L147) and [usePlanStore.ts](../src/hooks/usePlanStore.ts#L148), and effect-state warnings at [usePlanStore.ts](../src/hooks/usePlanStore.ts#L170), [MapView.tsx](../src/components/MapView.tsx#L236) and [App.tsx](../src/App.tsx#L163).

### Resolved Findings

| Original finding | Current resolution evidence |
| --- | --- |
| R1: tile-cycle health | Saved E2E passes initial success followed by total failure, partial failure, a bounded 12-second stalled cycle, and retry/offline recovery. Controlled injection does not establish a live OSM outage. |
| R2: stale crowd estimates | Current unit tests cover relevant report add/change/clear/expiry in snapshot freshness. Saved 10:30 IST E2E verifies stale queues/budget before explicit re-optimization and changed totals afterward, without silently changing route order. |
| R3: shared-budget bounds | Current unit tests reject 25 and 24.0001 hours; exactly 24 hours is accepted. Saved E2E verifies the accepted boundary can import, optimize and share, and invalid imports preserve the local plan. |
| R4: privacy copy | Saved English/Bengali privacy checks cover raw GPS handling separately from viewed tile area/IP and external directions. No native-speaker or real permission-prompt sign-off is claimed. |

The saved planner run also passes 44-by-44-pixel language-target/full-brand checks for English and Bengali at 320 pixels. Earlier live production evidence below includes actual OSM 20/20 desktop and 6/6 mobile tiles, offline reload/state persistence and clipboard fallback. **Those were earlier-build checks of the same paths, not fresh live-provider or public-deployment checks of this changed build.**

### Final Snapshot Recheck

The post-authoring `npm run build` passed, followed by `npm run test:office` completing **10/10 PASS** at `2026-10-14T22:49:50.009Z`. The immediately following full unit run was **151/151 PASS in 8 files**, including **57 office tests**, from `2026-10-14T22:49:50.766Z` to `22:49:51.328Z`. Its separate ignored receipt is [platform-final-unit-results.json](../test-results/platform-final-unit-results.json). A read-only comparison at `2026-10-14T22:51:19.662Z` confirmed that the tested built JSON exactly matches the source board, including the actual snapshot date `2026-10-14T22:44:26.167Z`, `publication: "pending"` and `release: null`.

Updated 1440-pixel and 320-pixel office screenshots were inspected; narrow Board view retains its existing horizontal lane scrolling, while List view remains available. The ten browser checks include all three widths (1440, 390, 320), zero automated axe violations in those checked office states and no uncaught office errors. Their polling clock is simulated; use receipt timestamps, not the clock advanced inside screenshot fixtures, as execution times. This is local office evidence, not another planner/live-OSM run.

Documentation validation passed 143 local links/anchors, ASCII, whitespace, fences, final newlines and board invariants at `2026-10-14T22:50:57.118Z`, after fixing a missing office-document final newline. This records the revision checked then; it is not a dedicated Markdown linter or a public-link availability check. Editor diagnostics reported no errors in the eight owned files.

## Original Findings - Resolved History

The following reproductions and requested fixes describe the original review. All four findings are superseded by the resolution table above; their historical screenshots and wording are retained for traceability.

### R1 - Resolved (Original P2): Tile Failures Can Leave A Misleading Ready Map

[MapView.tsx](../src/components/MapView.tsx#L245) only enters the online failure state when the lifetime loaded-tile count is zero. After an initial successful real OSM load, a controlled connection-failure injection followed by one normal zoom produced 20 broken images and 4 decoded images. The map still reported `data-streets="ready"`, with zero unavailable banners. Much of the street background was missing, without the schematic's warnings or labels.

Fix: evaluate health for the current tile-loading/view cycle, not whether any tile ever succeeded. On a failed current view, expose the unavailable warning and usable schematic/retry path. Include a bounded stalled-load case. Add a regression for successful load followed by provider failure while `navigator.onLine` remains true. This was deliberate fault injection, not an observed OSM outage.

Evidence: [../test-results/release-live/controlled-tile-failure-1440x900.png](../test-results/release-live/controlled-tile-failure-1440x900.png).

### R2 - Resolved (Original P2): Crowd Report Changes Do Not Invalidate Estimates

[App.tsx](../src/App.tsx#L109) and [uiState.ts](../src/components/uiState.ts#L112) exclude crowd reports from snapshot freshness. In a one-stop Bagbazar plan at synthetic 10:30 IST, optimization showed a moderate queue of 18-42 minutes. Entering a Heavy report immediately updated the detail dialog and storage, but the route still displayed the old queue and total breakdown without a stale-estimate notice. Only manual re-optimization changed the queue to 36-77 minutes.

Fix: invalidate or explicitly mark the estimate stale when a relevant report is added, changed, cleared, or expires. Include report identity/timestamp in freshness, and test the displayed total and budget result as well as the detail dialog. Do not silently reorder a user's route. The existing two-hour expiry test passes for the dialog and stored reports; it does not establish snapshot invalidation.

### R3 - Resolved (Original P2): Shared Budgets Exceed The Planner's Accepted Range

[storage.ts](../src/domain/storage.ts#L47) accepts any positive finite duration, while [route.ts](../src/domain/route.ts#L81) rejects more than 1,440 minutes. A valid-form shared link with `hours=25` was accepted, persisted as 1,500 minutes, and survived reload. Optimize then displayed "The route could not be estimated." No estimate was produced.

Fix: use a consistent duration contract in shared-link parsing, saved-plan loading/saving, and planning. Reject out-of-range incoming values without replacing a valid local plan. Test the upper boundary and just-over-boundary values. This is an input-validation/availability defect, not demonstrated script execution.

### R4 - Resolved (Original P2): Qualify The In-App Location Privacy Claim

[i18n.ts](../src/i18n.ts#L209) says location is never "sent anywhere by this app." Raw GPS coordinates were excluded from the inspected storage/share/directions paths, but centering the OSM map on GPS changes requested tile coordinates. The tile provider can infer the viewed area and receives ordinary network information, including IP address. The current in-app provider sentence is less explicit than the accurate disclosure in [README.md](../README.md#L31).

Fix the English and Bengali copy to distinguish raw GPS persistence/sharing from tile-area/IP disclosure. Do not describe this as demonstrated transmission of an exact latitude/longitude parameter. Native Bengali review remains required; this review does not supply that sign-off.

## Historical Baseline Gates

These commands ran during the original review, before the fixes and office extension. They are not the current aggregate or a second execution of the current regressions.

| Gate | Initial-review result | Evidence and limits |
| --- | --- | --- |
| `npm run test:unit` | 122/122 passed; 8 files | Started 03:27:00 IST, 402 ms reported duration. |
| `npm run build` | Passed | TypeScript and Vite 8.3.4; PWA generated 65 precache declarations. |
| `npm run test:office` | 10/10 checks passed | Completed `2026-10-14T21:57:07.402Z`; includes office injection, visibility, accessibility, asset, worker-update and offline checks. |
| `npm run lint` | Exit 0; 6 warnings | No lint errors; warning details below. |
| `npm audit --omit=dev` | 0 vulnerabilities | Production dependency audit only; not an audit of all development dependencies or a guarantee of security. |
| `npm run test:e2e` | 16/16 passed | Started `2026-10-14T21:58:13.719Z`; 32.601 s; 0 failed, 0 skipped, 0 flaky. GPS and OSM tiles are mocked in this suite. |

Baseline reports: [../test-results/office-verification.json](../test-results/office-verification.json) and [../test-results/planner-e2e-results.json](../test-results/planner-e2e-results.json). Older results and pending build errors in [OFFICE.md](OFFICE.md) are historical, not the current baseline.

The six non-blocking lint warnings are `react(purity)` at [useNow.ts](../src/hooks/useNow.ts#L10), two `react(refs)` warnings at [usePlanStore.ts](../src/hooks/usePlanStore.ts#L147) and [usePlanStore.ts](../src/hooks/usePlanStore.ts#L148), and `react(set-state-in-effect)` at [usePlanStore.ts](../src/hooks/usePlanStore.ts#L170), [MapView.tsx](../src/components/MapView.tsx#L197), and [App.tsx](../src/App.tsx#L163). They remain unresolved; an exit-zero lint run is not warning-free.

## Historical Production Browser Evidence

This section describes the earlier production artifact only. Its real-network checks were not rerun by the release-record pass and do not establish live behavior of the changed build or GitHub Pages.

The initial production run was `2026-10-14T22:02:32.020Z` to `22:02:38.177Z`. It used installed headless Chrome 155.0.8059.41, Node 25.5.0, fresh isolated contexts, and a temporary read-only loopback server exposing only the built site at `/kolkata-puja-guide/`. No user profile, shared tab, or account was touched. Servers and browsers were closed in `finally`. No arbitrary sleeps or long-running synchronous servers were used.

Initial result: 9/11 checks passed. Two harness assertions were wrong: the precache declaration count is not the unique cache-key count, and the first artifact allowlist omitted two existing public SVGs. Focused rechecks at `22:06:10.525Z` to `22:06:13.422Z` passed 2/2 after inspecting those SVGs and parsing the generated worker with the TypeScript AST. There are 65 declarations, 59 unique expected entries, and exactly 59 actual entries. Both SVGs are static artwork with no script, event attributes, foreign content, or external URLs. These were harness corrections, not application fixes or a new full 11-check run.

Separate defect probes in that recheck reproduced R1-R3, 3/3. Successful reproduction is a finding, not a release pass.

### Real OSM And Rendering

Final settled captures ran `22:08:19.190Z` to `22:08:21.954Z`, allowing normal OSM requests with no tile interception. Assertions waited for actual visible image decoding and opacity, not just the first `tileload` event. Both real CSS viewport dimensions and PNG dimensions matched the requested sizes; document width did not overflow.

| Viewport | Loaded tile images | HTTP 200 tiles | Broken tiles / HTTP errors | Painted map evidence |
| --- | --- | --- | --- | --- |
| 1440x900 | 20/20 | 20 | 0 / 0 | 1064x832 map; 1,139 quantized colors; 221,312 opaque pixel samples. |
| 390x844 | 6/6 | 6 | 0 / 0 | 390x338 map; 691 quantized colors; 32,955 opaque pixel samples. |

The canvas checks decoded browser-produced map screenshots, avoiding cross-origin canvas taint. Actual OSM image responses and 256x256 natural image sizes independently established tile success. There were 25 desktop and 9 mobile `ERR_ABORTED` requests during initial map reframing, with no other tile request failures in the settled checks. Both final captures were visually inspected; streets, route pins, attribution and controls rendered. This is not a no-network fallback counted as a real-map pass.

Screenshots: [../test-results/release-live/planner-1440x900.png](../test-results/release-live/planner-1440x900.png), [../test-results/release-live/planner-390x844.png](../test-results/release-live/planner-390x844.png), [../test-results/release-live/map-1440x900.png](../test-results/release-live/map-1440x900.png), and [../test-results/release-live/map-390x844.png](../test-results/release-live/map-390x844.png).

### Worker, Offline State And Assets

- After worker readiness and a controlled reload, the page had an active controller with exactly the project-prefix scope. All 59 cached URLs were same-origin and prefix-scoped; none were OSM tiles. The only observed external application origin in the cache recheck was `https://tile.openstreetmap.org`.
- With that controller active, a manual Bagbazar visit was recorded, language changed, and route order edited through the UI. After `browserContext.setOffline(true)` and a planner reload, the complete saved plan, manual visit and Bengali language matched. No tile image elements remained; the labeled schematic and offline warning were visible. Offline optimization worked.
- Offline navigation to the prefixed office served the actual office shell and "Offline cached snapshot," not the planner fallback. Returning to the planner offline retained its state. Reconnecting preserved state with zero main-frame navigations and restored the street-ready state without reload.
- The generated manifest loaded under the prefix with relative scope/start URL. All four PNG icons decoded at 192, 512, 512 and 180 pixels respectively. The bundled photograph decoded at 720x960. Outfit and Noto Sans Bengali loaded; same-origin resource paths remained prefixed. The office suite separately checked every bundled asset against the precache and maskable-icon pixels.
- External tiles were not prefetched or added to service-worker caches. Ordinary browser HTTP caching is distinct from the application's Cache Storage and was not represented as offline-map support.

Offline evidence: [../test-results/release-live/planner-offline-390x844.png](../test-results/release-live/planner-offline-390x844.png) and [../test-results/release-live/office-offline-390x844.png](../test-results/release-live/office-offline-390x844.png). The planner's offline capture was visually inspected. Its schematic warning works; R1 concerns later provider failures while still online.

### Clipboard Fallback

Two additional fresh production contexts disabled native share and supplied either a rejecting clipboard promise or a never-settling one. Both displayed the Share dialog within the assertion timeout. The link remained visible, manually selectable, and dismissible, including after Copy was clicked. The source query was dropped. The URL contained only `v`, `stops`, `start`, `preference`, `pace`, and `hours`, using the existing public stop/landmark IDs. It contained no visits, reports or GPS payload.

Evidence: [../test-results/release-live/share-rejecting-390x844.png](../test-results/release-live/share-rejecting-390x844.png) and [../test-results/release-live/share-hanging-390x844.png](../test-results/release-live/share-hanging-390x844.png). These are controlled API tests, not native share-sheet or clipboard permission-prompt sign-off. The initial production contexts reported zero uncaught application errors.

## Historical Scoped Security And Domain Review

This is the original scoped review. References to unresolved R2-R4 below describe that point in time; the current resolution evidence is recorded above. This is not a new security audit of every changed planner line.

- [useGeolocation.ts](../src/hooks/useGeolocation.ts#L1), [checkin.ts](../src/domain/checkin.ts#L1), and the App caller require explicit actions, journey/auto-check-in opt-in, foreground state, acceptable accuracy and continuous dwell. Hidden-state changes clear the watch and reset dwell. Fresh sessions do not request GPS automatically. Synthetic E2E verifies this; real OS permission and lifecycle behavior remain unverified.
- [storage.ts](../src/domain/storage.ts#L1) reconstructs an allowed schema rather than spreading input. GPS is not a persisted field. Sharing uses public IDs/settings and strips the source query; device-origin Google directions omit the origin parameter. OSM area inference remains the R4 disclosure issue.
- [crowd.ts](../src/domain/crowd.ts#L1) and [usePlanStore.ts](../src/hooks/usePlanStore.ts#L1) expire reports after two hours; timers, visibility resumption, load-time pruning and the passing browser test cover stored/UI reports. R2 remains in optimized snapshots.
- [route.ts](../src/domain/route.ts#L1) sums travel, queues and visit allowances, compares the upper total with the budget, and keeps stops until the user accepts trimming. Its bounded nearest-neighbor/2-opt result is explicitly an estimate, not a globally shortest street route.
- [travel.ts](../src/domain/travel.ts#L1) uses Graphology/Dijkstra for the static Metro graph, with access, waiting, transfers and exit costs. Service, operating hours, closures and real timings are explicitly unknown; no live transit guarantee was verified.
- Shared parsing bounds payload size, validates IDs/enums, rejects duplicate required parameters and malformed encoding, and does not evaluate markup. React text, numeric-only Leaflet labels and the office's typed DOM/evidence validator were inspected. Hostile-input unit/E2E/office tests passed; R3 is the remaining demonstrated parser/planner mismatch.
- [vite.config.ts](../vite.config.ts#L1) and the generated worker have no third-party runtime cache or analytics route. Prefix scoping, separate office offline navigation and a waiting worker without takeover/reload passed executable checks.

## Historical Publication Inventory

The inventory, counts and fingerprints in this section belong to the original artifact. Source/office changes invalidate their use as current fingerprints. The parent must review the actual final source allowlist, artifact and Git boundary before publishing.

Approved target: `ArindamChatterjee007/kolkata-puja-guide`. Approval of that target is not evidence of an existing repository, correct remote, Pages deployment or permission to publish in this review. No Git command, Git write, GitHub change, account action, parent-worktree scan or private-document scan was performed. The existing development service at port 5179 was used only by the isolated planner suite.

The former deployment workflow, now the inactive [Actions example](github-pages-actions.example.yml#L1), uploaded only the built directory. Its historical 61-file inventory passed a strict path allowlist: two HTML pages; manifest/registration/worker scripts; hashed application assets and local fonts; office JSON; four named PNG icons; the attributed photograph and license; and the two inspected static SVGs. No source maps, test traces, test screenshots, parent paths, known secret-token/private-key patterns or synthetic precise-GPS sentinels were found in the inspected artifact. Public catalogue coordinates are expected. Pattern scanning is not proof that every possible secret format is absent.

Artifact SHA-256: `903e9f656545ae7d4984ccde82db3d4430bd6f82bbf1af8e410079eaedae439e`.

[.gitignore](../.gitignore#L1) declares exclusions for dependencies, build output, test results/reports, coverage, environment files, private/temp directories and key files. Ignore rules do not untrack already tracked files or isolate a parent repository. Actual Git-root/remote/tracked-file validation remains the publishing owner's separate gate; this review deliberately did not inspect the parent worktree.

### Explicit Source Allowlist

The following is a reviewed project-only inventory, not permission to stage a wildcard or future files. It contains 70 existing candidate files plus this report, for 71 paths. Unreferenced legacy assets [react.svg](../src/assets/react.svg#L1), [vite.svg](../src/assets/vite.svg#L1), and [../src/assets/hero.png](../src/assets/hero.png) are excluded; their publication/provenance was not approved by this review.

- Root: [.gitignore](../.gitignore#L1), [.oxlintrc.json](../.oxlintrc.json#L1), [README.md](../README.md#L1), [package.json](../package.json#L1), [package-lock.json](../package-lock.json#L1), [index.html](../index.html#L1), [office.html](../office.html#L1), [playwright.config.ts](../playwright.config.ts#L1), [vite.config.ts](../vite.config.ts#L1), [vitest.config.ts](../vitest.config.ts#L1), [tsconfig.json](../tsconfig.json#L1), [tsconfig.app.json](../tsconfig.app.json#L1), [tsconfig.node.json](../tsconfig.node.json#L1).
- CI example and documentation: [github-pages-actions.example.yml](github-pages-actions.example.yml#L1), [DATA_SOURCES.md](DATA_SOURCES.md), [OFFICE.md](OFFICE.md), [RELEASE_CHECKS.md](RELEASE_CHECKS.md).
- Scripts: [generate-icons.mjs](../scripts/generate-icons.mjs#L1), [verify-office.mjs](../scripts/verify-office.mjs#L1).
- Public: [favicon.svg](../public/favicon.svg#L1), [icons.svg](../public/icons.svg#L1), [board.json](../public/office/board.json#L1), [puja-kolkata.LICENSE.md](../public/images/puja-kolkata.LICENSE.md#L1), [../public/images/puja-kolkata.webp](../public/images/puja-kolkata.webp), [../public/icons/icon-192.png](../public/icons/icon-192.png), [../public/icons/icon-512.png](../public/icons/icon-512.png), [../public/icons/icon-maskable-512.png](../public/icons/icon-maskable-512.png), [../public/icons/apple-touch-icon.png](../public/icons/apple-touch-icon.png).
- Runtime entry/style/types: [App.tsx](../src/App.tsx#L1), [App.css](../src/App.css#L1), [i18n.ts](../src/i18n.ts#L1), [index.css](../src/index.css#L1), [main.tsx](../src/main.tsx#L1), [office.ts](../src/office.ts#L1), [office.css](../src/office.css#L1), [types.ts](../src/types.ts#L1).
- Components: [AppHeader.tsx](../src/components/AppHeader.tsx#L1), [Dialogs.tsx](../src/components/Dialogs.tsx#L1), [ExploreTab.tsx](../src/components/ExploreTab.tsx#L1), [MapView.tsx](../src/components/MapView.tsx#L1), [Modal.tsx](../src/components/Modal.tsx#L1), [PandalDialog.tsx](../src/components/PandalDialog.tsx#L1), [RouteTab.tsx](../src/components/RouteTab.tsx#L1), [schematic.ts](../src/components/schematic.ts#L1), [Segmented.tsx](../src/components/Segmented.tsx#L1), [Toasts.tsx](../src/components/Toasts.tsx#L1), [uiState.ts](../src/components/uiState.ts#L1).
- Data/domain: [metro.ts](../src/data/metro.ts#L1), [pandals.ts](../src/data/pandals.ts#L1), [checkin.ts](../src/domain/checkin.ts#L1), [crowd.ts](../src/domain/crowd.ts#L1), [geo.ts](../src/domain/geo.ts#L1), [route.ts](../src/domain/route.ts#L1), [storage.ts](../src/domain/storage.ts#L1), [travel.ts](../src/domain/travel.ts#L1).
- Hooks: [useGeolocation.ts](../src/hooks/useGeolocation.ts#L1), [useMediaQuery.ts](../src/hooks/useMediaQuery.ts#L1), [useNow.ts](../src/hooks/useNow.ts#L1), [useOnlineStatus.ts](../src/hooks/useOnlineStatus.ts#L1), [usePlanStore.ts](../src/hooks/usePlanStore.ts#L1), [useToasts.ts](../src/hooks/useToasts.ts#L1).
- Tests: [planner.fixture.ts](../tests/e2e/planner.fixture.ts#L1), [planner.spec.ts](../tests/e2e/planner.spec.ts#L1), [catalogue.test.ts](../tests/unit/catalogue.test.ts#L1), [checkin.test.ts](../tests/unit/checkin.test.ts#L1), [estimates.test.ts](../tests/unit/estimates.test.ts#L1), [office.test.ts](../tests/unit/office.test.ts#L1), [route.test.ts](../tests/unit/route.test.ts#L1), [storage.test.ts](../tests/unit/storage.test.ts#L1), [travel.test.ts](../tests/unit/travel.test.ts#L1), [ui-state.test.ts](../tests/unit/ui-state.test.ts#L1).

The 70-file inventory excluding this new report has SHA-256 `44d22d563698c95c8c22e9e3121eacbc202c0135915dd5fc00c3098635a845ad`. Both fingerprints hash each sorted relative path followed by its raw file bytes, without separators. Paths are relative to the project root for the source inventory and to the build root for the artifact. Screenshots and machine test results are local, ignored evidence only; they are not in either publication allowlist and their links are not expected to resolve in the public repository.

## Pre-Recovery Limits And Release Conditions

- R1-R4 and the prior production typecheck blockers are resolved; the current local unit/build/office gates pass. Publication remains parent-controlled for the approved `ArindamChatterjee007/kolkata-puja-guide` target. No actual commit, Actions run or live Pages result has been supplied, so the board remains pending with `release: null`.
- Requested assignment was GPT-6 Astra (Copilot), with no fallback or subagents. The actual model/provider runtime was not independently verifiable. No fallback or subagent was invoked; this is not an exact-runtime certification.
- Native Bengali linguistic quality, real browser/OS location and clipboard prompts, real GPS accuracy/background lifecycle, iOS/Safari installation/offline behavior, assistive-technology review and actual travel safety remain unverified. Automated translations/layout checks are not substitutes.
- Local execution used Node 25.5.0, not the deployment workflow's Node 24. No fresh Node 24 CI run or live GitHub Pages project-prefix verification was performed.
- A first online visit and retained browser storage remain prerequisites for offline operation. Current event schedules, crowd observations, transit service and accessibility at venues are not live verified data.
- This pass owns only [office.ts](../src/office.ts), [office.html](../office.html), [board.json](../public/office/board.json), [office.test.ts](../tests/unit/office.test.ts), [verify-office.mjs](../scripts/verify-office.mjs), [README.md](../README.md), [OFFICE.md](OFFICE.md) and this report. Planner code, licenses and original photograph attribution are unchanged. Required commands generate ignored build/test evidence. No Git writes, publishing, account actions or scans outside this project were performed.
- Project files and retained app state persist across a network interruption. The assistant is not an unattended daemon and does not promise automatic model reconnection. Resume from the recorded state and recheck actual tool/network/deployment availability.

## Historical Report Validation

Report validation: PASS at `2026-10-14T22:15:17.280Z` after correcting a missing final newline detected by the first post-edit check. Verified 109 local links, 88 line anchors, 11 nonempty evidence files, 71 explicit publication paths, both screenshot dimensions, and unchanged fingerprints for 70 source/config/test/public inputs and 61 build files. Markdown checks covered headings, fences, table structure, ASCII, whitespace and final newline; this was not a dedicated full Markdown linter.
