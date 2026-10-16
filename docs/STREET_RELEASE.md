# Street Navigation Release QA

**PASS: required command gates retained; unfinished production checks completed.**

Checked on **2026-10-17 IST**. Final browser verification ended at
`2026-10-16T21:27:42.380Z` (**02:57:42 IST**). Receipt timestamps use the actual
clock; only the explicitly labelled 19:00 route-model scenario fixes page time.
Requested Copilot runtime remains unverified. The QA pass used no fallback,
subagents, private document access, Git commands or publication. Subsequent
release preparation updates public documentation and office metadata only.

## Change Overview

Existing walking directions use the retained OSM graph, named turns, modeled
alternatives and opt-in guidance. The completed QA pass changed only this summary
and ignored QA. All `test-results/` links below are **local-only ignored evidence**,
not public repository or deployed-site resources.

## Required Gates

| Command | Actual result |
| --- | --- |
| `npm run test:unit` | **218/218 passed**: 159 other tests + 34 engine + 25 navigation |
| `env -u REAL_OSM_TILES npm run test:e2e` | **63/63 passed**: 33 planner + 30 street; 0 skipped/flaky |
| `npm run build` | Passed; **69 precache entries, 9434.54 KiB** |
| `npm run test:office` | **10/10 checks passed** |
| `npm run lint` | Exit 0; **19 warnings**, no errors; warnings not cleaned up |

Exact invocations, reporter flags, timestamps and exit codes are retained in
[gates.json](../test-results/street-release/gates.json#L1).
Native results: [unit.json](../test-results/street-release/unit.json#L1),
[e2e.json](../test-results/street-release/e2e.json#L1), and
[office.json](../test-results/street-release/office.json#L1).
**These completed suites/build were not rerun.** Default E2E tiles are fixtures.

## Build Payload

The graph is **7,899,330 bytes**, below the **8,388,608-byte per-file cap**.
Its dist/public SHA-256 matches
`11331db29f1a13bbe65052f2f95e94597af2f965cb4ba6c6174da119ac794125`.
The built street worker is **89,326 bytes**; the ODbL companion is **1,760 bytes**.
The 69 listed precache entries contain six identical duplicate paths: **63 distinct
files / 9,660,970 bytes**. Every distinct file matched its built SHA-256 and byte
count in installed CacheStorage and in explicit offline service-worker responses.
All paths use `/kolkata-puja-guide/`; the worker and all three licence notices
are included. Font/image notices are **4,635 / 2,204 bytes**; all three match public
source files. This supersedes the historical size blocker in
[STREET_DATA.md](STREET_DATA.md#L1), not its provenance or access limitations.

## Original Counter Finding

The original **80 != 78** failure remains unchanged in
[production.json](../test-results/street-release/production.json#L1).
The bounded [request diagnostic](../test-results/street-release/production-request-diagnostic.json#L1)
reproduced **78 -> 80**, with no recorded local request pending at transition:

- Baseline: `2026-10-16T21:19:04.498Z`.
- `/kolkata-puja-guide/sw.js`: server begin `21:19:05.174Z`, HTTP 200.
- `/kolkata-puja-guide/workbox-2fbc6a65.js`: begin `21:19:05.178Z`, HTTP 200.

These are service-worker scripts, not graph loads: page load registers the worker,
which imports Workbox. Extra requests lacked page CDP/Playwright initiator events.
The exact browser-internal trigger remains unobserved. The original unlogged pair
cannot be retrospectively identified with certainty. The reproduction also retained
`navigator.onLine === true`: context-only offline was not transport isolation.

## Completed Production Proof

Fresh isolated **Chrome 155.0.8059.82**, project Playwright, Node **v25.5.0**, and
owned read-only loopback dist servers were used. The
[continuation receipt](../test-results/street-release/production-continuation.json#L1)
retains four completed production groups, request timing/source evidence, asset
hashes, screenshots and browser/server cleanup. No existing user server was touched.

- Controller ready, fonts settled, then an event-driven **800 ms local-static idle**
  barrier with zero pending requests; external tiles do not hold the barrier.
- Owned server closed before reload; its port returned **ECONNREFUSED**. HTTP cache
  was disabled before initial load, CacheStorage retained, external network blocked,
  and explicit CDP offline signalling verified before and after reload.
- New document and new worker recalculated Shyambazar to Bagbazar: **32 points /
  8 steps / 1,145 m**, identical online/offline geometry and steps; named roads and
  **8 m / 49 m** snap gaps verified. Document, worker, graph and all 63 assets came
  from the service worker. **Zero server requests, external successes or HTTP
  fixtures during offline acceptance**; no native GPS calls or permission prompts.
- Offline office showed its own **12-task** snapshot, not the planner fallback.
  A fresh uninstalled context failed offline as expected. Reopening the same owned
  port and restoring online transport preserved the plan and unsaved directions.
- Actual CSS **390x844, 1440x900 and 320x568 Bengali** had no horizontal overflow.
  Bengali synthetic-GPS guidance and pause controls fit above the 568 px fold;
  road-only arrival retained the 49 m entrance caveat and did not mark a visit.
- The labelled **19:00 IST model** produced distinct Kalighat/Ekdalia routes:
  **64 / 75 points**, quieter extra **150 m / 3-4 min**, with estimate/safety
  disclosures. Disconnected BJ routing removed the old path without a connector.

## Visual And Provider Evidence

**Real-map status: PASS**, exactly **one attempt**, zero retries, **1,310 ms** network
exposure within the **45,000 ms** limit: **45 successful tile responses / 29 decoded
real images**, map ready, no fallback banner. No OSM interception or cache-bypass
headers: [real-osm.json](../test-results/street-release/real-osm.json#L1).
This is one observed provider success, not a future availability guarantee.

Visually inspected: [real OSM route](../test-results/street-release/production-real-osm.png),
[server-closed offline route](../test-results/street-release/production-offline-reloaded-390-en.png),
[320px Bengali guidance](../test-results/street-release/production-following-320-bn.png),
and [source/gaps](../test-results/street-release/production-source-gaps-1440-en.png).
Route-pixel samples hit **100/100 real-map, 95/100 offline and 78/100 guidance**.
Non-provider online screenshots use controlled 1px background tiles, not real maps.
Harness-only corrections covered isolation, duplicate manifest accounting, actual
disclosure wording and native datalist interaction; no application bug was established.

## Publication And Limits

Street publication remains **pending verification** in this pre-publication record.
The updated 16-task office snapshot uses 218 tests in 10 files from the completed
local suite; its release object identifies the previous verified navigation
artifact `a6c90b7fb2302dfcc14a0cc72076eded0ece1bce`, run `38694258417`, deployed
`2026-10-15T06:45:10.000Z`. It is a checkpoint, not street-publication evidence.
Prior protected-file verification is retained, not rerun:
[publication.json](../test-results/street-release/publication.json#L1).
Future authorized publication must include street source/tests, graph and ODbL
companion, excluding protected workflow/legacy files and ignored QA artifacts.
Final metadata validation reruns unit/build/office checks; the completed 63 E2E
checks are retained without a redundant rerun. No source-data download, broad
audit or native GPS test is added.

OSM is not live crowd/closure/entrance/access verification; quieter is an estimate,
not a crowd-free guarantee. Mock GPS does not establish native GPS or field accuracy.