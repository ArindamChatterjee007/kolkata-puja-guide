# Trip storyboard — PujaPath round trip (design reference)

Status: design intent for the next UI role. Core contracts referenced here already exist in
`src/domain/route.ts` and `src/domain/trip.ts`; nothing below changes them. Theme and intro work is implemented
(see "Theme contract"). Area tabs, trip bar, live trip and food stops are **not yet built**.

Honesty rules that every panel inherits:

- Every duration shown before departure is an **estimate** built from catalogue walking/Metro/road
  assumptions and crowd heuristics; there is **no live traffic provider**. Labels must say "est." or "about".
- Once a trip is running, the UI shows two different kinds of time and must never blend them:
  **planned** values come from `RoutePlan` (`departureTimestamp`, `arrivalWindow`, `finishWindow`);
  **actual** values come from `TripState` timestamps (`startedAt`, `TripActivity.arrivedAt/departedAt`,
  `pausedTotalMs`) via `TripProgress.elapsedMinutes`. A planned window is a range; an actual duration is a
  measured number with the clock time it was measured at (`estimateAsOf`).
- Auto-arrival only completes a **catalogue stop** (`JourneyStop` with a known coordinate and
  `CITY_CHECKIN_BOUNDS`), never an unverified street position or a passing road segment.
- No reservations, bookings or payments are made for food or transport; a restaurant stop is a planned
  break (`TripBreak`/`PlannedBreak`) with a name and coordinate only.
- Car driving: until the road engine covers motor routes, show the walking/public estimate with an explicit
  "road time not computed" note rather than an invented driving duration.
- Photos: the 42 approved assets are historical (2009–2025) and labelled as such; nothing implies a 2026
  photo. The requested "26 photos for 2026" is an asset-research task for another role; the UI must keep
  showing year badges and never invent images.

## Panels

| # | Phase | Mobile (≤759px) | Desktop (≥760px) | Core fields read / written |
|---|-------|-----------------|------------------|----------------------------|
| 1 | **Origin** — choose home/start, transport, area | Trip bar under header shows "Start from · Transport · Area" as one tappable row; map 40dvh; panel below with Explore list | Trip bar spans full width under header; panel left (300–376px), map fills the rest | reads `START_POINTS`, `DEFAULT_ORIGIN`; writes `PlanInput.returnOrigin`, `transport`, `City` |
| 2 | **Areas** — Kolkata / Asansol / Durgapur | Segmented tabs (3 × 44px) at top of Explore; switching re-centres the map (no remount) and filters the catalogue | Same tabs above the Explore list; map `fitBounds` to the area | reads `City`; Asansol/Durgapur require their own catalogue + check-in bounds before the tabs ship |
| 3 | **Stops + Food** — media-first list, must-visit badge, add breaks | Cards with 84px photo thumb, year badge, zone chip; "Must visit" badge only for curated/sourced entries; "Add a food break" opens a small sheet (name + minutes, optional place) | Same list; selected card highlights the pin (vermilion ring, 160ms) | reads `Pandal.popularity`, media `year`; writes `stopIds`, `PlanInput.breaks` |
| 4 | **Optimized round trip** — fastest order, return home | Trip bar shows "N stops · est. total 3h 10m–3h 50m · back by 21:40–22:20"; "Optimize" is the single primary button; order change animates numbers quietly (160ms fade, no slide) | Summary at top of Your route; map draws the full loop including the return leg (dashed vermilion, Metro dotted) | writes `PlanInput.orderMode: 'fastest'`, `returnToOrigin: true`; reads `RoutePlan.finishWindow`, `arrivalWindow` per stop, `PlannedBreak` |
| 5 | **Drive + Live trip** — timer, next stop, arrival | Trip bar becomes the live strip: elapsed (actual), remaining (est.), next stop, Pause/Break; arrival tone opt-in toggle; "Arrived" confirms a catalogue stop | Live strip under header + Directions panel; map follows GPS only while the tab is visible | reads `TripProgress.elapsedMinutes`, `remainingEstimate`, `dwellRemainingMinutes`, `breakRemainingMinutes`, `TripState.status`, `lockedNextStopId`; writes `TripArrival` |
| 6 | **Return home + Done** — last leg, summary | Strip shows "Heading home · est. 25–35 min"; completion card lists planned vs actual per stop and total | Same summary in the panel; map fits the whole loop | reads `TripState.completedAt`, `activities[]`, `TripProgress.pausedMinutes` |

### Layout sketch

```mermaid
flowchart TB
  subgraph Mobile["Mobile 320-759px"]
    H1[Header 56px: brand · EN/বাংলা · theme · share · about]
    T1[Trip bar 48px: origin · transport · est. total / live timer]
    M1[Map 40dvh — full width, unframed]
    P1[Panel: Explore | Your route | Directions]
    H1 --> T1 --> M1 --> P1
  end
  subgraph Desktop["Desktop ≥760px"]
    H2[Header 68px]
    T2[Trip bar 52px, full width]
    H2 --> T2
    T2 --> P2[Panel 300-376px]
    T2 --> M2[Map fills remaining viewport]
  end
```

Trip bar rules: one reusable component (`TripBar`) under the header in every phase; 8px radius on its
controls, no nested cards, no hero image. It is the only place that shows the live timer so the number
changes in one spot. On 320px the bar truncates the origin name before anything else.

## Interaction states

| State | Trigger | Shown as | Notes |
|-------|---------|----------|-------|
| Idle | no trip | Trip bar shows plan summary (est.) | numbers fade 160ms when the order changes |
| Running | Start pressed | elapsed `mm:ss` (actual) + remaining range (est.) | elapsed uses `TripProgress.elapsedMinutes`; remaining recomputed from current position |
| Paused / Break | Pause or break starts | strip turns ochre, elapsed freezes, break countdown shows | `TripState.pausedAt`, `activeBreak.endsAt` |
| Arrival window | GPS inside check-in bounds of the locked next stop | "Arrived at X? Confirm" (manual) or auto-complete when the opt-in is on | only catalogue stops; `CITY_CHECKIN_BOUNDS` per `City` |
| Arrival tone | opt-in toggle in the live strip | short chime once per arrival, foreground only | never autoplay on load; off under reduced motion/"silent" preference; `AudioContext` created on the toggle gesture |
| Off-route / stale fix | fix older than threshold or outside bounds | hint row, no auto-complete | reuse existing "location-change"/stale hints |
| Return leg | last stop completed | strip "Heading home", map highlights return leg | `returnToOrigin` loop |
| Done | home reached or user ends trip | completion card: planned vs actual per stop | `completedAt`; nothing is uploaded |
| Offline | `navigator.onLine` false | schematic map as today; live timer continues (local clock) | no tile caching added |

## Shared API needs from core (reference only — implemented in `src/domain`)

| UI need | Field | Where |
|---------|-------|-------|
| order mode | `orderMode: 'fastest' \| 'nearest'` | `PlanInput`, `RoutePlan.orderMode` |
| transport | `transport: 'personal' \| 'public' \| 'walk'` | `types.ts` `Transport`, `PlanInput.transport` |
| home / return | `returnToOrigin`, `returnOrigin`; `TripHome` | `PlanInput`, `TripState.home` |
| area | `City = 'kolkata' \| 'asansol' \| 'durgapur'` | `types.ts`; check-in bounds `CITY_CHECKIN_BOUNDS` |
| trip active | `TripStatus` (`idle/running/paused/completed`) | `TripState.status` |
| elapsed (actual) | `elapsedMinutes`, `elapsedActiveMinutes`, `pausedMinutes` | `TripProgress` |
| remaining (estimate) | `remainingEstimate: MinuteRange`, `finishWindow: TimeWindow`, `estimateAsOf` | `TripProgress` |
| arrival window | per-stop `arrivalWindow`/`TimeWindow` | `RoutePlan` legs |
| breaks / food | `TripBreak`, `PlannedBreak`, `ActiveTripBreak` | `route.ts`, `trip.ts` |
| arrival event | `TripArrival` (`stopId`, `visitMinutes`, `method`) | `trip.ts` |

Still missing from core for the panels above: a restaurant/food catalogue per city, Asansol/Durgapur stop
catalogues, and any motor-road estimator (the storyboard labels car time as not computed until it exists).

## Theme contract (implemented)

- Store: `src/hooks/useTheme.ts` — `useTheme()` returns `{ preference, resolved, systemDark, setPreference }`.
  `preference` ∈ `light | dark | system`; `resolved` ∈ `light | dark`. Root attributes:
  `html[data-theme=light|dark]`, `html[data-theme-preference=…]`, inline `color-scheme`.
- Persistence: only the enum, key `kolkata-puja-guide:theme:v1`; `system` removes the key. Reads/writes are
  try/catch; corrupt values fall back to `system`. The plan key is never touched. `clearThemePreference()`
  is exported for an explicit "clear device data" integration if the parent wants it.
- OS scheme: `matchMedia('(prefers-color-scheme: dark)')` is subscribed only while `preference === 'system'`
  and a component is mounted. Pre-hydration, `theme.css` applies the dark scheme through
  `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }`, so Auto users see no flash. A stored
  explicit choice that differs from the OS scheme can flash for one frame before JS runs; a two-line inline
  script in `index.html` would remove that (parent-owned, optional).
- Tokens: `src/theme.css` (palettes via `light-dark()`, lowered by lightningcss in the build), `src/index.css`
  imports it first. Day = vermilion/ivory; Night = warm charcoal `#1a1617` / pearl `#f3ede5`, brass
  `#d4a24a`, teal focus `#5fd3c4`. Map pins/legend keep day colours because the tiles are the same.
- Control: `src/components/ThemeControl.tsx` in the header. ≥760px: segmented radiogroup Sun/Moon/Monitor
  (Day/Night/Auto, labels hidden 760–899px). 360–759px: one 44px cycling button (Day → Night → Auto) with
  an accessible name "Appearance: X. Next: Y". <360px: not rendered — the header is already at five 44px
  targets with the full brand name; those users follow the OS scheme.
- Motion: panels cross-fade 160ms (`--motion-quiet`); tab body enters in 200ms (`--motion-section`); map
  canvas never transitions; all disabled under `prefers-reduced-motion`.

## Map provider verdict (verified 18 Oct 2026)

- CARTO basemaps terms (updated 29 Sep 2026): an API key is mandatory (§3.b, §8); unkeyed tiles may carry a
  watermark that must not be removed (§3.d); attribution to OSM **and** CARTO required (§13); use for
  real-time turn-by-turn vehicle navigation is excluded (§14) — which the planned drive phase would be.
  Not used: no key, and §14 conflicts with phase 5.
- Esri World Dark Gray Base: "mature support, no longer updated", retiring 2029, India only to zoom 16,
  Esri Master License Agreement. Not a proven anonymous provider; not used.
- Decision: both themes draw the official OpenStreetMap standard tiles (`tile.openstreetmap.org`, attribution
  unchanged). Night applies `--map-tiles-filter: brightness(0.84) saturate(0.9)` to the tile pane — a
  uniform dimming, not an inversion or a different cartography — and themes the Leaflet chrome (zoom,
  attribution, popups, tooltips, legend). `MapView.tsx` keeps a `TILE_SOURCES` record per resolved theme so
  a verified dark provider can be added later without touching map logic; a different source must also be
  added to the e2e fixture allow-list and the privacy notice (the provider receives the viewer's IP and
  approximate map area). No service-worker caching of third-party tiles (`runtimeCaching: []`).

## Open items for the next role

1. Build `TripBar` + area tabs on top of `RoutePlan`/`TripProgress`; keep `App.tsx` structure changes minimal.
2. Add `theme.spec.ts` to the root `playwright.config.ts` `testMatch` (currently run through
   `test-results/theme-review/playwright.config.ts`).
3. Optional parent change: inline no-flash script in `index.html` for stored explicit themes.
4. Asset research: year-labelled, licensed photos for Asansol/Durgapur before the tabs ship.
