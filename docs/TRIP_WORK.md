# Trip Work Register

Saved checkpoint of the round-trip programme, written `2026-10-18` (IST morning). It records what exists on
disk, what was actually executed, and what is still missing. It is not a log of running agents, meetings or
an overnight schedule; nothing resumes on its own while the author is away.

Latest public checkpoint: the NEARESTFIX release in [NEARBY_RELEASE.md](NEARBY_RELEASE.md) (artifact
`073e860d7f0ab13893e3370ac4819ec4793e7f4d`, Pages run 39065658862, deploy job completed
`2026-10-17T20:11:55Z`). **None of the work below is live at the public URL.** Publication waits for the parent
once the trip UI is integrated and the whole project passes its gates.

## Scope

A same-day **car round trip from a chosen home/start landmark** across Kolkata, Asansol-area and Durgapur-area
stops, ordered by **fastest estimated total time** (nearest-first kept as an option), with planned food/rest
breaks, a return-home leg, a live trip timer, automatic arrival marking with an optional chime, Day/Night/Auto
themes and licensed, year-labelled media.

## Checklist (actual state)

| Item | State | What exists / evidence |
| --- | --- | --- |
| Fastest round-trip core | **Verified locally** | `src/domain/route.ts` (`orderMode` defaults to `fastest`, exact search up to five movable stops, bounded search above; `returnToOrigin` default on; `breaks` → `PlannedBreak`; `homeLeg`) and `src/domain/trip.ts` (create/start/pause/resume/arrive/leave/break/complete, `getTripProgress`, `estimateRemainingTrip`). Tests: `tests/unit/route.test.ts`, `tests/unit/trip.test.ts`; counts in [Executed checks](#executed-checks). |
| Regional places data | **Review** | 52 mapped stops: 40 pandals (33 Kolkata + 1 Asansol + 6 Durgapur), 8 food stops, 4 sights; 23 unlocated leads are excluded from every route. Eight-new-pandals-per-city goal not met. [REGIONAL_SOURCES.md](REGIONAL_SOURCES.md), `tests/unit/regional-data.test.ts`. |
| Car road engine | **Review** | Separate OSM motorcar engine, 343,870 directed edge states, chunk manifest, worker protocol; 35 car tests and the build passed on Oct 18. Observed heap ~730 MiB delta / ~772 MiB worker on desktop → **not phone-ready**; memory optimisation in progress; **no UI uses it**. [DRIVING_DATA.md](DRIVING_DATA.md), `tests/unit/driving.test.ts`. |
| Themes + header menu | **Review** | Day/Night/Auto store and tokens; header overflow menu (⋯) with Appearance on phones, About below 360px and the Work board link at every width. Scoped theme E2E through `test-results/theme-review/`; unit theme tests. [TRIP_STORYBOARD.md](TRIP_STORYBOARD.md). Not a full-suite or shared-build result. |
| Trip session UI | **Backlog** | `TripBar`, three area tabs, live strip, origin picker: **not started** (design reference only in the storyboard). Requires `App.tsx` integration by the core/parent role. |
| Automatic arrival + chime | **Backlog** | Core helpers exist: foreground check-in dwell (`src/domain/checkin.ts`, ~45 s within 90 m at ±60 m) and trip arrival/dwell state (`trip.ts`). No arrival-tone toggle, no sound asset, no UI. |
| Road/car integration | **Backlog** | Planner still shows walking/Metro/road *estimates*; the car worker is not wired. Blocked on the memory budget above. |
| Three-city release QA | **Backlog** | No Asansol/Durgapur check-in bounds, no regional E2E, no release gates run for the trip features. |
| Live feeds | **Blocked** | No verified traffic, crowd or trending backend exists; `REGIONAL_SOURCES.md` records zero verified trending places. Needs a product decision, not a fake promise. |
| 2026 photographs | **Blocked** | No licensed 2026 photo verified; the 8 historical photos (2009–2025) remain with year badges. [REGIONAL_MEDIA.md](REGIONAL_MEDIA.md), [MEDIA.md](MEDIA.md). |

## Role outputs so far

Requested models are recorded on the board (Claude Fable 5.1 for product/design, GPT-6 Astra for the rest);
**provider runtime is unverified for every role.**

- Routing/core: `route.ts` fastest round trip + breaks, `trip.ts` session state; motorcar engine, data builder,
  worker and chunked dataset (untracked, local).
- Data: `src/data/regionalPlaces.ts`, `src/data/placeInsights.ts`, regional source and media addenda.
- Design: `src/theme.css`, `src/hooks/useTheme.ts`, `ThemeControl` (group + menu variants), `AppHeader`
  overflow menu, intro polish, storyboard, this register and the office snapshot.
- Not produced by anyone yet: trip UI, arrival chime UI, car adapter in the app, regional QA, release.

## Pending dependencies

1. `App.tsx` integration of `TripBar`/area tabs/live strip (core role; parent owns the file).
2. Car engine memory proof on a phone-class budget before any UI wiring.
3. Asansol/Durgapur check-in bounds and licensed photos before the area tabs ship.
4. Parent test update: `tests/e2e/planner.spec.ts` "accessibility and responsive planner controls at 320px"
   clicks a direct About button; at 320–359px About now lives in the ⋯ menu (open the menu first). The 390px
   and 1440px variants are unaffected.
5. Full unit suite, full E2E, office checks and build on the shared tree, then publication by the parent.

## What the demo will show later

Once integrated: choose home/start → pick stops in three area tabs (Kolkata / Asansol / Durgapur) → fastest
car round trip with planned breaks and the return-home leg → live trip with a break timer → automatic arrival
marking with an optional chime → Day/Night/Auto appearance and year-labelled media.

Honesty notes that the UI must carry:

- Every pre-departure duration is an **estimate** from catalogue assumptions; there is no live traffic feed.
- Automatic arrival needs **location permission, the tab in the foreground, a fix of about ±60 m and ~45 s of
  dwell**. Background or unattended operation cannot be guaranteed; manual marking always works.
- No reservations, bookings or payments are made; a food stop is a planned break with a name and coordinate.
- Live crowd levels are unknown. No 2026 photograph exists in the catalogue.

## Executed checks

Counts here are only from runs actually executed on Oct 18 for this register; the board's full-suite figure
stays at the last released run (249 tests / 11 files) until a fresh full run happens on the shared tree.

- Theme E2E (scoped harness `test-results/theme-review/playwright.config.ts`, dev server, Chrome): **10/10**
  passed (Auto/explicit/corrupt storage, desktop axe + 44px targets in EN/BN, night dialogs/popups, 390px menu
  with Day/Night/Auto rows and keyboard loop, 320px About-in-menu + 360px inline restore, intro light/dark,
  real OSM tiles dimmed).
- Unit files run individually: `route.test.ts` **18/18**, `trip.test.ts` **9/9**, `theme.test.ts` **18/18**;
  `office.test.ts` **57/57** after the board snapshot edit.
- Header geometry probe (headless Chrome, EN and BN): 320px keeps four 44px targets with 13–16px of brand slack
  (a fifth inline target cannot fit), 360/390px keep five, 760–959px hide only the Share label so the eighth
  desktop target does not truncate the Bengali brand.
- Not rerun here: the full unit suite, the 122-test full E2E, office browser checks and the production build
  on the shared tree are reported in the board only where actually executed; the car-engine role was changing
  files concurrently.

## Continuity

- Code and data files persist in the working tree (modified and untracked paths listed by `git status`);
  nothing is committed or published by this register.
- To resume: read this file, `public/office/board.json` and [TRIP_STORYBOARD.md](TRIP_STORYBOARD.md); start
  the dev server from the project root with the explicit root argument; rerun the scoped checks above before
  claiming any count.
- Four untracked workflow/source asset paths (`.github/`, `src/assets/`, data chunks, builder) are protected
  and must not be deleted during cleanup.
