import { DirectedGraph, MultiDirectedGraph } from 'graphology'
import { bidirectional } from 'graphology-shortest-path/dijkstra'
import type { Coordinate } from '../types'
import { haversineMetres, isCoordinate } from './geo'

export type StreetStrategy = 'shortest' | 'quieter'

export interface WeightedStreetEdge {
  from: number
  to: number
  metres: number
  penaltyMetres: number
}

export function selectStreetPath(
  nodeCount: number,
  edges: readonly WeightedStreetEdge[],
  origin: number,
  destination: number,
  strategy: StreetStrategy,
): number[] | null {
  const validIndex = (index: number) => Number.isSafeInteger(index) && index >= 0 && index < nodeCount
  if (!Number.isSafeInteger(nodeCount) || nodeCount < 1 || nodeCount > 200_000
    || !Array.isArray(edges) || edges.length > 500_000
    || !validIndex(origin) || !validIndex(destination)
    || !['shortest', 'quieter'].includes(strategy)) throw new RangeError('Invalid street path input')
  const graph = new DirectedGraph()
  for (let index = 0; index < nodeCount; index += 1) graph.addNode(String(index))
  for (const edge of edges) {
    if (!edge || !validIndex(edge.from) || !validIndex(edge.to) || edge.from === edge.to
      || !Number.isFinite(edge.metres) || edge.metres <= 0 || edge.metres > 5_000
      || !Number.isFinite(edge.penaltyMetres) || edge.penaltyMetres < 0 || edge.penaltyMetres > 1_000_000
      || graph.hasDirectedEdge(String(edge.from), String(edge.to))) {
      throw new RangeError('Invalid or duplicate directed street edge')
    }
    graph.addDirectedEdge(String(edge.from), String(edge.to), {
      weight: edge.metres + (strategy === 'quieter' ? edge.penaltyMetres : 0),
    })
  }
  return bidirectional(graph, String(origin), String(destination), 'weight')?.map(Number) ?? null
}

export type StreetNode = [osmId: number, lat: number, lng: number]
export type StreetEdge = [from: number, to: number, metres: number, name: number, flags: number,
  direction: -1 | 0 | 1, intermediateDeltas: number[]]

export interface StreetData {
  version: 2
  geometryEncoding: 'intermediate-delta-lat-lng-e6'
  bounds: { south: number; west: number; north: number; east: number }
  nodes: StreetNode[]
  names: string[]
  edges: StreetEdge[]
  source: {
    provider: string
    license: 'ODbL-1.0'
    attribution: string
    attributionUrl: string
    licenseUrl: string
    timestamp: string
    fetchedAt: string
  }
}

export interface StreetEndpoint extends Coordinate { id?: string }
export interface StreetHotspot extends Coordinate {
  id: string
  radiusMetres?: number
  penaltyPerMetre?: number
}
export interface StreetSnap {
  edgeIndex: number
  fraction: number
  coordinate: Coordinate
  offsetMetres: number
  osmNodeId: number | null
  component: number
  accessVerified: false
}
export type StreetManeuver = 'depart' | 'continue' | 'bear-left' | 'bear-right'
  | 'turn-left' | 'turn-right' | 'u-turn' | 'arrive'
export interface StreetStep {
  maneuver: StreetManeuver
  name: string | null
  at: Coordinate
  metres: number
  startGeometryIndex: number
  endGeometryIndex: number
  flags: number
}
export interface StreetRouteSegment {
  edgeIndex: number
  fromFraction: number
  toFraction: number
  metres: number
  startGeometryIndex: number
  endGeometryIndex: number
}
export interface StreetRoute {
  strategy: StreetStrategy
  metres: number
  estimatedPenaltyMetres: number
  cost: number
  geometry: Coordinate[]
  cumulativeMetres: number[]
  segments: StreetRouteSegment[]
  steps: StreetStep[]
}
export interface StreetRouteOptions {
  maxSnapMetres?: number
  hotspots?: readonly StreetHotspot[]
}
export type StreetRouteResult = {
  status: 'ok'
  originSnap: StreetSnap
  destinationSnap: StreetSnap
  shortest: StreetRoute
  quieter: StreetRoute
  alternativesDiffer: boolean
  sourceTimestamp: string
  warnings: readonly string[]
} | {
  status: 'unavailable'
  reason: 'invalid-coordinate' | 'outside-bounds' | 'no-nearby-street' | 'disconnected'
  originSnap?: StreetSnap | null
  destinationSnap?: StreetSnap | null
  warnings: readonly string[]
}
export interface StreetRouter {
  snap: (point: Coordinate, maxMetres?: number) => StreetSnap | null
  route: (origin: StreetEndpoint, destination: StreetEndpoint, options?: StreetRouteOptions) => StreetRouteResult
  summary: {
    nodes: number
    polylines: number
    geometryPoints: number
    components: number
    largestComponent: number
    largestComponentNodes: number
  }
}

export const STREET_ROUTING_WARNINGS = [
  'OSM snapshot only: no live street crowd, police restrictions, closures or access guarantees.',
  'Quieter means an estimated detour around other supplied hotspots, never crowd-free or safer.',
  'Pins are approximate. Snaps identify nearby mapped streets, not verified gates or walkable access to a pin. Off-street gaps are not routed.',
  'Steps, bridges and tunnels may be present. This is not an accessible-route certification.',
] as const

function insideStreetBounds(point: Coordinate, bounds: StreetData['bounds']) {
  return point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east
}

export function decodeStreetGeometry(data: StreetData, edgeIndex: number): Coordinate[] {
  const edge = data.edges[edgeIndex]
  if (!edge) throw new RangeError('Invalid street edge index')
  const first = data.nodes[edge[0]]
  const last = data.nodes[edge[1]]
  let latitude = Math.round(first[1] * 1e6)
  let longitude = Math.round(first[2] * 1e6)
  const points = [{ lat: first[1], lng: first[2] }]
  for (let index = 0; index < edge[6].length; index += 2) {
    latitude += edge[6][index]
    longitude += edge[6][index + 1]
    points.push({ lat: latitude / 1e6, lng: longitude / 1e6 })
  }
  points.push({ lat: last[1], lng: last[2] })
  return points
}

export function validateStreetData(value: unknown): StreetData {
  if (!value || typeof value !== 'object') throw new RangeError('Invalid street dataset')
  const data = value as StreetData
  const bounds = data.bounds
  if (data.version !== 2 || data.geometryEncoding !== 'intermediate-delta-lat-lng-e6'
    || !bounds || !isCoordinate({ lat: bounds.south, lng: bounds.west })
    || !isCoordinate({ lat: bounds.north, lng: bounds.east }) || bounds.south >= bounds.north || bounds.west >= bounds.east
    || !Array.isArray(data.nodes) || !data.nodes.length || data.nodes.length > 200_000
    || !Array.isArray(data.edges) || !data.edges.length || data.edges.length > 500_000
    || !Array.isArray(data.names) || data.names[0] !== '' || data.names.length > 100_000
    || data.source?.provider !== 'OpenStreetMap' || data.source.license !== 'ODbL-1.0'
    || data.source.attribution !== 'OpenStreetMap contributors'
    || data.source.attributionUrl !== 'https://www.openstreetmap.org/copyright'
    || data.source.licenseUrl !== 'https://opendatacommons.org/licenses/odbl/1-0/'
    || typeof data.source.timestamp !== 'string' || typeof data.source.fetchedAt !== 'string'
    || !Number.isFinite(Date.parse(data.source.timestamp)) || !Number.isFinite(Date.parse(data.source.fetchedAt))) {
    throw new RangeError('Invalid street schema or attribution')
  }
  const ids = new Set<number>()
  for (const node of data.nodes) {
    if (!Array.isArray(node) || node.length !== 3 || !Number.isSafeInteger(node[0]) || node[0] <= 0 || ids.has(node[0])
      || !isCoordinate({ lat: node[1], lng: node[2] }) || !insideStreetBounds({ lat: node[1], lng: node[2] }, bounds)) {
      throw new RangeError('Invalid or duplicate OSM node')
    }
    ids.add(node[0])
  }
  if (new Set(data.names).size !== data.names.length
    || data.names.some((name) => typeof name !== 'string' || name.length > 160 || /[<>\u0000-\u001f\u007f]/.test(name))) {
    throw new RangeError('Invalid street names')
  }
  const usedNodes = new Uint8Array(data.nodes.length)
  let geometryPoints = 0
  for (const [index, edge] of data.edges.entries()) {
    if (!Array.isArray(edge) || edge.length !== 7 || ![edge[0], edge[1]].every((node) => Number.isSafeInteger(node)
      && node >= 0 && node < data.nodes.length) || edge[0] === edge[1]
      || !Number.isFinite(edge[2]) || edge[2] <= 0 || edge[2] > 100_000
      || !Number.isSafeInteger(edge[3]) || edge[3] < 0 || edge[3] >= data.names.length
      || !Number.isSafeInteger(edge[4]) || edge[4] < 0 || edge[4] > 15 || ![-1, 0, 1].includes(edge[5])
      || !Array.isArray(edge[6]) || edge[6].length % 2 || edge[6].length > 40_000
      || !edge[6].every((delta) => Number.isSafeInteger(delta) && Math.abs(delta) <= 1e6)) {
      throw new RangeError('Invalid street polyline')
    }
    const points = decodeStreetGeometry(data, index)
    geometryPoints += points.length
    if (geometryPoints > 2_000_000 || points.some((point) => !insideStreetBounds(point, bounds))) {
      throw new RangeError('Street geometry exceeds bounds')
    }
    let length = 0
    for (let point = 1; point < points.length; point += 1) length += haversineMetres(points[point - 1], points[point])
    if (length <= 0 || Math.abs(length - edge[2]) > Math.max(0.5, points.length * 0.16)) {
      throw new RangeError('Street distance differs from its actual polyline')
    }
    usedNodes[edge[0]] = 1
    usedNodes[edge[1]] = 1
  }
  if (usedNodes.some((used) => !used)) throw new RangeError('Unused street nodes')
  return data
}

interface PreparedStreetEdge {
  points: Coordinate[]
  cumulative: number[]
  length: number
}
interface StreetArc {
  edgeIndex: number
  start: number
  end: number
  metres: number
  penaltyMetres?: number
}
interface NormalizedHotspot extends Coordinate { id: string; radiusMetres: number; penaltyPerMetre: number }

function interpolate(first: Coordinate, second: Coordinate, fraction: number): Coordinate {
  return { lat: first.lat + (second.lat - first.lat) * fraction, lng: first.lng + (second.lng - first.lng) * fraction }
}

function projectToSegment(point: Coordinate, first: Coordinate, second: Coordinate) {
  const longitudeScale = Math.cos(point.lat * Math.PI / 180)
  const latitude = second.lat - first.lat
  const longitude = (second.lng - first.lng) * longitudeScale
  const square = latitude ** 2 + longitude ** 2
  const fraction = square ? Math.max(0, Math.min(1,
    ((point.lat - first.lat) * latitude + (point.lng - first.lng) * longitudeScale * longitude) / square)) : 0
  const coordinate = interpolate(first, second, fraction)
  return { coordinate, fraction, metres: haversineMetres(point, coordinate) }
}

function sliceStreetGeometry(prepared: PreparedStreetEdge, start: number, end: number): Coordinate[] {
  const pointAt = (fraction: number) => {
    if (fraction <= 0) return prepared.points[0]
    if (fraction >= 1) return prepared.points.at(-1)!
    const distance = fraction * prepared.length
    const next = prepared.cumulative.findIndex((metres) => metres >= distance)
    const segment = prepared.cumulative[next] - prepared.cumulative[next - 1]
    return interpolate(prepared.points[next - 1], prepared.points[next], segment ? (distance - prepared.cumulative[next - 1]) / segment : 0)
  }
  const low = Math.min(start, end)
  const high = Math.max(start, end)
  const points = [pointAt(low)]
  for (let index = 1; index < prepared.points.length - 1; index += 1) {
    const fraction = prepared.cumulative[index] / prepared.length
    if (fraction > low && fraction < high) points.push(prepared.points[index])
  }
  points.push(pointAt(high))
  return start <= end ? points : points.reverse()
}

function hotspotPenalty(points: Coordinate[], hotspots: readonly NormalizedHotspot[], metricLength: number) {
  let penalty = 0
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1]
    const second = points[index]
    const metres = haversineMetres(first, second)
    length += metres
    for (const hotspot of hotspots) {
      if (projectToSegment(hotspot, first, second).metres >= hotspot.radiusMetres) continue
      const samples = Math.max(1, Math.ceil(metres / 25))
      for (let sample = 0; sample < samples; sample += 1) {
        const distance = haversineMetres(interpolate(first, second, (sample + 0.5) / samples), hotspot)
        penalty += metres / samples * hotspot.penaltyPerMetre * Math.max(0, 1 - distance / hotspot.radiusMetres)
      }
    }
  }
  return length ? penalty * metricLength / length : 0
}

function turnAt(previous: Coordinate, current: Coordinate, next: Coordinate): StreetManeuver {
  const bearing = (first: Coordinate, second: Coordinate) => Math.atan2(
    (second.lng - first.lng) * Math.cos(first.lat * Math.PI / 180), second.lat - first.lat) * 180 / Math.PI
  const angle = ((bearing(current, next) - bearing(previous, current) + 540) % 360) - 180
  if (Math.abs(angle) < 20) return 'continue'
  if (Math.abs(angle) > 150) return 'u-turn'
  if (Math.abs(angle) < 45) return angle < 0 ? 'bear-left' : 'bear-right'
  return angle < 0 ? 'turn-left' : 'turn-right'
}

export function createStreetRouter(value: unknown): StreetRouter {
  const data = validateStreetData(value)
  const graph = new MultiDirectedGraph<Record<string, never>, StreetArc>({ allowSelfLoops: false })
  const components = Int32Array.from(data.nodes, (_, index) => index)
  const componentOf = (node: number): number => {
    let root = node
    while (components[root] !== root) root = components[root]
    while (components[node] !== node) {
      const next = components[node]
      components[node] = root
      node = next
    }
    return root
  }
  data.nodes.forEach((_, index) => graph.addNode(String(index)))
  const cellSize = 0.002
  const grid = new Map<string, Set<number>>()
  const prepared = data.edges.map((edge, edgeIndex): PreparedStreetEdge => {
    const points = decodeStreetGeometry(data, edgeIndex)
    const cumulative = [0]
    for (let index = 1; index < points.length; index += 1) {
      const first = points[index - 1]
      const second = points[index]
      cumulative.push(cumulative[index - 1] + haversineMetres(first, second))
      for (let row = Math.floor(Math.min(first.lat, second.lat) / cellSize); row <= Math.floor(Math.max(first.lat, second.lat) / cellSize); row += 1) {
        for (let column = Math.floor(Math.min(first.lng, second.lng) / cellSize); column <= Math.floor(Math.max(first.lng, second.lng) / cellSize); column += 1) {
          const key = `${row}:${column}`
          if (!grid.has(key)) grid.set(key, new Set())
          grid.get(key)!.add(edgeIndex)
        }
      }
    }
    const firstRoot = componentOf(edge[0])
    const secondRoot = componentOf(edge[1])
    components[Math.max(firstRoot, secondRoot)] = Math.min(firstRoot, secondRoot)
    if (edge[5] !== -1) graph.addDirectedEdgeWithKey(`${edgeIndex}:f`, String(edge[0]), String(edge[1]),
      { edgeIndex, start: 0, end: 1, metres: edge[2] })
    if (edge[5] !== 1) graph.addDirectedEdgeWithKey(`${edgeIndex}:r`, String(edge[1]), String(edge[0]),
      { edgeIndex, start: 1, end: 0, metres: edge[2] })
    return { points, cumulative, length: cumulative.at(-1)! }
  })
  const componentSizes = new Map<number, number>()
  data.nodes.forEach((_, index) => {
    const component = componentOf(index)
    componentSizes.set(component, (componentSizes.get(component) ?? 0) + 1)
  })
  const largest = [...componentSizes].sort((first, second) => second[1] - first[1])[0]
  const nearbyEdges = (point: Coordinate, metres: number) => {
    const latitude = metres / 110_000
    const longitude = latitude / Math.cos(point.lat * Math.PI / 180)
    const found = new Set<number>()
    for (let row = Math.floor((point.lat - latitude) / cellSize); row <= Math.floor((point.lat + latitude) / cellSize); row += 1) {
      for (let column = Math.floor((point.lng - longitude) / cellSize); column <= Math.floor((point.lng + longitude) / cellSize); column += 1) {
        for (const edge of grid.get(`${row}:${column}`) ?? []) found.add(edge)
      }
    }
    return found
  }
  const snap = (point: Coordinate, maxMetres = 120): StreetSnap | null => {
    if (!Number.isFinite(maxMetres) || maxMetres <= 0 || maxMetres > 120) throw new RangeError('Street snap limit must be within 120 metres')
    if (!isCoordinate(point) || !insideStreetBounds(point, data.bounds)) return null
    let best: StreetSnap | null = null
    for (const edgeIndex of nearbyEdges(point, maxMetres)) {
      const shape = prepared[edgeIndex]
      for (let index = 1; index < shape.points.length; index += 1) {
        const projected = projectToSegment(point, shape.points[index - 1], shape.points[index])
        if (projected.metres > maxMetres || (best && projected.metres >= best.offsetMetres - 1e-8)) continue
        const fraction = (shape.cumulative[index - 1]
          + projected.fraction * (shape.cumulative[index] - shape.cumulative[index - 1])) / shape.length
        const edge = data.edges[edgeIndex]
        best = { edgeIndex, fraction, coordinate: projected.coordinate, offsetMetres: projected.metres,
          osmNodeId: fraction === 0 ? data.nodes[edge[0]][0] : fraction === 1 ? data.nodes[edge[1]][0] : null,
          component: componentOf(edge[0]), accessVerified: false }
      }
    }
    return best
  }
  const route = (origin: StreetEndpoint, destination: StreetEndpoint, options: StreetRouteOptions = {}): StreetRouteResult => {
    const warnings = STREET_ROUTING_WARNINGS
    if (!isCoordinate(origin) || !isCoordinate(destination)) return { status: 'unavailable', reason: 'invalid-coordinate', warnings }
    if (!insideStreetBounds(origin, data.bounds) || !insideStreetBounds(destination, data.bounds)) {
      return { status: 'unavailable', reason: 'outside-bounds', warnings }
    }
    const originSnap = snap(origin, options.maxSnapMetres)
    const destinationSnap = snap(destination, options.maxSnapMetres)
    if (!originSnap || !destinationSnap) return { status: 'unavailable', reason: 'no-nearby-street', originSnap, destinationSnap, warnings }
    if (originSnap.component !== destinationSnap.component) return { status: 'unavailable', reason: 'disconnected', originSnap, destinationSnap, warnings }
    const supplied = options.hotspots ?? []
    if (!Array.isArray(supplied) || supplied.length > 128 || new Set(supplied.map((hotspot) => hotspot.id)).size !== supplied.length) {
      throw new RangeError('Invalid hotspot list')
    }
    const hotspots: NormalizedHotspot[] = supplied.map((hotspot) => {
      const id = hotspot.id
      const radiusMetres = hotspot.radiusMetres ?? 180
      const penaltyPerMetre = hotspot.penaltyPerMetre ?? 2
      if (!isCoordinate(hotspot) || typeof id !== 'string' || !id.length
        || !Number.isFinite(radiusMetres) || radiusMetres < 25 || radiusMetres > 500
        || !Number.isFinite(penaltyPerMetre) || penaltyPerMetre < 0 || penaltyPerMetre > 10) throw new RangeError('Invalid hotspot estimate')
      return { ...hotspot, id, radiusMetres, penaltyPerMetre }
    }).filter((hotspot) => hotspot.id !== origin.id && hotspot.id !== destination.id
      && haversineMetres(hotspot, origin) > 1 && haversineMetres(hotspot, destination) > 1)
    const penalties = new Map<number, number>()
    for (const hotspot of hotspots) {
      for (const edgeIndex of nearbyEdges(hotspot, hotspot.radiusMetres)) {
        const penalty = hotspotPenalty(prepared[edgeIndex].points, [hotspot], data.edges[edgeIndex][2])
        if (penalty) penalties.set(edgeIndex, (penalties.get(edgeIndex) ?? 0) + penalty)
      }
    }
    const temporaryNodes: string[] = []
    const addArc = (from: string, to: string, edgeIndex: number, start: number, end: number) => {
      const edge = data.edges[edgeIndex]
      if (from === to || start === end || (end > start && edge[5] === -1) || (end < start && edge[5] === 1)) return
      const metres = edge[2] * Math.abs(end - start)
      graph.addDirectedEdge(from, to, { edgeIndex, start, end, metres,
        penaltyMetres: hotspotPenalty(sliceStreetGeometry(prepared[edgeIndex], start, end), hotspots, metres) })
    }
    const attach = (location: StreetSnap, key: string) => {
      const edge = data.edges[location.edgeIndex]
      if (location.fraction === 0) return String(edge[0])
      if (location.fraction === 1) return String(edge[1])
      graph.addNode(key)
      temporaryNodes.push(key)
      addArc(String(edge[0]), key, location.edgeIndex, 0, location.fraction)
      addArc(key, String(edge[0]), location.edgeIndex, location.fraction, 0)
      addArc(String(edge[1]), key, location.edgeIndex, 1, location.fraction)
      addArc(key, String(edge[1]), location.edgeIndex, location.fraction, 1)
      return key
    }
    try {
      const originKey = attach(originSnap, '@origin')
      const sameSnap = originSnap.edgeIndex === destinationSnap.edgeIndex && originSnap.fraction === destinationSnap.fraction
      const destinationKey = sameSnap ? originKey : attach(destinationSnap, '@destination')
      if (originSnap.edgeIndex === destinationSnap.edgeIndex) {
        addArc(originKey, destinationKey, originSnap.edgeIndex, originSnap.fraction, destinationSnap.fraction)
      }
      const findRoute = (strategy: StreetStrategy): StreetRoute | null => {
        const penaltyOf = (arc: StreetArc) => arc.penaltyMetres ?? penalties.get(arc.edgeIndex) ?? 0
        const weight = (_edge: string, arc: StreetArc) => arc.metres + (strategy === 'quieter' ? penaltyOf(arc) : 0)
        const path = bidirectional(graph, originKey, destinationKey, weight)
        if (!path) return null
        const result: StreetRoute = { strategy, metres: 0, estimatedPenaltyMetres: 0, cost: 0,
          geometry: [originSnap.coordinate], cumulativeMetres: [0], segments: [], steps: [] }
        for (let index = 1; index < path.length; index += 1) {
          const candidates = graph.outEdges(path[index - 1], path[index])
          const selected = candidates.reduce((best, edge) => weight(edge, graph.getEdgeAttributes(edge))
            < weight(best, graph.getEdgeAttributes(best)) ? edge : best)
          const arc = graph.getEdgeAttributes(selected)
          const edge = data.edges[arc.edgeIndex]
          const points = sliceStreetGeometry(prepared[arc.edgeIndex], arc.start, arc.end)
          const startGeometryIndex = result.geometry.length - 1
          const rawLengths = points.slice(1).map((point, position) => haversineMetres(points[position], point))
          const rawLength = rawLengths.reduce((sum, metres) => sum + metres, 0)
          for (let point = 1; point < points.length; point += 1) {
            result.geometry.push(points[point])
            result.cumulativeMetres.push(result.cumulativeMetres.at(-1)! + (rawLength ? arc.metres * rawLengths[point - 1] / rawLength : 0))
          }
          result.metres += arc.metres
          result.estimatedPenaltyMetres += penaltyOf(arc)
          result.cumulativeMetres[result.cumulativeMetres.length - 1] = result.metres
          const endGeometryIndex = result.geometry.length - 1
          result.segments.push({ edgeIndex: arc.edgeIndex, fromFraction: arc.start, toFraction: arc.end,
            metres: arc.metres, startGeometryIndex, endGeometryIndex })
          const name = data.names[edge[3]] || null
          const maneuver = startGeometryIndex === 0 ? 'depart'
            : turnAt(result.geometry[startGeometryIndex - 1], result.geometry[startGeometryIndex], result.geometry[startGeometryIndex + 1])
          const previousStep = result.steps.at(-1)
          if (!previousStep || previousStep.name !== name || previousStep.flags !== edge[4] || maneuver !== 'continue') {
            result.steps.push({ maneuver, name, at: result.geometry[startGeometryIndex], metres: arc.metres,
              startGeometryIndex, endGeometryIndex, flags: edge[4] })
          } else {
            previousStep.metres += arc.metres
            previousStep.endGeometryIndex = endGeometryIndex
          }
        }
        result.cost = result.metres + (strategy === 'quieter' ? result.estimatedPenaltyMetres : 0)
        result.steps.push({ maneuver: 'arrive', name: null, at: destinationSnap.coordinate, metres: 0,
          startGeometryIndex: result.geometry.length - 1, endGeometryIndex: result.geometry.length - 1, flags: 0 })
        return result
      }
      const shortest = findRoute('shortest')
      if (!shortest) return { status: 'unavailable', reason: 'disconnected', originSnap, destinationSnap, warnings }
      const quieter = penalties.size || shortest.estimatedPenaltyMetres
        ? findRoute('quieter')! : { ...shortest, strategy: 'quieter' as const }
      const alternativesDiffer = shortest.segments.length !== quieter.segments.length || shortest.segments.some((segment, index) =>
        segment.edgeIndex !== quieter.segments[index].edgeIndex || segment.fromFraction !== quieter.segments[index].fromFraction
        || segment.toFraction !== quieter.segments[index].toFraction)
      return { status: 'ok', originSnap, destinationSnap, shortest, quieter, alternativesDiffer,
        sourceTimestamp: data.source.timestamp, warnings }
    } finally {
      for (const node of temporaryNodes) graph.dropNode(node)
    }
  }
  return { snap, route, summary: { nodes: data.nodes.length, polylines: data.edges.length,
    geometryPoints: prepared.reduce((sum, edge) => sum + edge.points.length, 0), components: componentSizes.size,
    largestComponent: largest[0], largestComponentNodes: largest[1] } }
}

export interface StreetProgress {
  status: 'on-route' | 'off-route' | 'uncertain' | 'arrived'
  coordinate: Coordinate
  distanceFromRouteMetres: number
  alongMetres: number
  remainingMetres: number
  stepIndex: number
}

export function streetRouteProgress(route: StreetRoute, point: Coordinate, previousMetres = 0, accuracyMetres = 0): StreetProgress {
  if (!isCoordinate(point) || !Number.isFinite(previousMetres) || previousMetres < 0 || previousMetres > route.metres
    || !Number.isFinite(accuracyMetres) || accuracyMetres < 0 || !route.geometry.length
    || route.geometry.length !== route.cumulativeMetres.length) throw new RangeError('Invalid street progress input')
  let best = { coordinate: route.geometry[0], metres: haversineMetres(point, route.geometry[0]), along: 0 }
  for (let index = 1; index < route.geometry.length; index += 1) {
    const projected = projectToSegment(point, route.geometry[index - 1], route.geometry[index])
    const along = route.cumulativeMetres[index - 1] + projected.fraction * (route.cumulativeMetres[index] - route.cumulativeMetres[index - 1])
    if (projected.metres < best.metres - 0.5 || (Math.abs(projected.metres - best.metres) <= 0.5
      && Math.abs(along - previousMetres) < Math.abs(best.along - previousMetres))) best = { ...projected, along }
  }
  const uncertain = accuracyMetres > 60
  const offRoute = best.metres > 35
  const alongMetres = uncertain || offRoute ? previousMetres : best.along
  const remainingMetres = Math.max(0, route.metres - alongMetres)
  const stepIndex = route.steps.findIndex((step) => route.cumulativeMetres[step.endGeometryIndex] > alongMetres)
  return { status: uncertain ? 'uncertain' : offRoute ? 'off-route'
    : remainingMetres <= 15 && haversineMetres(point, route.geometry.at(-1)!) <= 15 ? 'arrived' : 'on-route',
  coordinate: best.coordinate, distanceFromRouteMetres: best.metres, alongMetres, remainingMetres,
  stepIndex: stepIndex < 0 ? route.steps.length - 1 : stepIndex }
}