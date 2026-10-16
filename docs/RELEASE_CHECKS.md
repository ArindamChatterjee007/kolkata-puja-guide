# Final Release Checks

Review date: 2026-10-17 IST. Street-release UTC timestamps begin on October 16. Earlier navigation and deployment sections retain their original dates. Current office snapshot authored with `new Date().toISOString()`: `2026-10-16T21:35:51.024Z`.

**Street release: local gates PASS; publication verification is recorded separately after deployment.** [STREET_RELEASE.md](STREET_RELEASE.md) is the authoritative street QA record. R1-R4 remain resolved. The previous navigation artifact is a verified checkpoint, not the SHA of the street artifact carrying the office metadata. No fallback, subagents, active workflow or account-permission changes are authorized for this release. Historical pending states, HOLDs, reproductions and fingerprints below describe their dated revisions only.

## Street Release

The implemented feature provides in-app local walking routes on actual OSM road geometry, shortest mapped and lower-estimated-crowd alternatives, named turns, manual endpoint picking and opt-in foreground guidance. Endpoint gaps, disconnected routes, dated data and estimated crowd limits are explicit. Transit and driving continue through the external Maps fallback. The public graph is 7,899,330 bytes; regional source PBF/XML and download headers are never publication assets.

Retained completed gates: **218/218 unit tests in 10 files**, **63/63 E2E checks** (33 planner, 30 street), production build, **10/10 office checks**, and lint exit zero with **19 warnings**. Source integration has not changed since the final E2E pass. Metadata is checked immediately with the 57-test office slice, then the complete unit/build/office gates are rerun before publication. These later commands must not be relabelled as another E2E execution.

The local production proof closed its owned server before reloading and recalculating the 32-point, 8-step Shyambazar/Bagbazar route in a new worker. A separate real-OSM check passed in one bounded attempt. All receipts and screenshots linked under `test-results/` throughout these documents are **ignored local-only evidence**, not files in the public repository or deployed site.

The office's 16 tasks and 218-test result use completed local evidence. Its five-field release object deliberately references the previous verified navigation artifact `a6c90b7fb2302dfcc14a0cc72076eded0ece1bce`, run `38694258417`, deployed `2026-10-15T06:45:10.000Z`. Requested GPT-6 Astra (Copilot) and Fable assignments remain runtime-unverified. Native GPS/iOS, native Bengali acceptance, current annual schedules, live crowds, closures and entrance access remain unverified.

The user-owned untracked workflow and three legacy assets are preserved without publication. The office configuration gate checks only tracked active workflows in an isolated Git checkout, with a filesystem fallback for source archives. No workflow contents, account scopes or Pages settings are changed.

## Navigation Release

The approved navigation changes add next-unvisited and anywhere entry points, per-stop/detail/map navigation, bilingual destination cues and focus handling, Walk/Metro + Bus/Drive modes, and recommendations only from fresh plans. Current-location Google Maps URLs omit raw GPS and any explicit origin. Only current Walk/Drive links use `dir_action=navigate`; transit and public-origin previews do not. Typed Unicode destinations are bounded to 200 characters and URL-encoded, not saved or shared by PujaPath. The tab-local draft can be edited offline. Provider navigation may require connectivity; actual GPS, native Maps launching, visits and travel are not part of this release verification.

The owning handoff reports 159 unit tests, 33 planner E2E tests and a successful build before the last focus/query accessibility refinement. Its independent review was accepted with no blockers, 66 captures and nine automated accessibility states; requested model runtime remains unverified. These are handoff observations, separate from the fresh release-engineer executions below. The earlier focused receipt ran from `2026-10-15T06:31:31.123Z` for 4,770.902 ms: one `navigation encodes` check passed, zero failures/skips/flaky cases.

The first metadata edit was immediately checked with `npm run test:unit -- tests/unit/office.test.ts`. It rejected a new direct `.spec.ts` evidence link because the existing contract permits `.test.ts` links and documentation. Removing that metadata link, while retaining the release-document reference, restored **57/57 PASS**. No validator, fixture or application change was needed.

| Gate | Fresh result | UTC execution evidence |
| --- | --- | --- |
| Full unit suite | 159/159 PASS, 8 files, including 57 office tests | `2026-10-15T06:35:40.020Z` to `06:35:40.483Z` |
| TypeScript/Vite production build | PASS, Node 25.5.0 | `06:35:40.499Z` to `06:35:43.498Z` |
| Production office browser suite | 10/10 PASS, Chrome 155.0.8059.41 | `06:35:43.498Z` to `06:35:48.737Z`; suite receipt `06:35:48.543Z` |
| First full planner E2E execution | 32/33 PASS; one accessibility failure retained | Started `06:35:49.228Z`, duration 59,623.993 ms |
| Unchanged focused 320px navigation accessibility check | 1/1 PASS | `06:37:55.148Z` to `06:38:01.471Z` |
| Unchanged full planner E2E rerun | 33/33 PASS; zero failed/skipped/flaky cases in this execution | Started `06:38:22.302Z`, duration 60,762.336 ms; command completed `06:39:23.090Z` |

The first full run's `320-bn-navigation-entry` axe scan observed empty Leaflet `role="tooltip"` nodes during a map update. The same focused test and full suite passed unchanged. This is a non-reproduced transition-time accessibility finding, not a claimed code fix or a first-try clean run; its JSON and failure artifacts are retained under ignored `test-results/navigation-release/`. No arbitrary sleeps, test weakening or additional planner edits were used. The final snapshot was rebuilt and office-checked before publication. The board's `fullSuite.checkedAt` records the actual 159-test completion above; later metadata checks are not substituted for it.

Publication used the existing `legacy` branch publisher on `gh-pages` at `/`, with an empty `.nojekyll`. Pre-release main was `00d89f7485efa07867b0563d04d011e68c3043ff`; the prior metadata artifact was `4a4969c1ca9492cb98d74b6258e0cba8b4a78107`, successful run [38655925441](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38655925441), completed `2026-10-14T23:44:55.000Z`. The three untracked legacy assets remain untouched and excluded.

### Navigation Publication

| Evidence | Actual verified value |
| --- | --- |
| Public site | [PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/) and [office](https://arindamchatterjee007.github.io/kolkata-puja-guide/office.html) |
| Build source on `main` | `12ee45ebfe3b527b56ab8fe1aa5c19692cfa7e58`, `Add next-stop and anywhere navigation` |
| Published `gh-pages` artifact | `a6c90b7fb2302dfcc14a0cc72076eded0ece1bce` |
| Exact built-in Pages run | [38694258417](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38694258417), `completed` / `success` |
| Run and deploy-job completion | `2026-10-15T06:45:10.000Z` (October 15, 12:15:10 IST); `build`, `report-build-status` and `deploy` all succeeded |
| Environment deployment | `7085840665`, matching artifact SHA and public URL; successful status recorded `06:45:11Z` |
| Configuration | Unchanged `build_type: legacy`, `gh-pages`, `/`; empty `.nojekyll`, inactive workflow example |
| Reviewed inventory | 73 source files; 63 artifact files: 62 generated files plus `.nojekyll`; 14 explicitly staged feature/document/board paths |
| Final metadata validation | 57/57 office unit tests `06:41:25.781Z` to `06:41:26.494Z`; build `06:41:26.495Z` to `06:41:29.455Z`; 10/10 office checks `06:41:29.455Z` to `06:41:40.587Z`; source/build board bytes identical |
| Public HTTP verification | 62/62 files returned HTTP 200 and matched the audited SHA-256 bytes, `06:46:42.260Z` to `06:47:04.738Z` |
| Public browser verification | PASS, `06:49:46.786Z` to `06:50:08.283Z`, isolated headless Chrome 155.0.8059.41 |

Realpath, `.git` directory, exact public remotes and branch heads were asserted before Git writes. Source and artifact were committed and pushed normally without amendments or force pushes. The new owned worktree started at the prior verified artifact; only its obsolete tracked app JS/CSS assets were removed. Every generated and deleted path was explicitly staged. No environment file, test output, untracked legacy asset, source map, symlink or active workflow was published. Index/artifact pattern scans passed without printing match contents; such scanning is not a guarantee against every possible secret format. `gh run watch 38694258417 --repo ArindamChatterjee007/kolkata-puja-guide --exit-status` confirmed the actual run. No dispatch, Pages configuration or authentication-scope change was needed.

Fresh public checks covered actual CSS and PNG dimensions of **1440x900**, **390x844**, and **320x844 Bengali**. Navigation opened before Optimize; Current location omitted `origin`, Walk/Drive used `dir_action=navigate`, transit omitted it, and selected public points produced coordinate-origin previews without a navigation flag. Bengali text was encoded as one destination value, showed the explicit query cue with quiet announcements, and an empty anywhere destination received focus with no enabled external link. Dialog controls met 44-pixel bounds with no page-width overflow or overlapping control rectangles. Six desktop/mobile/Bengali/offline/office screenshots were visually inspected from the 12 captured states; no incoherent overlap was identified.

Real OSM maps reached street-ready state with **20**, **8**, and **4** decoded 256-pixel tiles in the respective viewport checks. There were **zero axe violations across eight checked public states**, zero uncaught page errors, zero console errors and zero online HTTP errors. A preventive in-context GPS guard counted **zero calls**; saved plans and visits were unchanged. Google Maps links were inspected but never followed, so native Maps launching and actual provider permissions are not certified. The earlier local tooltip finding remains recorded despite the passing public states.

The public worker controlled exactly `/kolkata-puja-guide/`. Its **66 declarations / 60 unique cache entries** matched the generated precache, including the new app bundle; every entry was same-origin and project-scoped, with no external map tiles. After the online controller was established and its page closed, a fresh offline page loaded the planner from the worker and opened Navigation. Its typed Bengali transit draft remained unchanged across offline/online/offline transitions without entering saved storage. Offline navigation then loaded the separate office shell and its actual **12-task, 159-test** snapshot. This does not promise an offline Maps service or draft survival after dismissing/reloading the dialog.

The visibly running public office loaded the exact authored snapshot, showed 12 tasks and 8 roles, and passed matching navigation search, combined Architecture/Verified filters, empty results, List and Board at 1440 and 390 pixels. Its displayed deployment links intentionally identify the **first verified release checkpoint**, not this artifact's own SHA. All isolated browser contexts were closed; shared user tabs, accounts and storage were untouched. The owned publishing worktree was removed and absence verified at `06:51:01.567Z`.

Receipts, the initial failed run and screenshots remain local under ignored `test-results/navigation-release/`. This final receipt is a **source-only documentation commit**: it does not alter the built source, artifact or board and does not require another static deployment. Requested GPT-6 Astra (Copilot) runtime remains unverified, with no fallback or subagents. Native Bengali review, actual OS/GPS and Maps prompts, iOS, live closures/timetables and Node 24 source-build execution remain unverified. Approximate pins and external-provider connectivity limits still apply.

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

The generated [pages-deployment-receipt.json](../test-results/pages-deployment-receipt.json) is retained locally in ignored test output, with the individual public-file hashes and API observations. At that point it established static delivery and hosting, not interactive live-browser sign-off. The first artifact's board was pending/null; the subsequent live check and checkpoint update below supersede that publication state. A documentation-only receipt commit does not change the build source or deployed artifact identified above. This receipt is not a new planner E2E run or Node 24 source-build execution.

## Live Release Checkpoint

Read-only GitHub checks reconfirmed successful run [38653686670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38653686670), artifact `559dbda813354f57043ed4a76d0a7c87b87909a8`, completion `2026-10-14T23:23:08.000Z`, and unchanged Pages `legacy` / `gh-pages` / `/` configuration. The first build source is `144663c05bf2e0cac75181620a00f7a0ca4fca9e`; the later receipt-only source head was `b7860e3db3751f54962dc4d15fa1f9a81369dc94`.

The prior parent public-browser check at `23:31:23.330Z` verified eight real 256-pixel OSM tiles, street-ready state, four retained stops and Optimize totals of 4h26-6h23 with a budget warning. At `23:31:34.566Z`, Bengali title/language and no overflow passed, then English was restored. No GPS permission was attempted or visit marked. These are the recorded parent observations, separate from the fresh execution below.

Fresh public execution ran **`2026-10-14T23:35:49.946Z` to `23:35:57.890Z`**, using installed headless Chrome **155.0.8059.41**, Node **25.5.0**, and a new isolated context:

- The public office had actual visible-document state, fetched the real 151-test/11-task/8-role board, derived correct counts, and passed matching search, combined status/role filters, empty results, List and Board. A hidden editor tab was not counted as live office evidence or an application defect; visibility was not overridden.
- Both office and planner had verified CSS and PNG dimensions of **1440x900** and **390x844**, with no page-width overflow. The office desktop Board and mobile List screenshots were inspected. Original captures and `first-live-check.json` are local, ignored output under `test-results/public-final/`, not public artifact files.
- The planner loaded actual decoded **256x256 OSM tiles**, with **27 HTTP 200 tile responses** across the check. Four stops remained after Optimize; EN/BN switching and Bengali layout passed. No tile fixture, GPS request, visit marking or user-browser storage change was used.
- The public HTTPS service worker was ready and controlled exactly `https://arindamchatterjee007.github.io/kolkata-puja-guide/`. Its **60 observed cache entries** were same-origin and project-scoped, with no map tiles. Offline reload retained the planner's stored four-stop route and Bengali language; offline office navigation served its own shell, cached snapshot and 11 tasks. English was restored before the isolated context closed.
- **Zero uncaught page errors, office console errors or online HTTP errors** were recorded. Offline fallback is expected and does not imply offline maps. Native Bengali, real OS/GPS, iOS, assistive technology and Node 24 source-build acceptance remain unverified.

The board now uses `publication: "deployed"`, the exact five-field first release checkpoint, and a verified `public-release` task. The offline task records completed public planner and office checks. Its `fullSuite.checkedAt` retains the actual earlier completed 151-test run; later commands are recorded separately, never inferred from role rows or handoff sums. The **23/23 planner E2E** receipt remains historical and was not rerun because planner code is unchanged.

This metadata publication contains a **prior verified release checkpoint**, not its own artifact SHA. The later source/artifact commits and built-in run must be recorded only after they exist; a source-only receipt commit does not require another artifact redeployment. The approved scope remains this isolated project, its public repository and site. Existing untracked legacy assets remain excluded and untouched.

### Release-Record Validation

The first substantive checkpoint patch was immediately followed by `npm run test:unit -- tests/unit/office.test.ts`: **57/57 PASS**. No fixture, validator, application code or office verification script needed modification; malicious-release rejection coverage remains unchanged.

| Gate | Fresh result | UTC execution evidence |
| --- | --- | --- |
| Production TypeScript/Vite build | PASS | `2026-10-14T23:40:06.268Z` to `23:40:09.219Z` |
| Full unit suite | 151/151 PASS, 8 files, including 57 office tests | `2026-10-14T23:40:09.219Z` to `23:40:10.011Z` |
| Production office browser suite | 10/10 PASS, Chrome 155.0.8059.41, deployed snapshot | `2026-10-14T23:40:10.011Z` to `23:40:15.920Z`; suite receipt `23:40:15.724Z` |
| Source/build board integrity | Byte-identical deployed checkpoint | `2026-10-14T23:40:15.940Z` |
| `git diff --check` and editor diagnostics | PASS; no errors in the four edited files | After the checkpoint patch |

The fresh machine receipts are ignored `test-results/public-final/validation.json` and `unit.json`, plus the generated office report. These executions do not replace the timestamp of the earlier full suite retained in the board. Only [README.md](../README.md), [OFFICE.md](OFFICE.md), this report and [board.json](../public/office/board.json) changed. The public-only source inventory remains 72 files; planner E2E was not rerun and its recorded 23 passes remain historical.

### Metadata Publication

The release-record source and artifact were committed and pushed normally to their existing branches, without amendments or force pushes. Root, public remote, local GitHub noreply identity, remote heads and explicit staging paths were verified. The existing owned `gh-pages` branch was attached at `559dbda813354f57043ed4a76d0a7c87b87909a8`; its tracked artifact matched the prior audit before copying the reviewed build. Only `office/board.json` and `sw.js` changed. No obsolete hashed asset needed removal, `.nojekyll` remained empty, and all other artifact bytes were unchanged. No Pages settings or authentication scopes were changed; the workflow example remains inactive.

| Evidence | Actual verified value |
| --- | --- |
| Release-record build source on `main` | `aff751ab6501b8ed278143ed5811c1b8472b4479` |
| Metadata artifact on `gh-pages` | `4a4969c1ca9492cb98d74b6258e0cba8b4a78107` |
| Built-in Pages run | [38655925441](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38655925441), `completed` / `success` |
| Run completed | `2026-10-14T23:44:55.000Z` (October 15, 05:14:55 IST) |
| Actual jobs | `build`, `report-build-status`, `deploy`: all successful; deploy job completed `23:44:54Z` |
| Environment deployment | `7079996297`, `github-pages`, `success`, matching the metadata artifact and exact public Pages URL |
| Configuration and counts | Unchanged `legacy` / `gh-pages` / `/`; 72 source files, 63 artifact files including empty `.nojekyll` |
| Scoped document/artifact preflight | 157 local documentation links passed; only board/worker artifact hashes changed; `2026-10-14T23:42:45.025Z` |

The exact artifact's commit checks and Actions API identified the real built-in run after a CLI display-name filter returned no match. `gh run watch 38655925441 --repo ArindamChatterjee007/kolkata-puja-guide --exit-status` ran synchronously and confirmed the already completed success. No guessed run, deployment retry, manual polling loop or settings change was used.

Post-publication checks ran **`2026-10-14T23:48:03.734Z` to `23:48:23.927Z`**. Fresh public board, worker and root-index requests with the public cache-buster `release-check=4a4969c1` returned HTTP 200 and matched the audited build hashes. In a new visible Chrome context, the office fetched the exact deployed board, showed 11 tasks, and exposed the actual Pages/repository/commit/run links to the **first verified release checkpoint**. Search, combined filters and Board/List worked. The planner loaded real 256-pixel OSM tiles, retained four stops after Optimize, and passed EN/BN controls with no page overflow. The new worker served the updated deployed office checkpoint offline. There were zero uncaught page errors, office console errors or online HTTP errors.

Actual desktop and mobile captures are 1440x900 and 390x844. The desktop map had 20 visible decoded tiles. Fresh fixed-size mobile captures replace the earlier resize-transition captures as visual evidence: the planner check at `23:50:22.882Z` to `23:50:25.438Z` had six decoded/HTTP-200 OSM tiles, a settled 390x337.59375 map, no loading indicator before or after capture, and no page errors. The office check at `23:51:41.049Z` to `23:51:43.732Z` had one header, 11 tasks, visible-document state, no page-width overflow and no page errors. The deployed office evidence links, fixed-size mobile office and settled mobile planner screenshots were visually inspected. These are capture corrections, not application-code changes or a new planner E2E suite.

The local ignored receipts are `test-results/public-final/deployment.json`, `post-deploy-live.json`, `post-deploy-mobile.json` and `post-deploy-office-mobile.json`, alongside the original PNGs. No test output was uploaded. This final receipt is a **source-only documentation update**: it leaves the built source, metadata artifact and board's first release checkpoint identified above unchanged, and requires no third artifact deployment. Existing untracked legacy assets remain untouched and excluded; a clean tracked worktree must not be described as having no untracked files.

## Pre-Public-Check Verification

The following local record predates the live checkpoint above. Its pending publication wording and earlier fingerprints describe that historical revision only.

| Gate | Result | Timestamp and scope |
| --- | --- | --- |
| Full unit suite | 151/151 PASS; 8 files | `2026-10-14T22:41:55.245Z` to `22:41:55.675Z`; includes 57 office tests, up from 31. Separate JSON receipt, not a sum of handoff counts. |
| Production build | PASS | TypeScript and Vite 8.3.4, Node 25.5.0; completed before the office receipt below. 65 precache declarations. Node 24 CI remains pending. |
| Production office browser suite | 10/10 PASS | Completed `2026-10-14T22:40:33.751Z`; isolated Chrome 155.0.8059.41 at the local `/kolkata-puja-guide/` prefix. |
| Lint | PASS exit 0; 6 warnings | Executed after the full unit run above. No new office errors; the same non-blocking React warnings remain. |
| Saved planner regression receipt | 23/23 PASS | Started `2026-10-14T22:31:51.782Z`, duration 36,596.49 ms, end derived from those values `2026-10-14T22:32:28.378Z`; 0 failed/skipped/flaky. Not rerun in this release-record pass. GPS and tiles are controlled fixtures. |

Machine receipts are local and ignored: [platform-unit-results.json](../test-results/platform-unit-results.json), [office-verification.json](../test-results/office-verification.json) and [planner-e2e-results.json](../test-results/planner-e2e-results.json). Later local executions can replace those files; the timestamps above identify these specific runs. They are not public-board evidence links. The pre-extension 125-test full-suite count is the owning-engineer handoff; the fresh 151-test command above includes the 26 added office cases and is the recorded current aggregate.

The office schema accepts `pending` only with `release: null`, or `deployed` only with a complete scoped Pages URL, repository, 40-hex commit, numeric workflow-run URL and canonical deployment date. Host/path/query/credential/traversal, missing/extra-field, SHA and timestamp negatives pass. The browser check renders a synthetic deployed fixture, rejects an unsafe replacement, retains valid state and restores the actual board. Those fixtures are not deployment evidence. At this historical point the actual board was pending/null; header/footer provenance followed the validated board rather than static publication text. See [OFFICE.md](OFFICE.md#recording-a-deployment) for the checkpoint procedure now applied above.

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
