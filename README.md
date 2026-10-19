# PujaPath

A Kolkata, Asansol and Durgapur Puja planner with a separate public task board. [Open PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/), [the office](https://arindamchatterjee007.github.io/kolkata-puja-guide/office.html), or [its public snapshot](https://arindamchatterjee007.github.io/kolkata-puja-guide/office/board.json).

**Current release workflow, 18 October 2026:** publish approved changes to `main` and Pages first, then check the live site only. `npm run build` is packaging only; no local unit, lint, type-only, office or E2E checks are run for this update.

**Work in progress: live checkpoint with listed checks and remaining limits.** Multi-city curation, Home-first car trips, return estimates, timer/break controls, automatic arrival/chime controls, themes and Add to Home Screen are built and live. Their [limited live receipts](docs/LIVE_CHECKPOINT.md) do not certify every route, a full 12-hour journey or native devices. A 1.6-second Durga opening, with Skip and Escape, plays on each real open or reload without resetting saved progress.

**Verified application checkpoint:** source `2a3d4b80bc4829b078d8ea00e20de174b6759af4`, artifact `6563ad22ca33ba5c1d583096a4d0ff71021351d2`, successful [Pages run 39123546575](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39123546575), deploy job completed `2026-10-18T11:31:39.000Z`. The latest eight-check Home/date receipt was finalized at `11:41:21.303Z`; earlier trip, control, installation and design receipts remain separately dated. The office's release fields identify this verified application checkpoint, not the later metadata artifact containing this text. Requested model runtimes remain unverified; no fallback or subagents are used for this update.

## Historical Releases: 17 October 2026

The following receipts are retained history, not new local executions or the current trip release's full-suite result.

**NEARESTFIX released:** source `5ec24a6a321df4c818cbc2ed875d4dd2b7d1ec8d`, artifact `073e860d7f0ab13893e3370ac4819ec4793e7f4d`, successful [Pages run 39065658862](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39065658862), deployed `2026-10-17T20:11:55Z`. Public checks completed `2026-10-17T20:17:17.227Z` (18 October IST). Both the aged South-anchor fallback and incorrect movement hint are fixed. All 110 public build files matched their MIME types and hashes; 11 public acceptance groups passed, with two locator-only reruns retained in [the release record](docs/NEARBY_RELEASE.md#public-deployment).

**Nearest-fix local gates:** 249 unit tests in 11 files, nine focused headless regressions, the TypeScript/Vite build and all 10 office browser checks passed. The earlier 122/122 full E2E result is retained, not rerun. QA used mocked positions only; requested model runtimes remain unverified. That historical artifact did not include the later multi-city, round-trip timer or restaurant features.

**Festival local verification:** 230 unit tests in 11 files, 89 E2E checks (12 festival, 14 preview, 33 planner and 30 street), build, 10 office checks and 16 independent production checks passed. That final E2E run had zero failures or retries; earlier failures and limits remain in [the festival release record](docs/FESTIVAL_RELEASE.md). The historical lint receipt retains 19 warnings. The office then recorded the [previous verified festive checkpoint](docs/FESTIVAL_RELEASE.md#public-deployment), deployed `2026-10-17T13:26:42.000Z`, not a self-referential artifact. Native phone GPS and requested model runtimes remain unverified.

**Public festival release:** source `b2c64206163a9d7e581f68e08a15f2a038a411ec`, artifact `ce2b7dfa1656be1aa0d161f1ba700c704fc34f91`, successful [Pages run 39036548670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39036548670), deployed `2026-10-17T13:26:42.000Z`. Public Chrome verification completed at `13:45:56.203Z`: all 110 served build files matched, real-time opening/reloads, all 33 previews, mobile controls, one real-OSM check, the 19-task office and fresh-document offline pictures passed. [The public receipt](docs/FESTIVAL_RELEASE.md#public-deployment) retains the verifier readiness failures and focused correction; this is not a claim of perfect UI or native-device acceptance.

## Planner Features

- Explore 50 main pandals: 33 Kolkata, 6 Asansol and 11 Durgapur. The 17 regional entries are theme-qualified, source-backed selections, not complete city coverage or a verified 2026 festival timetable. Eight food stops and four sights are separate optional categories. Unlocated/research-only leads are excluded from the main trip; TN school is absent.
- The original Kolkata set retains 8 historical venue photographs, 25 area-map primaries and individual area fallbacks. Regional source previews distinguish theme plans, historical material and unverified footage years; no Kolkata image is borrowed as a regional photo. [Media provenance](docs/MEDIA.md) and [regional media qualifications](docs/REGIONAL_MEDIA.md) remain explicit. No licensed 2026 photograph is claimed.
- Choose Home explicitly with **Use current location as home**, **Pick home on map**, or the public-start alternative. Home is initially unset; setting GPS home makes one requested fix. Moving location updates do not move the chosen home. New regional day trips default to **Own car** and **12 hours**; explicit existing budgets are retained.
- Edit up to 12 stops and use fastest round-trip ordering with the return-home leg and breaks, or choose nearest-first explicitly. Actual car road-profile matrices feed the planner; estimates are not live traffic or a globally optimal route guarantee. Walking and static Metro estimates remain available; bus links use an external provider.
- Start the trip, pause/resume, take a break and mark or undo a visit. Pending list/map numbers update together. Foreground opt-in automatic arrival and its optional chime are built; live evidence used synthetic fixes and an audio spy, not a physical journey or sound check. Food suggestions are qualified estimates; no reservation or booking is made.
- Nearby suggestions exclude visited stops and offer up to four within 3 km, or clearly labelled closest-listed alternatives. The original 33-candidate nearest-fix evidence remains historical, not a fresh all-city nearby test.
- Nearby route replacement requires confirmation when it changes an existing selection; saved visits and reports are retained. An accepted GPS anchor stays in memory as Last known location when aged or refresh fails. Background fixes do not reorder stops or undo manual sorting; explicit re-optimization uses the current accepted anchor. No real GPS was used in release QA.
- Navigate to the next unvisited stop without optimizing first, choose a particular stop from the route, detail view or map, or use **Navigate somewhere** for a typed destination.
- Calculate walking directions on the retained OpenStreetMap graph inside the app. Compare **Shortest** and **Lower estimated crowd**, read named turns and distances, or explicitly start foreground guidance. The separate motorcar worker is also integrated; external Maps remains a fallback and transit is not live.
- Keep route order under user control. Optimization includes a budget check and optional trimming; changed or expired crowd reports mark estimates stale until explicit re-optimization.
- Save progress locally, mark visits, undo completion and share public stop IDs/settings. Manual crowd reports expire after two hours; they are not shared live observations.
- Use English or Bengali controls, including 44-by-44-pixel language targets on narrow screens. Install the PWA where supported after a first online visit; offline use retains the app shell and saved plan, not street tiles.

## Navigation

1. Choose **Navigate** for the next unvisited stop, a stop's navigation control, or **Navigate somewhere**. Choose **Walk** and known public endpoints, or use **Pick on map** for either endpoint. Unknown typed places need a manual map pick or the external Maps fallback; there is no remote in-app geocoder.
2. Choose **Show walking routes**. The **Directions** tab displays actual mapped roads, names, turns, distances and off-street endpoint gaps. Select **Shortest** or **Lower estimated crowd**. The latter penalizes estimated hotspots around other pandals; it is not live crowd data or a crowd-free guarantee, and destination crowds cannot be avoided by that model.
3. Choose **Start walking** to opt into foreground location guidance. Follow the next turn and remaining mapped distance; off-route warnings offer recalculation. Pause when needed. Arrival means the mapped road endpoint, not a verified pandal gate, and never automatically marks that stop visited.
4. Own-car trip planning now uses the separate local motorcar worker and road geometry. **Open in Google Maps** remains an external fallback, and Metro + Bus does not imply a local live-transit service. Current-location links omit the origin; public origins produce previews. Driving estimates do not verify current traffic, access, parking or entrances.

Opening or editing the dialog never requests GPS or marks a visit. Choosing current location for local routing or starting guidance is explicit opt-in. Routes and GPS are computed locally in a worker, without an API key or remote GPS query. Typed destination text is encoded as data, kept only in the tab-local navigation draft, and excluded from saved plans and shared links; following an external link sends its chosen destination to Google Maps. Canceling an edit preserves the accepted route. Reloading discards unsaved directions.

The graphs are dated OSM snapshots, not verified current access, closures or entrances. The historical Kolkata walking check snapped 41 public points within 120 m, with BJ Block disconnected; it was not an all-region car check. The app reports unavailable instead of inventing a connector. Pins are approximate and endpoint gaps are disclosed. Auto-check-in is separate opt-in. Google Maps may need connectivity and decides whether to open its website or installed app.

## Add To Home Screen

Open the live app online, then **More > Add to Home Screen**. When the browser offers an installation prompt, the menu can show **Install app** instead.

- On iPhone/iPad, open the site in Safari, use **Share > Add to Home Screen**, then confirm **Add**.
- On Android, use **Install app** when available, or the browser menu's **Install app / Add to Home screen** option. Availability varies by browser.
- Accepting a prompt is not proof of installation. Fullscreen alone is not installed-app mode. The live installation checks simulated platform signals; no physical iOS/Android installation or installed-app launch was performed.
- Location needs explicit browser permission and a foreground app. QA kept **Remember this start on this device** off and Home/GPS coordinates session-only. The UI offers that separate opt-in for local start retention; it was not exercised by these checks. Private coordinates are excluded from shared links. OS suspension can interrupt timing and guidance; background tracking is not promised.

## Trip Albums

The [Trip albums entry](https://arindamchatterjee007.github.io/kolkata-puja-guide/photos.html) is deployed. Live checks verified two-person sharing, unchanged original downloads, private access and desktop/Bengali phone layouts on the initial artifact. A subsequently published album-counter refresh has passed packaging and signed-out live checks, but its post-upload regression remains unverified because the user retained the three-identity QA cap. The [photo release record](docs/PHOTOS_RELEASE.md) keeps these scopes separate; this is not an unrestricted frontend acceptance claim.

Open **More > Trip albums**, create an album with a display name, and share its invite link privately. Invite holders join with a name and receive a separate contributor folder, even when names match. Album members can view each other's folders and download unchanged originals; previews are separate smaller images.

Names are not verified identities. Anyone holding an invite can join. Membership belongs to an anonymous browser session and cannot be recovered by retyping a name after clearing storage. Original EXIF, including possible location data, is retained and available to album members. Originals are stored only in private Supabase Storage, never in Git or public Pages assets.

Limits are 40 MB per file, 500 MB and 50 photos per album, 900 MB project storage, and a finite 4 GB charged download allowance with shared Free-plan quota headroom. Download requests are charged twice their byte size; interrupted downloads still count. Free projects can pause after a week of inactivity. This is not unlimited hosting. See the [backend contract](docs/PHOTO_BACKEND.md) for format, quota, access and deletion details.

## Local Development

The following are optional contributor commands, not the current release gates and not executed for this metadata update. Use Node.js 24 LTS (minimum 22.12) and npm, from this project directory only:

```sh
npm ci
npm run test:unit
npm run build
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints for the planner, or append `office.html` for the task register. For the generated production build, use `npm run preview -- --host 127.0.0.1`. Service workers are generated for production, not the development server. A first online visit is required before offline use.

`npm run test:unit` covers the domain, storage, catalogue, media, street engine, navigation state and public-office schema/configuration. The nearest-fix run passed 249 tests in 11 files at `2026-10-17T20:04:51.569Z`, including 9 route, 44 UI-state, 34 engine, 25 navigation, 12 media and 57 office tests. Nine targeted release regressions passed; the previous full 122-test E2E run is retained without rerun. Build and office browser gates are recorded separately in the nearby release record. Street E2E uses the real graph with controlled GPS/tiles by default; `REAL_OSM_TILES=1` opts into provider-dependent checks. The prior lint result retains 19 warnings; lint was not rerun for this release. Public deployment and live-browser evidence are separate from local counts. Native-language and real-device acceptance remain unverified. Local execution used Node 25.5.0; Node 24 source-build CI has not run.

## Implementation

- React and TypeScript provide the planner interface; Leaflet provides the map.
- Graphology and graphology-shortest-path provide graph and routing primitives.
- The local street worker uses a 7,899,330-byte ODbL graph from the OSM snapshot of `2026-10-14T20:21:12Z`. [Street data and reproduction](docs/STREET_DATA.md) document filtering, provenance, connectivity and [licensing](public/data/Kolkata-walking.LICENSE.md). Regional PBF/XML inputs are not published.
- Outfit and Noto Sans Bengali are bundled from local font packages, not a remote font CDN.
- The separate office uses typed DOM construction and the existing Lucide React package for icons. It has no application backend or additional framework dependency.
- Vite builds three HTML entry points with a relative base. Trip albums uses a separate React entry and the pinned Supabase JavaScript SDK; backend source is not part of the static artifact. `vite-plugin-pwa` generates the manifest and same-origin precache, never private originals or API responses.

The original PNG app icons are checked in, so normal builds need no browser download. To regenerate them, install Google Chrome locally and run `npm run icons`; the existing Playwright package launches an isolated headless browser and writes only `public/icons/`. See [the office and release notes](docs/OFFICE.md) for provenance and maskable safe-area details.

The optional `npm run test:office` command uses that same isolated Chrome setup to serve only `dist` under a temporary `/kolkata-puja-guide/` prefix. It checks office controls, error handling, automated accessibility, icons, service-worker updates, and offline navigation. Screenshots and its timestamped report go to ignored `test-results/`. It does not sign off the planner or deploy anything, and is not run in this live-only release workflow.

## Data And Privacy

The main catalogue contains 50 source-backed candidate pandals, with 8 food stops and 4 sights separate from that count. The original Kolkata data retains 24 Metro nodes, 8 public starts and 4 example routes; none is a verified current 2026 festival timetable. Coordinates are approximate; travel times, queues, crowd indications, and route estimates are not live transport or safety information. Check current organizer, transit, accessibility, and local authority information before travel. [Data sources](docs/DATA_SOURCES.md), [regional qualifications](docs/REGIONAL_SOURCES.md) and the [original photograph license](public/images/puja-kolkata.LICENSE.md) remain available.

Planning state and manual reports are local to the browser. They are not a shared crowd-reporting service. The office reads a public JSON snapshot and never requests geolocation, sends telemetry, or writes project status to a server. No account, API secret, or private workspace material is needed in the published artifact.

Geolocation is an explicit foreground choice. The live QA used synthetic coordinates and left **Remember this start on this device** off; raw Home/GPS coordinates were not persisted in those flows. The UI separately offers that option for local start retention; the optional saved-start flow was not verified by these checks. GPS trails and private coordinates are excluded from shared links. External device-origin directions are delegated to the provider. Centering the map on a device location changes requested tile coordinates, so the tile provider can infer the viewed area and receives the IP address and ordinary network information. This is not a claim that no location-related information leaves the browser. GitHub Pages also receives ordinary hosting requests. There is no background auto-GPS, continuous tracking or unattended route monitoring. Third-party map tiles are **not** cached or prefetched by this project's service worker. Do not add bulk tile downloads or offline tile scraping.

## Offline And Installation Limits

The PWA precaches same-origin app resources, road workers/data, notices, bundled fonts, pictures, previews, icons and the office snapshot. The historical 17 October packaging record measured **108 unique targets / 11,966,517 bytes**; that is not the current multi-city download size. The later trip packaging record reported about 28 MB including car data, not a fresh public offline or phone-memory acceptance result. The festive release retains its separate fresh-document offline proof. The 42 original preview/opening WebPs total 2,212,474 bytes. Allow the first online download and service-worker installation to finish; retained storage is required. Area previews are static overviews, not an offline interactive basemap. The office has a separate offline shell and displays its snapshot date separately from historical local checks. A cached response is not live project analytics.

First-time installation requires connectivity; browser storage may be evicted and private browsing may disable persistence. A missing map background offline is expected because external tiles are not in the precache. Android battery optimizations and iOS suspension limit timers and background work. Neither platform promises continuous GPS or refresh while the application is backgrounded. On iOS, installation is normally through Safari's Add to Home Screen; platform and browser support varies.

Worker registration checks for updates without forcing a reload or taking over an open page. For a one-time update, close **all PujaPath and Office tabs or installed windows**, then reopen online and allow installation to finish. Existing saved routes, visits and language are retained; do not reset or clear site storage to update. See [offline verification](docs/OFFICE.md#release-gates) for release checks.

## Resuming Work

Project files and the recorded implementation survive a disconnected editing session. The planner's saved app state survives reloads while browser storage is retained; office filters are page-local. Restoring connectivity does not create an unattended assistant daemon or guarantee an automatic model reconnection. Resume from the [live checkpoint](docs/LIVE_CHECKPOINT.md) and [office snapshot](public/office/board.json), retaining the [earlier release record](docs/RELEASE_CHECKS.md) as history. Verify the actual tool, network and deployment state before continuing. A cached snapshot is not new work or a live deployment check.

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

1. For the current approved workflow, run `npm run build` for packaging only. Do not run local unit, lint, type-only, office or E2E checks. Publish the explicit approved source paths to `main` and the packaged artifact to Pages before any browser verification; retain old results only as dated history.
2. Review the generated artifact against the explicit static-file allowlist, including [FONT_LICENSES.md](public/FONT_LICENSES.md). Reject symlinks, source maps, environment files, private files and test output.
3. For subsequent releases, attach the existing owned `gh-pages` branch at its verified remote head in ignored `.private/pages-publish`; do not create another orphan history. Keep the main checkout on `main`. Verify the tracked artifact allowlist, copy only reviewed generated files from `dist`, remove only obsolete owned tracked artifact paths, and preserve the empty `.nojekyll`. Stage every added/changed/deleted artifact path explicitly, then commit and push normally. Never copy source or parent files or reuse an unrelated worktree.
4. Verify the existing Pages configuration read-only: **Deploy from a branch**, **gh-pages**, **/(root)**, with API source `{ "branch": "gh-pages", "path": "/" }` and `build_type: "legacy"`. It is already configured; no settings toggle or authentication-scope change is needed. `.nojekyll` disables Jekyll processing of the prebuilt site.
5. Record the real source SHA, published `gh-pages` SHA and GitHub-provided Pages run. Watch that exact run to completion with `gh run watch RUN_ID --repo ArindamChatterjee007/kolkata-puja-guide --exit-status`; a push alone is not a deployment receipt. Verify public HTTP responses and project-prefixed assets, then perform the parent's live-browser release checks.

GitHub normally records a built-in `pages build and deployment` Actions run for this branch-based path. It does not rerun the application's Node build. Node 24 source-build verification remains a separate pending limit.

The [Actions example](docs/github-pages-actions.example.yml) preserves the former Node 24 build/upload workflow as inactive documentation. It is **optional, not the initial release path**. Activating it requires separate approval and appropriate workflow permission before placing it in the active workflow directory or selecting a custom Actions publishing source. Do not expand authentication scopes to perform branch publishing.

The office records `publication: "deployed"` and the [verified application checkpoint](docs/LIVE_CHECKPOINT.md), artifact `6563ad22ca33ba5c1d583096a4d0ff71021351d2`. Its snapshot is not its own later metadata deployment receipt. Verify the new office render, public JSON and retained Home/install controls live after publication; keep the new source/artifact/run receipt separately in ignored release output. Never substitute fixtures or an unobserved future run, or repeatedly rebuild to chase a self-referential SHA. Pages remains `gh-pages` at `/`, with `build_type: "legacy"`; no workflow activation or authentication-scope expansion is required.
