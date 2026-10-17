# NEARESTFIX Release

**Publication pending.** The existing public site is the verified festive release,
not yet the nearest-fix artifact. This record covers only Kolkata nearby planning;
multi-city routes, Asansol/Durgapur, round-trip timers and restaurants are excluded.

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
The office fullSuite now records this actual current unit checkpoint. The
TypeScript/Vite build passed from `2026-10-17T20:06:18.222Z` to
`2026-10-17T20:06:21.521Z`; all **10 office browser checks** passed from
`2026-10-17T20:06:21.524Z` to `2026-10-17T20:06:27.105Z` in isolated Chrome
`155.0.8059.82`. These office checks do not claim planner acceptance. The final
board snapshot is rebuilt and office-checked before publication. The prior 19
lint warnings are historical, not a new lint execution.

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

The actual source/artifact SHA, new built-in Pages run, completion time and fresh
public verification will be added only after observation. A subsequent source-only
receipt commit will not trigger an artifact rebuild to chase its own hash.