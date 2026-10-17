import type {
  Coordinate, CrowdReport, Landmark, MetroStation, MinuteRange, NamedCoordinate, Pace, Pandal, TravelPreference,
} from '../types'
import { estimateCrowd, getIstHour } from './crowd'
import type { CrowdEstimate } from './crowd'
import { haversineMetres, isCoordinate } from './geo'
import { createLegEstimator } from './travel'
import type { LegEstimate } from './travel'

export const MAX_PLAN_STOPS = 12
export const DEFAULT_ORIGIN: Readonly<Landmark> = Object.freeze({
  id: 'esplanade',
  name: 'Esplanade Metro landmark (approximate)',
  lat: 22.5647,
  lng: 88.3519,
})

export interface PlanInput {
  pandals: readonly Pandal[]
  origin?: NamedCoordinate
  metroStations: readonly MetroStation[]
  preference: TravelPreference
  departureTimestamp: number
  availableMinutes: number
  pace: Pace
  avoidedVisited?: readonly string[]
  crowdReports?: readonly CrowdReport[]
}

export interface PlannedStop {
  pandalId: string
  arrivalTimestamp: number
  arrivalWindow: { earliest: number; latest: number }
  departureTimestamp: number
  departureWindow: { earliest: number; latest: number }
  leg: LegEstimate
  alternatives: LegEstimate[]
  crowd: CrowdEstimate
  visitMinutes: number
}

export interface PlanTotals {
  travelMinutes: MinuteRange
  queueMinutes: MinuteRange
  visitMinutes: number
  durationMinutes: MinuteRange
  estimatedMinutes: number
  walkMetres: number
  walkKm: number
}

export interface RoutePlan {
  origin: NamedCoordinate
  departureTimestamp: number
  finishTimestamp: number
  availableMinutes: number
  selectedIds: string[]
  orderedIds: string[]
  excludedVisitedIds: string[]
  stops: PlannedStop[]
  totals: PlanTotals
  overBudget: boolean
  budgetComparison: 'upper-estimate'
  suggestedIds?: string[]
  label: 'Optimized estimate'
  optimization: 'nearest-neighbour-geographic'
  uncertainty: string
}

function midpoint(range: MinuteRange): number {
  return (range.min + range.max) / 2
}

export function orderNearestFirst(pandals: readonly Pandal[], origin: Coordinate): Pandal[] {
  if (!isCoordinate(origin)) throw new RangeError('Invalid coordinate')
  const remaining = [...pandals]
  const ordered: Pandal[] = []
  let position = origin
  while (remaining.length) {
    remaining.sort((first, second) => haversineMetres(position, first) - haversineMetres(position, second)
      || first.id.localeCompare(second.id, 'en'))
    const next = remaining.shift()!
    ordered.push(next)
    position = next
  }
  return ordered
}

export function planRoute(input: PlanInput): RoutePlan {
  const origin = input.origin ?? DEFAULT_ORIGIN
  if (!isCoordinate(origin) || typeof origin.name !== 'string' || !origin.name.trim()) {
    throw new RangeError('Choose a named origin or an explicit landmark')
  }
  getIstHour(input.departureTimestamp)
  if (input.departureTimestamp < 0 || !Number.isFinite(input.availableMinutes)
    || input.availableMinutes < 0 || input.availableMinutes > 1_440
    || !['steady', 'relaxed'].includes(input.pace)
    || !['balanced', 'walk', 'less-walking'].includes(input.preference)) {
    throw new RangeError('Invalid plan settings')
  }
  if (input.pandals.length > MAX_PLAN_STOPS) throw new RangeError('A plan supports at most 12 stops')
  const ids = new Set<string>()
  for (const pandal of input.pandals) {
    if (!pandal.id || ids.has(pandal.id) || !isCoordinate(pandal)
      || !Number.isFinite(pandal.visitMinutes) || pandal.visitMinutes < 0 || pandal.visitMinutes > 240
      || ![1, 2, 3].includes(pandal.popularity)) {
      throw new RangeError('Invalid or duplicate pandal')
    }
    ids.add(pandal.id)
  }
  const avoided = new Set(input.avoidedVisited ?? [])
  const excludedVisitedIds = input.pandals.filter((pandal) => avoided.has(pandal.id)).map((pandal) => pandal.id)
  const pending = input.pandals.filter((pandal) => !avoided.has(pandal.id))
  const estimateLeg = createLegEstimator(input.metroStations)
  const reports = new Map<string, CrowdReport>()
  for (const report of input.crowdReports ?? []) {
    if (!Number.isFinite(report.reportedAt) || report.reportedAt > input.departureTimestamp) continue
    const previous = reports.get(report.pandalId)
    if (!previous || previous.reportedAt < report.reportedAt) reports.set(report.pandalId, report)
  }

  function evaluate(order: readonly Pandal[]) {
    let clock = input.departureTimestamp
    let earliest = clock
    let latest = clock
    let position = origin
    const stops: PlannedStop[] = []
    const totals: PlanTotals = {
      travelMinutes: { min: 0, max: 0 },
      queueMinutes: { min: 0, max: 0 },
      visitMinutes: 0,
      durationMinutes: { min: 0, max: 0 },
      estimatedMinutes: 0,
      walkMetres: 0,
      walkKm: 0,
    }
    for (const pandal of order) {
      const options = estimateLeg({
        from: position, to: pandal, preference: input.preference,
        departureTimestamp: clock, pace: input.pace,
      })
      const leg = options.recommended
      const arrivalTimestamp = clock + midpoint(leg.durationMinutes) * 60_000
      const arrivalWindow = {
        earliest: earliest + leg.durationMinutes.min * 60_000,
        latest: latest + leg.durationMinutes.max * 60_000,
      }
      const crowd = estimateCrowd(pandal, arrivalTimestamp, reports.get(pandal.id))
      const visitMinutes = Math.ceil(pandal.visitMinutes * (input.pace === 'relaxed' ? 1.25 : 1))
      clock = arrivalTimestamp + (midpoint(crowd.queueMinutes) + visitMinutes) * 60_000
      earliest = arrivalWindow.earliest + (crowd.queueMinutes.min + visitMinutes) * 60_000
      latest = arrivalWindow.latest + (crowd.queueMinutes.max + visitMinutes) * 60_000
      stops.push({
        pandalId: pandal.id, arrivalTimestamp, arrivalWindow, departureTimestamp: clock,
        departureWindow: { earliest, latest }, leg, alternatives: options.alternatives, crowd, visitMinutes,
      })
      totals.travelMinutes.min += leg.durationMinutes.min
      totals.travelMinutes.max += leg.durationMinutes.max
      totals.queueMinutes.min += crowd.queueMinutes.min
      totals.queueMinutes.max += crowd.queueMinutes.max
      totals.visitMinutes += visitMinutes
      totals.walkMetres += leg.walkMetres
      position = pandal
    }
    totals.durationMinutes = {
      min: totals.travelMinutes.min + totals.queueMinutes.min + totals.visitMinutes,
      max: totals.travelMinutes.max + totals.queueMinutes.max + totals.visitMinutes,
    }
    totals.estimatedMinutes = midpoint(totals.durationMinutes)
    totals.walkKm = totals.walkMetres / 1_000
    return { order: [...order], stops, totals, finishTimestamp: clock }
  }

  const best = evaluate(orderNearestFirst(pending, origin))
  const overBudget = best.totals.durationMinutes.max > input.availableMinutes
  return {
    origin: { name: origin.name, lat: origin.lat, lng: origin.lng },
    departureTimestamp: input.departureTimestamp,
    finishTimestamp: best.finishTimestamp,
    availableMinutes: input.availableMinutes,
    selectedIds: input.pandals.map((pandal) => pandal.id),
    orderedIds: best.order.map((pandal) => pandal.id),
    excludedVisitedIds,
    stops: best.stops,
    totals: best.totals,
    overBudget,
    budgetComparison: 'upper-estimate',
    ...(overBudget ? {
      suggestedIds: best.stops.filter((stop) => stop.departureWindow.latest
        <= input.departureTimestamp + input.availableMinutes * 60_000).map((stop) => stop.pandalId),
    } : {}),
    label: 'Optimized estimate',
    optimization: 'nearest-neighbour-geographic',
    uncertainty: 'Nearest-first by approximate geographic distance, not a globally shortest route. Actual road navigation is separate. Queues and travel are recalculated at sequential midpoint arrivals; ranges are approximate, not guarantees. The budget flag compares the upper total, and suggestions never remove selected stops. Default origin is a landmark, not device location. Confirm metro service and road closures locally.',
  }
}