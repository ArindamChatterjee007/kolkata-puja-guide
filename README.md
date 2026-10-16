# PujaPath

A Kolkata Puja planning application with a separate public engineering office. [Open PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/) or [the office](https://arindamchatterjee007.github.io/kolkata-puja-guide/office.html). In-app street walking directions, shortest mapped paths and lower-estimated-crowd alternatives have completed local release verification. The [street release record](docs/STREET_RELEASE.md) distinguishes that evidence from public deployment. The office retains the previous verified navigation release checkpoint, not a self-referential artifact hash.

**Street navigation:** 218 unit tests in 10 files, 63 E2E checks (33 planner and 30 street), the production build and 10 office browser checks passed. Local production verification includes real road geometry, named turns, 390px/1440px English and 320x568 Bengali layouts, and a new route calculated offline with the local server closed. Default E2E map backgrounds are fixtures; a separate bounded real-OSM check passed. Requested model runtimes remain unverified.

## Planner Features

- Explore 33 source-backed candidate pandals, with English/Bengali search, zone filters, a street map and an offline schematic. The catalogue is not a verified 2026 festival timetable.
- Start from a landmark or explicitly chosen device location, edit up to 12 stops, and compare approximate walking, Metro and road travel with queues and visit allowances. Bus travel is an external directions link, not a live bus timetable or locally computed bus itinerary.
- Navigate to the next unvisited stop without optimizing first, choose a particular stop from the route, detail view or map, or use **Navigate somewhere** for a typed destination.
- Calculate walking directions on the retained OpenStreetMap street graph inside the app. Compare **Shortest** and **Lower estimated crowd**, read named turns and distances, or explicitly start foreground GPS guidance. Driving and transit remain external-provider fallbacks.
- Keep route order under user control. Optimization includes a budget check and optional trimming; changed or expired crowd reports mark estimates stale until explicit re-optimization.
- Save progress locally, mark visits, undo completion and share public stop IDs/settings. Manual crowd reports expire after two hours; they are not shared live observations.
- Use English or Bengali controls, including 44-by-44-pixel language targets on narrow screens. Install the PWA where supported after a first online visit; offline use retains the app shell and saved plan, not street tiles.

## Navigation

1. Choose **Navigate** for the next unvisited stop, a stop's navigation control, or **Navigate somewhere**. Choose **Walk** and known public endpoints, or use **Pick on map** for either endpoint. Unknown typed places need a manual map pick or the external Maps fallback; there is no remote in-app geocoder.
2. Choose **Show walking routes**. The **Directions** tab displays actual mapped roads, names, turns, distances and off-street endpoint gaps. Select **Shortest** or **Lower estimated crowd**. The latter penalizes estimated hotspots around other pandals; it is not live crowd data or a crowd-free guarantee, and destination crowds cannot be avoided by that model.
3. Choose **Start walking** to opt into foreground location guidance. Follow the next turn and remaining mapped distance; off-route warnings offer recalculation. Pause when needed. Arrival means the mapped road endpoint, not a verified pandal gate, and never automatically marks that stop visited.
4. Metro + Bus, Drive and **Open in Google Maps** continue through an external provider. Current-location links omit the origin; public origins produce previews. No driving or live-transit engine runs inside PujaPath.

Opening or editing the dialog never requests GPS or marks a visit. Choosing current location for local routing or starting guidance is explicit opt-in. Routes and GPS are computed locally in a worker, without an API key or remote GPS query. Typed destination text is encoded as data, kept only in the tab-local navigation draft, and excluded from saved plans and shared links; following an external link sends its chosen destination to Google Maps. Canceling an edit preserves the accepted route. Reloading discards unsaved directions.

The graph is a dated OSM snapshot, not verified current access, closures or entrances. All 41 public points snap within 120 m, but BJ Block is disconnected in this dataset; the app reports unavailable instead of drawing a fictional connector. Pins are approximate and endpoint gaps are disclosed. Auto-check-in is separate opt-in. Google Maps may need connectivity and decides whether to open its website or installed app.

## Local Development

Use Node.js 24 LTS (minimum 22.12) and npm. Run these commands from this project directory only:

```sh
npm ci
npm run test:unit
npm run build
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints for the planner, or append `office.html` for the task register. For the generated production build, use `npm run preview -- --host 127.0.0.1`. Service workers are generated for production, not the development server. A first online visit is required before offline use.

`npm run test:unit` covers the domain, storage, catalogue, street engine, navigation state and public-office schema/configuration. The street release passed 218 tests in 10 files, including 34 engine, 25 navigation and 57 office tests, the TypeScript/Vite build, 10 production office browser checks and all 63 E2E checks. Street E2E uses the real graph with controlled GPS/tiles by default; `REAL_OSM_TILES=1` opts into provider-dependent checks. Lint exits zero with 19 warnings. Public deployment and live-browser evidence are separate from local counts. Native-language and real-device acceptance remain unverified. Local execution used Node 25.5.0; Node 24 source-build CI has not run.

## Implementation

- React and TypeScript provide the planner interface; Leaflet provides the map.
- Graphology and graphology-shortest-path provide graph and routing primitives.
- The local street worker uses a 7,899,330-byte ODbL graph from the OSM snapshot of `2026-10-14T20:21:12Z`. [Street data and reproduction](docs/STREET_DATA.md) document filtering, provenance, connectivity and [licensing](public/data/Kolkata-walking.LICENSE.md). Regional PBF/XML inputs are not published.
- Outfit and Noto Sans Bengali are bundled from local font packages, not a remote font CDN.
- The separate office uses typed DOM construction and the existing Lucide React package for icons. It has no application backend or additional framework dependency.
- Vite builds both HTML entry points with a relative base. `vite-plugin-pwa` generates the manifest and same-origin precache.

The original PNG app icons are checked in, so normal builds need no browser download. To regenerate them, install Google Chrome locally and run `npm run icons`; the existing Playwright package launches an isolated headless browser and writes only `public/icons/`. See [the office and release notes](docs/OFFICE.md) for provenance and maskable safe-area details.

After a production build, `npm run test:office` uses that same isolated Chrome setup to serve only `dist` under a temporary `/kolkata-puja-guide/` prefix. It checks office controls, error handling, automated accessibility, icons, service-worker updates, and offline navigation. Screenshots and its timestamped report go to ignored `test-results/`. It does not sign off the planner or deploy anything.

## Data And Privacy

The catalogue contains 33 source-backed **candidate locations**, 24 Metro nodes, 8 starts and 4 example routes, not a verified current 2026 festival timetable. Coordinates are approximate; travel times, queues, crowd indications, and route estimates are not live transport or safety information. Check current organizer, transit, accessibility, and local authority information before travel. [Data sources and limitations](docs/DATA_SOURCES.md) describe coverage; the [original photograph attribution and license](public/images/puja-kolkata.LICENSE.md) remain unchanged.

Planning state and manual reports are local to the browser. They are not a shared crowd-reporting service. The office reads a public JSON snapshot and never requests geolocation, sends telemetry, or writes project status to a server. No account, API secret, or private workspace material is needed in the published artifact.

Geolocation is an explicit foreground choice. Raw GPS coordinates stay in memory for local walking calculations and guidance; they are not saved in the plan, included in shared links or added to outbound directions URLs. External device-origin directions are delegated to the provider. Centering the map on a device location changes requested tile coordinates, so the tile provider can infer the viewed area and receives the IP address and ordinary network information. This is not a claim that no location-related information leaves the browser. GitHub Pages also receives ordinary hosting requests. There is no background auto-GPS, continuous tracking or unattended route monitoring. Third-party map tiles are **not** cached or prefetched by this project's service worker. Do not add bulk tile downloads or offline tile scraping.

## Offline And Installation Limits

The PWA precaches the same-origin shell, street worker, approximately 8 MB walking graph and ODbL notice, bundled fonts, images, icons, and office snapshot. Allow the first online download and service-worker installation to finish; later local walking calculations can work offline while those assets remain stored. This is not an offline basemap. After installation of the worker, `/office.html` remains the office offline, not the planner fallback. The office displays the build snapshot's own date separately from the last successful local check. A cached response is not live project analytics.

First-time installation requires connectivity; browser storage may be evicted and private browsing may disable persistence. A missing map background offline is expected because external tiles are not in the precache. Android battery optimizations and iOS suspension limit timers and background work. Neither platform promises continuous GPS or refresh while the application is backgrounded. On iOS, installation is normally through Safari's Add to Home Screen; platform and browser support varies.

Worker registration checks for updates without forcing a reload or taking over an open page. Close all PujaPath tabs or installed windows and reopen online to activate a waiting update. Save or export useful planning state before clearing site data. See [offline verification](docs/OFFICE.md#release-gates) for release checks.

## Resuming Work

Project files and the recorded implementation survive a disconnected editing session. The planner's saved app state survives reloads while browser storage is retained; office filters are page-local. Restoring connectivity does not create an unattended assistant daemon or guarantee an automatic model reconnection. Resume from the current [release record](docs/RELEASE_CHECKS.md) and [office snapshot](public/office/board.json), then verify the actual tool, network and deployment state before continuing. A cached snapshot is not new work or a live deployment check.

## Publication Boundary

The approved public repository is [ArindamChatterjee007/kolkata-puja-guide](https://github.com/ArindamChatterjee007/kolkata-puja-guide); its Pages address is [PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/). A URL alone does not prove a successful deployment. Initial publication uses GitHub's built-in **Deploy from a branch**, with prebuilt static files on `gh-pages` at `/` and API `build_type: "legacy"`.

This project has an isolated Git root inside a private parent workspace. **Never stage, scan or publish the parent repository. Do not use `git add .` or `git add -A`.** A child ignore file or `git -C` alone does not establish isolation.

From the main project directory, verify the boundary before every Git write:

```sh
project_root="$(pwd -P)"
test "$(basename "$project_root")" = "kolkata-puja-guide" || test "$(basename "$project_root")" = "Kolkata_Puja_Guide"
test -d .git && test ! -L .git
test "$(git rev-parse --show-toplevel)" = "$project_root"
test "$(git remote get-url origin)" = "https://github.com/ArindamChatterjee007/kolkata-puja-guide.git"
test "$(git remote get-url --push origin)" = "https://github.com/ArindamChatterjee007/kolkata-puja-guide.git"
```

Stop on any mismatch or unexpected remote history. Stage explicit reviewed paths only, including deletions. The source branch must contain no active workflow files. Both branches now have published history: use normal new commits, never amend that history, force-push or replace another contributor's work.

### Branch Publishing

1. Run `npm run test:unit`, `npm run build` and `npm run test:office`. Retain fresh timestamps; earlier planner E2E results are not a new execution.
2. Review the generated artifact against the explicit static-file allowlist, including [FONT_LICENSES.md](public/FONT_LICENSES.md). Reject symlinks, source maps, environment files, private files and test output.
3. For subsequent releases, attach the existing owned `gh-pages` branch at its verified remote head in ignored `.private/pages-publish`; do not create another orphan history. Keep the main checkout on `main`. Verify the tracked artifact allowlist, copy only reviewed generated files from `dist`, remove only obsolete owned tracked artifact paths, and preserve the empty `.nojekyll`. Stage every added/changed/deleted artifact path explicitly, then commit and push normally. Never copy source or parent files or reuse an unrelated worktree.
4. Verify the existing Pages configuration read-only: **Deploy from a branch**, **gh-pages**, **/(root)**, with API source `{ "branch": "gh-pages", "path": "/" }` and `build_type: "legacy"`. It is already configured; no settings toggle or authentication-scope change is needed. `.nojekyll` disables Jekyll processing of the prebuilt site.
5. Record the real source SHA, published `gh-pages` SHA and GitHub-provided Pages run. Watch that exact run to completion with `gh run watch RUN_ID --repo ArindamChatterjee007/kolkata-puja-guide --exit-status`; a push alone is not a deployment receipt. Verify public HTTP responses and project-prefixed assets, then perform the parent's live-browser release checks.

GitHub normally records a built-in `pages build and deployment` Actions run for this branch-based path. It does not rerun the application's Node build. Node 24 source-build verification remains a separate pending limit.

The [Actions example](docs/github-pages-actions.example.yml) preserves the former Node 24 build/upload workflow as inactive documentation. It is **optional, not the initial release path**. Activating it requires separate approval and appropriate workflow permission before placing it in the active workflow directory or selecting a custom Actions publishing source. Do not expand authentication scopes to perform branch publishing.

The office records `publication: "deployed"` and the previous verified navigation release checkpoint. Follow [recording a deployment](docs/OFFICE.md#recording-a-deployment) for later checkpoints; never substitute fixture values or an unobserved future run. A metadata artifact necessarily contains evidence of an earlier verified release. Record its own later publication separately rather than repeatedly rebuilding to chase its own SHA.
