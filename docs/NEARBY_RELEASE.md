# NEARESTFIX Release

**Deployed and publicly verified.** Both reported location regressions are fixed at
[PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/). Public
acceptance completed `2026-10-17T20:17:17.227Z` (18 October IST). This record
covers only Kolkata nearby planning; multi-city routes, Asansol/Durgapur,
round-trip timers and restaurants are excluded.

Requested GPT-6 Astra (Copilot) and earlier requested Claude Fable 5.1 runtime
identities remain unverified. This release uses one controller, no fallback and no
subagents. No actual user coordinates, personal starting address, account tabs or
private parent-workspace documents are used.

## Released Scope

- Every optimized pending hop chooses the haversine-nearest remaining stop. Queue
  estimates cannot displace it. Approximate planning distance is not an actual
  street route; the existing road walking/navigation engines are unchanged.
- Use my location considers all 33 candidates, excludes visited stops and shows
  up to four within 3 km. If none are nearby, closest-listed results and their real
  approximate kilometres are explicitly labelled.
- Changing an existing route to nearby suggestions requires confirmation. Visits,
  reports and saved settings remain intact. Empty or identical selections do not
  require redundant replacement confirmation.
- An accepted location remains an in-memory planner anchor after 60 seconds or a
  rejected refresh, labelled Last known location. Re-optimization still uses that
  anchor instead of silently returning to a North landmark. A rejected first fix
  is never presented as current location. Forget/manual-start actions release it.
- Watch updates do not shuffle route order or reset manual sorting. Estimate
  freshness compares its own accepted-position snapshot with a 20 m threshold;
  a meaningful move uses the location-change hint, not the generic plan-change
  hint. Small jitter does not invalidate the estimate.
- Nearby route in use, refresh, age labels and 44px controls retain English and
  Bengali support. Raw coordinates stay out of browser storage, shared plans and
  outbound directions URLs. A person supplies their origin explicitly at use.

## Verification

The fresh release-blocker run started `2026-10-17T20:02:54.296Z` and completed
9/9 tests in 13.735 seconds, with zero failures, skips or retries. It used fresh
headless Chrome contexts, mocked Kalighat coordinates and controlled map tiles.

The selected existing planner tests cover:

1. Accepted South fix, Use nearby route, 65 seconds of ageing while offline and
   re-optimization: the South anchor, nearest order and saved plan persist with
   Last known location and no second GPS request.
2. Seven failed refreshes: denied, inaccurate, outside coverage, stale, future,
   invalid coordinate and invalid accuracy. Each retains the accepted South point
   and visits through re-optimization instead of accepting the rejected North fix.
3. Small watch jitter followed by approximately 150 m movement: route order stays
   stable, only the meaningful move invalidates the estimate, the origin-change
   hint is correct and explicit re-optimization uses the moved point.

Retained evidence, not rerun for reassurance:

- Focused location suite: 31/31, started `2026-10-17T19:34:00.793Z`.
- Full E2E: 122/122 in four files, started `2026-10-17T19:35:39.004Z`, duration
  269.431 seconds; zero failures, skips or retries.
- The earlier independent Fable review passed 14 checks but found the aged-anchor
  North fallback and incorrect movement hint. Both were subsequently fixed. Its
  final follow-up ended with a 408 request timeout after preflight only; that is
  not a follow-up pass or verified runtime attribution.

The fresh unit gate ran from `2026-10-17T20:04:48.681Z` to
`2026-10-17T20:04:51.569Z`: **249 passed in 11 files**, zero failures. Counts
come from the JSON report's assertion results and test-file entries, not its
nested describe-suite count. This includes 9 route, 44 UI-state and 57 office
tests. The first metadata edit was immediately checked by all 57 office tests.
The office fullSuite records this actual current unit checkpoint. Initial build
and office gates passed, then the final metadata snapshot passed all 57 focused
office tests and was rebuilt and checked again before publication:

| Final packaging gate | UTC start | UTC completion | Result |
| --- | --- | --- | --- |
| TypeScript/Vite build | 2026-10-17T20:07:40.175Z | 2026-10-17T20:07:43.319Z | Passed |
| Office browser checks | 2026-10-17T20:07:43.319Z | 2026-10-17T20:07:48.474Z | 10 passed |

The office used isolated Chrome `155.0.8059.82` and snapshot
`2026-10-17T20:06:26.903Z`; these checks do not claim planner acceptance. No
application source changed during release preparation. The prior 19 lint warnings
are historical, not a new lint execution.

Local receipts remain ignored under `test-results/nearby-release/`. Earlier full
results remain in `test-results/nearest-location-full.json`; the new focused
receipt is `test-results/nearby-release/local-regressions.json`.

## Publication Boundary

The isolated source baseline is `41dabcbf95e45bfa73b07ad021992e745fc4a5c4`.
The exact approved origin is
`https://github.com/ArindamChatterjee007/kolkata-puja-guide.git`.

The office release object records the **previous actual festive checkpoint**:
artifact `ce2b7dfa1656be1aa0d161f1ba700c704fc34f91`, successful built-in
[Pages run 39036548670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39036548670),
deployed `2026-10-17T13:26:42.000Z`. It is not this artifact's receipt.

Publication uses the existing `gh-pages` root branch source with `build_type:
legacy` and `.nojekyll`, normal commits and normal fast-forward pushes. No active
workflow is staged, uploaded or read; no OAuth scope or Pages setting is changed.
The four protected untracked files remain unread and excluded. Licensed media,
the 7,899,330-byte walking graph, intro and street behavior are retained.

The preparation snapshot deliberately said publication pending. The following
observed receipt supersedes that wording, while the embedded office retains its
previous-checkpoint semantics. This documentation update is source-only; no
artifact rebuild is performed to chase the receipt commit's own hash.

## Public Deployment

| Receipt | Observed value |
| --- | --- |
| Feature/build source | `5ec24a6a321df4c818cbc2ed875d4dd2b7d1ec8d` |
| Source baseline | `41dabcbf95e45bfa73b07ad021992e745fc4a5c4` |
| Published artifact | `073e860d7f0ab13893e3370ac4819ec4793e7f4d` |
| Previous artifact | `ce2b7dfa1656be1aa0d161f1ba700c704fc34f91` |
| Built-in Pages run | [39065658862](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39065658862), success |
| Deploy job completed | `2026-10-17T20:11:55Z` |
| Public verification | `2026-10-17T20:16:00.821Z` through `2026-10-17T20:17:17.227Z` |
| Browser | Fresh isolated headless Chrome `155.0.8059.82` |

The exact built-in run was watched synchronously to success. Both branches
advanced by ordinary commits and fast-forward pushes. The source commit contains
exactly 15 audited feature/documentation paths. The artifact contains 110 audited
build files plus the preserved empty `.nojekyll`. Only the two obsolete tracked
bundles `assets/main-4vt6CUS2.css` and `assets/main-CGSj2aC8.js` were removed;
Git's CSS rename display does not change the explicitly checked delete/add paths.
No source, test output, secret-shaped content, source maps or symlinks were
published in the artifact.

### Public Acceptance

All **11 acceptance groups** are verified across the initial run and two targeted
locator-only reruns. No application change or second deployment was needed.

- All **110 public files** returned HTTP 200, expected MIME types and matching
  SHA-256/byte counts. All **94 retained licensed asset files**, including the
  **42 preview/opening WebPs** and **7,899,330-byte graph**, match the previous
  festive audit. The current build has 108 unique precache targets totalling
  **11,966,517 bytes**; this is a build measurement, not a new public offline test.
- South Kalighat and North Shyambazar checks use the full 33-entry catalogue,
  exclude visits and reset old Explore filters on the first location request.
  Every pending hop and the displayed next destination are checked against
  haversine distance. The first unvisited choices were Badamtala Ashar Sangha
  in the South fixture and Sovabazar Rajbari in the North fixture.
- Cancel keeps the custom selection unchanged. Confirmed nearby replacement
  retains visits, reports and saved settings; the in-use action becomes disabled.
  Reload retains the saved plan but removes the memory-only GPS anchor.
- After Use nearby route and 65 seconds, South remains the accepted last-known
  origin through re-optimization, with no North fallback or extra GPS request.
  A failed refresh also retains that point and the saved plan.
- Fresh North refresh preserves the user-selected name sort, visits, reports and
  selected membership. Background fixes preserve manual route order. A replacement
  confirmation uses the latest accepted point rather than its opening snapshot.
- Approximately 11 m jitter retains the estimate; approximately 150 m movement
  leaves order unchanged and shows the origin-change hint, not generic stale-plan
  text. Explicit re-optimization uses the moved point at every hop.
- Rejected first denied/stale fixes do not become current or nearby. Browser
  permission remains `prompt`; all position callbacks are synthetic, and no actual
  geolocation API is invoked. Raw mock coordinates stay out of local/session
  storage and share payloads, and destination navigation omits a device origin.
- Fresh desktop/mobile captures were inspected. The 320x568 Bengali check verifies
  Last known labels, polite live status, visible primary controls, no horizontal
  overflow and non-overlapping 44px targets with the existing 43.5px fractional
  tolerance. Lower candidates scroll normally; this is not native-device sign-off.
- The public office renders **22 tasks, 8 requested/runtime-unverified roles,
  249 tests and 11 files**. Filters and empty state work. Its release object still
  identifies the previous actual festive checkpoint, not the new artifact.

Map tiles were controlled images; actual public same-origin assets were fetched.
No new claim about live OSM availability, native phone GPS, background tracking,
current event schedules, real-time crowds or globally shortest road routes is made.
The intro, images, street engine and navigation code outside the owned nearest-fix
paths were preserved. The prior 122-test full E2E result remains the broad gate.

### Retained Corrections

The initial public execution passed nine groups and stopped two on an ambiguous
test locator that matched both Navigate and Navigate somewhere. Selecting the
actual named destination button made both focused reruns pass; assertions were
not weakened. A verifier syntax check also caught an awaited lookup before any
public test ran. These were ignored QA-harness corrections, not application bugs.

Two publication guards stopped safely: trimming a leading Git status space was
corrected before source staging, and the default subprocess buffer was increased
for the graph's staged-blob hash check before artifact commit/push. The existing
staged index was revalidated and resumed without reset, add-all or force.

Detailed reports, hashes and screenshots remain ignored under
`test-results/nearby-release/`; consolidated public acceptance is in
`test-results/nearby-release/public/acceptance.json`. The original failed reports
are retained. The owned `.private/pages-publish` worktree was removed normally at
`2026-10-17T20:19:26.892Z`. All four protected files remain unchanged, unread and
untracked. No active workflow upload, OAuth reauthorization, Pages settings change,
parent-workspace access or multi-city implementation occurred.