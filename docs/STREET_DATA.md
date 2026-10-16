# Kolkata Walking Data And Street Engine

## Verified Status

**PASS: retained real-data build, V2 schema, 34 street tests and TypeScript compilation.** The final measured engine run was **2026-10-15T21:45:58.476Z**, or October 16, 03:15:58.476 IST. This checkpoint supersedes the earlier Overpass source blocker; it is not the OSM snapshot date.

The existing [street JSON](../public/data/kolkata-walking.json), PBF, clipped extracts and XML were reused without downloading or replacing them. The new read-only `--check` hashes the retained PBF/XML, checks the actual PBF header, converts the XML in memory and compares the entire V2 JSON byte-for-byte with the existing asset. It returned **PASS in 3,715.512 ms**. No miniature/synthetic map replaced the real asset.

**Integration blocker resolved:** the original Workbox 2 MiB limit is historical. The current build uses an **8 MiB (8,388,608-byte) per-file cap**, includes the **7,899,330-byte** graph, street worker and ODbL notice, and passed production offline routing with its owned server closed. See [the street release evidence](STREET_RELEASE.md). The retained engine recovery itself did not change UI/PWA/office code or publish anything; its provenance measurements below remain unchanged.

Full measurements and all 41 point records are in [the validation report](../test-results/street-data-validation.json), an ignored local-only receipt, not a public resource. Source, importer, tests and license are [streets.ts](../src/domain/streets.ts), [build-streets.mjs](../scripts/build-streets.mjs), [streets.test.ts](../tests/unit/streets.test.ts) and [the ODbL notice](../public/data/Kolkata-walking.LICENSE.md).

## Source Provenance

The source is the public [Geofabrik Eastern Zone extract](https://download.geofabrik.de/asia/india/eastern-zone-latest.osm.pbf), linked from the [official India page](https://download.geofabrik.de/asia/india.html). The listing's "235 MB" corresponds to the retained **247,289,715 bytes**, approximately 235.83 MiB, below the authorized 350,000,000-byte bound. The importer imposes a stricter 349,999,999-byte cap.

| Evidence | Verified value |
| --- | --- |
| Resolved public download | `https://download.geofabrik.de/asia/india/eastern-zone-261014.osm.pbf` |
| Retained response | HTTP 200; Content-Length 247289715; ETag `"ebd5773-65dd6264d2457"` |
| Source checked at | `2026-10-15T07:32:57.818Z` |
| Fetch completed/recorded at | `2026-10-15T07:33:52.168Z` |
| HTTP Last-Modified | `2026-10-15T00:30:07Z` |
| Actual OSM snapshot | `2026-10-14T20:21:12Z`, from the PBF replication header |
| Header properties | Non-history snapshot; replication sequence 1828 |
| Local extraction recorded at | `2026-10-15T07:33:54.725Z` |
| Recorded clipping tool | osmium 1.19.1 |
| PBF SHA-256 | `b2443fab468183501a9072f4ffa46d6b9c5a4ceea2e54479a51d8aec43a755b1` |
| XML bytes / SHA-256 | 57,936,255 / `15fe49f50895c72d771dcdd9bde7de979e0a5fb994a45993b3ceae80e650e4e1` |
| Public JSON SHA-256 | `11331db29f1a13bbe65052f2f95e94597af2f965cb4ba6c6174da119ac794125` |

The recovery verified retained HTTP headers and local hashes, not a new request to the changing `latest` URL. These are distinct download, modification, extraction, validation and map-data times. The source record's `query` is `null`: this dataset came from local PBF clipping, not the failed Overpass queries. Public provenance contains relative reproduction commands, not local account paths.

Both retained extracts passed `osmium check-refs` with **zero missing way-node references**: the city extract has 2,193,622 nodes / 453,837 ways / 1,804 relations, and the highway extract has 350,489 nodes / 61,352 ways / 0 relations. This check concerns way-node references, not a separate audit of every relation. No PBF, XML or download-header file was found under either public or dist output; the regional source remains a private build input.

## Measured Dataset

| Metric | Actual value |
| --- | ---: |
| JSON bytes | 7,899,330 |
| Gzip bytes, measured locally | 2,628,206 |
| Retained graph nodes | 87,221 |
| Street polylines | 112,718 |
| Directed graph arcs | 225,436 |
| Decoded geometry points, including repeated junction endpoints | 448,321 |
| Non-empty street names | 1,905 |
| Named polylines | 19,552 |
| Bridge / steps / tunnel polylines | 813 / 129 / 65 |
| Retained pedestrian one-way polylines | 0 |
| Weakly connected components | 332 |
| Largest component ID / nodes | 0 / 85,940 |
| Pre-compression nodes / segments | 310,106 / 335,603 |
| Ways passing / rejected by tag filter | 54,486 / 6,866 |
| Blocked in-bounds nodes | 4,113 |

Requested clip: west 88.28, south 22.44, east 88.49, north 22.64. Actual decoded geometry extrema: west **88.280001**, south **22.44**, east **88.49**, north **22.639999**. Complete-way extraction may retain source nodes outside the clip; the importer excludes their segments rather than connecting across them. This is not complete Kolkata/Howrah or festival-access coverage.

The deterministic schema is `version: 2`, `geometryEncoding: 'intermediate-delta-lat-lng-e6'`:

- `nodes`: `[osmId, lat, lng]`. Original OSM IDs remain at intersections, name/flag/direction boundaries and necessary cycle anchors.
- `edges`: `[fromIndex, toIndex, metres, nameIndex, flags, direction, intermediateDeltas]`. Direction `0` means both ways, `1` from-to only, `-1` to-from only. Current real data has no retained foot-one-way edges; directional behavior is tested with fixtures.
- `intermediateDeltas`: alternating latitude/longitude integer deltas in millionths of a degree, relative to the previous point, starting at the from-node. It excludes both endpoint coordinates. `decodeStreetGeometry` adds the endpoints back in from-to order.
- Compression removes only degree-two graph vertices with matching name/flags/foot direction. It retains their coordinates and bends, at six decimal places; it does not replace bends with a straight chord. Distances sum original consecutive-node haversine lengths, rounded to millimetres. Small coordinate-quantization differences are bounded by schema validation.
- Junctions use node IDs, never coordinate coincidence. Grade-separated crossings, missing intermediate nodes and disconnected river-bank roads never acquire synthetic connections. A mapped bridge is an existing OSM way, not an invented cross-river line.
- `names[0]` is empty; the 1,906 entries include 1,905 actual names. Prefer `name:en`, otherwise `name`; reject HTML/control characters. Route steps return `name: null` for unnamed paths. UI may label those "Unnamed path", not invent names.
- Flag bits: `1` bridge, `2` steps, `4` tunnel, `8` explicitly foot-permitted motorway/trunk. Flags are notices, not accessibility or safety certifications.

`validateStreetData(unknown)` checks V2 structure, array/index/size limits, unique original IDs, finite coordinates and weights, names, decoded geometry bounds and lengths, and the OpenStreetMap/ODbL attribution fields and string dates. It returns `StreetData` or throws `RangeError`. Schema validation alone does not authenticate a publisher; the separate local hash/rebuild check establishes the retained source chain.

## Pedestrian Filtering

The importer uses implicit pedestrian access only for its listed ordinary highway classes. Motorway/trunk and their links require explicit `foot=yes` or `foot=designated`. General `access=no/private` or `foot=no/private` rejects the way **even if another tag says `foot=yes`**. This corrects the old document's contrary statement.

Directional `foot:forward/backward` and `access:forward/backward` restrictions are honored, as are `oneway:foot` and `foot:oneway`. Vehicle-only `oneway` is not applied to pedestrians. Unsupported/conflicting foot-oneway values, conditional access, construction/proposed ways, highway areas, and `foot=use_sidepath` are excluded. Missing, out-of-bounds, restricted or locked nodes break their adjacent segments. Unknown node barriers require explicit permitted foot access; locked gates remain blocked. A rejected intermediate node is never skipped to connect its neighbors.

Duplicate segments with the same OSM node pair merge permitted directions and flags from accepted ways. The quieter search uses this same filtered graph; it cannot recover a rejected private, no-foot or construction detour. Missing OSM restrictions, unmapped closures, police controls or barriers can still make a mapped route unusable. Neither a snap nor a route establishes legal/public access.

## Exact Runtime API

Import from [the engine module](../src/domain/streets.ts). Its value exports are exactly:

- `createStreetRouter(value: unknown): StreetRouter`
- `validateStreetData(value: unknown): StreetData`
- `decodeStreetGeometry(data: StreetData, edgeIndex: number): Coordinate[]`
- `streetRouteProgress(route: StreetRoute, point: Coordinate, previousMetres = 0, accuracyMetres = 0): StreetProgress`
- `selectStreetPath(nodeCount, edges, origin, destination, strategy): number[] | null`, the retained low-level node-index helper
- `STREET_ROUTING_WARNINGS`, the four shared warning strings

Type exports are `StreetStrategy`, `WeightedStreetEdge`, `StreetNode`, `StreetEdge`, `StreetData`, `StreetEndpoint`, `StreetHotspot`, `StreetSnap`, `StreetManeuver`, `StreetStep`, `StreetRouteSegment`, `StreetRoute`, `StreetRouteOptions`, `StreetRouteResult`, `StreetRouter` and `StreetProgress`. `Coordinate` is the existing `{ lat: number; lng: number }` type from [types.ts](../src/types.ts), not a new engine export.

`createStreetRouter` validates and prepares one Graphology `MultiDirectedGraph` and spatial snap index. Its methods are synchronous; route results are plain serializable data. Retain one router per loaded dataset. The router object itself contains functions and should not be posted through a worker boundary.

| Member | Exact contract |
| --- | --- |
| `router.snap(point, maxMetres = 120)` | `StreetSnap` or `null`; maximum must be positive and no greater than 120 m |
| `router.route(origin, destination, options = {})` | `StreetRouteResult`; endpoints are `{ lat, lng, id?: string }` |
| `options` | `{ maxSnapMetres?: number, hotspots?: readonly StreetHotspot[] }` |
| `router.summary` | `{ nodes, polylines, geometryPoints, components, largestComponent, largestComponentNodes }` |
| `StreetSnap` | `{ edgeIndex, fraction, coordinate, offsetMetres, osmNodeId, component, accessVerified: false }` |
| Successful result | `{ status: 'ok', originSnap, destinationSnap, shortest, quieter, alternativesDiffer, sourceTimestamp, warnings }` |
| Unavailable result | `{ status: 'unavailable', reason, originSnap?, destinationSnap?, warnings }`; optional snaps can be `null` |
| Unavailable `reason` | `'invalid-coordinate'`, `'outside-bounds'`, `'no-nearby-street'` or `'disconnected'` |
| Each `StreetRoute` | `{ strategy, metres, estimatedPenaltyMetres, cost, geometry, cumulativeMetres, segments, steps }` |
| Each route segment | `{ edgeIndex, fromFraction, toFraction, metres, startGeometryIndex, endGeometryIndex }` |
| Each step | `{ maneuver, name, at, metres, startGeometryIndex, endGeometryIndex, flags }` |

Fractions describe distance along the full decoded polyline from 0 to 1, not vertex indices. `osmNodeId` is an original ID only when the snap is exactly at an endpoint; otherwise it is `null`. Components are opaque, graph-local root indices, not OSM IDs or consecutive component numbers. Equal weak-component IDs do not by themselves prove directional reachability; Dijkstra still checks it.

`geometry` is an ordered `{lat,lng}[]`, starting/ending at the street snaps, **not the off-street pins**. `cumulativeMetres` has the same length, begins at zero and ends at route `metres`. Both geometry indices in steps/segments are zero-based and inclusive. Off-street offsets are reported separately and excluded from route distance; no straight connector or gate access is invented. Invalid data/options can throw `RangeError`; do not convert an error/unavailable result into a direct-line route.

Maneuvers are `'depart'`, `'continue'`, `'bear-left'`, `'bear-right'`, `'turn-left'`, `'turn-right'`, `'u-turn'`, `'arrive'`. They derive from incoming/outgoing segment bearings at polyline junctions; there is no numeric-bearing field. Continue segments with the same name and flags are grouped. Internal curve points remain geometry, not instructions at every bend. Every result ends with a zero-metre arrive step; step distances sum to route distance.

### Hotspot Units And Alternatives

`StreetHotspot` is `{ id: string, lat: number, lng: number, radiusMetres?: number, penaltyPerMetre?: number }`. Supply at most 128 hotspots with unique non-empty IDs. Radius defaults to **180 m**, allowed **25-500 m**. `penaltyPerMetre` defaults to **2**, allowed **0-10**: it is estimated penalty-metres per walked metre at the hotspot center, not people, probability, minutes or measured density.

Exposure falls linearly to zero at the radius. The engine integrates with midpoint samples at most 25 m apart; overlapping hotspot contributions add. `shortest.cost` is physical `metres`; `quieter.cost` is `metres + estimatedPenaltyMetres`. Both are Graphology weighted bidirectional Dijkstra over existing permitted arcs, including permitted partial-edge snaps.

**Core endpoint exclusion is implemented.** Hotspots whose IDs match either endpoint ID are excluded, including slightly displaced endpoint coordinates. Hotspots within 1 m of an endpoint coordinate are also excluded. Pass catalogue IDs on endpoints; callers do not need to repeat this exclusion. The benchmark maps catalogue `popularity` to `penaltyPerMetre` explicitly as a static model choice, not a live crowd reading.

`alternativesDiffer` compares the chosen edge/fraction sequence. False means render one distinct route; no separate quieter detour necessarily exists. For all three measured journeys below it is false. Fixture tests demonstrate a valid longer, lower-penalty detour and demonstrate that private/no-foot/closed-for-construction detours cannot be used.

### Request And Response

The static fetch includes no route coordinates. This is the exact tested Shyambazar/Bagbazar request using all 33 catalogue hotspots:

```ts
import { createStreetRouter } from '../src/domain/streets'
import { PANDALS } from '../src/data/pandals'

const response = await fetch(`${import.meta.env.BASE_URL}data/kolkata-walking.json`)
if (!response.ok) throw new Error(`Street data HTTP ${response.status}`)
const router = createStreetRouter(await response.json())
const result = router.route(
  { id: 'start-blue-shyambazar', lat: 22.601313, lng: 88.372586 },
  { id: 'bagbazar', lat: 22.6047, lng: 88.36613 },
  {
    maxSnapMetres: 120,
    hotspots: PANDALS.map(({ id, lat, lng, popularity }) => ({
      id, lat, lng, radiusMetres: 180, penaltyPerMetre: popularity,
    })),
  },
)
```

Actual response excerpt, with the large geometry/step arrays and snap/warning fields omitted **only from this excerpt**:

```json
{
  "status": "ok",
  "shortest": {
    "strategy": "shortest",
    "metres": 1144.5369974082116,
    "estimatedPenaltyMetres": 0,
    "cost": 1144.5369974082116
  },
  "quieter": {
    "strategy": "quieter",
    "metres": 1144.5369974082116,
    "estimatedPenaltyMetres": 0,
    "cost": 1144.5369974082116
  },
  "alternativesDiffer": false,
  "sourceTimestamp": "2026-10-14T20:21:12Z"
}
```

The full response has 32 geometry/cumulative entries and 8 shortest-route steps. Origin/destination snap offsets are 8.249694118166673 / 48.88134511004566 m. The first step is `depart` on the OSM name `Bupendra Bose Avenue`, at `{lat:22.601384258878337,lng:88.37256363005778}`, for 115.77599941343222 m with geometry indices 0 to 2 and flags 0. The original OSM spelling is retained.

### Navigation Progress

`streetRouteProgress` is implemented and local. It returns `{ status, coordinate, distanceFromRouteMetres, alongMetres, remainingMetres, stepIndex }`; `stepIndex` is zero-based. Pass the selected `StreetRoute`, current coordinate, previous accepted `alongMetres` and actual geolocation accuracy in metres. The default accuracy 0 is not an accuracy measurement.

Statuses are `'on-route'`, `'off-route'`, `'uncertain'` and `'arrived'`. More than 35 m from route geometry is off-route; accuracy worse than 60 m is uncertain. Either freezes progress at `previousMetres`. Arrival requires both remaining route distance and distance to the snapped destination to be at most 15 m. Projection ties use previous progress to disambiguate; progress is not otherwise forced to be monotonic. The helper does not establish arrival at an off-street pandal entrance, reroute automatically or export GPS. UI can also consume `geometry`, `cumulativeMetres` and `steps` directly.

## Coverage And Benchmarks

All **33/33 pandals and 8/8 starts** have a closest mapped street within 120 m. From `start-blue-esplanade`, **32/33 pandals and 8/8 starts** are reachable. `salt-lake-bj-block` snaps 39.75 m away to component **34740**, disconnected from component **0**. This is a dataset/connectivity gap, not proof the physical pandal is inaccessible. No farther-road retry or synthetic link hides it.

The following complete catalogue lists closest-street distance and component. Every component-0 row is reachable from Esplanade; the single component-34740 row is unavailable with reason `disconnected`. The other 330 graph components contain none of these catalogue snaps.

| Catalogue ID | Snap m | Component |
| --- | ---: | ---: |
| start-blue-shyambazar | 8.25 | 0 |
| start-blue-girish-park | 10.01 | 0 |
| start-blue-esplanade | 2.53 | 0 |
| start-blue-kalighat | 14.50 | 0 |
| start-blue-rabindra-sarobar | 2.95 | 0 |
| start-green-sector-v | 3.84 | 0 |
| start-green-karunamoyee | 3.71 | 0 |
| start-new-town | 44.14 | 0 |
| bagbazar | 48.88 | 0 |
| kumartuli-park | 18.39 | 0 |
| sovabazar-rajbari | 26.07 | 0 |
| tala-prattoy | 7.92 | 0 |
| ahiritola | 14.07 | 0 |
| sreebhumi | 17.79 | 0 |
| college-square | 19.42 | 0 |
| md-ali-park | 38.48 | 0 |
| santosh-mitra-square | 24.35 | 0 |
| chaltabagan | 11.10 | 0 |
| ekdalia-evergreen | 14.81 | 0 |
| singhi-park | 16.38 | 0 |
| deshapriya-park | 38.02 | 0 |
| ballygunge-cultural | 13.83 | 0 |
| samaj-sebi | 12.60 | 0 |
| tridhara | 10.42 | 0 |
| hindustan-park | 17.00 | 0 |
| 66-pally | 8.02 | 0 |
| badamtala-ashar-sangha | 16.83 | 0 |
| mudiali | 2.29 | 0 |
| shib-mandir | 16.38 | 0 |
| suruchi-sangha | 16.71 | 0 |
| chetla-agrani | 14.83 | 0 |
| naktala-udayan | 21.81 | 0 |
| bosepukur-sitala-mandir | 20.99 | 0 |
| barisha-club | 19.71 | 0 |
| behala-notun-dal | 23.08 | 0 |
| behala-friends | 7.74 | 0 |
| sb-park | 6.69 | 0 |
| salt-lake-fd-block | 52.47 | 0 |
| salt-lake-ak-block | 7.38 | 0 |
| salt-lake-bj-block | 39.75 | 34740 |
| new-town-sarbojanin | 44.14 | 0 |

Measured on local macOS arm64, Node 25.5.0/Vitest, one bounded run, not phone performance. JSON parse was **35.992 ms**; schema validation plus graph/spatial-index construction was **333.405 ms**. Each request timing below includes snapping, hotspot weights and both shortest/quieter results, not separate isolated algorithm timings.

| Actual journey | Shortest m | Quieter m | Combined request ms | Shortest geometry / steps | Distinct alternative |
| --- | ---: | ---: | ---: | ---: | --- |
| Shyambazar -> Bagbazar | 1144.537 | 1144.537 | 6.016 | 32 / 8 | No |
| Bagbazar -> Kumartuli Park | 1023.874 | 1023.874 | 5.491 | 39 / 4 | No |
| Kalighat -> Chetla Agrani | 1025.477 | 1025.477 | 9.305 | 47 / 12 | No |

The first two routes have zero modeled other-hotspot penalty. Kalighat/Chetla has 199.83180960112804 penalty-metres for both results; the weighted search did not find a better-cost different path. None of these results asserts a crowd-free route. The separate synthetic performance fixture has 625 nodes / 1,200 polylines, 5.986 ms build / 7.571 ms request; it is not a published map asset or real-road benchmark.

## Verification And Reproduction

Installed and reused from [the project's package manifest](../package.json): `graphology@0.26.0` and `graphology-shortest-path@2.1.0` runtime dependencies, plus `fast-xml-parser@5.11.2` as a build/test **devDependency**. `osmium-tool` is a local build prerequisite, not a browser dependency. No additional package installation was needed during recovery.

Run these local checks with the retained inputs; none downloads, clips or rewrites a source/data asset. `STREET_REPORT=1` rewrites only the existing validation report:

```sh
node scripts/build-streets.mjs --check
STREET_REPORT=1 npx vitest run --config vitest.config.ts tests/unit/streets.test.ts
node --check scripts/build-streets.mjs
npx tsc -b
osmium check-refs .private/street-data/kolkata.osm.pbf
osmium check-refs .private/street-data/kolkata-highways.osm.pbf
```

The 13 original focused cases remain covered within **34 passing tests**, including at least three real catalogue journeys, all-point coverage, V2 schema/source attribution, directional foot rules, barriers/private access, missing nodes, coincident over/underpass IDs, degree-two geometry and cycles, snapping/too-far/disconnected results, explicit quiet detours/deduplication, bearing/name maneuvers, and navigation-progress states. For both alternatives on all three real routes, tests verify ordered source-polyline interiors, permitted direction, exact shared OSM junction IDs between arcs, street names and summed distances. The full unrelated unit/E2E/office suites were not rerun.

The following are the **historical extraction commands recorded in provenance**, not commands rerun in this recovery. They overwrite build intermediates and are only for an explicitly intended reproduction with the verified original input:

```sh
osmium extract --bbox 88.28,22.44,88.49,22.64 --strategy complete_ways .private/street-data/eastern-zone.osm.pbf --output .private/street-data/kolkata.osm.pbf --overwrite
osmium tags-filter .private/street-data/kolkata.osm.pbf w/highway --output .private/street-data/kolkata-highways.osm.pbf --overwrite
osmium cat .private/street-data/kolkata-highways.osm.pbf --output-format osm --output .private/street-data/kolkata-highways.osm --overwrite
```

To create an intentionally absent asset from the retained verified XML/metadata, the importer command is:

```sh
node scripts/build-streets.mjs --local-osm .private/street-data/kolkata-highways.osm --metadata .private/street-data/metadata.json
```

It checks the XML hash and refuses to overwrite an existing asset. `--replace` is an explicit overwrite opt-in, not needed here. Importer exports are `STREET_BOUNDS`, `OVERPASS_QUERY`, `walkingDirections`, `isWalkableNode`, `convertOverpass`, `convertOsmXml` and `compactStreetGraph`. The converters return the uncompressed intermediate graph; `compactStreetGraph` produces V2. The production local/PBF CLI applies both. XML parsing is structured, capped at 150 MiB, and rejects malformed XML and entity/DOCTYPE declarations. The asset cap is 8 MiB.

The network/clip mode `--geofabrik` and the legacy Overpass prototype modes are not recovery checks. Do not invoke them to validate this existing snapshot. Future source replacement needs deliberate metadata, hash and coverage revalidation; the dated URL and retained bytes must not silently follow a newer `latest` file.

## UI Owner Handoff

Use the static runtime URL `${import.meta.env.BASE_URL}data/kolkata-walking.json` and retain [the companion license](../public/data/Kolkata-walking.LICENSE.md). The existing Workbox build already encounters this asset, but its default **2,097,152-byte** limit rejects it. The UI/PWA owner needs `workbox.maximumFileSizeToCacheInBytes` at least **7,899,330**; **8,388,608** matches the enforced 8 MiB asset cap. Gzip transfer size does not satisfy the uncompressed precache limit. Preserve explicit asset inclusion and license/attribution availability, then rerun the complete production/PWA build and offline checks. No configuration was changed or offline caching certified by this engine recovery.

**A Web Worker is recommended** for parse/validation/router construction and route requests, especially the measured 333 ms initialization. No worker was implemented in this scope. Render the returned street geometry, handle `unavailable` explicitly, deduplicate identical alternatives, expose snap offsets and source warnings, and do not present off-street gaps as navigable segments.

Attribute **OpenStreetMap contributors**, linking [OSM copyright](https://www.openstreetmap.org/copyright) and the [ODbL 1.0 license](https://opendatacommons.org/licenses/odbl/1-0/). The derived database remains ODbL with attribution/share-alike obligations. Display the snapshot honestly and retain all four `STREET_ROUTING_WARNINGS`: no live crowd/police/closure or access guarantee; quieter is an estimate, not crowd-free or safer; snaps are not verified gates; steps/bridges/tunnels are not accessibility certification.

## Superseded History

At `2026-10-15T07:14:52Z`, the initial Overpass requests returned HTTP 406 at the primary and HTTP 429 at the mirror, and only the 13-test prototype existed. Those requests were not retried in this recovery. The later authorized Geofabrik download and local conversion had already completed before interruption. The earlier statements that no PBF, real asset, coordinate API or maneuvers existed, and that source approval remained blocked, are historical and no longer describe this checkpoint.