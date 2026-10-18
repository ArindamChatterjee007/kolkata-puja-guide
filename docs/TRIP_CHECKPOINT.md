# Trip Checkpoint

## Current Live Status: 18 October 2026

The trip UI, regional catalogue, motorcar planner, Home controls, themes, chime controls and installation guidance are now published, with the limited live checks recorded in [LIVE_CHECKPOINT.md](LIVE_CHECKPOINT.md). The latest verified application artifact is `6563ad22ca33ba5c1d583096a4d0ff71021351d2`, deployed by successful Pages run `39123546575` at `2026-10-18T11:31:39.000Z`.

Current user workflow: publish approved changes to `main` and Pages before live checks; `npm run build` is packaging only. No local suites, lint, type-only or local browser checks are run for this metadata update. Native-device acceptance and the other listed limits remain open.

Everything below is the **earlier local handoff, retained as historical evidence**. Its pending deployment/full-E2E statements describe that earlier role, not today's live state. Failed or pending local runs are not reclassified as passes; no 155/171/full-app pass or combined local-plus-live total is asserted.

## Historical Local Checkpoint

Date: 2026-10-18. Local implementation and verification only. The requested GPT-6 Astra (Copilot) runtime is unverified; no fallback or subagents were used. No Git, publishing, account, Career_Search, or unrelated private-document action was taken.

### Historical Release Gate

> Earlier handoff: **Ready for parent deployment: pending final complete E2E receipt.** This checkpoint is not a live release receipt. The current local app is http://127.0.0.1:5181/; port 5179 was not stopped or reused.

| Gate | Fresh result |
| --- | --- |
| Production build | PASS: TypeScript and Vite; main-DkeUly84.js and main-lq7jpHwz.css |
| Full unit suite | 394/394 PASS, 22 files, no failed or pending tests; started 2026-10-18T09:20:22.374Z |
| Full E2E suite | Final 171-test execution in progress; not yet counted as passing |
| Editor diagnostics | No errors in the explicitly checked touched application and E2E files |

Machine receipts are local under [test-results](../test-results/): [final units](../test-results/trip-checkpoint-final-unit.json) and the final E2E receipt will be recorded here when complete. The first complete E2E attempt was 158 passed / 11 failed of 169, with no skips or retries. Its failures were repaired and individually rechecked; those targeted passes do not replace a complete rerun. Two additional regional regressions were then added.

## Implemented

- Route rows and map pins share pending-only ordinals. Completing a stop displays a checkmark and renumbers the next pending stop to 1. IDs, saved order and visit records remain intact; accessible marker titles update too.
- First Start waits for the actual planner, including the three car time-profile matrices, before locking the first computed destination. It focuses the ordered home-to-stops-to-home loop and opens the map on mobile.
- Empty selection offers **Plan themed highlights**. Start can plan four curated highlights in the chosen area. Existing custom selections are never replaced by this shortcut. An over-budget result remains a visible, idle plan with explicit fit guidance; nothing is silently dropped.
- Home remains unset for a new visitor or a legacy locally saved plan. The direct GPS-home action makes one fresh request. Public starts require an explicit choice; a v1 shared link intentionally restores its encoded public start. Moving GPS changes the car marker, not the chosen home. New regional day trips default to own car and 12 hours; existing explicit budgets are preserved.
- ALL_PLACES remains the known-ID/history registry. BROWSABLE_PLACES and CURATED_PLACES include only eligibleMain regional pandals, plus the existing Kolkata, food and sight entries. Browse, map, nearby and unplanned arrival use the eligible set. Explicitly selected deprecated stops still display with known names. Unlocated leads stay under collapsed Additional research; T.N. School is absent. Manual pins remain optional, session-only and excluded from automatic arrival.
- Detail dialogs show source previews with publication dates and separate footage-year, theme-plan and historical labels. Conflicting theme evidence is not resolved by guessing. No regional photo is borrowed from Kolkata. All original licensed historical images remain unchanged.
- The six data-validated YouTube entries have click-to-load support: four associated with main-catalogue places and two confined to additional research. No iframe, remote thumbnail, social script or provider request is mounted before consent. The sole embed URL path is getRegionalPreviewEmbedUrl(id, true), using youtube-nocookie, no autoplay, a restrictive sandbox, lazy loading, an explicit title and a 160px height cap. Canonical source links remain available if playback fails. Instagram and article previews are link-only.
- Legacy tests choose home and nearest mode through actual UI controls where intended. Tracking-only fixtures have explicit budgets that cover the measured return trip. Budget tests still assert blocking and preserve all selected stops. Intro tests retain actual Skip behavior and avoid racing auto-dismiss.

## Source And Routing

The catalogue count attachment in the final regional E2E test will provide the exact raw and browsable totals. Qualifying regional pandals are 6 Asansol and 11 Durgapur, with 33 existing Kolkata pandals, 8 food stops and 4 sights.

The car regression loads and hash-checks the actual chunked road graph and independently computes outward and return expectations at the current catalogue coordinates. Marconi now uses the source-matched pandal grounds; the old generic-anchor 2.48 km assertion is not reused or relaxed with a tolerance. No driving/walking dataset, core road engine, legal notice, dependency manifest or lockfile was edited in this pass.

Media source inventory remains 32 place-linked records / 13 canonical URLs / 6 allowlisted embeds, as documented in [REGIONAL_MEDIA.md](REGIONAL_MEDIA.md). A repeated multi-puja source is not a new independent report. Theme plans and publication dates do not establish completed construction, capture date, opening, parking, crowds or car access.

## Changed Files

- Application: [App.tsx](../src/App.tsx), [App.css](../src/App.css), [i18n.ts](../src/i18n.ts), [regions.ts](../src/data/regions.ts).
- Components: [uiState.ts](../src/components/uiState.ts), [RouteTab.tsx](../src/components/RouteTab.tsx), [MapView.tsx](../src/components/MapView.tsx), [TripPanel.tsx](../src/components/TripPanel.tsx), [ExploreTab.tsx](../src/components/ExploreTab.tsx), [PandalDialog.tsx](../src/components/PandalDialog.tsx), [RegionalPreviews.tsx](../src/components/RegionalPreviews.tsx).
- Tests: [ui-state.test.ts](../tests/unit/ui-state.test.ts), [regions.test.ts](../tests/unit/regions.test.ts), [planner.fixture.ts](../tests/e2e/planner.fixture.ts), [planner.spec.ts](../tests/e2e/planner.spec.ts), [streets.spec.ts](../tests/e2e/streets.spec.ts), [trip.spec.ts](../tests/e2e/trip.spec.ts), [previews.spec.ts](../tests/e2e/previews.spec.ts), [festival.spec.ts](../tests/e2e/festival.spec.ts), [playwright.config.ts](../playwright.config.ts).
- Handoff: this document. Build and test outputs are local generated artifacts, not publication evidence.

## Remaining Limits

- Parent deployment and post-deployment verification are not performed in this role.
- Native phone GPS/heading, iOS, real travel and live crowd/queue/traffic/parking/access conditions remain unverified. Food stops are optional estimates, not bookings.
- Social-player request gating is tested with intercepted provider responses, not authenticated social playback. Provider restrictions, connectivity and future removals can still prevent playback; the public source link is the fallback.
- Build reports a roughly 684 kB minified main chunk (184 kB gzip) and 126 precache entries totaling about 28 MB. Real-phone memory, download and service-worker update behavior require release attention; no size warning was hidden.