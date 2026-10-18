# Live Checkpoint

Snapshot: `2026-10-18T11:44:39.247Z`. **Work in progress: live checkpoint with listed checks and remaining limits.** This is a record of completed, scoped live observations, not formal whole-app QA or a promise of error-free/native-device operation.

[Live planner](https://arindamchatterjee007.github.io/kolkata-puja-guide/) | [Public office](https://arindamchatterjee007.github.io/kolkata-puja-guide/office.html) | [Public snapshot](https://arindamchatterjee007.github.io/kolkata-puja-guide/office/board.json)

## Publish First, Live Only

The current user instruction supersedes older local release-gate instructions: make only approved public metadata/documentation edits, run `npm run build` for packaging, explicitly publish `main` and `gh-pages`, wait for the exact built-in Pages run, then verify the public site. No local unit, lint, type-only, office, E2E, source-validator or local-server checks are run for this update. No failed tests are modified or hidden.

Requested model: GPT-6 Astra (Copilot); runtime unverified. No fallback or subagents are used for this update. The office's eight role labels describe requested responsibilities, not running models, attendance or ongoing unattended work.

## Verified Application Checkpoint

| Field | Observed value |
| --- | --- |
| Source on main | `2a3d4b80bc4829b078d8ea00e20de174b6759af4` |
| Application artifact | `6563ad22ca33ba5c1d583096a4d0ff71021351d2` |
| Built-in Pages run | [39123546575](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39123546575), success |
| Actual deploy-job completion | `2026-10-18T11:31:39.000Z` |
| GitHub run/jobs rechecked | `2026-10-18T11:44:39.247Z` |
| Latest Home/date receipt finalized | `2026-10-18T11:41:21.303Z` |
| Packaging | `npm run build`, exit 0, completed `2026-10-18T11:29:42.458Z` |
| Pages configuration | `build_type: legacy`, source `gh-pages`, path `/` |

The office release fields deliberately retain this **verified application checkpoint**, not the later board/documentation artifact's own SHA. The metadata publication gets a separate ignored receipt after it happens; there is no invented future run or self-reference loop. Earlier commits and receipts remain history.

## Retained Live Checks

These are separate dated scopes. Do not add them into a full-suite total or treat them as rerun by this metadata update. Machine receipts remain in the ignored `test-results/` folders named below; this document provides their public, bounded summary without publishing private QA output.

### Trip Start And Return Arithmetic

Five groups passed from `2026-10-18T10:33:09.781Z` to `10:33:18.190Z`, after the production worker-prefix fix. Source `d9e32e76a9de949c0c5662edbb21fcf7c0772659`, artifact `0d3fc74fe5aff5967e14c8d91484e8dfbdd3ba4a`, successful [run 39118755210](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39118755210). Receipt: `test-results/live-trip-qa/fix1/summary.json` and `report.json`.

- Actual Skip, initially unset Home, Durgapur, Own car and a 12-hour budget were observed.
- Two curated stops and one explicit synthetic GPS-home fix were used; raw home coordinates were not persisted.
- The public project-prefixed manifest and graph chunks returned 200; three actual car-profile matrices completed before running state.
- Pending row/map indices were 1 and 2; the positive return leg was included once and the active clock advanced.
- One manual completion left next pending index 1 and history 1 of 2, without duplication.

This did not complete a 12-hour outing, a real return drive or a full all-city route matrix. The original worker-path failure and harness readiness stops remain in their earlier receipts.

### Arrival, Car Movement, Breaks And Curation

Eleven completed groups passed in the retained live controls work between `2026-10-18T11:14:55.602Z` and `11:22:10.033Z`, on the install-fix application bundle. Receipt: `test-results/live-trip-controls/LIVE_QA.md`, with its separate arrival/control reports. The original overall report remains PARTIAL because it recorded the date defect and an unfinished media-selector group; those findings are resolved by the later Home/date receipt, not retroactively erased.

- Four accurate foreground samples spanning 45 seconds at the selected pin produced one accepted automatic visit, zero manual visits and one AudioContext-spy oscillator start. Poor accuracy, simulated background dwell, duplicates and post-undo stationary fixes did not add arrivals. The accepted event was subsequently undone. Physical sound was not played or heard.
- The actual car route had 53 geometry points, 7 turn rows and 1438.0177 m, with motorcar capability and no fallback. Two synthetic route positions moved the car while Home stayed fixed and unpersisted.
- The 15-minute default break counted down once, End break cleared its remainder, and pause/resume preserved active-time arithmetic. Remaining and return times stayed explicitly estimated.
- Food suggestions disclosed sources, detours, unverified hours and no reservations. No restaurant was added, reservation made or booking submitted.
- The main list contained 17 regional pandals: 6 Asansol and 11 Durgapur. Shankarpur was present; TN school and research-only entries were excluded. Eight Kolkata archive photo labels stayed historical.

The source report also retains its actual 53 UI actions against an intended 50-action ceiling and earlier harness stops. It does not verify physical background behavior, off-route rerouting, flagged roads or added-meal accounting.

### Installation-State Fix

Eight groups passed from `2026-10-18T11:05:52.465Z` to `11:06:10.745Z`. Source `681b201382c1a5a2c63a4b7deb235e7d98917535`, artifact `2d1196189747646cd69b553fec5ece84e1ddda07`, successful [run 39121688266](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39121688266), deploy completed `11:03:48Z`. Receipt: `test-results/live-install-qa/fix-summary.json` and `fix-report.json`.

Simulated iOS/Android/desktop guidance, one-shot prompt use, dismissal/re-arm, accepted-not-installed, `appinstalled`, standalone signals and preserved plan state passed. Fullscreen and minimal-ui alone no longer claim installation. The original seven-pass/one-fail receipt remains retained. Actual native prompts, physical installation and installed-app launch were not performed.

### Home Access, Dates And Consent

The latest application checkpoint above passed eight limited live groups; receipt: `test-results/live-home-fixreceipt/summary.json` and `report.json`, finalized `11:41:21.303Z`.

- Home from default, List and Explore exposed both controls and focused the heading at 320px English and 390px Bengali/night; wide desktop stayed wide. Seven Home clicks left saved storage unchanged and made zero GPS requests.
- Shankarpur's full Instagram publication timestamp `2026-10-04T20:38:32Z` now displays 5 October 2026 in India, in EN/BN. The separate 15 October full-timestamp preview is unchanged. Genuine day-only Urvashi archive date `2022-01-03` remains 3 January 2022 in both languages.
- No iframe/provider request existed before consent. Actual Load video produced one sandboxed `youtube-nocookie` iframe; source links retained `noopener noreferrer`. The provider request was deliberately blocked after the DOM check, so actual playback remains unverified.

The earlier ambiguous media selector and two later date-selector harness failures remain documented. Their focused correction is not a whole-app rerun. Two screenshots were reviewed; this receipt recorded zero page errors. That observation is not an error-free guarantee.

### Design Review And Resolved Finding

The retained live design review ran `2026-10-18T11:16:50.468Z` to `11:17:02.519Z`; receipt: `test-results/live-design-qa/final/summary.txt` and `report.json`. Requested Claude Fable 5.1 runtime was unverified; no new review agent is started here.

The checked 320/390 EN/BN menus, 44px controls, install-dialog fit, Escape/focus handling and measured contrast passed their limited observations. Home CTA contrast measured 5.85 day / 4.58 night; dark install-note contrast measured 6.09. Its HIGH Home visibility/focus finding was real and was fixed/rechecked by the latest Home receipt. The actual Explore list had 50 pandals; an earlier zero-row harness read was not an app defect. This is not full-image contrast, native Bengali or whole-app accessibility certification.

## Catalogue And Privacy

The current main catalogue is 50 pandals: 33 Kolkata plus 17 regional theme-qualified entries (6 Asansol, 11 Durgapur). Eight food stops and four sights are separate optional categories, not extra pandals. Unlocated and unqualified research leads remain outside the main trip; TN school is absent. Regional theme plans and publication dates do not establish completed construction, capture year, opening, parking, crowds or car access. No licensed 2026 photos or verified live trending feed exist. See [regional sources](REGIONAL_SOURCES.md) and [media qualifications](REGIONAL_MEDIA.md).

All QA home/device coordinates were **synthetic**, not a user's real home; no real-home coordinate is published here. Raw GPS/home coordinates stayed in memory rather than saved plans or shared links in the observed flows. Map tiles and hosting still receive ordinary requests, and viewed tiles can disclose the viewed area. Location is explicit foreground opt-in; continuous background tracking is not promised. No reservation or booking was made.

## Historical Local Evidence

The board retains `fullSuite: 249 tests / 11 files / 2026-10-17T20:04:51.569Z` from [NEARESTFIX](NEARBY_RELEASE.md), with historical handoff labels. This is not a new execution. The earlier 122-test E2E receipt, festive receipts and [local trip handoff](TRIP_CHECKPOINT.md) remain separate history. The latter records a 158-pass/11-fail first complete attempt and a pending later execution; no pending, failed, 155-test or 171-test suite is declared passed here. Targeted live passes do not overwrite those records.

## Remaining Limits

- Physical phone GPS/heading, actual background/foreground OS behavior, real driving/return, phone memory, audible chime, native iOS/Android installation and installed-app launch remain in Review.
- Full 12-hour completion, all-city route matrices, off-route rerouting, bridge/flyover/toll/tunnel routes and added-restaurant meal accounting were not checked by these subsets.
- Live traffic/crowd/trending feeds and licensed 2026 photographs remain Blocked; current access, queues, schedules and parking are unverified.
- Social playback remains unverified. No full native-language, image-background contrast, accessibility or current offline-cache certification is claimed.
- Packaging warnings and historical memory findings remain disclosed; successful static deployment does not establish phone readiness or a zero-error application.

This metadata update closes the stale public-progress documentation task. Its final acceptance is the new exact Pages deployment followed by a fresh live office/JSON check and a limited Home/install-presence check, not additional features or local tests.