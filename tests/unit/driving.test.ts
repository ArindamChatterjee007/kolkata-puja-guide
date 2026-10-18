import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Worker as NodeWorker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { DirectedGraph } from 'graphology'
import { bidirectional } from 'graphology-shortest-path/dijkstra'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createDrivingRouter, decodeDrivingGeometry, drivingTimeProfile, makeDrivingLegEstimator, selectDrivingPath,
  validateDrivingData, type DrivingArc, type DrivingData, type DrivingNode, type DrivingRouter } from '../../src/domain/driving'
import { haversineMetres } from '../../src/domain/geo'
import { createDrivingWorkerController, type DrivingWorkerProgress } from '../../src/workers/driving.worker'

const benchmark: Record<string, unknown> = { routes: [] }
afterAll(() => {
  if (process.env.DRIVING_REPORT === '1') writeFileSync(new URL('../../public/data/bengal-driving.benchmark.json', import.meta.url),
    `${JSON.stringify({ measuredAt: new Date().toISOString(), environment: 'macOS Node/Vitest; public demo coordinates only; not phone or live-traffic performance',
      ...benchmark }, null, 2)}\n`)
})

const { motorcarDirections, isMotorcarNode, parsePostedSpeed, parseCarRestriction, convertDrivingXml } =
  await import(new URL('../../scripts/build-driving.mjs', import.meta.url).href) as {
    motorcarDirections: (tags?: Record<string, string | undefined>) => number[]
    isMotorcarNode: (tags?: Record<string, string>) => boolean
    parsePostedSpeed: (value?: string) => number | null
    parseCarRestriction: (relation: unknown) => { fromWay: number; kind: string; type: string; reason: string }[]
    convertDrivingXml: (xml: string, source: Record<string, string>) => unknown
  }

describe('directed car edge-state routing', () => {
  const arcs: DrivingArc[] = [
    { from: 0, to: 1, wayId: 101, metres: 100, seconds: 10 },
    { from: 1, to: 2, wayId: 102, metres: 10, seconds: 1 },
    { from: 1, to: 3, wayId: 103, metres: 100, seconds: 10 },
    { from: 3, to: 4, wayId: 104, metres: 100, seconds: 10 },
    { from: 4, to: 2, wayId: 105, metres: 100, seconds: 10 },
  ]

  it('excludes an illegal short left turn using the previous car edge', () => {
    expect(selectDrivingPath(5, arcs, 0, 2)).toEqual([0, 1])
    expect(selectDrivingPath(5, arcs, 0, 2, [{ fromArc: 0, toArc: 1 }])).toEqual([0, 2, 3, 4])
    expect(selectDrivingPath(5, arcs, 1, 2, [{ fromArc: 0, toArc: 1 }])).toEqual([1])
  })

  it('never reverses a one-way arc or invents a geometric connector', () => {
    expect(selectDrivingPath(5, arcs, 2, 0)).toBeNull()
  })

  it('matches Graphology minimum costs for every fixture pair and keeps tied paths legal', () => {
    const candidates = [...arcs,
      { from: 0, to: 3, wayId: 106, metres: 200, seconds: 20 },
      { from: 3, to: 1, wayId: 107, metres: 100, seconds: 10 },
    ]
    for (const blocked of [[], [{ fromArc: 0, toArc: 1 }]]) {
      for (let origin = 0; origin < 5; origin += 1) {
        for (let destination = 0; destination < 5; destination += 1) {
          const reference = new DirectedGraph()
          for (const [index] of candidates.entries()) reference.addNode(String(index))
          for (const [previousIndex, previous] of candidates.entries()) {
            for (const [nextIndex, next] of candidates.entries()) {
              if (previous.to !== next.from || next.to === previous.from
                || blocked.some((turn) => turn.fromArc === previousIndex && turn.toArc === nextIndex)) continue
              reference.addDirectedEdge(String(previousIndex), String(nextIndex), { weight: next.seconds })
            }
          }
          reference.addNode('origin'); reference.addNode('destination')
          for (const [index, arc] of candidates.entries()) {
            if (arc.from === origin) reference.addDirectedEdge('origin', String(index), { weight: arc.seconds })
            if (arc.to === destination) reference.addDirectedEdge(String(index), 'destination', { weight: 0 })
          }
          const expected = origin === destination ? [] : bidirectional(reference, 'origin', 'destination', 'weight')?.slice(1, -1).map(Number) ?? null
          const actual = selectDrivingPath(5, candidates, origin, destination, blocked)
          if (expected === null || origin === destination) {
            expect(actual).toEqual(expected)
            continue
          }
          expect(actual).not.toBeNull()
          expect(actual!.reduce((seconds, index) => seconds + candidates[index].seconds, 0))
            .toBe(expected.reduce((seconds, index) => seconds + candidates[index].seconds, 0))
          expect(candidates[actual![0]].from).toBe(origin)
          expect(candidates[actual!.at(-1)!].to).toBe(destination)
          for (let index = 1; index < actual!.length; index += 1) {
            const previous = actual![index - 1]
            const next = actual![index]
            expect(candidates[previous].to).toBe(candidates[next].from)
            expect(candidates[next].to).not.toBe(candidates[previous].from)
            expect(blocked.some((turn) => turn.fromArc === previous && turn.toArc === next)).toBe(false)
          }
        }
      }
    }
  })
})

describe('conservative OSM motorcar import', () => {
  it('honors forward, reverse, implicit roundabout and vehicle-specific one-way tags', () => {
    for (const oneway of ['yes', '1', 'true']) expect(motorcarDirections({ highway: 'primary', oneway })).toEqual([1])
    expect(motorcarDirections({ highway: 'primary', oneway: '-1' })).toEqual([-1])
    expect(motorcarDirections({ highway: 'primary', junction: 'roundabout' })).toEqual([1])
    expect(motorcarDirections({ highway: 'primary', oneway: 'yes', 'oneway:motorcar': 'no' })).toEqual([1, -1])
    expect(motorcarDirections({ highway: 'primary', oneway: 'reversible' })).toEqual([])
  })

  it('excludes private, no-access, permit, destination and designated roads without through-traffic shortcuts', () => {
    for (const key of ['motorcar', 'motor_vehicle', 'vehicle', 'access']) {
      for (const value of ['no', 'private', 'destination', 'designated', 'permit', 'license', 'customers']) {
        expect(motorcarDirections({ highway: 'residential', [key]: value })).toEqual([])
      }
    }
    expect(motorcarDirections({ highway: 'primary', access: 'private', motorcar: 'yes' })).toEqual([])
    expect(motorcarDirections({ highway: 'residential', 'motor_vehicle:backward': 'no' })).toEqual([1])
  })

  it('excludes walking roads, construction, conditional access, parking aisles and unknown car dimensions', () => {
    for (const highway of ['footway', 'path', 'steps', 'cycleway', 'pedestrian', 'construction', 'proposed']) {
      expect(motorcarDirections({ highway, foot: 'yes' })).toEqual([])
    }
    for (const extra of [{ construction: 'yes' }, { 'motorcar:conditional': 'yes @ (Mo-Fr)' },
      { service: 'parking_aisle' }, { maxheight: '2.0' }]) {
      expect(motorcarDirections({ highway: 'service', ...extra })).toEqual([])
    }
  })

  it('breaks roads at car barriers and conditional or restricted nodes', () => {
    expect(isMotorcarNode({ barrier: 'bollard' })).toBe(false)
    expect(isMotorcarNode({ barrier: 'gate', motorcar: 'yes' })).toBe(false)
    expect(isMotorcarNode({ access: 'private' })).toBe(false)
    expect(isMotorcarNode({ 'access:conditional': 'no @ (night)' })).toBe(false)
    expect(isMotorcarNode({ barrier: 'toll_booth' })).toBe(true)
  })

  it('parses only numeric posted speed limits and converts mph without inventing unknown limits', () => {
    expect(parsePostedSpeed('50')).toBe(50)
    expect(parsePostedSpeed('30 mph')).toBeCloseTo(48.28032, 2)
    for (const value of ['signals', 'none', 'IN:urban', '30;50', '-20', '999']) expect(parsePostedSpeed(value)).toBeNull()
  })

  const relation = (tags: Record<string, string>, viaType = 'node') => ({ id: 900,
    tags: { type: 'restriction', restriction: 'no_left_turn', ...tags },
    members: [{ type: 'way', role: 'from', ref: 101 }, { type: viaType, role: 'via', ref: 2 },
      { type: 'way', role: 'to', ref: 102 }],
  })

  it('respects motorcar restriction precedence and car exceptions', () => {
    expect(parseCarRestriction(relation({ 'restriction:motorcar': 'only_right_turn' }))[0]).toMatchObject({ kind: 'only', type: 'only_right_turn' })
    expect(parseCarRestriction(relation({ except: 'bicycle;motor_vehicle' }))).toEqual([])
    expect(parseCarRestriction(relation({ except: 'bus' }))[0].kind).toBe('no')
  })

  it('marks via-way, conditional and unknown restrictions for conservative transition blocking', () => {
    expect(parseCarRestriction(relation({}, 'way'))[0]).toMatchObject({ kind: 'block', reason: 'via-way' })
    expect(parseCarRestriction(relation({ 'restriction:conditional': 'no_left_turn @ (17:00-22:00)' }))[0].kind).toBe('block')
    expect(parseCarRestriction(relation({ restriction: 'unknown_turn_rule' }))[0].kind).toBe('block')
  })

  it('conservatively excludes a via-only restriction node with no identifiable turn approaches', () => {
    expect(parseCarRestriction({ id: 7729480, tags: { type: 'restriction', restriction: 'no_left_turn' },
      members: [{ type: 'node', role: 'via', ref: 1176978433 }] })).toMatchObject([
      { kind: 'exclude-node', reason: 'missing-from', viaNode: 1176978433 },
    ])
  })

  it('rejects missing way references and XML entities rather than inventing road geometry', () => {
    const source = { timestamp: '2026-10-14T20:21:12Z' }
    expect(() => convertDrivingXml('<osm version="0.6"><way id="1"><nd ref="999"/></way></osm>', source)).toThrow('reference')
    expect(() => convertDrivingXml('<!DOCTYPE osm><osm version="0.6"/>', source)).toThrow('Invalid OSM')
  })

  it('retains real geometry for an internal loop without a self-edge or invented crossing', () => {
    const data = convertDrivingXml('<osm version="0.6">'
      + '<node id="1" lat="23.55" lon="87.31"/><node id="2" lat="23.551" lon="87.31"/>'
      + '<node id="3" lat="23.552" lon="87.311"/><node id="4" lat="23.551" lon="87.312"/>'
      + '<node id="5" lat="23.550" lon="87.313"/><way id="101"><nd ref="1"/><nd ref="2"/>'
      + '<nd ref="3"/><nd ref="4"/><nd ref="2"/><nd ref="5"/><tag k="highway" v="residential"/></way></osm>',
    { timestamp: '2026-10-14T20:21:12Z' }) as { nodes: number[][]; edges: number[][] }
    expect(data.edges).toHaveLength(4)
    expect(data.edges.every((edge) => edge[0] !== edge[1])).toBe(true)
    expect(data.nodes.some((node) => node[0] === 3)).toBe(true)
  })
})

interface FixtureWay { id: number; nodes: number[]; tags?: Record<string, string> }
const fixtureSource = { timestamp: '2026-10-14T20:21:12Z', pbfSha256: '0'.repeat(64),
  url: 'https://download.geofabrik.de/asia/india/eastern-zone-261014.osm.pbf' }
const fixtureNodes: DrivingNode[] = [
  [1, 23.550, 87.310], [2, 23.551, 87.310], [3, 23.551, 87.309],
  [4, 23.552, 87.310], [5, 23.552, 87.309],
]
const fixtureWays: FixtureWay[] = [
  { id: 101, nodes: [1, 2] }, { id: 102, nodes: [2, 3], tags: { oneway: 'no', name: 'Short left' } },
  { id: 103, nodes: [2, 4] }, { id: 104, nodes: [4, 5] }, { id: 105, nodes: [5, 3] },
]
const turnXml = (type = 'no_left_turn', viaType = 'node', viaId = 2, conditional = false) => '<relation id="900">'
  + '<member type="way" role="from" ref="101"/>'
  + `<member type="${viaType}" role="via" ref="${viaId}"/>`
  + '<member type="way" role="to" ref="102"/><tag k="type" v="restriction"/>'
  + `<tag k="restriction" v="${type}"/>`
  + (conditional ? '<tag k="restriction:conditional" v="no_left_turn @ (17:00-22:00)"/>' : '') + '</relation>'

function carFixture(nodes = fixtureNodes, ways = fixtureWays, relations = ''): DrivingData {
  const xml = '<osm version="0.6">' + nodes.map(([id, lat, lng]) => `<node id="${id}" lat="${lat}" lon="${lng}"/>`).join('')
    + ways.map((way) => `<way id="${way.id}">` + way.nodes.map((ref) => `<nd ref="${ref}"/>`).join('')
      + Object.entries({ highway: 'residential', oneway: 'yes', ...way.tags }).map(([key, value]) => `<tag k="${key}" v="${value}"/>`).join('')
      + '</way>').join('') + relations + '</osm>'
  return validateDrivingData(convertDrivingXml(xml, fixtureSource))
}

const point = (id: number) => {
  const node = fixtureNodes.find((entry) => entry[0] === id)!
  return { lat: node[1], lng: node[2] }
}
const offPeak = { departureTimestamp: Date.parse('2026-10-18T06:30:00Z') }

describe('production car router legality and instructions', () => {
  it('enforces a via-node turn rule through the final partial destination edge', () => {
    const router = createDrivingRouter(carFixture(fixtureNodes, fixtureWays, turnXml()))
    const full = router.route(point(1), point(3), offPeak)
    const partial = router.route(point(1), { lat: 23.551, lng: 87.3095 }, offPeak)
    expect(full.status).toBe('ok')
    expect(partial.status).toBe('ok')
    if (full.status !== 'ok' || partial.status !== 'ok') throw new Error('Expected legal detours')
    expect(full.route.osmWayIds).toEqual([101, 103, 104, 105])
    expect(partial.route.osmWayIds).toEqual([101, 103, 104, 105, 102])
    expect(partial.route.segments.at(-1)?.direction).toBe(-1)
    expect(partial.restrictionsApplied.viaNodeRelations).toBe(1)
    expect(partial.unknownFallback).toBe(false)
  })

  it('enforces only-turn rules and directed roads without inventing reverse travel', () => {
    const router = createDrivingRouter(carFixture(fixtureNodes, fixtureWays, turnXml('only_left_turn')))
    expect(router.route(point(1), point(4), offPeak).status).toBe('unavailable')
    const oneWay = createDrivingRouter(carFixture(fixtureNodes.slice(0, 2), [fixtureWays[0]]))
    expect(oneWay.route(point(2), point(1), offPeak)).toMatchObject({ status: 'unavailable', unknownFallback: false })
  })

  it('conservatively blocks via-way and conditional restrictions even outside the stated hours', () => {
    for (const relation of [turnXml('no_left_turn', 'way', 103), turnXml('no_left_turn', 'node', 2, true)]) {
      const router = createDrivingRouter(carFixture(fixtureNodes, fixtureWays, relation))
      expect(router.route(point(1), point(3), offPeak)).toMatchObject({ status: 'unavailable', reason: 'disconnected-or-restricted' })
      expect(router.summary.restrictions.conservativelyBlockedRelations).toBe(1)
    }
  })

  it('does not connect grade-separated OSM nodes with identical coordinates', () => {
    const nodes: DrivingNode[] = [[10, 23.55, 87.308], [11, 23.55, 87.310],
      [12, 23.55, 87.310], [13, 23.552, 87.310]]
    const router = createDrivingRouter(carFixture(nodes, [{ id: 201, nodes: [10, 11], tags: { bridge: 'yes', layer: '1' } },
      { id: 202, nodes: [12, 13] }]))
    expect(router.route({ lat: 23.55, lng: 87.308 }, { lat: 23.552, lng: 87.310 }, offPeak))
      .toMatchObject({ status: 'unavailable', reason: 'disconnected-or-restricted' })
  })

  it('excludes private and destination-only shortcuts from the actual route', () => {
    for (const access of ['private', 'destination', 'designated']) {
      const ways = fixtureWays.map((way) => way.id === 102 ? { ...way, tags: { ...way.tags, access } } : way)
      const result = createDrivingRouter(carFixture(fixtureNodes, ways)).route(point(1), point(3), offPeak)
      expect(result.status).toBe('ok')
      if (result.status === 'ok') expect(result.route.osmWayIds).toEqual([101, 103, 104, 105])
    }
  })

  it('preserves bent OSM geometry and never inserts the off-street destination pin', () => {
    const data = carFixture(fixtureNodes, [{ id: 301, nodes: [1, 2, 4, 5, 3] }])
    const result = createDrivingRouter(data).route(point(1), { lat: 23.5507, lng: 87.309 }, offPeak)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.route.geometry).toEqual(decodeDrivingGeometry(data, 0))
    expect(result.snaps.destination.offsetMetres).toBeGreaterThan(30)
    expect(result.route.geometry.at(-1)).toEqual(point(3))
    expect(result.route.cumulativeMetres.at(-1)).toBeCloseTo(result.route.metres, 6)
    expect(result.snaps.destination.accessVerified).toBe(false)
  })

  it('returns NoRoad within the outer clip when no mapped car road is within 120 metres', () => {
    const router = createDrivingRouter(carFixture())
    expect(router.route(point(1), { lat: 23.56, lng: 87.33 }, offPeak)).toMatchObject({ status: 'unavailable', reason: 'no-road', unknownFallback: false })
    expect(router.route(point(1), { lat: 24, lng: 87.3 }, offPeak)).toMatchObject({ status: 'unavailable', reason: 'outside-bounds' })
    expect(() => router.snap(point(1), 400)).toThrow(RangeError)
  })

  it('derives turns, posted limits, flyover flags and lane evidence only from source roads', () => {
    const nodes = fixtureNodes.slice(0, 3)
    const data = carFixture(nodes, [
      { id: 401, nodes: [1, 2], tags: { name: 'Ordinary bridge', bridge: 'yes', maxspeed: '30 mph' } },
      { id: 402, nodes: [2, 3], tags: { name: 'Elevated turn', bridge: 'viaduct', layer: '1', ref: 'NH 19', 'turn:lanes': 'left|through' } },
    ])
    const result = createDrivingRouter(data).route(point(1), point(3), offPeak)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.route.steps[0]).toMatchObject({ maneuver: 'depart', flags: { bridge: true, flyover: false }, speedLimitKph: 48.28 })
    expect(result.route.steps[1]).toMatchObject({ maneuver: 'turn-left', ref: 'NH 19', flags: { flyover: true }, sourceLaneTags: { 'turn:lanes': 'left|through' } })
    expect(result.route.steps[1].speedLimitKph).toBeUndefined()
    expect(result.route.steps[0].sourceLaneTags).toBeUndefined()
    expect(result.route.steps.reduce((sum, step) => sum + step.metres, 0)).toBeCloseTo(result.route.metres, 6)
    expect(result.route.steps.at(-1)?.maneuver).toBe('arrive')
  })

  it('keeps no-U-turn on one way from blocking legal straight continuation on that same way', () => {
    const nodes: DrivingNode[] = [[1, 23.55, 87.31], [2, 23.551, 87.31], [3, 23.552, 87.31]]
    const relation = '<relation id="901"><member type="way" role="from" ref="501"/>'
      + '<member type="node" role="via" ref="2"/><member type="way" role="to" ref="501"/>'
      + '<tag k="type" v="restriction"/><tag k="restriction" v="no_u_turn"/></relation>'
    const router = createDrivingRouter(carFixture(nodes, [{ id: 501, nodes: [1, 2, 3], tags: { oneway: 'no' } }], relation))
    expect(router.route({ lat: 23.55, lng: 87.31 }, { lat: 23.552, lng: 87.31 }, offPeak).status).toBe('ok')
    expect(router.summary.restrictions.immediateReversalsBlocked).toBeGreaterThan(0)
  })

  it('supports static time profiles, directed cached metrics and failure-explicit integration', () => {
    const router = createDrivingRouter(carFixture(fixtureNodes.slice(0, 2), [fixtureWays[0]]))
    const day = router.routeMetrics(point(1), point(2), 12)
    const evening = router.routeMetrics(point(1), point(2), 19)
    expect(day.status).toBe('ok')
    expect(evening.status).toBe('ok')
    if (day.status !== 'ok' || evening.status !== 'ok') throw new Error('Expected road estimates')
    expect(evening.estimatedSeconds.min).toBeGreaterThan(day.estimatedSeconds.min)
    expect(day).toEqual(router.routeMetrics(point(1), point(2), 12))
    expect(router.routeMetrics(point(2), point(1), 12).status).toBe('unavailable')
    expect(() => drivingTimeProfile(24)).toThrow(RangeError)
    expect(makeDrivingLegEstimator(router)({ from: point(2), to: point(1), departureTimestamp: offPeak.departureTimestamp,
      transport: 'personal', pace: 'steady', preference: 'balanced' })).toMatchObject({ status: 'unavailable', unknownFallback: false })
  })

  it('avoids tagged toll roads without restoring prohibited or geometric shortcuts', () => {
    const ways = fixtureWays.map((way) => way.id === 102 ? { ...way, tags: { ...way.tags, toll: 'yes' } } : way)
    const router = createDrivingRouter(carFixture(fixtureNodes, ways))
    const result = router.route(point(1), point(3), { ...offPeak, avoid: ['tolls'] })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.route.osmWayIds).toEqual([101, 103, 104, 105])
    const blocked = createDrivingRouter(carFixture(fixtureNodes.slice(0, 2), [{ ...fixtureWays[0], tags: { tunnel: 'yes' } }]))
    expect(blocked.route(point(1), point(2), { ...offPeak, avoid: ['tunnels'] }).status).toBe('unavailable')
  })

  it('caches all 24 IST hours by their three effective profiles without changing metrics', () => {
    const router = createDrivingRouter(carFixture(fixtureNodes, fixtureWays, turnXml()))
    for (let hour = 0; hour < 24; hour += 1) {
      const metrics = router.routeMetrics(point(1), point(3), hour)
      expect(metrics).toMatchObject({ status: 'ok', timeProfile: drivingTimeProfile(hour) })
      expect(metrics).not.toHaveProperty('geometry')
      expect(metrics).not.toHaveProperty('route')
    }
    expect(router.summary.performance).toMatchObject({ searches: 3, metricCacheHits: 21 })
    const metrics = router.routeMetrics(point(1), point(3), 12)
    const route = router.route(point(1), point(3), offPeak)
    if (metrics.status !== 'ok' || route.status !== 'ok') throw new Error('Expected source-road metrics')
    expect(metrics.metres).toBe(route.route.metres)
    expect(metrics.estimatedSeconds).toEqual(route.route.estimatedSeconds)
    metrics.metres = -1
    metrics.snaps.origin.coordinate.lat = 0
    expect(router.routeMetrics(point(1), point(3), 13)).toMatchObject({ metres: route.route.metres, snaps: route.snaps })
  })

  it('normalizes option keys but separates custom profiles, avoid sets and snap limits', () => {
    const router = createDrivingRouter(carFixture())
    const first = router.routeMetrics(point(1), point(3), 8, { avoid: ['tolls', 'motorways'],
      timeProfile: { name: 'custom', urbanFactor: 1.4, corridorFactor: 1.1 } })
    expect(router.routeMetrics(point(1), point(3), 22, { avoid: ['motorways', 'tolls', 'tolls'],
      timeProfile: { corridorFactor: 1.1, name: 'custom', urbanFactor: 1.4 } })).toEqual(first)
    expect(router.summary.performance).toMatchObject({ searches: 1, metricCacheHits: 1 })
    for (const options of [
      { timeProfile: { name: 'custom', urbanFactor: 1.5, corridorFactor: 1.1 } },
      { timeProfile: { name: 'another-label', urbanFactor: 1.4, corridorFactor: 1.1 } },
      { avoid: ['tunnels'] as const }, { maxSnapMetres: 100 },
    ]) router.routeMetrics(point(1), point(3), 8, options)
    expect(router.summary.performance?.searches).toBe(5)
    router.clearMetricCache()
    router.routeMetrics(point(1), point(3), 8)
    expect(router.summary.performance?.searches).toBe(6)
  })

  it('rejects wrong modes, corrupted geometry and oversized snap options', () => {
    const data = carFixture()
    expect(() => createDrivingRouter({ ...data, mode: 'foot' })).toThrow(RangeError)
    const broken = structuredClone(data)
    broken.edges[0][2] += 100
    expect(() => createDrivingRouter(broken)).toThrow('distance')
    expect(() => createDrivingRouter(data).route(point(1), point(3), { maxSnapMetres: 121 })).toThrow(RangeError)
  })
})

export const drivingDemoPoints = [
  { id: 'kolkata-esplanade', lat: 22.56361, lng: 88.35120 },
  { id: 'asansol-hotel', lat: 23.6817, lng: 86.988 },
  { id: 'durgapur-sepco', lat: 23.5498992, lng: 87.31662885 },
  { id: 'durgapur-marconi', lat: 23.5663757, lng: 87.3107181 },
  { id: 'kalyaneshwari-area', lat: 23.777, lng: 86.828 },
] as const

const retainedRouteReferences = [
  { from: 2, to: 3, metres: 2476.2317859021587, planningSeconds: 431.7758815170555,
    estimatedSeconds: { min: 388.59829336534995, max: 863.551763034111 },
    segmentsSha256: 'bbb29c822a2927a919fe0634383a85a2df593a0fd1959ab18cfa01dddd7bfa20',
    geometrySha256: '35008228978d35c414ab12a3390a9e5be5170d97429d7aff0e3c191dabc5dab7',
    osmWayIdsSha256: '1c40da6714f6d05e07f059476cec2c977b65a08801eb674690a571f41555384c' },
  { from: 1, to: 2, metres: 39327.372100382905, planningSeconds: 3466.088151599339,
    estimatedSeconds: { min: 3119.4793364394054, max: 6723.564251998679 },
    segmentsSha256: '2cb54f9d776abd866bc8e89f8e7065b86042110a94aaaf9c5c08de3a1159f8ae',
    geometrySha256: '07ec98c8f0bcc05522ad76a9c29c64f1baf4325dbd07804f2ab6306d152bc9da',
    osmWayIdsSha256: 'd956606e7994d05e5e938cd1d45eeac3d7205975fe05806490ef07651eadb174' },
  { from: 0, to: 2, metres: 195045.39515291786, planningSeconds: 11937.420111860087,
    estimatedSeconds: { min: 10743.678100674078, max: 20580.678425320166 },
    segmentsSha256: '5572761adb09503f4484e816477abef683fd00ce030ef54ee580dfe15efe12a2',
    geometrySha256: '442df7c4c0d05b6c3981b9f6a46115501d43cbf3c9ca1293e4321635f848dda0',
    osmWayIdsSha256: '80f58aa9de6790f4d3cfad5370e77d4cfa2700d41cf0d8a2d6597b650d1429fd' },
]
const retainedMatrixSha256 = '636eb08487494f335e559d8e4be7e1217bbea6e609f33853c2bff50f54839e9a'

function retainedCarData(): DrivingData {
  const base = new URL('../../public/data/', import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('bengal-driving.manifest.json', base), 'utf8')) as {
    layout: string; datasetSha256: string; header: Record<string, unknown>
    files: { file: string; sha256: string; bytes: number; table?: string; offset?: number }[]
  }
  const data: Record<string, unknown> = { ...manifest.header }
  let gzipBytes = 0
  let totalBytes = 0
  for (const entry of manifest.files) {
    const content = readFileSync(new URL(entry.file, base))
    gzipBytes += gzipSync(content).byteLength
    totalBytes += content.byteLength
    expect(content.byteLength).toBe(entry.bytes)
    expect(content.byteLength).toBeLessThanOrEqual(8 * 1024 * 1024)
    expect(createHash('sha256').update(content).digest('hex')).toBe(entry.sha256)
    const chunk = JSON.parse(content.toString())
    if (manifest.layout === 'single') return validateDrivingData(chunk)
    const rows = (data[chunk.table] ?? []) as unknown[]
    expect(rows.length).toBe(chunk.offset)
    data[chunk.table] = rows.concat(chunk.values)
  }
  expect(createHash('sha256').update(`${JSON.stringify(data)}\n`).digest('hex')).toBe(manifest.datasetSha256)
  benchmark.assets = { files: manifest.files.length, totalBytes, gzipBytes,
    maximumChunkBytes: Math.max(...manifest.files.map((entry) => entry.bytes)), datasetSha256: manifest.datasetSha256 }
  return validateDrivingData(data)
}

describe('retained Bengal motorcar data', () => {
  let data: DrivingData
  let router: DrivingRouter
  beforeAll(() => {
    const before = process.memoryUsage().heapUsed
    data = retainedCarData()
    router = createDrivingRouter(data)
    benchmark.graph = { measuredAt: new Date().toISOString(), ...router.summary,
      heapDeltaMiB: (process.memoryUsage().heapUsed - before) / 1024 / 1024, source: data.source.timestamp }
  }, 60_000)

  it('loads only the genuine car graph and retains the published source identity', () => {
    expect(data.source.pbfSha256).toBe('b2443fab468183501a9072f4ffa46d6b9c5a4ceea2e54479a51d8aec43a755b1')
    expect(data.source.timestamp).toBe('2026-10-14T20:21:12Z')
    expect(router.summary.directedStates).toBeLessThanOrEqual(400_000)
    expect(data.exclusions.nodeIds).toContain(1176978433)
  })

  it.each([
    [2, 3, 1_000, 10_000], [1, 2, 30_000, 100_000], [0, 2, 140_000, 280_000],
  ])('routes public demo point %i to %i on source roads', (from, to, minimum, maximum) => {
    const started = performance.now()
    const result = router.route(drivingDemoPoints[from], drivingDemoPoints[to], offPeak)
    ;(benchmark.routes as unknown[]).push({ from: drivingDemoPoints[from].id, to: drivingDemoPoints[to].id,
      routeMs: performance.now() - started, status: result.status,
      ...(result.status === 'ok' ? { metres: result.route.metres, seconds: result.route.estimatedSeconds,
        geometryPoints: result.route.geometry.length, steps: result.route.steps.length,
        originOffset: result.snaps.origin.offsetMetres, destinationOffset: result.snaps.destination.offsetMetres,
        refs: [...new Set(result.route.steps.map((step) => step.ref).filter(Boolean))] } : { reason: result.reason, snaps: result.snaps }) })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error(result.reason)
    expect(result.route.metres).toBeGreaterThan(minimum)
    expect(result.route.metres).toBeLessThan(maximum)
    expect(result.route.geometry.length).toBeGreaterThan(5)
    expect(result.route.metres).toBeGreaterThan(haversineMetres(result.snaps.origin.coordinate, result.snaps.destination.coordinate))
    expect(result.route.estimatedSeconds.max).toBeGreaterThan(result.route.estimatedSeconds.min)
    for (const segment of result.route.segments) {
      const edge = data.edges[segment.edgeIndex]
      const road = data.roads[edge[3]]
      expect(road[0]).toBe(segment.osmWayId)
      expect(road[4] === 0 || road[4] === segment.direction).toBe(true)
      const points = decodeDrivingGeometry(data, segment.edgeIndex)
      expect(points.length).toBeGreaterThanOrEqual(2)
    }
    for (const step of result.route.steps) {
      if (step.flags.flyover) expect(step.osmWayIds.every((id) => data.roads.some((road) => road[0] === id && (road[5] & 4)))).toBe(true)
    }
  }, 30_000)

  it('computes a directed five-point matrix and returning legs without a straight-line fallback', () => {
    const started = performance.now()
    const matrix = drivingDemoPoints.map((from) => drivingDemoPoints.map((to) => router.routeMetrics(from, to, 12)))
    benchmark.matrix = { measuredAt: new Date().toISOString(), milliseconds: performance.now() - started,
      points: drivingDemoPoints.map((entry) => entry.id), rows: matrix.map((row) => row.map((entry) => entry.status === 'ok'
        ? { metres: Math.round(entry.metres), minutes: entry.durationMinutes } : { unavailable: entry.reason })) }
    expect(matrix).toHaveLength(5)
    for (const row of matrix) for (const entry of row) expect(entry.unknownFallback).toBe(false)
    expect(matrix[2][3].status).toBe('ok')
    expect(matrix[3][2].status).toBe('ok')
    expect(matrix[0][2].status).toBe('ok')
    expect(matrix[2][0].status).toBe('ok')
    const cachedStarted = performance.now()
    expect(router.routeMetrics(drivingDemoPoints[0], drivingDemoPoints[2], 12)).toEqual(matrix[0][2])
    benchmark.cachedMetricMs = performance.now() - cachedStarted
  }, 60_000)
})

describe('car worker protocol over bounded static HTTP', () => {
  let server: Server
  let origin: string
  let mode: 'valid' | 'bad-uri' | 'bad-hash' | 'too-large' | 'real' = 'valid'
  const requests: { path: string; method: string | undefined; cookie: string | undefined }[] = []
  const fixture = carFixture(fixtureNodes, fixtureWays, turnXml())
  const content = `${JSON.stringify(fixture)}\n`
  const bytes = Buffer.byteLength(content)
  const hash = createHash('sha256').update(content).digest('hex')
  let compiled: Promise<string> | undefined
  const compileWorker = () => compiled ??= build({ configFile: false, root: fileURLToPath(new URL('../../', import.meta.url)), base: '/app/',
    logLevel: 'silent', build: { write: false, copyPublicDir: false, minify: false,
      lib: { entry: fileURLToPath(new URL('../../src/workers/driving.worker.ts', import.meta.url)), formats: ['es'], fileName: 'driving-worker' } } })
    .then((generated) => {
      const output = Array.isArray(generated) ? generated[0] : generated
      if (!('output' in output)) throw new Error('Worker did not produce a bundle')
      const entry = output.output.find((item) => item.type === 'chunk' && item.isEntry)
      if (!entry || entry.type !== 'chunk') throw new Error('Worker entry bundle missing')
      return entry.code
    })
  beforeAll(async () => {
    server = createServer((request, response) => {
      requests.push({ path: request.url!, method: request.method, cookie: request.headers.cookie })
      response.setHeader('Content-Type', 'application/json')
      if (mode === 'real' && /^\/app\/data\/bengal-driving(?:\.manifest|-[0-7])\.json$/.test(request.url ?? '')) {
        const file = request.url!.slice('/app/data/'.length)
        response.end(readFileSync(new URL(`../../public/data/${file}`, import.meta.url)))
      } else if (request.url === '/app/data/bengal-driving.manifest.json') {
        const file = mode === 'bad-uri' ? 'https://example.invalid/collect?point=1' : 'bengal-driving.json'
        response.end(JSON.stringify({ version: 1, mode: 'motorcar', layout: 'single', sourceTimestamp: fixture.source.timestamp,
          datasetBytes: bytes, datasetSha256: hash, files: [{ file, bytes, sha256: mode === 'bad-hash' ? '0'.repeat(64) : hash }] }))
      } else if (request.url === '/app/data/bengal-driving.json') {
        if (mode === 'too-large') response.setHeader('Content-Length', 8 * 1024 * 1024 + 1)
        response.end(content)
      } else { response.statusCode = 404; response.end('{}') }
    })
    await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/app/`
  })
  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  })

  it('loads fixed assets once, correlates requests and returns directed cached matrix estimates', async () => {
    mode = 'valid'; requests.length = 0
    const controller = createDrivingWorkerController(new URL(origin))
    const loaded = await controller.dispatch({ type: 'load', requestId: 1 })
    expect(loaded).toMatchObject({ type: 'loaded', requestId: 1, capabilities: { geometryKind: 'car-network', liveTraffic: false } })
    const routed = await controller.dispatch({ type: 'route', requestId: 2, origin: point(1), destination: point(3), options: offPeak })
    expect(routed).toMatchObject({ type: 'route', requestId: 2, result: { status: 'ok', unknownFallback: false } })
    const matrix = await controller.dispatch({ type: 'matrix', requestId: 3, points: [point(1), point(3)], hour: 12 })
    expect(matrix.type).toBe('matrix')
    if (matrix.type !== 'matrix') throw new Error('Expected matrix')
    expect(matrix.rows[0][1].status).toBe('ok')
    expect(matrix.rows[1][0].status).toBe('unavailable')
    expect(requests.map((request) => request.path)).toEqual(['/app/data/bengal-driving.manifest.json', '/app/data/bengal-driving.json'])
    expect(requests.every((request) => request.method === 'GET' && request.cookie === undefined && !request.path.includes('?'))).toBe(true)
    expect(await controller.dispatch({ type: 'reset', requestId: 4 })).toEqual({ type: 'reset', requestId: 4 })
  })

  it('rejects arbitrary request URLs, oversized matrices and invalid coordinates without fetching', async () => {
    requests.length = 0
    const controller = createDrivingWorkerController(new URL(origin))
    for (const request of [
      { type: 'load', requestId: 5, dataUrl: 'https://example.invalid/' },
      { type: 'matrix', requestId: 6, points: Array.from({ length: 26 }, () => point(1)), hour: 12 },
      { type: 'route', requestId: 7, origin: { lat: NaN, lng: 0 }, destination: point(3) },
    ]) expect(await controller.dispatch(request)).toMatchObject({ type: 'error', requestId: request.requestId, code: 'invalid-request', unknownFallback: false })
    expect(requests).toHaveLength(0)
  })

  it.each(['bad-uri', 'bad-hash', 'too-large'] as const)('fails closed for %s static data', async (failure) => {
    mode = failure; requests.length = 0
    const result = await createDrivingWorkerController(new URL(origin)).dispatch({ type: 'load', requestId: 8 })
    expect(result).toMatchObject({ type: 'error', code: failure === 'too-large' ? 'too-large' : 'invalid-data', unknownFallback: false })
    expect(requests.every((request) => request.path.startsWith('/app/data/bengal-driving'))).toBe(true)
    if (failure === 'bad-uri') expect(requests).toHaveLength(1)
  })

  it('emits opt-in correlated byte and completed-row progress without changing the final matrix', async () => {
    mode = 'valid'; requests.length = 0
    const controller = createDrivingWorkerController(new URL(origin))
    const progress: DrivingWorkerProgress[] = []
    const loaded = await Promise.all([20, 21].map((requestId) => controller.dispatch({ type: 'load', requestId, progress: true },
      (event) => progress.push(event))))
    expect(loaded.every((response) => response.type === 'loaded')).toBe(true)
    expect(requests).toHaveLength(2)
    for (const requestId of [20, 21]) {
      const bytes = progress.filter((event) => event.requestId === requestId && event.phase === 'static')
      expect(bytes.length).toBeGreaterThan(1)
      let previous = 0
      for (const event of bytes) {
        if (event.phase !== 'static') throw new Error('Expected static progress')
        expect(event.loadedBytes).toBeGreaterThanOrEqual(previous)
        previous = event.loadedBytes
      }
      expect(bytes.at(-1)).toMatchObject({ loadedBytes: loaded[0].type === 'loaded' ? loaded[0].downloadBytes : -1,
        totalBytes: loaded[0].type === 'loaded' ? loaded[0].downloadBytes : -1 })
    }
    progress.length = 0
    await controller.dispatch({ type: 'load', requestId: 22 }, (event) => progress.push(event))
    expect(progress).toHaveLength(0)
    const matrix = await controller.dispatch({ type: 'matrix', requestId: 23, points: [point(1), point(3)], hour: 12, progress: true },
      (event) => {
        progress.push(event)
        if (event.phase === 'matrix' && event.row[0].status === 'ok') event.row[0].metres = -1
      })
    expect(matrix.type).toBe('matrix')
    expect(progress).toMatchObject([
      { type: 'progress', requestId: 23, phase: 'matrix', completedRows: 1, totalRows: 2, hour: 12 },
      { type: 'progress', requestId: 23, phase: 'matrix', completedRows: 2, totalRows: 2, hour: 12 },
    ])
    if (matrix.type !== 'matrix') throw new Error('Expected final matrix')
    expect(matrix.rows[0][0]).toMatchObject({ status: 'ok', metres: 0 })
    expect(matrix.rows[0][1].status).toBe('ok')
    expect(matrix.rows[1][0].status).toBe('unavailable')
    expect(await controller.dispatch({ type: 'load', requestId: 24, progress: 'yes' })).toMatchObject({ type: 'error', code: 'invalid-request' })
  })

  it.each(['headers', 'body'] as const)('bounds stalled response %s at 25 seconds and clears both deadlines', async (stage) => {
    vi.useFakeTimers()
    let signal: AbortSignal | null | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      signal = options?.signal
      return stage === 'headers' ? new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal?.reason), { once: true })
      }) : Promise.resolve(new Response(new ReadableStream({ start(stream) {
        signal?.addEventListener('abort', () => stream.error(signal?.reason), { once: true })
      } })))
    })
    try {
      const controller = createDrivingWorkerController(new URL(origin))
      let settled = false
      const pending = controller.dispatch({ type: 'load', requestId: 30 }).finally(() => { settled = true })
      await vi.advanceTimersByTimeAsync(24_999)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(await pending).toMatchObject({ type: 'error', requestId: 30, code: 'data-unavailable', unknownFallback: false })
      expect(signal?.aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.restoreAllMocks(); vi.useRealTimers()
    }
  })

  it('bounds aggregate loading at 55 seconds even when each completed file was within its deadline', async () => {
    vi.useFakeTimers()
    const pendingFiles: { file: string; signal: AbortSignal; resolve: (response: Response) => void }[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => new Promise((resolve, reject) => {
      const signal = options!.signal!
      pendingFiles.push({ file: new URL(String(url)).pathname.split('/').at(-1)!, signal, resolve })
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    const respond = (index: number) => pendingFiles[index].resolve(new Response(readFileSync(
      new URL(`../../public/data/${pendingFiles[index].file}`, import.meta.url), 'utf8')))
    try {
      const pending = createDrivingWorkerController(new URL(origin)).dispatch({ type: 'load', requestId: 31 })
      await vi.advanceTimersByTimeAsync(20_000)
      respond(0)
      await vi.waitFor(() => expect(pendingFiles).toHaveLength(2))
      await vi.advanceTimersByTimeAsync(20_000)
      respond(1)
      await vi.waitFor(() => expect(pendingFiles).toHaveLength(3))
      await vi.advanceTimersByTimeAsync(15_000)
      expect(await pending).toMatchObject({ type: 'error', requestId: 31, code: 'data-unavailable', unknownFallback: false })
      expect(pendingFiles[2].signal.aborted).toBe(true)
      expect(pendingFiles).toHaveLength(3)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.restoreAllMocks(); vi.useRealTimers()
    }
  })

  it('does not publish a router that finishes construction after the total load deadline', async () => {
    mode = 'valid'; requests.length = 0
    const controller = createDrivingWorkerController(new URL(origin))
    const clock = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(55_001)
    try {
      expect(await controller.dispatch({ type: 'load', requestId: 32 })).toMatchObject({ type: 'error', code: 'data-unavailable' })
    } finally { clock.mockRestore() }
    expect(await controller.dispatch({ type: 'load', requestId: 33 })).toMatchObject({ type: 'loaded' })
    expect(requests).toHaveLength(4)
  })

  it('cancels an old load on reset without stale progress or clearing the replacement router', async () => {
    mode = 'valid'; requests.length = 0
    const originalFetch = globalThis.fetch
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options!.signal!.addEventListener('abort', () => reject(options!.signal!.reason), { once: true })
    })).mockImplementation(originalFetch)
    try {
      const controller = createDrivingWorkerController(new URL(origin))
      const progress: DrivingWorkerProgress[] = []
      const old = controller.dispatch({ type: 'load', requestId: 40, progress: true }, (event) => progress.push(event))
      expect(await controller.dispatch({ type: 'reset', requestId: 41 })).toEqual({ type: 'reset', requestId: 41 })
      const fresh = controller.dispatch({ type: 'load', requestId: 42, progress: true }, (event) => progress.push(event))
      expect(await old).toMatchObject({ type: 'error', requestId: 40, code: 'cancelled' })
      expect(await fresh).toMatchObject({ type: 'loaded', requestId: 42 })
      expect(progress.length).toBeGreaterThan(0)
      expect(progress.every((event) => event.requestId === 42)).toBe(true)
      expect(await controller.dispatch({ type: 'load', requestId: 43 })).toMatchObject({ type: 'loaded', requestId: 43 })
      expect(requests).toHaveLength(2)
    } finally { fetchMock.mockRestore() }
  })

  it('cancels a matrix after a streamed row with no stale subsequent row or final matrix', async () => {
    mode = 'valid'
    const controller = createDrivingWorkerController(new URL(origin))
    const progress: DrivingWorkerProgress[] = []
    const result = await controller.dispatch({ type: 'matrix', requestId: 50, points: [point(1), point(3), point(2)], hour: 12, progress: true },
      (event) => {
        progress.push(event)
        if (event.phase === 'matrix') void controller.dispatch({ type: 'reset', requestId: 51 })
      })
    expect(result).toEqual({ type: 'error', requestId: 50, code: 'cancelled', unknownFallback: false })
    expect(progress.filter((event) => event.phase === 'matrix')).toMatchObject([{ completedRows: 1, totalRows: 3, requestId: 50 }])
    expect(await controller.dispatch({ type: 'load', requestId: 52 })).toMatchObject({ type: 'loaded', requestId: 52 })
  })

  it('enforces the matrix deadline without emitting a partial result as a final matrix', async () => {
    mode = 'valid'
    const controller = createDrivingWorkerController(new URL(origin))
    await controller.dispatch({ type: 'load', requestId: 60 })
    const progress: DrivingWorkerProgress[] = []
    const clock = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(55_001)
    try {
      expect(await controller.dispatch({ type: 'matrix', requestId: 61, points: [point(1), point(3)], hour: 12, progress: true },
        (event) => progress.push(event))).toEqual({ type: 'error', requestId: 61, code: 'routing-failed', unknownFallback: false })
      expect(progress).toHaveLength(0)
    } finally { clock.mockRestore() }
  })

  it('runs the compiled real-data router in a separate worker thread with fixed HTTP assets', async () => {
    mode = 'real'; requests.length = 0
    const code = await compileWorker()
    const worker = new NodeWorker(`
      const { parentPort, workerData, threadId } = require('node:worker_threads');
      globalThis.self = {
        location: { origin: workerData.origin },
        addEventListener: (type, handler) => parentPort.on(type, (data) => handler({ data })),
        postMessage: (message) => parentPort.postMessage({ ...message, observedThreadId: threadId,
          observedHeapMiB: process.memoryUsage().heapUsed / 1024 / 1024 })
      };
      import('data:text/javascript;base64,' + Buffer.from(workerData.code).toString('base64'))
        .then(() => parentPort.postMessage({ type: 'worker-ready' }));
    `, { eval: true, workerData: { origin: new URL(origin).origin, code } })
    const nextMessage = () => new Promise<Record<string, unknown>>((resolveMessage, reject) => {
      const onError = (error: Error) => { worker.off('message', onMessage); reject(error) }
      const onMessage = (message: Record<string, unknown>) => { worker.off('error', onError); resolveMessage(message) }
      worker.once('message', onMessage); worker.once('error', onError)
    })
    const send = async (message: unknown) => { const response = nextMessage(); worker.postMessage(message); return response }
    try {
      expect(await nextMessage()).toMatchObject({ type: 'worker-ready' })
      const loaded = await send({ type: 'load', requestId: 100 })
      expect(loaded).toMatchObject({ type: 'loaded', requestId: 100, summary: { directedStates: 343870 } })
      expect(Number(loaded.observedThreadId)).toBeGreaterThan(0)
      const routed = await send({ type: 'route', requestId: 101, origin: drivingDemoPoints[2], destination: drivingDemoPoints[3], options: offPeak })
      expect(routed).toMatchObject({ type: 'route', requestId: 101, result: { status: 'ok', unknownFallback: false } })
      const matrix = await send({ type: 'matrix', requestId: 102, points: drivingDemoPoints, hour: 12 })
      expect(matrix).toMatchObject({ type: 'matrix', requestId: 102, unknownFallback: false })
      const cached = await send({ type: 'matrix', requestId: 103, points: drivingDemoPoints, hour: 12 })
      expect(cached.rows).toEqual(matrix.rows)
      benchmark.worker = { loadMs: loaded.loadMs, downloadBytes: loaded.downloadBytes, construction: loaded.summary,
        observedHeapMiB: loaded.observedHeapMiB, separateThread: Number(loaded.observedThreadId) > 0,
        routeMs: routed.elapsedMs, matrixMs: matrix.elapsedMs, cachedMatrixMs: cached.elapsedMs,
        fixedRequests: requests.map((request) => request.path) }
      expect(requests).toHaveLength(9)
      expect(requests.every((request) => request.method === 'GET' && request.cookie === undefined && !request.path.includes('?'))).toBe(true)
      expect(await send({ type: 'reset', requestId: 104 })).toMatchObject({ type: 'reset', requestId: 104 })
    } finally {
      await worker.terminate()
    }
  }, 90_000)

  it('preserves exact real routes and matrices in a memory-bounded child process', async () => {
    mode = 'real'; requests.length = 0
    const code = await compileWorker()
    const limitMiB = process.env.DRIVING_HEAP_MIB === '256' ? 256 : 384
    const child = spawn(process.execPath, [`--max-old-space-size=${limitMiB}`, '--expose-gc', '--trace-gc', '--input-type=module', '-'],
      { stdio: ['pipe', 'pipe', 'pipe'], cwd: fileURLToPath(new URL('../../', import.meta.url)) })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    const timer = setTimeout(() => child.kill('SIGKILL'), 90_000)
    const ended = new Promise<{ code: number | null; signal: string | null }>((resolveExit, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => resolveExit({ code, signal }))
    })
    child.stdin.end(`
      import { createHash } from 'node:crypto';
      const { createDrivingWorkerController } = await import('data:text/javascript;base64,${Buffer.from(code).toString('base64')}');
      const controller = createDrivingWorkerController(new URL(${JSON.stringify(origin)}));
      const emit = record => process.stdout.write('DRIVING_PERF ' + JSON.stringify(record) + '\\n');
      const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
      const checkpoint = phase => { const immediate = process.memoryUsage(); globalThis.gc(); emit({phase, immediate, afterGC: process.memoryUsage()}); };
      const points = ${JSON.stringify(drivingDemoPoints)};
      const fullPlanPoints = [points[0]];
      checkpoint('before');
      const loaded = await controller.dispatch({type:'load', requestId:1});
      emit({phase:'loaded', response:loaded}); checkpoint('after-load');
      if (loaded.type !== 'loaded') throw new Error('Bounded load failed');
      let requestId = 2;
      for (const [from,to] of [[2,3],[1,2],[0,2]]) {
        const response = await controller.dispatch({type:'route', requestId:requestId++, origin:points[from], destination:points[to], options:${JSON.stringify(offPeak)}});
        if (response.type !== 'route' || response.result.status !== 'ok') throw new Error('Bounded route failed');
        const route = response.result.route;
        for (const portion of [1,2,3,4]) fullPlanPoints.push(route.geometry[Math.floor(route.geometry.length * portion / 5)]);
        emit({phase:'route', elapsedMs:response.elapsedMs, reference:{from,to,metres:route.metres,planningSeconds:route.planningSeconds,
          estimatedSeconds:route.estimatedSeconds,segmentsSha256:hash(route.segments),geometrySha256:hash(route.geometry),osmWayIdsSha256:hash(route.osmWayIds)}});
        checkpoint('after-route-' + from + '-' + to);
      }
      for (const hour of [12,9,19]) {
        const response = await controller.dispatch({type:'matrix', requestId:requestId++, points, hour});
        if (response.type !== 'matrix') throw new Error('Bounded matrix failed');
        const rows = response.rows.map(row => row.map(value => value.status === 'ok'
          ? {status:value.status,metres:value.metres,planningSeconds:value.planningSeconds,estimatedSeconds:value.estimatedSeconds,durationMinutes:value.durationMinutes}
          : {status:value.status,reason:value.reason}));
        emit({phase:'matrix',hour,elapsedMs:response.elapsedMs,sha256:hash(rows)}); checkpoint('after-matrix-' + hour);
        const cached = await controller.dispatch({type:'matrix', requestId:requestId++, points, hour:hour+1});
        if (cached.type !== 'matrix' || hash(cached.rows) !== hash(response.rows)) throw new Error('Equivalent profile cache changed metrics');
        emit({phase:'cached-matrix',hour:hour+1,elapsedMs:cached.elapsedMs});
      }
      if (${JSON.stringify(process.env.DRIVING_FULL_MATRIX === '1')}) {
        if (new Set(fullPlanPoints.map(point => JSON.stringify([point.lat,point.lng]))).size !== 13) throw new Error('Full plan points must be distinct');
        for (const hour of [12,9,19]) {
          const progress = [];
          const matrixId = requestId++;
          const response = await controller.dispatch({type:'matrix',requestId:matrixId,points:fullPlanPoints,hour,progress:true},
            event => { if (event.phase === 'matrix') progress.push({requestId:event.requestId,completedRows:event.completedRows,totalRows:event.totalRows}); });
          if (response.type !== 'matrix' || response.rows.length !== 13 || response.rows.some(row => row.length !== 13 || row.some(value => value.unknownFallback !== false))) {
            throw new Error('Full plan matrix failed');
          }
          if (progress.length !== 13 || progress.some((event,index) => event.requestId !== matrixId || event.completedRows !== index+1 || event.totalRows !== 13)) {
            throw new Error('Full plan row progress failed');
          }
          emit({phase:'full-plan-matrix',hour,elapsedMs:response.elapsedMs,pointCount:13,
            pointSource:'Esplanade plus 12 points sampled from the three verified public road routes',
            completedCells:169,unavailableCells:response.rows.flat().filter(value => value.status !== 'ok').length,progress,sha256:hash(response.rows)});
          checkpoint('after-full-plan-' + hour);
        }
      }
      await controller.dispatch({type:'reset', requestId:requestId++}); checkpoint('after-reset');
    `)
    try {
      const exit = await ended
      const records = stdout.split('\n').filter((line) => line.startsWith('DRIVING_PERF ')).map((line) => JSON.parse(line.slice(13)))
      const gcSizes = [...`${stdout}\n${stderr}`.matchAll(/(\d+(?:\.\d+)?) \([\d.]+\) -> (\d+(?:\.\d+)?) \([\d.]+\) MB/g)]
        .flatMap((match) => [Number(match[1]), Number(match[2])])
      const report = { measuredAt: new Date().toISOString(), environment: 'isolated macOS Node child; not a phone or live traffic',
        node: process.version, limitMiB, ...exit, observedGcPeakHeapMiB: gcSizes.length ? Math.max(...gcSizes) : null, records,
        fixedRequests: [...requests], failure: exit.code === 0 ? null : stderr.slice(-2000) }
      const output = new URL('../../test-results/driving-performance/', import.meta.url)
      mkdirSync(output, { recursive: true })
      writeFileSync(new URL(`bounded-${limitMiB}.json`, output), `${JSON.stringify(report, null, 2)}\n`)
      expect(exit, stderr.slice(-2000)).toEqual({ code: 0, signal: null })
      expect(records.find((record) => record.phase === 'loaded').response).toMatchObject({ type: 'loaded', summary: {
        directedStates: 343870, transitions: 628338, geometryPoints: 864607, restrictions: {
          viaNodeRelations: 30, conservativelyBlockedRelations: 109, malformedRelationsExcluded: 8,
          forbiddenTransitions: 246, immediateReversalsBlocked: 330006,
        },
      } })
      expect(records.filter((record) => record.phase === 'route').map((record) => record.reference)).toEqual(retainedRouteReferences)
      expect(records.find((record) => record.phase === 'matrix' && record.hour === 12).sha256).toBe(retainedMatrixSha256)
      expect(records.find((record) => record.phase === 'after-load').afterGC.heapUsed).toBeLessThan(200 * 1024 * 1024)
      for (const record of records.filter((record) => record.afterGC)) expect(record.afterGC.heapUsed).toBeLessThan(200 * 1024 * 1024)
      if (process.env.DRIVING_FULL_MATRIX === '1') {
        expect(records.filter((record) => record.phase === 'full-plan-matrix')).toHaveLength(3)
      }
      expect(records.find((record) => record.phase === 'after-reset').afterGC.heapUsed).toBeLessThan(32 * 1024 * 1024)
      expect(requests).toHaveLength(9)
      expect(requests.every((request) => request.method === 'GET' && request.cookie === undefined && !request.path.includes('?'))).toBe(true)
    } finally {
      clearTimeout(timer)
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }
  }, 100_000)
})