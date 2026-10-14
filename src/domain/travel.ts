import { UndirectedGraph } from 'graphology'
import { bidirectional } from 'graphology-shortest-path/dijkstra'
import type { Coordinate, MetroStation, MinuteRange, Pace, TravelPreference } from '../types'
import { getIstHour } from './crowd'
import { haversineMetres, isCoordinate } from './geo'

export type TravelMode = 'walk' | 'metro' | 'road'

export interface LegRequest {
  from: Coordinate
  to: Coordinate
  preference: TravelPreference
  departureTimestamp: number
  pace: Pace
}

export interface LegInput extends LegRequest {
  metroStations: readonly MetroStation[]
}

export interface MetroComponents {
  accessMinutes: MinuteRange
  waitMinutes: MinuteRange
  rideMinutes: MinuteRange
  transferMinutes: MinuteRange
  exitMinutes: MinuteRange
}

export interface LegEstimate {
  mode: TravelMode
  durationMinutes: MinuteRange
  distanceMetres: number
  walkMetres: number
  walkKm: number
  geometry: Coordinate[]
  geometryKind: 'straight-connectors'
  scoreMinutes: number
  stationNames?: string[]
  stationIds?: string[]
  transfers?: number
  components?: MetroComponents
  uncertainty: string
}

export interface LegOptions {
  alternatives: LegEstimate[]
  recommended: LegEstimate
}

type MetroEdge = {
  weight: number
  minutes: MinuteRange
  distanceMetres: number
  walkMetres: number
  transfer: boolean
}

const WALK_DETOUR = 1.3
const geometryNotice = 'Approximate straight connectors, not turn-by-turn directions.'

function midpoint(range: MinuteRange): number {
  return (range.min + range.max) / 2
}

function walkingMinutes(metres: number, pace: Pace): MinuteRange {
  const slow = pace === 'relaxed' ? 2_500 : 3_000
  const fast = pace === 'relaxed' ? 3_000 : 3_500
  return { min: metres / fast * 60, max: metres / slow * 60 }
}

function sumRanges(...ranges: MinuteRange[]): MinuteRange {
  return ranges.reduce((total, range) => ({
    min: total.min + range.min,
    max: total.max + range.max,
  }), { min: 0, max: 0 })
}

function makeLeg(
  mode: TravelMode,
  minutes: MinuteRange,
  distanceMetres: number,
  walkMetres: number,
  geometry: Coordinate[],
  preference: TravelPreference,
  uncertainty: string,
): LegEstimate {
  const walkKm = walkMetres / 1_000
  const walkingPenalty = preference === 'less-walking' ? walkKm * 14 : preference === 'balanced' ? walkKm * 2 : 0
  const modePenalty = preference === 'walk' && mode !== 'walk' ? 25 : mode === 'road' ? 3 : 0
  const durationMinutes = { min: Math.ceil(minutes.min), max: Math.ceil(minutes.max) }
  return {
    mode,
    durationMinutes,
    distanceMetres: Math.round(distanceMetres),
    walkMetres: Math.round(walkMetres),
    walkKm,
    geometry: geometry.map(({ lat, lng }) => ({ lat, lng })),
    geometryKind: 'straight-connectors',
    scoreMinutes: midpoint(durationMinutes) + walkingPenalty + modePenalty,
    uncertainty: `${uncertainty} ${geometryNotice}`,
  }
}

function metroGraph(stations: readonly MetroStation[], pace: Pace) {
  if (stations.length > 256) throw new RangeError('Too many metro stations')
  const graph = new UndirectedGraph<{ station: MetroStation }, MetroEdge>()
  const lineOrders = new Set<string>()
  for (const station of stations) {
    const lineOrder = `${station.line}:${station.order}`
    if (!station.id || !station.name || !isCoordinate(station)
      || !['blue', 'green'].includes(station.line) || !Number.isFinite(station.order)
      || graph.hasNode(station.id) || lineOrders.has(lineOrder)) {
      throw new RangeError('Invalid or duplicate metro station')
    }
    lineOrders.add(lineOrder)
    graph.addNode(station.id, { station: { ...station } })
  }
  for (const line of ['blue', 'green'] as const) {
    const ordered = stations.filter((station) => station.line === line)
      .sort((first, second) => first.order - second.order)
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]
      const current = ordered[index]
      const distanceMetres = haversineMetres(previous, current) * 1.1
      const minutes = { min: distanceMetres / 40_000 * 60 + 1, max: distanceMetres / 25_000 * 60 + 2 }
      graph.addUndirectedEdge(previous.id, current.id, {
        weight: midpoint(minutes), minutes, distanceMetres, walkMetres: 0, transfer: false,
      })
    }
  }
  const esplanade = stations.filter((station) => station.name.trim().toLowerCase() === 'esplanade')
  const blue = esplanade.filter((station) => station.line === 'blue')
  const green = esplanade.filter((station) => station.line === 'green')
  if (blue.length === 1 && green.length === 1 && haversineMetres(blue[0], green[0]) <= 450) {
    const walkMetres = Math.max(250, haversineMetres(blue[0], green[0]) * WALK_DETOUR)
    const minutes = sumRanges(walkingMinutes(walkMetres, pace), { min: 3, max: 9 })
    graph.addUndirectedEdge(blue[0].id, green[0].id, {
      weight: midpoint(minutes), minutes, distanceMetres: walkMetres, walkMetres, transfer: true,
    })
  }
  return graph
}

export function createLegEstimator(
  metroStations: readonly MetroStation[],
): (input: LegRequest) => LegOptions {
  const networks = {
    steady: metroGraph(metroStations, 'steady'),
    relaxed: metroGraph(metroStations, 'relaxed'),
  }
  return (input) => {
    if (!['steady', 'relaxed'].includes(input.pace)
      || !['balanced', 'walk', 'less-walking'].includes(input.preference)) {
      throw new RangeError('Invalid travel settings')
    }
    const hour = getIstHour(input.departureTimestamp)
    const direct = haversineMetres(input.from, input.to)
    const walkDistance = direct * WALK_DETOUR
    const walk = makeLeg('walk', walkingMinutes(walkDistance, input.pace), walkDistance,
      walkDistance, [input.from, input.to], input.preference,
      'Walking assumes a 1.3 detour factor and 2.5-3.5 km/h. Closures and accessibility are unknown.')
    const peak = hour >= 17 || hour < 2
    const midday = hour >= 12 && hour < 17
    const roadFast = peak ? 10_000 : midday ? 12_000 : 15_000
    const roadSlow = peak ? 8_000 : midday ? 10_000 : 12_000
    const roadDistance = direct * 1.4
    const roadWalk = Math.min(200, walkDistance * 0.2)
    const roadMinutes = sumRanges(walkingMinutes(roadWalk, input.pace), {
      min: 10 + roadDistance / roadFast * 60,
      max: 20 + roadDistance / roadSlow * 60,
    })
    const road = makeLeg('road', roadMinutes, roadDistance + roadWalk, roadWalk,
      [input.from, input.to], input.preference,
      'Road-transfer estimate, not a bus timetable: 10-20 minutes of pickup/traffic overhead and typical IST traffic at 8-15 km/h. Vehicle availability, fares and closures are unknown.')
    const alternatives = [walk, road]
    const graph = networks[input.pace]
    const stations = graph.mapNodes((_key, attributes) => attributes.station)
    const access = stations.map((station) => ({
      station, metres: haversineMetres(input.from, station) * WALK_DETOUR,
    })).filter((candidate) => candidate.metres <= 1_000)
    const exits = stations.map((station) => ({
      station, metres: haversineMetres(input.to, station) * WALK_DETOUR,
    })).filter((candidate) => candidate.metres <= 1_000)
    const metroOptions: LegEstimate[] = []
    for (const entry of access) {
      for (const exit of exits) {
        if (entry.station.id === exit.station.id || entry.metres + exit.metres > 1_400) continue
        const path = bidirectional(graph, entry.station.id, exit.station.id, 'weight')
        if (!path || path.length < 2) continue
        let rideMinutes: MinuteRange = { min: 0, max: 0 }
        let transferMinutes: MinuteRange = { min: 0, max: 0 }
        let walkMetres = entry.metres + exit.metres + 200
        let distanceMetres = walkMetres
        let transfers = 0
        for (let index = 1; index < path.length; index += 1) {
          const edge = graph.getEdgeAttributes(path[index - 1], path[index])
          distanceMetres += edge.distanceMetres
          if (edge.transfer) {
            transfers += 1
            walkMetres += edge.walkMetres
            transferMinutes = sumRanges(transferMinutes, edge.minutes)
          } else {
            rideMinutes = sumRanges(rideMinutes, edge.minutes)
          }
        }
        const components: MetroComponents = {
          accessMinutes: sumRanges(walkingMinutes(entry.metres + 100, input.pace), { min: 3, max: 6 }),
          waitMinutes: { min: 4, max: 12 },
          rideMinutes,
          transferMinutes,
          exitMinutes: sumRanges(walkingMinutes(exit.metres + 100, input.pace), { min: 2, max: 4 }),
        }
        const duration = sumRanges(...Object.values(components))
        if (midpoint(duration) + 3 > Math.min(midpoint(walk.durationMinutes), midpoint(road.durationMinutes))) continue
        const pathStations = path.map((id) => graph.getNodeAttribute(id, 'station'))
        metroOptions.push({
          ...makeLeg('metro', duration, distanceMetres, walkMetres,
            [input.from, ...pathStations, input.to], input.preference,
            'Metro planning estimate includes access, gates, waits, transfers and exit. Live service, operating hours and actual timings are unknown; confirm before travelling.'),
          stationNames: pathStations.map((station) => station.name),
          stationIds: path,
          transfers,
          components,
        })
      }
    }
    metroOptions.sort((first, second) => first.scoreMinutes - second.scoreMinutes
      || first.stationIds!.join('|').localeCompare(second.stationIds!.join('|'), 'en'))
    if (metroOptions[0]) alternatives.push(metroOptions[0])
    const recommended = [...alternatives].sort((first, second) => first.scoreMinutes - second.scoreMinutes
      || ['walk', 'metro', 'road'].indexOf(first.mode) - ['walk', 'metro', 'road'].indexOf(second.mode))[0]
    return { alternatives, recommended }
  }
}

export function getLegAlternatives(input: LegInput): LegOptions {
  return createLegEstimator(input.metroStations)(input)
}