import { nba } from 'ngraph.path'
import type { Coordinate } from '../types'
import type { LegRequest } from './travel'
import { haversineMetres, isCoordinate } from './geo'

export interface DrivingArc {
  from: number
  to: number
  wayId: number
  metres: number
  seconds: number
}

export interface DrivingBlockedTurn {
  fromArc: number
  toArc: number
}

interface SearchNode { id: string | number }
interface SearchLink { id: number; fromId: string | number; toId: string | number; data: Transition }

class CompactDrivingGraph {
  readonly size: number
  readonly stateSeconds: Float64Array
  readonly outboundOffsets: Uint32Array
  readonly targets: Uint32Array
  readonly inboundOffsets: Uint32Array
  readonly inboundIds: Uint32Array
  readonly sources: Uint32Array
  private readonly virtualNodes = new Set<string>()
  private temporaryEdges: { from: number; to: number; attributes: Transition }[] = []

  constructor(stateSeconds: Float64Array, outboundOffsets: Uint32Array, targets: Uint32Array) {
    this.stateSeconds = stateSeconds
    this.outboundOffsets = outboundOffsets
    this.targets = targets
    this.size = targets.length
    this.inboundOffsets = new Uint32Array(stateSeconds.length + 1)
    this.inboundIds = new Uint32Array(this.size)
    this.sources = new Uint32Array(this.size)
    for (const target of targets) this.inboundOffsets[target + 1] += 1
    for (let state = 1; state < this.inboundOffsets.length; state += 1) this.inboundOffsets[state] += this.inboundOffsets[state - 1]
    const positions = this.inboundOffsets.slice()
    for (let state = 0; state < stateSeconds.length; state += 1) {
      for (let edge = outboundOffsets[state]; edge < outboundOffsets[state + 1]; edge += 1) {
        this.sources[edge] = state
        this.inboundIds[positions[targets[edge]]++] = edge
      }
    }
  }

  private nodeIndex(node: string | number) {
    return node === 'origin' ? this.stateSeconds.length : node === 'destination' ? this.stateSeconds.length + 1 : Number(node)
  }

  hasNode(node: string | number) {
    const index = this.nodeIndex(node)
    return this.virtualNodes.has(String(node)) || Number.isSafeInteger(index) && index >= 0 && index < this.stateSeconds.length
  }

  addNode(node: string) {
    if (!['origin', 'destination'].includes(node) || this.hasNode(node)) throw new RangeError('Invalid temporary car node')
    this.virtualNodes.add(node)
  }

  dropNode(node: string) {
    if (!this.virtualNodes.delete(node)) throw new RangeError('Only temporary car nodes can be removed')
    const index = this.nodeIndex(node)
    this.temporaryEdges = this.temporaryEdges.filter((edge) => edge.from !== index && edge.to !== index)
  }

  addDirectedEdge(from: string, to: string, attributes: Transition) {
    if (!this.hasNode(from) || !this.hasNode(to) || from !== 'origin' && to !== 'destination') {
      throw new RangeError('Only request-local car transitions can be added')
    }
    this.temporaryEdges.push({ from: this.nodeIndex(from), to: this.nodeIndex(to), attributes })
  }

  private temporaryIndex(from: string | number, to: string | number) {
    const source = this.nodeIndex(from)
    const target = this.nodeIndex(to)
    return this.temporaryEdges.findIndex((edge) => edge.from === source && edge.to === target)
  }

  hasDirectedEdge(from: string, to: string) {
    return this.temporaryIndex(from, to) >= 0
  }

  replaceEdgeAttributes(from: string, to: string, attributes: Transition) {
    const index = this.temporaryIndex(from, to)
    if (index < 0) throw new RangeError('Missing temporary car transition')
    this.temporaryEdges[index].attributes = attributes
  }

  outboundEdges(node: string | number) {
    const state = this.nodeIndex(node)
    const edges: number[] = []
    if (state < this.stateSeconds.length) {
      for (let edge = this.outboundOffsets[state]; edge < this.outboundOffsets[state + 1]; edge += 1) edges.push(edge)
    }
    for (const [index, edge] of this.temporaryEdges.entries()) if (edge.from === state) edges.push(this.size + index)
    return edges
  }

  inboundEdges(node: string | number) {
    const state = this.nodeIndex(node)
    const edges: number[] = []
    if (state < this.stateSeconds.length) {
      for (let index = this.inboundOffsets[state]; index < this.inboundOffsets[state + 1]; index += 1) edges.push(this.inboundIds[index])
    }
    for (const [index, edge] of this.temporaryEdges.entries()) if (edge.to === state) edges.push(this.size + index)
    return edges
  }

  opposite(node: string | number, edge: number) {
    const source = edge < this.size ? this.sources[edge] : this.temporaryEdges[edge - this.size].from
    const target = edge < this.size ? this.targets[edge] : this.temporaryEdges[edge - this.size].to
    const opposite = this.nodeIndex(node) === source ? target : source
    return opposite === this.stateSeconds.length ? 'origin' : opposite === this.stateSeconds.length + 1 ? 'destination' : opposite
  }

  getNode(node: string | number): SearchNode | undefined {
    return this.hasNode(node) ? { id: node === 'origin' || node === 'destination' ? node : Number(node) } : undefined
  }

  forEachLinkedNode(node: string | number, callback: (other: SearchNode, link: SearchLink) => void) {
    for (const edge of [...this.outboundEdges(node), ...this.inboundEdges(node)]) {
      const source = edge < this.size ? this.sources[edge] : this.temporaryEdges[edge - this.size].from
      const target = edge < this.size ? this.targets[edge] : this.temporaryEdges[edge - this.size].to
      const key = (state: number) => state === this.stateSeconds.length ? 'origin' : state === this.stateSeconds.length + 1 ? 'destination' : state
      callback({ id: this.opposite(node, edge) }, { id: edge, fromId: key(source), toId: key(target), data: this.getEdgeAttributes(edge) })
    }
  }

  getEdgeAttributes(edgeOrSource: string | number, target?: string | number): Transition {
    if (target !== undefined) {
      const temporary = this.temporaryIndex(edgeOrSource, target)
      if (temporary >= 0) return this.temporaryEdges[temporary].attributes
      const source = this.nodeIndex(edgeOrSource)
      for (let edge = this.outboundOffsets[source]; edge < this.outboundOffsets[source + 1]; edge += 1) {
        if (this.targets[edge] === this.nodeIndex(target)) return this.getEdgeAttributes(edge)
      }
      throw new RangeError('Missing car transition')
    }
    const edge = Number(edgeOrSource)
    if (edge >= this.size) return this.temporaryEdges[edge - this.size].attributes
    const arcIndex = this.targets[edge]
    return { weight: this.stateSeconds[arcIndex], arcIndex }
  }

  shortestPath(weight: (edge: string, attributes: Transition) => number = (_edge, attributes) => attributes.weight) {
    const search = nba<undefined, Transition>(this as unknown as Parameters<typeof nba<undefined, Transition>>[0], {
      oriented: true, quitFast: false, heuristic: () => 0,
      distance: (_from, _to, link) => weight(String(link.id), link.data),
    })
    const path = search.find('origin', 'destination')
    return path.length ? path.reverse().map((node: SearchNode) => String(node.id)) : null
  }
}

export function selectDrivingPath(
  nodeCount: number,
  arcs: readonly DrivingArc[],
  origin: number,
  destination: number,
  blockedTurns: readonly DrivingBlockedTurn[] = [],
): number[] | null {
  const validNode = (node: number) => Number.isSafeInteger(node) && node >= 0 && node < nodeCount
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 1 || nodeCount > 200_000
    || arcs.length > 200_000 || !validNode(origin) || !validNode(destination)) {
    throw new RangeError('Invalid driving graph')
  }
  const outgoing = new Map<number, number[]>()
  const stateSeconds = new Float64Array(arcs.length)
  const offsets = new Uint32Array(arcs.length + 1)
  const targets: number[] = []
  const blocked = new Set(blockedTurns.map((turn) => `${turn.fromArc}:${turn.toArc}`))
  for (const [index, arc] of arcs.entries()) {
    if (!validNode(arc.from) || !validNode(arc.to) || arc.from === arc.to
      || !Number.isSafeInteger(arc.wayId) || arc.wayId <= 0
      || !Number.isFinite(arc.metres) || arc.metres <= 0
      || !Number.isFinite(arc.seconds) || arc.seconds <= 0) {
      throw new RangeError('Invalid driving arc')
    }
    stateSeconds[index] = arc.seconds
    const departures = outgoing.get(arc.from) ?? []
    departures.push(index)
    outgoing.set(arc.from, departures)
  }
  for (const [index, arc] of arcs.entries()) {
    offsets[index] = targets.length
    for (const next of outgoing.get(arc.to) ?? []) {
      if (arcs[next].to === arc.from || blocked.has(`${index}:${next}`)) continue
      targets.push(next)
    }
  }
  if (origin === destination) return []
  offsets[arcs.length] = targets.length
  const graph = new CompactDrivingGraph(stateSeconds, offsets, Uint32Array.from(targets))
  graph.addNode('origin')
  graph.addNode('destination')
  for (const [index, arc] of arcs.entries()) {
    if (arc.from === origin) graph.addDirectedEdge('origin', String(index), { weight: arc.seconds, arcIndex: index })
    if (arc.to === destination) graph.addDirectedEdge(String(index), 'destination', { weight: 0, arcIndex: -1 })
  }
  return graph.shortestPath()?.slice(1, -1).map(Number) ?? null
}

export type DrivingNode = [osmId: number, lat: number, lng: number]
export type DrivingRoad = [osmWayId: number, name: number, ref: number, highway: number,
  direction: -1 | 0 | 1, flags: number, forwardLimit: number | null, backwardLimit: number | null, lanes: number]
export type DrivingEdge = [from: number, to: number, metres: number, road: number, urban: 0 | 1, deltas: number[]]
export interface DrivingBounds { south: number; west: number; north: number; east: number }
export interface DrivingRestriction {
  id: number
  fromWay: number
  toWays: number[]
  viaWays: number[]
  viaNode: number | null
  type: string
  kind: 'no' | 'only' | 'block'
  reason: string
}
export interface DrivingSource {
  provider: 'OpenStreetMap'
  distributor: 'Geofabrik'
  license: 'ODbL-1.0'
  attribution: 'OpenStreetMap contributors'
  attributionUrl: string
  licenseUrl: string
  timestamp: string
  pbfSha256: string
  url: string
  fetchedAt?: string
  builtAt?: string
}
export interface DrivingCoverage {
  cities: { id: string; bounds: DrivingBounds }[]
  corridorHighways: string[]
  maxSnapMetres: 120
  localRoadsOutsideCities: false
  boundaryConnectors: false
}
export interface DrivingData {
  version: 1
  mode: 'motorcar'
  geometryEncoding: 'intermediate-delta-lat-lng-e6'
  bounds: DrivingBounds
  coverage: DrivingCoverage
  source: DrivingSource
  nodes: DrivingNode[]
  names: string[]
  highways: string[]
  roads: DrivingRoad[]
  edges: DrivingEdge[]
  laneTags: (Record<string, string> | null)[]
  restrictions: DrivingRestriction[]
  exclusions: { nodeIds: number[]; wayIds: number[]; relationIds: number[] }
  stats: Record<string, number | boolean>
}
export interface DrivingSnap {
  edgeIndex: number
  fraction: number
  coordinate: Coordinate
  offsetMetres: number
  maxOffsetMetres: 120
  osmNodeId: number | null
  accessVerified: false
  endpointCoverage: 'city-local' | 'major-road-corridor'
}
export interface DrivingTimeProfile { name: string; urbanFactor: number; corridorFactor: number }
export type DrivingAvoid = 'tolls' | 'motorways' | 'tunnels'
export interface DrivingOptions {
  departureTimestamp?: number
  avoid?: readonly DrivingAvoid[]
  timeProfile?: DrivingTimeProfile
  maxSnapMetres?: number
}
export interface DrivingFlags { bridge: boolean; tunnel: boolean; flyover: boolean; roundabout: boolean; toll: boolean }
export type DrivingManeuver = 'depart' | 'continue' | 'bear-left' | 'bear-right' | 'turn-left' | 'turn-right'
  | 'u-turn' | 'enter-roundabout' | 'exit-roundabout' | 'arrive'
export interface DrivingStep {
  maneuver: DrivingManeuver
  name: string | null
  ref: string | null
  at: Coordinate
  metres: number
  flags: DrivingFlags
  speedLimitKph?: number
  sourceLaneTags?: Record<string, string>
  osmWayIds: number[]
  startGeometryIndex: number
  endGeometryIndex: number
}
export interface DrivingRouteSegment {
  edgeIndex: number
  osmWayId: number
  direction: -1 | 1
  fromFraction: number
  toFraction: number
  metres: number
  startGeometryIndex: number
  endGeometryIndex: number
}
export interface DrivingRoute {
  strategy: 'fastest-estimated'
  geometryKind: 'car-network'
  metres: number
  estimatedSeconds: { min: number; max: number }
  planningSeconds: number
  timeProfile: DrivingTimeProfile
  geometry: Coordinate[]
  cumulativeMetres: number[]
  segments: DrivingRouteSegment[]
  steps: DrivingStep[]
  osmWayIds: number[]
}
export interface DrivingRestrictionSummary {
  viaNodeRelations: number
  conservativelyBlockedRelations: number
  malformedRelationsExcluded: number
  forbiddenTransitions: number
  immediateReversalsBlocked: number
}
interface DrivingResultBase {
  unknownFallback: false
  source: DrivingSource
  coverage: DrivingCoverage
  restrictionsApplied: DrivingRestrictionSummary
  warnings: readonly string[]
}
export type DrivingUnavailable = DrivingResultBase & {
  status: 'unavailable'
  reason: 'invalid-coordinate' | 'outside-bounds' | 'no-road' | 'disconnected-or-restricted'
  snaps: { origin: DrivingSnap | null; destination: DrivingSnap | null }
}
export type DrivingRouteResult = (DrivingResultBase & { status: 'ok'; route: DrivingRoute
  snaps: { origin: DrivingSnap; destination: DrivingSnap } }) | DrivingUnavailable
export type DrivingMetrics = (DrivingResultBase & {
  status: 'ok'
  metres: number
  estimatedSeconds: { min: number; max: number }
  durationMinutes: { min: number; max: number }
  planningSeconds: number
  timeProfile: DrivingTimeProfile
  geometryKind: 'car-network'
  snaps: { origin: DrivingSnap; destination: DrivingSnap }
}) | DrivingUnavailable
export interface DrivingSummary {
  nodes: number
  polylines: number
  directedStates: number
  transitions: number
  geometryPoints: number
  constructionMs: number
  restrictions: DrivingRestrictionSummary
  performance?: { library: 'ngraph.path/nba'; storage: 'typed-array-csr'; searches: number; metricCacheHits: number }
}
export interface DrivingRouter {
  snap: (point: Coordinate, maxMetres?: number) => DrivingSnap | null
  route: (origin: Coordinate, destination: Coordinate, options?: DrivingOptions) => DrivingRouteResult
  routeMetrics: (from: Coordinate, to: Coordinate, hour: number, options?: Omit<DrivingOptions, 'departureTimestamp'>) => DrivingMetrics
  clearMetricCache: () => void
  summary: DrivingSummary
  source: DrivingSource
  coverage: DrivingCoverage
}

export const DRIVING_WARNINGS = [
  'OSM snapshot, not live navigation: missing map restrictions, police controls, closures and access are unknown. Obey road signs.',
  'Fastest means lowest static planning-time weight on retained car roads, not fastest in current traffic. Times are estimates, not speed advice.',
  'Snaps are at most 120 m from the supplied pins. Parking, entrances and off-road walking are unverified and are not part of the car route.',
  'Outside the three city bounds only major corridor roads are retained. Unsupported restrictions are conservatively blocked; no geometric fallback is used.',
] as const

const MAX_STATES = 400_000
const MAX_TRANSITIONS = 1_500_000
const GRID = 0.003
const EMPTY_RULES: DrivingRestriction[] = []
const roadClasses = new Set(['motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link',
  'primary_link', 'secondary_link', 'tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street', 'service'])
const supportedTurns = new Set(['no_left_turn', 'no_right_turn', 'no_straight_on', 'no_u_turn', 'no_entry', 'no_exit',
  'only_left_turn', 'only_right_turn', 'only_straight_on', 'only_u_turn'])
const validId = (value: number) => Number.isSafeInteger(value) && value > 0
const validLabel = (value: unknown): value is string => typeof value === 'string' && value.length <= 160 && !/[<>\u0000-\u001f\u007f]/.test(value)
const inside = (point: Coordinate, bounds: DrivingBounds) => point.lat >= bounds.south && point.lat <= bounds.north
  && point.lng >= bounds.west && point.lng <= bounds.east
const validBounds = (bounds: DrivingBounds) => !!bounds && isCoordinate({ lat: bounds.south, lng: bounds.west })
  && isCoordinate({ lat: bounds.north, lng: bounds.east }) && bounds.south < bounds.north && bounds.west < bounds.east

export function decodeDrivingGeometry(data: DrivingData, edgeIndex: number): Coordinate[] {
  const edge = data.edges[edgeIndex]
  if (!edge) throw new RangeError('Invalid car edge')
  const first = data.nodes[edge[0]]
  const last = data.nodes[edge[1]]
  let latitude = Math.round(first[1] * 1e6)
  let longitude = Math.round(first[2] * 1e6)
  const points = [{ lat: first[1], lng: first[2] }]
  for (let index = 0; index < edge[5].length; index += 2) {
    latitude += edge[5][index]
    longitude += edge[5][index + 1]
    points.push({ lat: latitude / 1e6, lng: longitude / 1e6 })
  }
  points.push({ lat: last[1], lng: last[2] })
  return points
}

export function validateDrivingData(value: unknown): DrivingData {
  if (!value || typeof value !== 'object') throw new RangeError('Invalid car dataset')
  const data = value as DrivingData
  if (data.version !== 1 || data.mode !== 'motorcar' || data.geometryEncoding !== 'intermediate-delta-lat-lng-e6'
    || !validBounds(data.bounds) || !Array.isArray(data.nodes) || !data.nodes.length || data.nodes.length > 200_000
    || !Array.isArray(data.edges) || !data.edges.length || data.edges.length > 250_000
    || !Array.isArray(data.roads) || !data.roads.length || data.roads.length > 150_000
    || !Array.isArray(data.names) || data.names[0] !== '' || data.names.length > 100_000
    || !data.names.every(validLabel) || new Set(data.names).size !== data.names.length
    || !Array.isArray(data.highways) || data.highways.length > 20 || !data.highways.every((name) => roadClasses.has(name))
    || !Array.isArray(data.laneTags) || data.laneTags[0] !== null || data.laneTags.length > 10_000
    || !Array.isArray(data.restrictions) || data.restrictions.length > 20_000
    || data.source?.provider !== 'OpenStreetMap' || data.source.distributor !== 'Geofabrik'
    || data.source.license !== 'ODbL-1.0' || data.source.attribution !== 'OpenStreetMap contributors'
    || data.source.attributionUrl !== 'https://www.openstreetmap.org/copyright'
    || data.source.licenseUrl !== 'https://opendatacommons.org/licenses/odbl/1-0/'
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(data.source.timestamp)
    || !Number.isFinite(Date.parse(data.source.timestamp)) || !/^[a-f0-9]{64}$/.test(data.source.pbfSha256)
    || !/^https:\/\/download\.geofabrik\.de\/asia\/india\/eastern-zone-\d{6}\.osm\.pbf$/.test(data.source.url)
    || !data.coverage || data.coverage.maxSnapMetres !== 120 || data.coverage.localRoadsOutsideCities !== false
    || data.coverage.boundaryConnectors !== false || !Array.isArray(data.coverage.cities) || data.coverage.cities.length > 3
    || !data.coverage.cities.every((city) => ['kolkata', 'asansol', 'durgapur'].includes(city.id) && validBounds(city.bounds))
    || !Array.isArray(data.coverage.corridorHighways) || !data.coverage.corridorHighways.every((name) => roadClasses.has(name))
    || !data.exclusions || ![data.exclusions.nodeIds, data.exclusions.wayIds, data.exclusions.relationIds]
      .every((ids) => Array.isArray(ids) && ids.length <= 20_000 && ids.every(validId))) {
    throw new RangeError('Invalid car schema, source or coverage')
  }
  const nodeIds = new Set<number>()
  for (const node of data.nodes) {
    if (!Array.isArray(node) || node.length !== 3 || !validId(node[0]) || nodeIds.has(node[0])
      || !isCoordinate({ lat: node[1], lng: node[2] }) || !inside({ lat: node[1], lng: node[2] }, data.bounds)) {
      throw new RangeError('Invalid car node')
    }
    nodeIds.add(node[0])
  }
  const roadIds = new Set<number>()
  const indexOf = (index: number, length: number) => Number.isSafeInteger(index) && index >= 0 && index < length
  for (const road of data.roads) {
    if (!Array.isArray(road) || road.length !== 9 || !validId(road[0]) || roadIds.has(road[0])
      || !indexOf(road[1], data.names.length) || !indexOf(road[2], data.names.length) || !indexOf(road[3], data.highways.length)
      || ![-1, 0, 1].includes(road[4]) || !Number.isSafeInteger(road[5]) || road[5] < 0 || road[5] > 31
      || ![road[6], road[7]].every((speed) => speed === null || Number.isFinite(speed) && speed > 0 && speed <= 200)
      || !indexOf(road[8], data.laneTags.length)) throw new RangeError('Invalid car road')
    roadIds.add(road[0])
  }
  for (const tags of data.laneTags) {
    if (tags !== null && (typeof tags !== 'object' || Array.isArray(tags) || Object.keys(tags).length > 6
      || !Object.entries(tags).every(([key, value]) => /^(lanes|turn:lanes)(:forward|:backward)?$/.test(key) && validLabel(value)))) {
      throw new RangeError('Invalid source lane tags')
    }
  }
  let geometryPoints = 0
  let states = 0
  for (const [index, edge] of data.edges.entries()) {
    if (!Array.isArray(edge) || edge.length !== 6 || !indexOf(edge[0], data.nodes.length) || !indexOf(edge[1], data.nodes.length)
      || edge[0] === edge[1] || !Number.isFinite(edge[2]) || edge[2] <= 0 || edge[2] > 200_000
      || !indexOf(edge[3], data.roads.length) || ![0, 1].includes(edge[4]) || !Array.isArray(edge[5])
      || edge[5].length % 2 !== 0 || edge[5].length > 40_000
      || !edge[5].every((delta) => Number.isSafeInteger(delta) && Math.abs(delta) <= 1e6)) throw new RangeError('Invalid car polyline')
    const points = decodeDrivingGeometry(data, index)
    geometryPoints += points.length
    states += data.roads[edge[3]][4] === 0 ? 2 : 1
    if (geometryPoints > 2_000_000 || states > MAX_STATES || points.some((point) => !inside(point, data.bounds))) {
      throw new RangeError('Car graph exceeds worker budget or bounds')
    }
    const length = points.slice(1).reduce((sum, point, position) => sum + haversineMetres(points[position], point), 0)
    if (Math.abs(length - edge[2]) > Math.max(0.02, points.length * 0.002)) throw new RangeError('Car distance differs from OSM geometry')
  }
  for (const rule of data.restrictions) {
    if (!rule || !validId(rule.id) || !validId(rule.fromWay) || !roadIds.has(rule.fromWay)
      || !Array.isArray(rule.toWays) || rule.toWays.length > 64 || !rule.toWays.every(validId)
      || !Array.isArray(rule.viaWays) || rule.viaWays.length > 64 || !rule.viaWays.every(validId)
      || !(rule.viaNode === null || validId(rule.viaNode)) || !['no', 'only', 'block'].includes(rule.kind)
      || !validLabel(rule.type) || !validLabel(rule.reason)
      || (rule.kind !== 'block' && (rule.viaNode === null || rule.viaWays.length || rule.toWays.length !== 1
        || !supportedTurns.has(rule.type) || (rule.kind === 'only') !== rule.type.startsWith('only_')))) {
      throw new RangeError('Invalid car turn restriction')
    }
  }
  return data
}

interface PreparedLine { points: Coordinate[]; cumulative: number[]; length: number }
interface RoutingArc extends DrivingArc { edgeIndex: number; direction: -1 | 1; limit: number | null }
interface Transition { weight: number; arcIndex: number; fromFraction?: number; toFraction?: number }
interface RouteContext { profile: DrivingTimeProfile; avoid: Set<DrivingAvoid>; maxSnap: number }

function indexStates(owners: Uint32Array, ownerCount: number) {
  const offsets = new Uint32Array(ownerCount + 1)
  for (const owner of owners) offsets[owner + 1] += 1
  for (let index = 1; index < offsets.length; index += 1) offsets[index] += offsets[index - 1]
  const positions = offsets.slice()
  const states = new Uint32Array(owners.length)
  for (let state = 0; state < owners.length; state += 1) states[positions[owners[state]]++] = state
  return (owner: number) => states.subarray(offsets[owner], offsets[owner + 1])
}

function prepareLine(points: Coordinate[]): PreparedLine {
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) cumulative.push(cumulative[index - 1] + haversineMetres(points[index - 1], points[index]))
  return { points, cumulative, length: cumulative.at(-1)! }
}

function interpolate(first: Coordinate, second: Coordinate, fraction: number): Coordinate {
  return { lat: first.lat + (second.lat - first.lat) * fraction, lng: first.lng + (second.lng - first.lng) * fraction }
}

function project(point: Coordinate, first: Coordinate, second: Coordinate) {
  const scale = Math.cos(point.lat * Math.PI / 180)
  const latitude = second.lat - first.lat
  const longitude = (second.lng - first.lng) * scale
  const square = latitude ** 2 + longitude ** 2
  const fraction = square ? Math.max(0, Math.min(1, ((point.lat - first.lat) * latitude
    + (point.lng - first.lng) * scale * longitude) / square)) : 0
  const coordinate = interpolate(first, second, fraction)
  return { coordinate, fraction, offset: haversineMetres(point, coordinate) }
}

function pointAt(line: PreparedLine, fraction: number): Coordinate {
  if (fraction <= 0) return line.points[0]
  if (fraction >= 1) return line.points.at(-1)!
  const distance = line.length * fraction
  const index = line.cumulative.findIndex((metres) => metres >= distance)
  const span = line.cumulative[index] - line.cumulative[index - 1]
  return interpolate(line.points[index - 1], line.points[index], span ? (distance - line.cumulative[index - 1]) / span : 0)
}

function sliceLine(line: PreparedLine, from: number, to: number): Coordinate[] {
  const low = Math.min(from, to)
  const high = Math.max(from, to)
  const points = [pointAt(line, low)]
  for (let index = 1; index < line.points.length - 1; index += 1) {
    if (line.cumulative[index] > low * line.length + 1e-7 && line.cumulative[index] < high * line.length - 1e-7) points.push(line.points[index])
  }
  points.push(pointAt(line, high))
  return from <= to ? points : points.reverse()
}

function bearing(first: Coordinate, second: Coordinate) {
  const radians = Math.PI / 180
  const longitude = (second.lng - first.lng) * radians
  return Math.atan2(Math.sin(longitude) * Math.cos(second.lat * radians),
    Math.cos(first.lat * radians) * Math.sin(second.lat * radians)
    - Math.sin(first.lat * radians) * Math.cos(second.lat * radians) * Math.cos(longitude)) / radians
}

function flagsOf(flags: number): DrivingFlags {
  return { bridge: !!(flags & 1), tunnel: !!(flags & 2), flyover: !!(flags & 4), roundabout: !!(flags & 8), toll: !!(flags & 16) }
}

function maneuver(previous: Coordinate[], next: Coordinate[], before: DrivingFlags, after: DrivingFlags): DrivingManeuver {
  if (!before.roundabout && after.roundabout) return 'enter-roundabout'
  if (before.roundabout && !after.roundabout) return 'exit-roundabout'
  const delta = ((bearing(next[0], next[1]) - bearing(previous.at(-2)!, previous.at(-1)!) + 540) % 360) - 180
  if (Math.abs(delta) >= 160) return 'u-turn'
  if (Math.abs(delta) < 25) return 'continue'
  if (Math.abs(delta) < 60) return delta < 0 ? 'bear-left' : 'bear-right'
  return delta < 0 ? 'turn-left' : 'turn-right'
}

export function drivingTimeProfile(hour: number): DrivingTimeProfile {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError('Invalid IST planning hour')
  if (hour >= 8 && hour < 11) return { name: 'static-morning-estimate', urbanFactor: 1.3, corridorFactor: 1.1 }
  if (hour >= 17 && hour < 22) return { name: 'static-evening-estimate', urbanFactor: 1.6, corridorFactor: 1.15 }
  return { name: 'static-off-peak-estimate', urbanFactor: 1, corridorFactor: 1 }
}

function contextFor(options: DrivingOptions, hour?: number): RouteContext {
  const timestamp = options.departureTimestamp ?? Date.now()
  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) throw new RangeError('Invalid departure timestamp')
  const profile = options.timeProfile ?? drivingTimeProfile(hour ?? new Date(timestamp + 19_800_000).getUTCHours())
  const maxSnap = options.maxSnapMetres ?? 120
  if (!profile || !validLabel(profile.name) || !profile.name || ![profile.urbanFactor, profile.corridorFactor]
    .every((factor) => Number.isFinite(factor) && factor >= 1 && factor <= 5)
    || !Number.isFinite(maxSnap) || maxSnap <= 0 || maxSnap > 120
    || options.avoid !== undefined && (!Array.isArray(options.avoid) || options.avoid.length > 3
      || options.avoid.some((item) => !['tolls', 'motorways', 'tunnels'].includes(item)))) throw new RangeError('Invalid car routing options')
  return { profile: { ...profile }, avoid: new Set(options.avoid), maxSnap }
}

function planningSpeed(highway: string, urban: boolean, limit: number | null) {
  const baseline: Record<string, number> = { motorway: 80, trunk: 75, primary: 60, secondary: 50,
    tertiary: 35, unclassified: 30, residential: 20, living_street: 10, service: 15 }
  const speed = highway.endsWith('_link') ? (urban ? 25 : 35) : Math.min(baseline[highway] ?? 20, urban ? 35 : 80)
  return limit === null ? speed : Math.min(speed, limit * 0.9)
}

export function createDrivingRouter(value: unknown): DrivingRouter {
  const started = performance.now()
  const data = validateDrivingData(value)
  const stateCount = data.edges.reduce((count, edge) => count + (data.roads[edge[3]][4] === 0 ? 2 : 1), 0)
  const arcFrom = new Uint32Array(stateCount)
  const arcTo = new Uint32Array(stateCount)
  const arcEdges = new Uint32Array(stateCount)
  const arcDirections = new Int8Array(stateCount)
  const stateSeconds = new Float64Array(stateCount)
  const arcAt = (index: number): RoutingArc => {
    const edge = data.edges[arcEdges[index]]
    const road = data.roads[edge[3]]
    const direction = arcDirections[index] === 1 ? 1 : -1
    return { from: arcFrom[index], to: arcTo[index], wayId: road[0], edgeIndex: arcEdges[index], direction,
      limit: road[direction === 1 ? 6 : 7], metres: edge[2], seconds: stateSeconds[index] }
  }
  const geometryCache = new Map<number, PreparedLine>()
  let cachedGeometryPoints = 0
  const lineFor = (edgeIndex: number) => {
    const cached = geometryCache.get(edgeIndex)
    if (cached) return cached
    const line = prepareLine(decodeDrivingGeometry(data, edgeIndex))
    if (line.points.length <= 16_384) {
      while (cachedGeometryPoints + line.points.length > 16_384) {
        const oldest = geometryCache.keys().next().value!
        cachedGeometryPoints -= geometryCache.get(oldest)!.points.length
        geometryCache.delete(oldest)
      }
      geometryCache.set(edgeIndex, line)
      cachedGeometryPoints += line.points.length
    }
    return line
  }
  const nodeIndexById = new Map(data.nodes.map((node, index) => [node[0], index]))
  const wayNodes = new Map<number, Set<number>>()
  const grid = new Map<string, number[]>()
  let stateIndex = 0
  for (const [edgeIndex, edge] of data.edges.entries()) {
    const road = data.roads[edge[3]]
    const endpoints = wayNodes.get(road[0]) ?? new Set<number>()
    endpoints.add(edge[0]); endpoints.add(edge[1]); wayNodes.set(road[0], endpoints)
    for (const direction of [1, -1] as const) {
      if (road[4] !== 0 && road[4] !== direction) continue
      const from = edge[direction === 1 ? 0 : 1]
      const to = edge[direction === 1 ? 1 : 0]
      const limit = road[direction === 1 ? 6 : 7]
      arcFrom[stateIndex] = from; arcTo[stateIndex] = to; arcEdges[stateIndex] = edgeIndex; arcDirections[stateIndex] = direction
      stateSeconds[stateIndex] = edge[2] / (planningSpeed(data.highways[road[3]], edge[4] === 1, limit) / 3.6)
      stateIndex += 1
    }
    const cells = new Set<string>()
    const points = decodeDrivingGeometry(data, edgeIndex)
    for (let index = 1; index < points.length; index += 1) {
      const first = points[index - 1]
      const second = points[index]
      const samples = Math.max(1, Math.ceil(Math.max(Math.abs(first.lat - second.lat), Math.abs(first.lng - second.lng)) / GRID))
      for (let sample = 0; sample <= samples; sample += 1) {
        const point = interpolate(first, second, sample / samples)
        cells.add(`${Math.floor(point.lat / GRID)}:${Math.floor(point.lng / GRID)}`)
      }
    }
    for (const cell of cells) {
      const entries = grid.get(cell) ?? []
      entries.push(edgeIndex); grid.set(cell, entries)
    }
  }
  const outgoing = indexStates(arcFrom, data.nodes.length)
  const incoming = indexStates(arcTo, data.nodes.length)
  const edgeArcs = indexStates(arcEdges, data.edges.length)
  const rulesByApproach = new Map<string, DrivingRestriction[]>()
  for (const rule of data.restrictions) {
    let junctions: number[]
    if (rule.viaNode !== null) {
      const node = nodeIndexById.get(rule.viaNode)
      junctions = node === undefined ? [] : [node]
    } else {
      const fromNodes = wayNodes.get(rule.fromWay) ?? new Set<number>()
      junctions = [...fromNodes].filter((node) => rule.viaWays.some((way) => wayNodes.get(way)?.has(node)))
      if (!junctions.length) junctions = [...fromNodes]
    }
    for (const node of junctions) {
      const key = `${node}:${rule.fromWay}`
      const rules = rulesByApproach.get(key) ?? []
      rules.push(rule); rulesByApproach.set(key, rules)
    }
  }
  const isReverse = (previous: RoutingArc, next: RoutingArc) => previous.edgeIndex === next.edgeIndex && previous.direction !== next.direction
  const allowed = (previous: RoutingArc, next: RoutingArc) => {
    if (previous.to !== next.from) return false
    const rules = rulesByApproach.get(`${previous.to}:${previous.wayId}`) ?? EMPTY_RULES
    const reverse = isReverse(previous, next)
    if (reverse && !rules.some((rule) => rule.kind === 'only' && rule.type === 'only_u_turn' && rule.toWays.includes(next.wayId))) return false
    return rules.every((rule) => {
      if (rule.kind === 'block') return false
      const sameWayUturn = rule.type.endsWith('u_turn') && rule.fromWay === next.wayId
      const matches = rule.toWays.includes(next.wayId) && (!sameWayUturn || reverse)
      return rule.kind === 'only' ? matches : !matches
    })
  }
  const restrictionsApplied: DrivingRestrictionSummary = {
    viaNodeRelations: new Set(data.restrictions.filter((rule) => rule.kind !== 'block').map((rule) => rule.id)).size,
    conservativelyBlockedRelations: new Set(data.restrictions.filter((rule) => rule.kind === 'block').map((rule) => rule.id)).size,
    malformedRelationsExcluded: data.exclusions.relationIds.length,
    forbiddenTransitions: 0, immediateReversalsBlocked: 0,
  }
  const transitionOffsets = new Uint32Array(stateCount + 1)
  const transitionTargets = new Uint32Array(MAX_TRANSITIONS)
  let transitionCount = 0
  for (let index = 0; index < stateCount; index += 1) {
    const arc = arcAt(index)
    transitionOffsets[index] = transitionCount
    for (const nextIndex of outgoing(arc.to)) {
      const next = arcAt(nextIndex)
      if (!allowed(arc, next)) {
        if (isReverse(arc, next)) restrictionsApplied.immediateReversalsBlocked += 1
        else restrictionsApplied.forbiddenTransitions += 1
        continue
      }
      if (transitionCount >= MAX_TRANSITIONS) throw new RangeError('Car transition graph exceeds worker memory budget')
      transitionTargets[transitionCount++] = nextIndex
    }
  }
  transitionOffsets[stateCount] = transitionCount
  const graph = new CompactDrivingGraph(stateSeconds, transitionOffsets, transitionTargets.slice(0, transitionCount))
  const resultBase: DrivingResultBase = { unknownFallback: false, source: data.source, coverage: data.coverage,
    restrictionsApplied, warnings: DRIVING_WARNINGS }
  const performanceStats: NonNullable<DrivingSummary['performance']> = {
    library: 'ngraph.path/nba', storage: 'typed-array-csr', searches: 0, metricCacheHits: 0,
  }
  const snapCache = new Map<string, DrivingSnap | null>()
  const snap = (point: Coordinate, maxMetres = 120): DrivingSnap | null => {
    if (!Number.isFinite(maxMetres) || maxMetres <= 0 || maxMetres > 120) throw new RangeError('Car snap limit must be at most 120 m')
    if (!isCoordinate(point) || !inside(point, data.bounds)) return null
    const key = JSON.stringify([point.lat, point.lng, maxMetres])
    if (snapCache.has(key)) return structuredClone(snapCache.get(key)!)
    const latitude = Math.floor(point.lat / GRID)
    const longitude = Math.floor(point.lng / GRID)
    const candidates = new Set<number>()
    for (let vertical = -1; vertical <= 1; vertical += 1) {
      for (let horizontal = -1; horizontal <= 1; horizontal += 1) {
        for (const index of grid.get(`${latitude + vertical}:${longitude + horizontal}`) ?? []) candidates.add(index)
      }
    }
    let best: DrivingSnap | null = null
    for (const edgeIndex of candidates) {
      const line = lineFor(edgeIndex)
      for (let index = 1; index < line.points.length; index += 1) {
        const projected = project(point, line.points[index - 1], line.points[index])
        if (projected.offset > maxMetres || best && projected.offset >= best.offsetMetres - 1e-8) continue
        const along = line.cumulative[index - 1] + projected.fraction * (line.cumulative[index] - line.cumulative[index - 1])
        const fraction = Math.max(0, Math.min(1, along / line.length))
        const edge = data.edges[edgeIndex]
        best = { edgeIndex, fraction, coordinate: projected.coordinate, offsetMetres: projected.offset, maxOffsetMetres: 120,
          osmNodeId: fraction < 1e-10 ? data.nodes[edge[0]][0] : fraction > 1 - 1e-10 ? data.nodes[edge[1]][0] : null,
          accessVerified: false, endpointCoverage: data.coverage.cities.some((city) => inside(point, city.bounds)) ? 'city-local' : 'major-road-corridor' }
      }
    }
    if (snapCache.size >= 128) snapCache.delete(snapCache.keys().next().value!)
    snapCache.set(key, structuredClone(best))
    return best
  }
  const cost = (attributes: Transition, context: RouteContext) => {
    if (attributes.arcIndex < 0) return attributes.weight
    const edge = data.edges[arcEdges[attributes.arcIndex]]
    const road = data.roads[edge[3]]
    if (context.avoid.has('tolls') && (road[5] & 16) || context.avoid.has('tunnels') && (road[5] & 2)
      || context.avoid.has('motorways') && data.highways[road[3]].startsWith('motorway')) return Infinity
    return attributes.weight * (edge[4] ? context.profile.urbanFactor : context.profile.corridorFactor)
  }
  function compute(origin: Coordinate, destination: Coordinate, context: RouteContext, metricsOnly: true): DrivingMetrics
  function compute(origin: Coordinate, destination: Coordinate, context: RouteContext, metricsOnly?: false): DrivingRouteResult
  function compute(origin: Coordinate, destination: Coordinate, context: RouteContext, metricsOnly = false): DrivingRouteResult | DrivingMetrics {
    const unavailable = (reason: DrivingUnavailable['reason'], originSnap: DrivingSnap | null = null,
      destinationSnap: DrivingSnap | null = null): DrivingUnavailable => ({ ...resultBase, status: 'unavailable', reason,
      snaps: { origin: originSnap, destination: destinationSnap } })
    if (!isCoordinate(origin) || !isCoordinate(destination)) return unavailable('invalid-coordinate')
    if (!inside(origin, data.bounds) || !inside(destination, data.bounds)) return unavailable('outside-bounds')
    const originSnap = snap(origin, context.maxSnap)
    const destinationSnap = snap(destination, context.maxSnap)
    if (!originSnap || !destinationSnap) return unavailable('no-road', originSnap, destinationSnap)
    const originNode = originSnap.osmNodeId === null ? undefined : nodeIndexById.get(originSnap.osmNodeId)
    const destinationNode = destinationSnap.osmNodeId === null ? undefined : nodeIndexById.get(destinationSnap.osmNodeId)
    graph.addNode('origin'); graph.addNode('destination')
    const temporary = (from: string, to: string, attributes: Transition) => {
      if (!Number.isFinite(cost(attributes, context))) return
      if (graph.hasDirectedEdge(from, to)) {
        const current = graph.getEdgeAttributes(from, to)
        if (cost(current, context) > cost(attributes, context)) graph.replaceEdgeAttributes(from, to, attributes)
      } else graph.addDirectedEdge(from, to, attributes)
    }
    const partial = (arcIndex: number, fromFraction: number, toFraction: number): Transition => ({
      arcIndex, fromFraction, toFraction, weight: stateSeconds[arcIndex] * Math.abs(toFraction - fromFraction),
    })
    let traversals: Transition[] = []
    try {
      for (const arcIndex of originNode === undefined ? edgeArcs(originSnap.edgeIndex) : outgoing(originNode)) {
        const arc = arcAt(arcIndex)
        temporary('origin', String(arcIndex), partial(arcIndex,
          originNode === undefined ? originSnap.fraction : arc.direction === 1 ? 0 : 1, arc.direction === 1 ? 1 : 0))
      }
      if (destinationNode !== undefined) {
        for (const arcIndex of incoming(destinationNode)) temporary(String(arcIndex), 'destination', { weight: 0, arcIndex: -1 })
        if (originNode === destinationNode) temporary('origin', 'destination', { weight: 0, arcIndex: -1 })
      } else {
        for (const arcIndex of edgeArcs(destinationSnap.edgeIndex)) {
          const arc = arcAt(arcIndex)
          const finish = partial(arcIndex, arc.direction === 1 ? 0 : 1, destinationSnap.fraction)
          for (const previous of incoming(arc.from)) {
            if (allowed(arcAt(previous), arc)) temporary(String(previous), 'destination', finish)
          }
          if (originNode === arc.from) temporary('origin', 'destination', finish)
        }
      }
      if (originSnap.edgeIndex === destinationSnap.edgeIndex) {
        for (const arcIndex of edgeArcs(originSnap.edgeIndex)) {
          if ((destinationSnap.fraction - originSnap.fraction) * arcDirections[arcIndex] >= 0) {
            temporary('origin', 'destination', partial(arcIndex, originSnap.fraction, destinationSnap.fraction))
          }
        }
      }
      performanceStats.searches += 1
      const path = graph.shortestPath((_edge, attributes) => cost(attributes, context))
      if (!path) return unavailable('disconnected-or-restricted', originSnap, destinationSnap)
      for (let index = 1; index < path.length; index += 1) {
        const attributes = graph.getEdgeAttributes(path[index - 1], path[index])
        if (!Number.isFinite(cost(attributes, context))) return unavailable('disconnected-or-restricted', originSnap, destinationSnap)
        if (attributes.arcIndex >= 0 && attributes.weight > 0) traversals.push(attributes)
      }
    } finally {
      graph.dropNode('origin'); graph.dropNode('destination')
    }
    if (metricsOnly) {
      let metres = 0
      let planningSeconds = 0
      let maximumSeconds = 0
      for (const traversal of traversals) {
        const edge = data.edges[arcEdges[traversal.arcIndex]]
        const fraction = Math.abs((traversal.toFraction ?? 1) - (traversal.fromFraction ?? 0))
        const seconds = cost(traversal, context)
        metres += fraction * edge[2]
        planningSeconds += seconds
        maximumSeconds += seconds * (edge[4] ? 2 : 1.6)
      }
      const estimatedSeconds = { min: planningSeconds * 0.9, max: maximumSeconds }
      return { ...resultBase, status: 'ok', metres, planningSeconds, estimatedSeconds,
        durationMinutes: { min: Math.ceil(estimatedSeconds.min / 60), max: Math.ceil(estimatedSeconds.max / 60) },
        timeProfile: context.profile, geometryKind: 'car-network', snaps: { origin: originSnap, destination: destinationSnap } }
    }
    const geometry: Coordinate[] = []
    const segments: DrivingRouteSegment[] = []
    const steps: DrivingStep[] = []
    let metres = 0
    let planningSeconds = 0
    let maximumSeconds = 0
    let previousPoints: Coordinate[] | null = null
    let previousFlags: DrivingFlags | null = null
    for (const traversal of traversals) {
      const arc = arcAt(traversal.arcIndex)
      const edge = data.edges[arc.edgeIndex]
      const road = data.roads[edge[3]]
      const fromFraction = traversal.fromFraction ?? (arc.direction === 1 ? 0 : 1)
      const toFraction = traversal.toFraction ?? (arc.direction === 1 ? 1 : 0)
      const points = sliceLine(lineFor(arc.edgeIndex), fromFraction, toFraction)
      const segmentMetres = Math.abs(toFraction - fromFraction) * edge[2]
      const startGeometryIndex = Math.max(0, geometry.length - 1)
      if (geometry.length && haversineMetres(geometry.at(-1)!, points[0]) > 0.02) throw new Error('Car route geometry is not contiguous')
      geometry.push(...(geometry.length ? points.slice(1) : points))
      const endGeometryIndex = geometry.length - 1
      segments.push({ edgeIndex: arc.edgeIndex, osmWayId: road[0], direction: arc.direction, fromFraction, toFraction,
        metres: segmentMetres, startGeometryIndex, endGeometryIndex })
      const flags = flagsOf(road[5])
      const turn = previousPoints && previousFlags ? maneuver(previousPoints, points, previousFlags, flags) : 'depart'
      const name = data.names[road[1]] || null
      const ref = data.names[road[2]] || null
      const laneTags = data.laneTags[road[8]]
      const previous = steps.at(-1)
      if (turn === 'continue' && previous && previous.name === name && previous.ref === ref
        && previous.speedLimitKph === (arc.limit ?? undefined) && JSON.stringify(previous.flags) === JSON.stringify(flags)
        && JSON.stringify(previous.sourceLaneTags ?? null) === JSON.stringify(laneTags)) {
        previous.metres += segmentMetres
        previous.endGeometryIndex = endGeometryIndex
        if (!previous.osmWayIds.includes(road[0])) previous.osmWayIds.push(road[0])
      } else {
        steps.push({ maneuver: turn, name, ref, at: points[0], metres: segmentMetres, flags,
          ...(arc.limit === null ? {} : { speedLimitKph: arc.limit }), ...(laneTags === null ? {} : { sourceLaneTags: { ...laneTags } }),
          osmWayIds: [road[0]], startGeometryIndex, endGeometryIndex })
      }
      metres += segmentMetres
      const seconds = cost(traversal, context)
      planningSeconds += seconds
      maximumSeconds += seconds * (edge[4] ? 2 : 1.6)
      previousPoints = points; previousFlags = flags
    }
    if (!geometry.length) geometry.push(originSnap.coordinate)
    const cumulativeMetres = prepareLine(geometry).cumulative
    const measuredLength = cumulativeMetres.at(-1)!
    if (measuredLength > 0) for (let index = 1; index < cumulativeMetres.length; index += 1) cumulativeMetres[index] *= metres / measuredLength
    steps.push({ maneuver: 'arrive', name: null, ref: null, at: geometry.at(-1)!, metres: 0, flags: flagsOf(0),
      osmWayIds: [], startGeometryIndex: geometry.length - 1, endGeometryIndex: geometry.length - 1 })
    const route: DrivingRoute = { strategy: 'fastest-estimated', geometryKind: 'car-network', metres,
      planningSeconds, estimatedSeconds: { min: planningSeconds * 0.9, max: maximumSeconds }, timeProfile: context.profile,
      geometry, cumulativeMetres, segments, steps, osmWayIds: [...new Set(segments.map((segment) => segment.osmWayId))] }
    return { ...resultBase, status: 'ok', route, snaps: { origin: originSnap, destination: destinationSnap } }
  }
  const metricCache = new Map<string, DrivingMetrics>()
  const router: DrivingRouter = {
    snap, route: (origin, destination, options = {}) => compute(origin, destination, contextFor(options)),
    routeMetrics: (from, to, hour, options = {}) => {
      drivingTimeProfile(hour)
      const context = contextFor(options, hour)
      const key = JSON.stringify([from.lat, from.lng, to.lat, to.lng, context.profile.name,
        context.profile.urbanFactor, context.profile.corridorFactor, [...context.avoid].sort(), context.maxSnap])
      const cached = metricCache.get(key)
      if (cached) { performanceStats.metricCacheHits += 1; return structuredClone(cached) }
      const metrics = compute(from, to, context, true)
      if (metricCache.size >= 1024) metricCache.delete(metricCache.keys().next().value!)
      metricCache.set(key, structuredClone(metrics))
      return metrics
    },
    clearMetricCache: () => metricCache.clear(), source: data.source, coverage: data.coverage,
    summary: { nodes: data.nodes.length, polylines: data.edges.length, directedStates: stateCount, transitions: graph.size,
      geometryPoints: data.edges.reduce((sum, edge) => sum + edge[5].length / 2 + 2, 0), constructionMs: performance.now() - started,
      restrictions: restrictionsApplied, performance: performanceStats },
  }
  return router
}

export type DrivingLegResult = DrivingUnavailable | {
  status: 'ok'
  unknownFallback: false
  estimate: {
    mode: 'road'; transport: 'personal'; geometryKind: 'car-network'; provenance: 'osm-car-network'
    durationMinutes: { min: number; max: number }; distanceMetres: number; geometry: Coordinate[]; scoreMinutes: number
    offStreetAccess: 'unknown'; parking: 'unknown'; uncertainty: string
  }
  driving: Extract<DrivingRouteResult, { status: 'ok' }>
}

export function makeDrivingLegEstimator(router: DrivingRouter): (input: LegRequest) => DrivingLegResult {
  return (input) => {
    if (input.transport !== 'personal' || input.preference === 'walk') throw new RangeError('Car estimator requires a personal-car leg')
    const driving = router.route(input.from, input.to, { departureTimestamp: input.departureTimestamp })
    if (driving.status === 'unavailable') return driving
    const durationMinutes = { min: Math.ceil(driving.route.estimatedSeconds.min / 60), max: Math.ceil(driving.route.estimatedSeconds.max / 60) }
    return { status: 'ok', unknownFallback: false, driving, estimate: { mode: 'road', transport: 'personal',
      geometryKind: 'car-network', provenance: 'osm-car-network', durationMinutes, distanceMetres: driving.route.metres,
      geometry: driving.route.geometry, scoreMinutes: (durationMinutes.min + durationMinutes.max) / 2,
      offStreetAccess: 'unknown', parking: 'unknown', uncertainty: DRIVING_WARNINGS.join(' ') } }
  }
}