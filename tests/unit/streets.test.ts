import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { afterAll, describe, expect, it } from 'vitest'
import { createStreetRouter, decodeStreetGeometry, selectStreetPath, streetRouteProgress, validateStreetData } from '../../src/domain/streets'
import type { WeightedStreetEdge } from '../../src/domain/streets'
import { haversineMetres } from '../../src/domain/geo'
import { PANDALS, START_POINTS } from '../../src/data/pandals'

const measurements: Record<string, unknown> = {}
const realRouteMeasurements: Record<string, unknown>[] = []

interface ImportedFixtureGraph {
  nodes: [number, number, number][]
  names: string[]
  edges: [number, number, number, number, number, number][]
  source: { license: string; timestamp: string }
}

interface ImportedCompactGraph extends Omit<ImportedFixtureGraph, 'edges'> {
  version: number
  edges: [number, number, number, number, number, number, number[]][]
}

const { convertOverpass, convertOsmXml, compactStreetGraph, isWalkableNode, walkingDirections, OVERPASS_QUERY, STREET_BOUNDS } =
  await import(new URL('../../scripts/build-streets.mjs', import.meta.url).href) as {
    convertOverpass: (raw: unknown, provenance: Record<string, string>) => ImportedFixtureGraph
    convertOsmXml: (xml: string, metadata: Record<string, string>) => ImportedFixtureGraph
    compactStreetGraph: (data: ImportedFixtureGraph) => ImportedCompactGraph
    isWalkableNode: (tags?: Record<string, string | undefined>) => boolean
    walkingDirections: (tags?: Record<string, string | undefined>) => number[]
    OVERPASS_QUERY: string
    STREET_BOUNDS: { south: number; west: number; north: number; east: number }
  }

const branches: WeightedStreetEdge[] = [
  { from: 0, to: 1, metres: 100, penaltyMetres: 300 },
  { from: 1, to: 3, metres: 100, penaltyMetres: 300 },
  { from: 0, to: 2, metres: 150, penaltyMetres: 0 },
  { from: 2, to: 3, metres: 150, penaltyMetres: 0 },
]

describe('street path selection', () => {
  it('minimizes metres or metres plus an explicit exposure penalty on existing edges', () => {
    for (const strategy of ['shortest', 'quieter'] as const) {
      const path = selectStreetPath(4, branches, 0, 3, strategy)!
      expect(path).toEqual(strategy === 'shortest' ? [0, 1, 3] : [0, 2, 3])
      let distance = 0
      for (let index = 1; index < path.length; index += 1) {
        const edge = branches.find((candidate) => candidate.from === path[index - 1] && candidate.to === path[index])
        expect(edge).toBeDefined()
        distance += edge!.metres
      }
      expect(distance).toBe(strategy === 'shortest' ? 200 : 300)
    }
  })

  it('does not invent a connector across disconnected or reversed edges', () => {
    expect(selectStreetPath(5, branches, 0, 4, 'shortest')).toBeNull()
    expect(selectStreetPath(4, branches, 3, 0, 'quieter')).toBeNull()
  })

  it('returns only the shared node for identical endpoints', () => {
    expect(selectStreetPath(4, branches, 1, 1, 'shortest')).toEqual([1])
  })

  it('rejects invalid indices, non-finite or negative weights and duplicate directed edges', () => {
    expect(() => selectStreetPath(0, [], 0, 0, 'shortest')).toThrow(RangeError)
    expect(() => selectStreetPath(4, branches, -1, 3, 'shortest')).toThrow(RangeError)
    expect(() => selectStreetPath(4, branches, 0, 4, 'shortest')).toThrow(RangeError)
    for (const invalid of [
      { ...branches[0], metres: NaN }, { ...branches[0], metres: -1 },
      { ...branches[0], penaltyMetres: -1 }, { ...branches[0], from: 0.5 },
    ]) expect(() => selectStreetPath(4, [invalid], 0, 3, 'shortest')).toThrow(RangeError)
    expect(() => selectStreetPath(4, [...branches, branches[0]], 0, 3, 'shortest')).toThrow(RangeError)
  })
})

describe('compact street routing', () => {
  const fixture = () => compactStreetGraph(convertOverpass(fixtureResponse([...fixtureNodes, fixtureWay]), fixtureSource))

  it('snaps to the real polyline, slices it between endpoints and reports local progress', () => {
    const data = validateStreetData(fixture())
    const router = createStreetRouter(data)
    expect(decodeStreetGeometry(data, 0)).toEqual(fixtureNodes.map((node) => ({ lat: node.lat, lng: node.lon })))
    const result = router.route({ lat: 22.5705, lng: 88.36 }, { lat: 22.5715, lng: 88.3605 })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.originSnap.offsetMetres).toBeLessThan(0.01)
    expect(result.shortest.geometry).toHaveLength(3)
    expect(result.shortest.geometry[1]).toEqual({ lat: 22.571, lng: 88.36 })
    expect(result.shortest.metres).toBeCloseTo(data.edges[0][2] / 2, 2)
    expect(result.shortest.steps.at(-1)?.maneuver).toBe('arrive')
    expect(streetRouteProgress(result.shortest, result.shortest.geometry[1]).status).toBe('on-route')
    expect(streetRouteProgress(result.shortest, result.shortest.geometry.at(-1)!).status).toBe('arrived')
    expect(streetRouteProgress(result.shortest, { lat: 22.58, lng: 88.38 }).status).toBe('off-route')
    expect(streetRouteProgress(result.shortest, result.shortest.geometry[1], 0, 100).status).toBe('uncertain')
    expect(streetRouteProgress(result.shortest, { lat: 22.58, lng: 88.38 }, 10).alongMetres).toBe(10)
    expect(streetRouteProgress(result.shortest, result.shortest.geometry[1], 10, 100).alongMetres).toBe(10)
  })

  it('enforces foot direction on partial polylines and never fabricates an off-network route', () => {
    const data = compactStreetGraph(convertOverpass(fixtureResponse([...fixtureNodes,
      { ...fixtureWay, tags: { highway: 'footway', 'oneway:foot': 'yes' } },
    ]), fixtureSource))
    const router = createStreetRouter(data)
    const first = { lat: 22.5702, lng: 88.36 }
    const last = { lat: 22.5708, lng: 88.36 }
    expect(router.route(first, last).status).toBe('ok')
    expect(router.route(last, first)).toMatchObject({ status: 'unavailable', reason: 'disconnected' })
    expect(router.snap({ lat: 22.6, lng: 88.4 })).toBeNull()
    expect(router.route(first, { lat: 22.6, lng: 88.4 })).toMatchObject({ status: 'unavailable', reason: 'no-nearby-street' })
    expect(() => router.snap(first, 121)).toThrow('120 metres')
  })

  it('rejects malformed graph data, missing attribution and false geometric lengths', () => {
    const data = fixture()
    expect(() => validateStreetData({ ...data, version: 1 })).toThrow('schema')
    for (const invalid of [
      { provider: undefined }, { provider: 'Unknown' }, { license: '' }, { attribution: 'Unknown' },
      { attributionUrl: '' }, { licenseUrl: '' }, { timestamp: 2026 }, { fetchedAt: 2026 },
    ]) expect(() => validateStreetData({ ...data, source: { ...data.source, ...invalid } })).toThrow('attribution')
    expect(() => validateStreetData({ ...data, edges: [[0, 1, 1, 0, 0, 0, [1000, 0]]] })).toThrow('distance')
    expect(() => validateStreetData({ ...data, edges: [[0, 1, 100, 0, 0, 0, [1]]] })).toThrow('polyline')
  })

  it.each([
    ['continue', 22.572, 88.36], ['turn-left', 22.571, 88.359], ['turn-right', 22.571, 88.361],
    ['bear-left', 22.572, 88.3595], ['bear-right', 22.572, 88.3605], ['u-turn', 22.57, 88.36005],
  ] as const)('derives %s from street bearings and retains the next street name', (maneuver, lat, lng) => {
    const nodes = [fixtureNodes[0], fixtureNodes[1], { type: 'node', id: 103, lat, lon: lng }]
    const ways = [
      { ...fixtureWay, nodes: [101, 102], tags: { highway: 'footway', name: 'First Fixture Street' } },
      { ...fixtureWay, id: 202, nodes: [102, 103], tags: { highway: 'footway', name: 'Next Fixture Street' } },
    ]
    const router = createStreetRouter(compactStreetGraph(convertOverpass(fixtureResponse([...nodes, ...ways]), fixtureSource)))
    const result = router.route({ lat: nodes[0].lat, lng: nodes[0].lon }, { lat, lng })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.shortest.steps.map((step) => step.maneuver)).toEqual(['depart', maneuver, 'arrive'])
    expect(result.shortest.steps.map((step) => step.name)).toEqual(['First Fixture Street', 'Next Fixture Street', null])
    expect(result.shortest.steps[1].at).toEqual({ lat: 22.571, lng: 88.36 })
  })

  it('uses a real parallel detour around other hotspots, excludes endpoints and cannot use prohibited detours', () => {
    const origin = { id: 'origin', lat: 22.57, lng: 88.36 }
    const destination = { id: 'destination', lat: 22.572, lng: 88.36 }
    const nodes = [
      origin,
      { lat: 22.571, lng: 88.36 },
      { lat: 22.5705, lng: 88.362 },
      destination,
    ].map((node, index) => ({ type: 'node', id: 101 + index, lat: node.lat, lon: node.lng }))
    const direct = { type: 'way', id: 201, nodes: [101, 102, 104], tags: { highway: 'residential', name: 'Fixture direct' } }
    const detour = { type: 'way', id: 202, nodes: [101, 103, 104], tags: { highway: 'residential', name: 'Fixture detour' } }
    const hotspots = [origin, destination, { id: 'other', lat: 22.571, lng: 88.36 }]
      .map((point) => ({ ...point, radiusMetres: 90, penaltyPerMetre: 10 }))
    const router = createStreetRouter(compactStreetGraph(convertOverpass(fixtureResponse([...nodes, direct, detour]), fixtureSource)))
    const result = router.route(origin, destination, { hotspots })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.alternativesDiffer).toBe(true)
    expect(result.quieter.metres).toBeGreaterThan(result.shortest.metres)
    expect(result.quieter.estimatedPenaltyMetres).toBeLessThan(result.shortest.estimatedPenaltyMetres)
    const endpointsOnly = router.route(origin, destination, { hotspots: hotspots.slice(0, 2) })
    expect(endpointsOnly.status === 'ok' && endpointsOnly.shortest.estimatedPenaltyMetres).toBe(0)
    const endpointsById = router.route(origin, destination, {
      hotspots: hotspots.slice(0, 2).map((hotspot) => ({ ...hotspot, lat: hotspot.lat + 0.00005 })),
    })
    expect(endpointsById.status === 'ok' && endpointsById.shortest.estimatedPenaltyMetres).toBe(0)
    const noHotspots = router.route(origin, destination)
    expect(noHotspots.status === 'ok' && noHotspots.alternativesDiffer).toBe(false)
    expect(noHotspots.status === 'ok' && noHotspots.quieter.geometry).toEqual(result.shortest.geometry)
    for (const restriction of [
      { access: 'private', foot: 'yes' }, { access: 'no' }, { foot: 'no' },
      { highway: 'construction' }, { construction: 'yes' }, { 'foot:conditional': 'no @ (night)' },
    ]) {
      const restrictedRouter = createStreetRouter(compactStreetGraph(convertOverpass(fixtureResponse([
        ...nodes, direct, { ...detour, tags: { ...detour.tags, ...restriction } },
      ]), fixtureSource)))
      const blocked = restrictedRouter.route(origin, destination, { hotspots })
      expect(blocked.status === 'ok' && blocked.alternativesDiffer).toBe(false)
      expect(blocked.status === 'ok' && blocked.quieter.metres).toBeCloseTo(result.shortest.metres, 3)
    }
  })

  it('keeps coincident over/underpass node IDs disconnected instead of joining their coordinates', () => {
    const data = compactStreetGraph(convertOverpass(fixtureResponse([
      ...fixtureNodes, { ...fixtureNodes[1], id: 104 }, { ...fixtureNodes[2], id: 105 },
      { ...fixtureWay, nodes: [101, 102], tags: { highway: 'footway', bridge: 'yes' } },
      { ...fixtureWay, id: 202, nodes: [104, 105] },
    ]), fixtureSource))
    const router = createStreetRouter(data)
    expect(router.summary.components).toBe(2)
    expect(router.route({ lat: 22.57, lng: 88.36 }, { lat: 22.572, lng: 88.361 }))
      .toMatchObject({ status: 'unavailable', reason: 'disconnected' })
  })

  it('benchmarks one bounded synthetic grid without publishing it as map data', () => {
    const side = 25
    const nodes = Array.from({ length: side * side }, (_, index) => ({
      type: 'node', id: 100_000 + index, lat: 22.55 + Math.floor(index / side) * 0.00025,
      lon: 88.35 + index % side * 0.00025,
    }))
    const ways = Array.from({ length: side }, (_, row) => ({
      type: 'way', id: 200_000 + row, nodes: Array.from({ length: side }, (_, column) => 100_000 + row * side + column),
      tags: { highway: 'residential', name: 'Synthetic row' },
    })).concat(Array.from({ length: side }, (_, column) => ({
      type: 'way', id: 300_000 + column, nodes: Array.from({ length: side }, (_, row) => 100_000 + row * side + column),
      tags: { highway: 'residential', name: 'Synthetic column' },
    })))
    const graph = compactStreetGraph(convertOverpass(fixtureResponse([...nodes, ...ways]), fixtureSource))
    const buildStart = performance.now()
    const router = createStreetRouter(graph)
    const buildMs = performance.now() - buildStart
    const routeStart = performance.now()
    const result = router.route({ lat: nodes[0].lat, lng: nodes[0].lon }, { lat: nodes.at(-1)!.lat, lng: nodes.at(-1)!.lon },
      { hotspots: [{ id: 'synthetic-hotspot', lat: 22.553, lng: 88.353 }] })
    const routeMs = performance.now() - routeStart
    expect(result.status).toBe('ok')
    measurements.synthetic = { nodes: graph.nodes.length, polylines: graph.edges.length, buildMs, routeMs,
      metres: result.status === 'ok' ? result.shortest.metres : null, runs: 1 }
  })
})

describe('real Kolkata catalogue routes', () => {
  const text = readFileSync(new URL('../../public/data/kolkata-walking.json', import.meta.url), 'utf8')
  const parseStart = performance.now()
  const data = JSON.parse(text)
  const parseMs = performance.now() - parseStart
  const buildStart = performance.now()
  const router = createStreetRouter(data)
  const buildMs = performance.now() - buildStart
  const catalogue = [...START_POINTS, ...PANDALS]
  const hotspots = PANDALS.map(({ id, lat, lng, popularity }) => ({ id, lat, lng, penaltyPerMetre: popularity }))

  it('validates the actual JSON schema, source header, size, license and topology-preserving geometry', () => {
    expect(Buffer.byteLength(text)).toBeLessThan(8 * 1024 * 1024)
    expect(data.source.endpoint).toBe('https://download.geofabrik.de/asia/india/eastern-zone-latest.osm.pbf')
    expect(data.source.pbfBytes).toBeGreaterThan(200_000_000)
    expect(data.source.pbfBytes).toBeLessThan(350_000_000)
    expect(data.source.pbfSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(data.source.pbfHeader.with_history).toBe(false)
    expect(data.source.timestamp).toBe(data.source.pbfHeader.option.osmosis_replication_timestamp)
    expect(Date.parse(data.source.timestamp)).toBeLessThanOrEqual(Date.parse(data.source.fetchedAt))
    expect(Date.parse(data.source.lastModified)).toBeLessThanOrEqual(Date.parse(data.source.fetchedAt))
    expect(data.source.query).toBeNull()
    expect(JSON.stringify(data.source.commands)).not.toContain('/Users/')
    expect(data.filters.explicitPrivateOrNoExcluded).toBe(true)
    expect(data.compression.allPolylinePointsRetained).toBe(true)
    expect(data.compression.geometryPoints).toBe(router.summary.geometryPoints)
    expect(data.names.length).toBeGreaterThan(1000)
    const license = readFileSync(new URL('../../public/data/Kolkata-walking.LICENSE.md', import.meta.url), 'utf8')
    expect(license).toContain('OpenStreetMap contributors')
    expect(license).toContain('https://opendatacommons.org/licenses/odbl/1-0/')
    const actualGeometryBounds = { south: Infinity, west: Infinity, north: -Infinity, east: -Infinity }
    for (let edgeIndex = 0; edgeIndex < data.edges.length; edgeIndex += 1) {
      for (const point of decodeStreetGeometry(data, edgeIndex)) {
        actualGeometryBounds.south = Math.min(actualGeometryBounds.south, point.lat)
        actualGeometryBounds.west = Math.min(actualGeometryBounds.west, point.lng)
        actualGeometryBounds.north = Math.max(actualGeometryBounds.north, point.lat)
        actualGeometryBounds.east = Math.max(actualGeometryBounds.east, point.lng)
      }
    }
    measurements.data = { bytes: Buffer.byteLength(text), gzipBytes: gzipSync(text).length,
      sha256: createHash('sha256').update(text).digest('hex'), ...router.summary,
      source: data.source, bounds: data.bounds, actualGeometryBounds, names: data.names.length - 1,
      compression: data.compression, filters: data.filters,
      namedPolylines: data.edges.filter((edge: number[]) => edge[3] !== 0).length,
      stepsPolylines: data.edges.filter((edge: number[]) => edge[4] & 2).length,
      bridgePolylines: data.edges.filter((edge: number[]) => edge[4] & 1).length,
      tunnelPolylines: data.edges.filter((edge: number[]) => edge[4] & 4).length,
      directedPolylines: data.edges.filter((edge: number[]) => edge[5] !== 0).length,
      directedArcs: data.edges.reduce((sum: number, edge: number[]) => sum + (edge[5] === 0 ? 2 : 1), 0),
      parseMs, validateAndBuildMs: buildMs }
  })

  it('measures all 33 catalogue pins and 8 starts within a strict 120 metre snap limit', () => {
    expect(PANDALS).toHaveLength(33)
    expect(START_POINTS).toHaveLength(8)
    const reference = START_POINTS.find((point) => point.id === 'start-blue-esplanade')!
    const coverage = catalogue.map((point) => {
      const snapped = router.snap(point)
      const result = router.route(reference, point)
      if (snapped) expect(snapped.offsetMetres).toBeLessThanOrEqual(120)
      if (!snapped) expect(result.status).toBe('unavailable')
      return { id: point.id, group: point.id.startsWith('start-') ? 'start' : 'pandal',
        lat: point.lat, lng: point.lng,
        offsetMetres: snapped?.offsetMetres ?? null, component: snapped?.component ?? null,
        largestComponent: snapped?.component === router.summary.largestComponent,
        reachableFromEsplanade: result.status === 'ok', reason: result.status === 'ok' ? null : result.reason }
    })
    measurements.coverage = coverage
    measurements.coverageSummary = ['pandal', 'start'].map((group) => {
      const rows = coverage.filter((row) => row.group === group)
      return { group, total: rows.length, snappedWithin120m: rows.filter((row) => row.offsetMetres !== null).length,
        reachableFromEsplanade: rows.filter((row) => row.reachableFromEsplanade).length,
        gaps: rows.filter((row) => !row.reachableFromEsplanade).map(({ id, reason }) => ({ id, reason })) }
    })
    measurements.coverageComponents = [...new Set(coverage.map((row) => row.component))].map((component) => ({
      component, largestComponent: component === router.summary.largestComponent,
      ids: coverage.filter((row) => row.component === component).map((row) => row.id),
    }))
  })

  it.each([
    ['Shyambazar to Bagbazar', 'start-blue-shyambazar', 'bagbazar'],
    ['Bagbazar to Kumartuli', 'bagbazar', 'kumartuli-park'],
    ['Kalighat to Chetla', 'start-blue-kalighat', 'chetla-agrani'],
  ])('%s follows connected actual OSM geometry', (_label, originId, destinationId) => {
    const origin = catalogue.find((point) => point.id === originId)!
    const destination = catalogue.find((point) => point.id === destinationId)!
    const routeStart = performance.now()
    const result = router.route(origin, destination, { hotspots })
    const routeMs = performance.now() - routeStart
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(`${originId} -> ${destinationId}: ${result.reason}`)
    realRouteMeasurements.push({ originId, destinationId, routeMs, originOffsetMetres: result.originSnap.offsetMetres,
      destinationOffsetMetres: result.destinationSnap.offsetMetres, shortestMetres: result.shortest.metres,
      quieterMetres: result.quieter.metres, shortestPenaltyMetres: result.shortest.estimatedPenaltyMetres,
      quieterPenaltyMetres: result.quieter.estimatedPenaltyMetres, alternativesDiffer: result.alternativesDiffer,
      origin: { id: origin.id, lat: origin.lat, lng: origin.lng },
      destination: { id: destination.id, lat: destination.lat, lng: destination.lng },
      originSnap: result.originSnap, destinationSnap: result.destinationSnap,
      geometryPoints: result.shortest.geometry.length, quieterGeometryPoints: result.quieter.geometry.length,
      steps: result.shortest.steps })
    expect(result.originSnap.offsetMetres).toBeLessThanOrEqual(120)
    expect(result.destinationSnap.offsetMetres).toBeLessThanOrEqual(120)
    expect(result.shortest.metres).toBeGreaterThan(100)
    expect(result.shortest.metres).toBeLessThan(10_000)
    expect(result.shortest.geometry.length).toBeGreaterThan(5)
    expect(result.quieter.cost).toBeLessThanOrEqual(result.shortest.metres + result.shortest.estimatedPenaltyMetres + 0.01)
    expect(result.quieter.metres).toBeGreaterThanOrEqual(result.shortest.metres - 0.01)
    for (const route of [result.shortest, result.quieter]) {
      expect(route.steps.reduce((sum, step) => sum + step.metres, 0)).toBeCloseTo(route.metres, 4)
      expect(route.cumulativeMetres.at(-1)).toBeCloseTo(route.metres, 4)
      expect(route.geometry[0]).toEqual(result.originSnap.coordinate)
      expect(route.geometry.at(-1)).toEqual(result.destinationSnap.coordinate)
      for (const [segmentIndex, segment] of route.segments.entries()) {
        const direction = data.edges[segment.edgeIndex][5]
        expect(direction === 0 || Math.sign(segment.toFraction - segment.fromFraction) === direction).toBe(true)
        const sourceGeometry = decodeStreetGeometry(data, segment.edgeIndex)
        const cumulative = [0]
        for (let pointIndex = 1; pointIndex < sourceGeometry.length; pointIndex += 1) {
          cumulative.push(cumulative.at(-1)! + haversineMetres(sourceGeometry[pointIndex - 1], sourceGeometry[pointIndex]))
        }
        const low = Math.min(segment.fromFraction, segment.toFraction) * cumulative.at(-1)!
        const high = Math.max(segment.fromFraction, segment.toFraction) * cumulative.at(-1)!
        const interior = sourceGeometry.filter((_point, pointIndex) => cumulative[pointIndex] > low && cumulative[pointIndex] < high)
        if (segment.fromFraction > segment.toFraction) interior.reverse()
        expect(route.geometry.slice(segment.startGeometryIndex + 1, segment.endGeometryIndex)).toEqual(interior)
        if (segmentIndex) {
          const previous = route.segments[segmentIndex - 1]
          expect([0, 1]).toContain(previous.toFraction)
          expect([0, 1]).toContain(segment.fromFraction)
          const previousNode = data.edges[previous.edgeIndex][previous.toFraction === 0 ? 0 : 1]
          const currentNode = data.edges[segment.edgeIndex][segment.fromFraction === 0 ? 0 : 1]
          expect(data.nodes[currentNode][0]).toBe(data.nodes[previousNode][0])
        }
      }
      for (const step of route.steps.filter((step) => step.maneuver !== 'arrive')) {
        const segment = route.segments.find((candidate) => candidate.startGeometryIndex === step.startGeometryIndex)!
        expect(step.name).toBe(data.names[data.edges[segment.edgeIndex][3]] || null)
        expect(step.at).toEqual(route.geometry[step.startGeometryIndex])
      }
    }
  })
})

afterAll(() => {
  if (process.env.STREET_REPORT !== '1') return
  const report = { checkedAt: new Date().toISOString(), environment: 'Local macOS Node/Vitest; one bounded run, not a phone benchmark',
    ...measurements, routes: realRouteMeasurements }
  mkdirSync(new URL('../../test-results/', import.meta.url), { recursive: true })
  writeFileSync(new URL('../../test-results/street-data-validation.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ coverage: measurements.coverageSummary, synthetic: measurements.synthetic,
    routes: realRouteMeasurements.map(({ originId, destinationId, routeMs, shortestMetres, quieterMetres, geometryPoints }) =>
      ({ originId, destinationId, routeMs, shortestMetres, quieterMetres, geometryPoints })) }, null, 2))
})

const fixtureNodes = [
  { type: 'node', id: 101, lat: 22.57, lon: 88.36 },
  { type: 'node', id: 102, lat: 22.571, lon: 88.36 },
  { type: 'node', id: 103, lat: 22.572, lon: 88.361 },
]
const fixtureWay = {
  type: 'way', id: 201, nodes: [101, 102, 103],
  tags: { highway: 'residential', name: 'Synthetic Fixture Road' },
}
const fixtureSource = { endpoint: 'synthetic-fixture', fetchedAt: '2024-01-01T00:00:00Z' }
const fixtureResponse = (elements: unknown[]) => ({
  osm3s: { timestamp_osm_base: '2024-01-01T00:00:00Z' }, elements,
})

describe('OSM importer pedestrian access', () => {
  it('rejects prohibited, private and non-walking ways, including unapproved high-speed roads', () => {
    for (const tags of [
      { highway: 'residential', access: 'private' }, { highway: 'residential', access: 'no' },
      { highway: 'footway', foot: 'no' }, { highway: 'footway', foot: 'private' },
      { highway: 'primary', foot: 'use_sidepath' }, { highway: 'construction' },
      { highway: 'proposed' }, { highway: 'motorway' }, { highway: 'trunk', foot: 'permissive' },
      { highway: 'pedestrian', area: 'yes' },
    ]) expect(walkingDirections(tags)).toEqual([])
    expect(walkingDirections({ highway: 'trunk', foot: 'designated' })).toEqual([1, -1])
  })

  it('never overrides explicit private/no access and keeps vehicle restrictions separate from foot access', () => {
    expect(walkingDirections({ highway: 'service', access: 'private', foot: 'yes' })).toEqual([])
    expect(walkingDirections({ highway: 'service', access: 'no', foot: 'yes' })).toEqual([])
    expect(walkingDirections({ highway: 'service', access: 'yes', foot: 'no' })).toEqual([])
    expect(walkingDirections({ highway: 'service', motor_vehicle: 'no' })).toEqual([1, -1])
    expect(walkingDirections({ highway: 'service', motor_vehicle: 'private', foot: 'yes' })).toEqual([1, -1])
    expect(walkingDirections({ highway: 'service', 'foot:forward': 'no' })).toEqual([-1])
    expect(walkingDirections({ highway: 'service', 'foot:backward': 'private' })).toEqual([1])
  })

  it('honors pedestrian one-way tags without applying car-only one-way restrictions', () => {
    expect(walkingDirections({ highway: 'residential', oneway: 'yes' })).toEqual([1, -1])
    expect(walkingDirections({ highway: 'footway', 'oneway:foot': 'yes' })).toEqual([1])
    expect(walkingDirections({ highway: 'footway', 'oneway:foot': '-1' })).toEqual([-1])
    expect(walkingDirections({ highway: 'footway', 'foot:oneway': 'yes' })).toEqual([1])
    expect(walkingDirections({ highway: 'footway', 'foot:oneway': '-1' })).toEqual([-1])
    expect(walkingDirections({ highway: 'footway', 'oneway:foot': 'reversible' })).toEqual([])
    expect(walkingDirections({ highway: 'footway', 'foot:oneway:conditional': 'yes @ (Mo)' })).toEqual([])
  })

  it('excludes conditional access and restricted, locked or unknown barriers at actual nodes', () => {
    expect(walkingDirections({ highway: 'path', 'foot:conditional': 'no @ (18:00-06:00)' })).toEqual([])
    expect(walkingDirections({ highway: 'path', 'access:forward:conditional': 'private @ (Mo)' })).toEqual([])
    for (const tags of [
      { foot: 'no' }, { access: 'private' }, { barrier: 'wall' }, { barrier: 'gate' },
      { barrier: 'gate', foot: 'yes', locked: 'yes' }, { 'access:conditional': 'no @ (night)' },
    ]) expect(isWalkableNode(tags)).toBe(false)
    expect(isWalkableNode({ barrier: 'bollard' })).toBe(true)
    expect(isWalkableNode({ barrier: 'gate', foot: 'yes' })).toBe(true)
  })

  it('preserves each real node and segment, road names, steps and bridge flags', () => {
    const data = convertOverpass(fixtureResponse([...fixtureNodes, {
      ...fixtureWay, tags: { highway: 'steps', name: 'Synthetic Fixture Steps', bridge: 'yes' },
    }]), fixtureSource)
    expect(data.nodes).toEqual(fixtureNodes.map((node) => [node.id, node.lat, node.lon]))
    expect(data.names).toEqual(['', 'Synthetic Fixture Steps'])
    expect(data.edges.map((edge: number[]) => [edge[0], edge[1], edge[3], edge[4], edge[5]]))
      .toEqual([[0, 1, 1, 3, 0], [1, 2, 1, 3, 0]])
    expect(data.edges[0][2]).toBeGreaterThan(111)
    expect(data.source.license).toBe('ODbL-1.0')
    expect(data.source.timestamp).toBe('2024-01-01T00:00:00Z')
  })

  it('never joins coincident coordinates belonging to distinct OSM node IDs', () => {
    const data = convertOverpass(fixtureResponse([
      ...fixtureNodes, { ...fixtureNodes[1], id: 104 }, { ...fixtureNodes[2], id: 105 },
      { ...fixtureWay, nodes: [101, 102] }, { ...fixtureWay, id: 202, nodes: [104, 105] },
    ]), fixtureSource)
    expect(data.nodes.map((node: number[]) => node[0])).toEqual([101, 102, 104, 105])
    expect(data.edges.map((edge: number[]) => edge.slice(0, 2))).toEqual([[0, 1], [2, 3]])
  })

  it('does not bridge missing, out-of-bounds or forbidden intermediate nodes', () => {
    const extraNodes = [{ ...fixtureNodes[0], id: 104 }, { ...fixtureNodes[1], id: 105 }]
    const extraWay = { ...fixtureWay, id: 202, nodes: [104, 105] }
    for (const middle of [
      { ...fixtureNodes[1], lat: 22.8 }, { ...fixtureNodes[1], tags: { foot: 'no' } },
      { ...fixtureNodes[1], id: 999 },
    ]) {
      const data = convertOverpass(fixtureResponse([
        fixtureNodes[0], middle, fixtureNodes[2], ...extraNodes, fixtureWay, extraWay,
      ]), fixtureSource)
      expect(data.nodes.map((node: number[]) => node[0])).toEqual([104, 105])
      expect(data.edges).toHaveLength(1)
    }
  })

  it('leaves absent or HTML-like street names blank instead of inventing a name', () => {
    for (const tags of [{ highway: 'footway' }, { highway: 'footway', name: '<b>Not a plain name</b>' }]) {
      const data = convertOverpass(fixtureResponse([...fixtureNodes, { ...fixtureWay, tags }]), fixtureSource)
      expect(data.names).toEqual([''])
      expect(data.edges.every((edge: number[]) => edge[3] === 0)).toBe(true)
    }
  })

  it('rejects partial or undated source data and embeds only the fixed public bounds in its query', () => {
    expect(() => convertOverpass({ elements: [] }, fixtureSource)).toThrow('Incomplete')
    expect(() => convertOverpass({ ...fixtureResponse([]), remark: 'timeout' }, fixtureSource)).toThrow('Incomplete')
    expect(() => convertOverpass(fixtureResponse(fixtureNodes), fixtureSource)).toThrow('No connected')
    expect(STREET_BOUNDS).toEqual({ south: 22.44, west: 88.28, north: 22.64, east: 88.49 })
    expect(OVERPASS_QUERY).toContain('(22.44,88.28,22.64,88.49)')
    expect(OVERPASS_QUERY).toContain('[timeout:90]')
  })

  it('parses Osmium XML with its structured tags and original node IDs', () => {
    const xml = '<osm version="0.6"><node id="101" lat="22.57" lon="88.36"/>'
      + '<node id="102" lat="22.571" lon="88.36"/><way id="201"><nd ref="101"/><nd ref="102"/>'
      + '<tag k="highway" v="steps"/><tag k="name:en" v="Fixture &amp; Steps"/>'
      + '<tag k="foot:oneway" v="yes"/></way></osm>'
    const data = convertOsmXml(xml, { snapshot: '2024-01-01T00:00:00Z', url: 'synthetic-fixture' })
    expect(data.nodes).toEqual([[101, 22.57, 88.36], [102, 22.571, 88.36]])
    expect(data.names).toEqual(['', 'Fixture & Steps'])
    expect(data.edges[0].slice(3)).toEqual([1, 2, 1])
    expect(data.source.timestamp).toBe('2024-01-01T00:00:00Z')
  })

  it('rejects malformed XML, entity declarations and missing snapshot provenance', () => {
    const metadata = { snapshot: '2024-01-01T00:00:00Z' }
    expect(() => convertOsmXml('<osm>', metadata)).toThrow('Malformed')
    expect(() => convertOsmXml('<!DOCTYPE osm><osm version="0.6"/>', metadata)).toThrow('Invalid')
    expect(() => convertOsmXml('<osm version="0.6"/>', {})).toThrow('snapshot')
  })

  it('compresses degree-two chains without changing their polyline, distance or pedestrian direction', () => {
    const raw = convertOverpass(fixtureResponse([...fixtureNodes,
      { ...fixtureWay, tags: { highway: 'footway', 'oneway:foot': 'yes' } },
    ]), fixtureSource)
    const data = compactStreetGraph(raw)
    expect(data.version).toBe(2)
    expect(data.nodes.map((node) => node[0])).toEqual([101, 103])
    expect(data.edges).toHaveLength(1)
    expect(data.edges[0][2]).toBeCloseTo(raw.edges.reduce((sum, edge) => sum + edge[2], 0), 3)
    expect(data.edges[0][5]).toBe(1)
    expect(data.edges[0][6]).toEqual([1000, 0])
  })

  it('retains street-name boundaries and represents cycles as distinct parallel paths', () => {
    const named = convertOverpass(fixtureResponse([...fixtureNodes,
      { ...fixtureWay, nodes: [101, 102] },
      { ...fixtureWay, id: 202, nodes: [102, 103], tags: { highway: 'footway', name: 'Other Fixture' } },
    ]), fixtureSource)
    expect(compactStreetGraph(named).nodes).toHaveLength(3)
    const cycle = convertOverpass(fixtureResponse([...fixtureNodes,
      { ...fixtureWay, nodes: [101, 102, 103, 101] },
    ]), fixtureSource)
    const compact = compactStreetGraph(cycle)
    expect(compact.nodes).toHaveLength(2)
    expect(compact.edges).toHaveLength(2)
    expect(compact.edges.every((edge) => edge[0] !== edge[1])).toBe(true)
    expect(compact.edges.reduce((sum, edge) => sum + edge[2], 0))
      .toBeCloseTo(cycle.edges.reduce((sum, edge) => sum + edge[2], 0), 3)
  })
})