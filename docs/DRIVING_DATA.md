# Bengal Motorcar Engine

## Status And Integration Boundary

The separate OSM motorcar engine, reproducible data builder, static chunk manifest, worker protocol and focused tests are implemented. **47 car-specific tests and `npm run build` passed** on October 18, 2026, including all 35 original checks. Strict, scoped runtime TypeScript checking also passed without skipping dependency declarations. Tests include a Vite-bundled module in a separate worker thread and an isolated Node process with a 256 MiB old-space limit. This is not a claim that the existing UI uses the engine, that browser/mobile navigation is released, or that unrelated regressions passed.

No Kolkata walking asset, App/UI, theme, route core, trip core or regional catalogue was changed. No account action, publication, source download or Overpass request was performed. The exact requested model runtime was unverified; no fallback model or subagent was used.

**Memory acceptance:** Development limit increased to fit measured dataset; not mobile-readiness acceptance. Hard limits remain 200,000 physical nodes, 400,000 directed states and 1,500,000 transitions. The unchanged dataset has 343,870 states and 628,338 legal transitions. The former Graphology object graph aborted during load at a 384 MiB old-space limit and retained **693.03 MiB after GC** in a larger reference process. Compact typed-array storage with the published `ngraph.path` search now passes the real-route and matrix checks at both 256 and 384 MiB limits. In the 256 MiB full-plan run, heap after GC was **101.16 MiB after load and at most 108.44 MiB after routing**, with **22.46 MiB of array buffers**, a **256.3 MiB GC-observed heap peak**, and **434.41 MiB maximum sampled process RSS**. Heap limits do not bound total process or browser memory. Do not advertise this as phone-ready; the UI, maps, browser overhead and real-device behavior are still unmeasured. Construct one lazily loaded worker and surface failures as car routing unavailable.

This performance pass changed only the runtime engine, worker, focused tests, this document, and justified package dependencies. The eight static chunks, manifest, canonical hash, original source files and historical public benchmark were not changed or refetched. Current measurements and command receipts are local, ignored [performance artifacts](../test-results/driving-performance/), not published geometry.

## Engine Artifacts

- [Runtime engine](../src/domain/driving.ts)
- [Worker and protocol](../src/workers/driving.worker.ts)
- [Local data builder](../scripts/build-driving.mjs)
- [Focused tests](../tests/unit/driving.test.ts)
- [Static manifest](../public/data/bengal-driving.manifest.json), naming all eight data chunks
- [License and attribution](../public/data/bengal-driving.LICENSE.md)
- [Historical public benchmark](../public/data/bengal-driving.benchmark.json)
- [Current 256 MiB full-plan measurement](../test-results/driving-performance/bounded-256.json)

## Verified Source

| Fact | Value |
| --- | --- |
| Public source | `https://download.geofabrik.de/asia/india/eastern-zone-261014.osm.pbf` |
| Original PBF bytes | 247,289,715 |
| Original PBF SHA-256 | `b2443fab468183501a9072f4ffa46d6b9c5a4ceea2e54479a51d8aec43a755b1` |
| Actual OSM replication timestamp | `2026-10-14T20:21:12Z` |
| Replication sequence | 1828 |
| Original fetch recorded at | `2026-10-15T07:33:52.168Z` |
| Selected XML export recorded at, source `builtAt` | `2026-10-17T21:27:11.298Z` |
| Final successful conversion observed at | `2026-10-18T04:20:35.555Z` |
| Selected PBF bytes / SHA-256 | 6,606,723 / `21fb8770764a824fae101828bc27376d97bc672836ee81d84a27ae682af9172f` |
| XML bytes / SHA-256 | 76,542,096 / `d2ff0760754fc06434c1fbf0c3422985c9e68e2c6187d22ee38efa8939bc4e3a` |
| Canonical dataset SHA-256 | `396b75c8d885ce8c18f6ac37250ccced710c90211ce031230d3024790cb72474` |
| Tool | osmium 1.19.1; existing fast-xml-parser and Graphology dependencies |

These are different snapshot, fetch, extraction, conversion and measurement times. They are not current traffic or festival schedules. Provenance contains only public source URLs and project-relative reproduction commands. No PBF/XML is placed in public assets.

The original PBF is pinned by size, SHA-256 and header. `osmium extract --strategy smart -S types=restriction` provides complete ways plus completed restriction relations. `osmium tags-filter ... w/highway r/type=restriction` retains referenced objects by default. The builder then combines complete city extracts with motorway/trunk/primary/secondary corridor roads and their links, retaining restriction members. Both the full highway selection and the final reduced selection passed `osmium check-refs --check-relations`.

The first full-corridor XML exceeded the 200 MiB export cap and was not published. The reduced, reference-complete selection succeeded. Current retained car intermediates total about 83.15 MB, below the 250 MiB cap; the already-existing original PBF is a separate read-only input. No new large download was made.

## Coverage

Outer clip: west **86.80**, south **22.40**, east **88.55**, north **23.90**.

| Local road area | Latitude | Longitude |
| --- | --- | --- |
| Kolkata | 22.44 to 22.65 | 88.28 to 88.49 |
| Asansol | 23.58 to 23.83 | 86.81 to 87.11 |
| Durgapur | 23.43 to 23.67 | 87.20 to 87.46 |

Inside these rectangles, eligible public motorcar highway classes are retained. Elsewhere in the outer clip, only motorway, trunk, primary, secondary and their links are retained. Tertiary/residential roads outside those rectangles are not an available local road network. Both original segment endpoints must pass the bounds and access filter. No boundary, river crossing, coordinate-coincidence or missing-node connector is invented.

Snaps are to the closest retained road polyline, capped at **120 m**, and report `accessVerified: false`. A pin inside the outer rectangle can still return `no-road`. A nearby disconnected or one-way-incompatible snap is not retried against a farther convenient road. Car geometry starts and ends at the road snaps, never at an off-road pandal centre. Snap offsets are excluded from driving distance/time and must remain separate unknown-access gaps. Parking and entrance locations are not supplied.

## Access And Restrictions

- Walking paths, footways, steps, cycleways, pedestrian roads, construction/proposed roads and highway areas are excluded, even if foot access is allowed.
- Any explicit unsupported access value on `motorcar`, `motor_vehicle`, `vehicle` or `access` excludes that direction. Only absent, `yes` or `permissive` access passes. `no`, `private`, destination/designated, customers, permits and licence-dependent access are excluded. A more permissive tag does not override an explicit restrictive tag. Destination-only roads therefore cannot become through-traffic shortcuts.
- Conditional car access and direction are excluded. Driveways, parking aisles, drive-throughs, emergency accesses and dimension/weight-restricted ways are conservatively excluded because no parking entitlement or vehicle dimensions were supplied.
- `oneway=yes/1/true`, reverse `-1/reverse`, explicit bidirectional values, implicit roundabouts and motorway direction are handled. Motorcar, motor-vehicle and vehicle-specific one-way tags have precedence over generic `oneway`. Unsupported/reversible values are excluded. Directional access tags are checked separately.
- Locked or unverified barriers break roads. Bollards, gates and unsupported barriers do not become legal car connections. Ordinary entrances and toll booths remain eligible unless another access tag blocks them.
- Via-node `no_left_turn`, `no_right_turn`, `no_straight_on`, `no_u_turn`, `no_entry`, `no_exit` and `only_*` rules are represented with previous-edge context. Motorcar/motor-vehicle/vehicle restriction tags take precedence. `except=motorcar`, `motor_vehicle` or `vehicle` exempts the car mode.
- Unsupported via-way or conditional restrictions block departures from the affected approach at the identified entry junction. An unidentifiable via-way entry blocks all retained departures from the affected from-way. This is intentionally more restrictive than the conditional schedule; it never silently ignores the restriction.
- A malformed relation without a from-way excludes its identifiable member nodes/ways entirely. Eight such relation IDs are recorded in `exclusions`, including via-only relation 7729480 at OSM node 1176978433. An entirely unlocatable car restriction aborts conversion.
- Immediate reversal of the same physical road edge is forbidden unless an applicable explicit `only_u_turn` requires it. No generic dead-end U-turn permission is inferred. `no_u_turn` on one continuing OSM way does not accidentally prohibit straight travel through its split via-node.

The dataset retains 139 routing rules: **30 supported via-node relations and 109 conservatively blocked relations**. The runtime excludes **246 additional forbidden transitions** and **330,006 immediate reversals**. Malformed-relation exclusions occur before graph construction. These are snapshot rules, not a complete legal-access guarantee; obey actual signs and police directions.

## Data And Graph

| Metric | Value |
| --- | ---: |
| Original-ID graph nodes | 140,387 |
| Original OSM roads | 82,405 |
| Compacted polylines | 178,867 |
| Directed edge-state vertices | 343,870 |
| Legal transitions | 628,338 |
| Decoded geometry points, repeated endpoints included | 864,607 |
| Static chunks | 8 |
| Sum of chunk bytes | 17,127,284 |
| Largest chunk bytes | 8,388,328 |
| Per-file PWA cap | 8,388,608 |
| Locally measured gzip sum | 5,385,256 |

Gzip is a measurement, not an assumed GitHub Pages response header. Worker loading succeeds without compression. The manifest and chunks are bounded and SHA-256 checked before graph construction; table offsets/counts must be contiguous. The canonical reconstructed dataset is checked against its separate hash. Files are never chosen from arbitrary request URLs.

Schema: `version: 1`, `mode: 'motorcar'`, `geometryEncoding: 'intermediate-delta-lat-lng-e6'`.

- `nodes`: `[osmId, lat, lng]`.
- `roads`: `[osmWayId, nameIndex, refIndex, highwayIndex, direction, flags, forwardLimitKph, backwardLimitKph, laneTagsIndex]`. Direction is `1`, `-1` or `0` for both directions. Unknown speed limits are `null`.
- `edges`: `[fromNodeIndex, toNodeIndex, metres, roadIndex, urbanFlag, intermediateDeltas]`. Deltas are alternating latitude/longitude integers in millionths of a degree, relative to the previous geometry point. Endpoints are stored in `nodes`.
- `names`, `highways`, `laneTags` are indexed tables. Road name/ref, way identity, direction, posted limits, flags and lane tags are not merged across OSM ways.
- Flag bits: bridge `1`, tunnel `2`, elevated/flyover evidence `4`, roundabout `8`, toll `16`. The elevated flag requires a bridge plus `bridge=viaduct` or a positive `layer`; a generic bridge tag alone is not called a flyover. This is mapped evidence, not a surveyed structure classification.
- Degree-two compaction retains every geometry bend at six decimal places, all original intersection identities, restriction via-nodes and necessary loop anchors. Same-coordinate nodes on different grades never become the same junction.

Routing still uses **directed car edges as vertices**. A transition encodes exactly the same legal previous-edge/next-edge pair and charges the next edge's time. Numeric state IDs, double-precision state weights, forward/reverse CSR transitions and physical-node adjacency are stored in typed arrays. Names, source tags and way identities stay in the existing indexed data tables, not repeated graph attributes. Decoded geometry is prepared on demand with a 16,384-point cache; metrics do not build geometry or instructions. No street, transition or geometry bend was removed to fit memory.

The initial compact adapter retained unmodified Graphology Dijkstra and passed fixture checks, but its per-discovered-node copied path arrays still exhausted the 384 MiB process during a matrix. The final adapter supplies the query methods consumed by the published **`ngraph.path` 1.6.1 NBA search**, with `oriented: true`, `quitFast: false` and a zero heuristic. Its predecessor records avoid those path copies. The library algorithm is unmodified; this is exact weighted search, not the package's greedy variant or a hand-written engine. Equal-cost synthetic alternatives can have different tie ordering; the three actual reference routes retain exactly the same distances, times, way IDs, segment hashes and geometry hashes, and every five-point reference matrix cell is unchanged.

The graph is constructed once per worker. Request-local origin/destination transitions preserve direction and turn context, including partial destination edges, and are removed in `finally`. There is no walking-graph reuse or straight-line substitute. `ngraph.path` is MIT-licensed. Its declaration dependency `ngraph.graph` 20.0.0 and the latter's `ngraph.events` 1.4.0 dependency are development dependencies, both BSD-3-Clause; no `ngraph.graph` object graph is allocated or bundled by this adapter.

## Runtime API

`createDrivingRouter(data: unknown): DrivingRouter` validates and constructs the graph synchronously. Use it in a worker or a test, not on the UI thread.

| Method | Contract |
| --- | --- |
| `snap(point, maxMetres = 120)` | `DrivingSnap` or `null`; larger limits throw |
| `route(origin, destination, options?)` | `DrivingRouteResult` |
| `routeMetrics(from, to, hour, options?)` | `DrivingMetrics`; hour is integer IST 0-23 |
| `clearMetricCache()` | Clears the worker-local directed metric cache |
| `summary`, `source`, `coverage` | Existing fields retained; optional `summary.performance` reports library/storage, searches and metric-cache hits |

Options are `{ departureTimestamp?, avoid?, timeProfile?, maxSnapMetres? }`. Avoid flags are `'tolls'`, `'motorways'`, `'tunnels'`. Unsupported input throws or becomes a worker error; it never produces a fallback route.

Successful results have `status: 'ok'`, `route`, `snaps: { origin, destination }`, `source`, `coverage`, `restrictionsApplied`, `warnings` and `unknownFallback: false`. The route provides:

- `strategy: 'fastest-estimated'`, `geometryKind: 'car-network'`.
- `metres`, `planningSeconds`, `estimatedSeconds: { min, max }`, `timeProfile`.
- Real ordered `geometry`, `cumulativeMetres`, source-traceable `segments` and `osmWayIds`.
- `steps` with `maneuver`, nullable `name`/`ref`, `at`, `metres`, object `flags`, optional `speedLimitKph`/`sourceLaneTags`, source way IDs and geometry indices.

Maneuvers are depart, continue, bear-left/right, turn-left/right, u-turn, enter/exit-roundabout and arrive. Turns derive from the actual incoming/outgoing polyline bearings. No exit count, recommended lane or unknown road name is invented. `sourceLaneTags` reports original tags only, not validated lane guidance. An arrive step means arrival at the road snap, not at a gate.

Unavailable results have no route or connector: `status: 'unavailable'`, `reason` of `'invalid-coordinate'`, `'outside-bounds'`, `'no-road'` or `'disconnected-or-restricted'`, nullable snaps, provenance/warnings and `unknownFallback: false`. Callers must surface this result, not silently fall back to the old geographic car estimate.

`routeMetrics` skips constructing heavy geometry/steps and returns distance, estimated seconds/minutes, planning seconds, snaps and provenance. Its bounded 1,024-entry cache uses exact directed endpoints, the normalized profile name and factors, snap limit and sorted/deduplicated avoid set. All 24 default IST hours therefore require only three weight-profile entries for a given pair, not 24 identical computations. Supplied profiles, different snap limits and different avoid sets remain distinct; input hour validation is unchanged. Results are cloned so callers cannot mutate cached metrics. A separate 128-entry snap cache is also worker-local. None of these caches persist or transmit coordinates. Reset or terminate the worker to release them. Opposite directions are separate routes and are not assumed symmetric.

### Time Model

Default nonurban baseline speeds in km/h are motorway 80, trunk 75, primary 60, secondary 50, tertiary 35, unclassified 30, residential 20, living street 10 and service 15. Links use 35 outside cities and 25 inside; ordinary urban baselines are capped at 35. A known numeric/mph posted limit caps the planning speed at 90% of that snapshot value. Unknown limits are never presented as posted limits.

Default IST factors: 08:00-10:59 urban/corridor 1.3/1.1; 17:00-21:59 1.6/1.15; otherwise 1/1. A supplied named profile can set factors from 1 to 5. These are explicit static planning assumptions, not observed congestion. Minimum duration is 90% of weighted planning time; maximum is 200% for urban segments and 160% for corridor segments. Parking, off-road access and queue time are not included. No arrival guarantee or advice to drive at an estimated speed is implied.

## Worker Protocol

The UI owner can create the worker from its own module:

```ts
const worker = new Worker(new URL('../workers/driving.worker.ts', import.meta.url), { type: 'module' })
worker.postMessage({ type: 'load', requestId: 1 })
worker.postMessage({
  type: 'route', requestId: 2,
  origin: { lat: 23.5498992, lng: 87.31662885 },
  destination: { lat: 23.5663757, lng: 87.3107181 },
  options: { departureTimestamp: Date.parse('2026-10-18T06:30:00Z') },
})
```

Plain serializable requests remain `load`, `route`, `metrics`, `matrix`, `reset`, all with nonnegative integer `requestId`. `matrix` takes `points` (1-25), an IST `hour` and optional routing options. Existing terminal responses and result shapes are retained. The descriptive `capabilities.routing` identifier now truthfully names `edge-state-ngraph-nba`; `summary.performance.library` is `ngraph.path/nba`. Error codes remain `invalid-request`, `invalid-data`, `data-unavailable`, `too-large`, `cancelled`, `routing-failed`, with `unknownFallback: false`.

`load` and `matrix` additionally accept **`progress: true`**. No extra messages are sent unless opted in. Progress is non-terminal: keep the request pending until its ordinary final response, not merely its first message. New responses are:

- `{ type: 'progress', requestId, phase: 'static', loadedBytes, totalBytes? }`: cumulative received bytes, including the manifest. The total becomes known after manifest validation. Bytes received are not proof of a verified dataset; only `loaded` follows chunk and canonical hash verification.
- `{ type: 'progress', requestId, phase: 'matrix', completedRows, totalRows, hour, row }`: the completed directed row in point order. `completedRows` is one-based. Rows are separate clones; progress consumers cannot mutate the final result. An eventual error/cancellation must not be interpreted as a complete matrix.

Direct controller callers can use the optional second argument `dispatch(request, onProgress)`. A normal worker forwards the same events through `postMessage`. Keep request IDs distinct while active and discard old request IDs after a reset/replan.

Each static file has a **25-second** deadline covering response headers and body, and controller initialization has a **55-second** total deadline. A synchronous construction completing after that total is rejected before publishing the router. Timeouts return `data-unavailable`; reset returns `cancelled` for interrupted work. A matrix has a **55-second** budget and returns `routing-failed` if exceeded, never a partial array disguised as a final result. It yields between cells and streams completed rows. `reset` aborts loading, clears the router/cache, and invalidates an in-progress matrix at its next yield; an old load cannot install its result or clear a replacement router. Tests cover stalled headers/body, aggregate deadlines, and stale-generation suppression.

JavaScript cannot preempt a currently synchronous construction/search. **`worker.terminate()` remains the immediate-stop mechanism**, including while a route is running; the UI owner should drop pending requests and create a fresh worker when needed. A worker's error/exit also needs an unavailable state. Timer bounds do not promise completion of a large matrix on a slower phone.

There is **no data URL field**. The worker derives the fixed app base from Vite's `BASE_URL` and its own origin, loads `data/bengal-driving.manifest.json`, then only the exact fixed filenames validated in that manifest. Requests use GET, omitted credentials, no referrer, same-origin mode and redirect rejection. No GPS endpoint, route telemetry, query-string coordinates, account data or storage export exists. A local HTTP test verifies all nine requests and absence of cookies/query strings.

### Core Adapter

`makeDrivingLegEstimator(router)` accepts the existing `LegRequest` shape for personal-car legs but **does not claim to implement the current `LegEstimator` return contract**. It returns an explicit unavailable result or `{ status: 'ok', estimate, driving, unknownFallback: false }`. The estimate uses `geometryKind: 'car-network'`, `provenance: 'osm-car-network'`, `offStreetAccess: 'unknown'` and `parking: 'unknown'`; it does not invent zero walking to a pandal entrance.

The current core union accepts straight connectors/street paths and requires a recommendation even when a car route is unavailable. The core owner must deliberately extend that union and handle unavailable legs before adapting this result. Do not cast the car result to `'straight-connectors'` or `'street-path'`. For fastest-tour integration, request the full directed matrix in the worker, accept only `status: 'ok'` cells as candidate car legs, and revalidate times for actual departure hours. Round trips require independently routed return legs. UI wiring, tour selection and final walking/parking integration remain outside this role's scope.

The production build copies the static assets and keeps every chunk below its existing 8 MiB limit. Because no UI imports this worker yet, that build does not emit a car-worker entry or prove an offline UI release. The independent compiled-worker test does prove the module can be bundled and executed. The UI owner must validate emitted worker and offline behavior after integration.

## Measured Routes

Current bounded benchmark: `2026-10-18T05:01:31.262Z`, local macOS Node 25.5.0 in an isolated child process with `--max-old-space-size=256 --expose-gc`, not a phone or traffic measurement. Request timestamp for the route examples is `2026-10-18T06:30:00Z`, an off-peak planning input, not an observed journey. The immutable original-worker reference was recorded at `2026-10-18T04:39:16.874Z` with a larger limit because its 384 MiB load aborted.

| Public route | Road km | Estimated min | Geometry points / steps | Route ms | Snap offsets m |
| --- | ---: | --- | --- | ---: | --- |
| SEPCO -> Marconi | 2.476 | 6.48-14.39 | 96 / 11 | 8.99 | 30.20 / 56.94 |
| Asansol International hotel -> SEPCO | 39.327 | 51.99-112.06 | 504 / 51 | 72.39 | 2.82 / 30.20 |
| Esplanade -> SEPCO | 195.045 | 179.06-343.01 | 3090 / 198 | 184.74 | 2.53 / 30.20 |

The latter routes contain real source refs including `NH19` and `NH14;NH19`; the Kolkata journey also uses mapped state/national-highway segments. These are actual routed polylines, not the straight-line distance with a detour multiplier. Directional restrictions and conservative blocks can produce substantial asymmetric detours: SEPCO -> Esplanade is 172.876 km, while Esplanade -> SEPCO is 195.045 km. Do not present these as traffic-optimal or assume a missing shorter route is illegal in reality.

The five-point demo uses Esplanade, Asansol International hotel, SEPCO, Marconi and the public Kalyaneshwari-area coordinate 23.777/86.828. All 25 matrix cells, including the identity cells, resolved without fallback. SEPCO -> Marconi -> SEPCO is 2.476 + 2.426 km; the off-street gaps still remain unknown.

| Measurement | Original Graphology reference | Compact 256 MiB run |
| --- | ---: | ---: |
| Cold fixed-HTTP load plus construction | 1,503.74 ms | 1,058.22 ms |
| Construction | 1,252.56 ms | 711.79 ms |
| Heap after load and GC | 693.03 MiB | 101.16 MiB |
| Largest observed heap | At least 1,195.73 MiB at a checkpoint | 256.3 MiB in GC samples |
| Largest sampled RSS | 1,509.48 MiB | 434.41 MiB |
| First five-point off-peak matrix | 7,490.19 ms | 2,047.48 ms |
| Repeated five-point matrix | 7.78 ms, same hour | 30.62 ms, equivalent hour 12 -> 13 |

Both loads used the same 17,135,471 fixed bytes including the manifest. The current cached matrix intentionally yields between cells for cancellation, accounting for its higher scheduling floor. Its morning/evening five-point matrices took 2,166.42/2,082.67 ms; equivalent 10:00/20:00 requests used cached profiles. A separate 384 MiB run also passed; results vary with heap pressure and host workload.

The full-plan measurement uses Esplanade plus twelve distinct points sampled from the three verified public route geometries, not private/home coordinates or claimed pandal entrances. Three 13x13 matrices took **8,142.40 ms off-peak, 6,999.18 ms morning and 6,803.11 ms evening**, about **21.94 seconds total**. All 507 cells were available with no fallback, and each request emitted 13 correlated completed rows. Some shared cells were already cached from the five-point checks. Heap after GC reached 108.44 MiB; typed-array buffers remained 22.46 MiB. After reset, heap was 8.40 MiB and array buffers about 0.07 MiB, although process RSS need not return immediately to its starting level.

These are sampled measurements, not absolute peak guarantees. The original GC trace parser did not recognize that Node trace format, so its largest checkpoint heap is a lower bound, not a measured GC peak. An old-space limit excludes young-generation heap, native memory and array buffers, explaining why the 256 MiB run can report a slightly larger total heap. Real phone memory pressure, thermal throttling, browser worker limits, offline worker integration, and main-thread/UI responsiveness still need device testing. The full-plan timing is a reason to consume progress and support cancellation, not a promise of instant planning.

## Reproduction And Checks

```sh
npm run test:unit -- tests/unit/driving.test.ts
DRIVING_HEAP_MIB=256 DRIVING_FULL_MATRIX=1 npm run test:unit -- tests/unit/driving.test.ts -t 'memory-bounded child process'
npm run build
```

The normal suite verifies every retained static chunk and the canonical hash without rereading the PBF/XML. It includes the 384 MiB child-process reference check. The optional 256 MiB/full-plan command adds three 13x13 matrices and writes only ignored [bounded measurements](../test-results/driving-performance/bounded-256.json). Unit/build/typecheck receipts are in the same local directory. No simulated viewport is used as memory evidence. The legacy `DRIVING_REPORT=1` flag would update the historical public benchmark and was not used for this pass.

For a separate deliberate source-reproduction audit, `node scripts/build-driving.mjs --check` rehashes the pinned original PBF and retained XML, verifies the source header, rebuilds in memory, and compares every public chunk and manifest. It does not download, extract or overwrite assets. That expensive source check was not rerun for this storage/search-only change.

For a deliberate fresh build, `node scripts/build-driving.mjs --build` requires the pinned original source, an empty task-owned `.private/driving-data` directory and absent output assets. It refuses to overwrite existing inputs/outputs. `--resume` handles only the known unpublished full-highway-XML stage; `--convert` converts already recorded, hash-verified XML into absent assets. The exact executed relative osmium commands are retained in manifest provenance. No arbitrary input URL or network retrieval option is provided.

Coverage includes one-way/reverse/roundabout precedence, explicit denied access, destination-through-traffic exclusion, barriers, conditional/via-way blocking, malformed relations, internal loops, grade separation, restriction-aware destination snaps, no fallback, posted limits, source lane/flyover evidence, avoid settings, normalized static profiles, source hashes, exact real-route references and returning legs. Worker tests cover fixed URLs, request correlation, opt-in byte/row progress, input bounds, bad hashes, oversized content, stalled headers/bodies, total deadlines, generation-safe reset, actual thread isolation and a bounded child process. Regional walking graphs, App/UI and core-trip integration were not changed. No full UI test suite, Git operation or publication was performed by this performance pass.