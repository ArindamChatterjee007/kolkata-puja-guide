import type {
  Coordinate, CrowdReport, JourneyStop, Landmark, MetroStation, MinuteRange, NamedCoordinate,
  Pace, Pandal, StopKind, Transport, TravelPreference,
} from '../types'
import { estimateCrowd, getIstHour, isFreshCrowdReport } from './crowd'
import type { CrowdEstimate } from './crowd'
import { haversineMetres, isCoordinate } from './geo'
import { createLegEstimator, validateLegOptions } from './travel'
import type { LegEstimate, LegEstimator, LegOptions, LegRequest } from './travel'

export const MAX_PLAN_STOPS = 12
export const MAX_ROUTE_EVALUATIONS = 1_200
export const DEFAULT_ORIGIN: Readonly<Landmark> = Object.freeze({
  id: 'esplanade',
  name: 'Esplanade Metro landmark (approximate)',
  lat: 22.5647,
  lng: 88.3519,
})

export interface TimeWindow {
  earliest: number
  latest: number
}

export interface TripBreak {
  id: string
  minutes: number
  afterStopId?: string
  afterMinutes?: number
  place?: NamedCoordinate
}

export interface PlannedBreak {
  id: string
  minutes: number
  startTimestamp: number
  endTimestamp: number
  startWindow: TimeWindow
  endWindow: TimeWindow
  place?: NamedCoordinate
  leg?: LegEstimate
}

export type QueueEstimate = CrowdEstimate | {
  level: 'unknown'
  queueMinutes: MinuteRange
  basis: 'provided' | 'unspecified'
  label: string
  istHour: number
  uncertainty: string
}

export interface PlanInput<Stop extends JourneyStop = Pandal> {
  pandals: readonly Stop[]
  origin?: NamedCoordinate
  metroStations: readonly MetroStation[]
  preference: TravelPreference
  departureTimestamp: number
  availableMinutes: number
  pace: Pace
  avoidedVisited?: readonly string[]
  crowdReports?: readonly CrowdReport[]
  orderMode?: 'fastest' | 'nearest'
  returnToOrigin?: boolean
  returnOrigin?: NamedCoordinate
  legEstimator?: LegEstimator
  transport?: Transport
  roadContext?: 'urban' | 'rural'
  lockedNextStopId?: string
  breaks?: readonly TripBreak[]
  completedBreakIds?: readonly string[]
  skippedBreakIds?: readonly string[]
  scheduleStartTimestamp?: number
  activeDwellRemainingMinutes?: number
  activeBreakRemainingMinutes?: number
}

export interface PlannedStop<Stop extends JourneyStop = Pandal> {
  pandalId: string
  kind: StopKind
  arrivalTimestamp: number
  arrivalWindow: { earliest: number; latest: number }
  departureTimestamp: number
  departureWindow: { earliest: number; latest: number }
  leg: LegEstimate
  alternatives: LegEstimate[]
  crowd: Stop extends Pandal ? CrowdEstimate : QueueEstimate
  queue: QueueEstimate
  visitMinutes: number
}

export interface PlanTotals {
  travelMinutes: MinuteRange
  queueMinutes: MinuteRange
  visitMinutes: number
  breakMinutes: number
  activeDwellMinutes: number
  durationMinutes: MinuteRange
  estimatedMinutes: number
  walkMetres: number
  walkKm: number
}

export interface RoutePlan<Stop extends JourneyStop = Pandal> {
  origin: NamedCoordinate
  departureTimestamp: number
  finishTimestamp: number
  returnOrigin: NamedCoordinate
  homeLeg?: LegEstimate
  returnArrivalWindow?: { earliest: number; latest: number }
  estimatedFinish: { earliest: number; latest: number }
  availableMinutes: number
  selectedIds: string[]
  orderedIds: string[]
  excludedVisitedIds: string[]
  stops: PlannedStop<Stop>[]
  breaks: PlannedBreak[]
  totals: PlanTotals
  overBudget: boolean
  budgetComparison: 'upper-estimate'
  suggestedIds?: string[]
  suggestion?: { ids: string[]; breakIds: string[]; durationMinutes: MinuteRange; estimatedFinish: TimeWindow }
  orderMode: 'fastest' | 'nearest'
  transport: Transport
  returnToOrigin: boolean
  endLabel: 'Return home' | 'Last stop'
  evaluatedOrders: number
  estimateKind: 'model-estimate'
  label: 'Optimized estimate'
  optimization: 'nearest-neighbour-geographic' | 'exact-estimated-duration' | 'bounded-estimated-duration'
  uncertainty: string
}

function midpoint(range: MinuteRange): number {
  return (range.min + range.max) / 2
}

export function orderNearestFirst<Stop extends Coordinate & { id: string }>(pandals: readonly Stop[], origin: Coordinate): Stop[] {
  if (!isCoordinate(origin)) throw new RangeError('Invalid coordinate')
  const remaining = [...pandals]
  const ordered: Stop[] = []
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

export function planRoute(input: PlanInput): RoutePlan
export function planRoute(input: PlanInput<JourneyStop>): RoutePlan<JourneyStop>
export function planRoute(input: PlanInput<JourneyStop>): RoutePlan<JourneyStop> {
  const origin = input.origin ?? DEFAULT_ORIGIN
  if (!isCoordinate(origin) || typeof origin.name !== 'string' || !origin.name.trim()) {
    throw new RangeError('Choose a named origin or an explicit landmark')
  }
  const returnOrigin = input.returnOrigin ?? origin
  if (!isCoordinate(returnOrigin) || typeof returnOrigin.name !== 'string' || !returnOrigin.name.trim()
    || (input.orderMode !== undefined && !['fastest', 'nearest'].includes(input.orderMode))
    || (input.returnToOrigin !== undefined && typeof input.returnToOrigin !== 'boolean')) {
    throw new RangeError('Invalid return origin or order mode')
  }
  getIstHour(input.departureTimestamp)
  if (input.departureTimestamp < 0 || !Number.isFinite(input.availableMinutes)
    || input.availableMinutes < 0 || input.availableMinutes > 1_440
    || !['steady', 'relaxed'].includes(input.pace)
    || !['balanced', 'walk', 'less-walking'].includes(input.preference)
    || (input.transport !== undefined && !['personal', 'public', 'walk'].includes(input.transport))
    || (input.roadContext !== undefined && !['urban', 'rural'].includes(input.roadContext))
    || [input.activeDwellRemainingMinutes ?? 0, input.activeBreakRemainingMinutes ?? 0]
      .some((minutes) => !Number.isFinite(minutes) || minutes < 0 || minutes > 1_440)) {
    throw new RangeError('Invalid plan settings')
  }
  if (input.pandals.length > MAX_PLAN_STOPS) throw new RangeError('A plan supports at most 12 stops')
  const ids = new Set<string>()
  for (const pandal of input.pandals) {
    if (!pandal.id || ids.has(pandal.id) || !isCoordinate(pandal)
      || !Number.isFinite(pandal.visitMinutes) || pandal.visitMinutes < 0 || pandal.visitMinutes > 240
      || (pandal.kind !== undefined && !['pandal', 'restaurant', 'sight'].includes(pandal.kind))
      || (pandal.kind === undefined && ![1, 2, 3].includes(pandal.popularity!))
      || (pandal.popularity !== undefined && ![1, 2, 3].includes(pandal.popularity))
      || (pandal.queueMinutes !== undefined && (!Number.isFinite(pandal.queueMinutes.min)
        || !Number.isFinite(pandal.queueMinutes.max) || pandal.queueMinutes.min < 0
        || pandal.queueMinutes.max < pandal.queueMinutes.min || pandal.queueMinutes.max > 1_440))) {
      throw new RangeError('Invalid or duplicate pandal')
    }
    ids.add(pandal.id)
  }
  const avoided = new Set(input.avoidedVisited ?? [])
  const excludedVisitedIds = input.pandals.filter((pandal) => avoided.has(pandal.id)).map((pandal) => pandal.id)
  const pending = input.pandals.filter((pandal) => !avoided.has(pandal.id))
  const locked = input.lockedNextStopId === undefined ? undefined : pending.find((stop) => stop.id === input.lockedNextStopId)
  if (input.lockedNextStopId !== undefined && !locked) throw new RangeError('Locked destination must be a pending stop')
  const movable = pending.filter((stop) => stop !== locked).sort((first, second) => first.id.localeCompare(second.id, 'en'))
  const prefix = locked ? [locked] : []
  const scheduleStart = input.scheduleStartTimestamp ?? input.departureTimestamp
  getIstHour(scheduleStart)
  if (scheduleStart < 0 || scheduleStart > input.departureTimestamp) throw new RangeError('Invalid break schedule origin')
  const breakIds = new Set<string>()
  if ((input.breaks?.length ?? 0) > 24) throw new RangeError('Too many breaks')
  for (const pause of input.breaks ?? []) {
    if (!pause.id || breakIds.has(pause.id) || !Number.isFinite(pause.minutes) || pause.minutes < 0 || pause.minutes > 240
      || (pause.afterStopId !== undefined && (!pause.afterStopId || (!ids.has(pause.afterStopId) && !avoided.has(pause.afterStopId))))
      || (pause.afterMinutes !== undefined && (!Number.isFinite(pause.afterMinutes) || pause.afterMinutes < 0 || pause.afterMinutes > 1_440))
      || (pause.afterStopId !== undefined && pause.afterMinutes !== undefined)
      || (pause.place !== undefined && (!isCoordinate(pause.place) || typeof pause.place.name !== 'string' || !pause.place.name.trim()))) {
      throw new RangeError('Invalid or duplicate break')
    }
    breakIds.add(pause.id)
  }
  const consumedBreaks = new Set([...(input.completedBreakIds ?? []), ...(input.skippedBreakIds ?? [])])
  const breaks = (input.breaks ?? []).filter((pause) => !consumedBreaks.has(pause.id))
  const estimateLeg = input.legEstimator ?? createLegEstimator(input.metroStations)
  const legCache = new Map<string, LegOptions>()
  function legOptions(from: Coordinate, to: Coordinate, departureTimestamp: number): LegOptions {
    const timeKey = input.legEstimator ? departureTimestamp : Math.floor((departureTimestamp + 19_800_000) / 3_600_000)
    const key = `${from.lat},${from.lng}:${to.lat},${to.lng}:${timeKey}`
    let options = legCache.get(key)
    if (!options) {
      const request: LegRequest = {
        from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng },
        departureTimestamp, pace: input.pace, preference: input.preference,
        transport: input.transport ?? 'public', roadContext: input.roadContext,
      }
      options = structuredClone(validateLegOptions(estimateLeg(request), request))
      for (const leg of [options.recommended, ...options.alternatives]) {
        leg.provenance ??= input.legEstimator ? 'provided-matrix' : 'geographic-model'
        leg.transport ??= input.transport ?? 'public'
      }
      legCache.set(key, options)
    }
    return options
  }
  const reports = new Map<string, CrowdReport>()
  for (const report of input.crowdReports ?? []) {
    if (!Number.isFinite(report.reportedAt) || report.reportedAt > input.departureTimestamp) continue
    const previous = reports.get(report.pandalId)
    if (!previous || previous.reportedAt < report.reportedAt) reports.set(report.pandalId, report)
  }

  const queueCache = new Map<string, QueueEstimate>()
  function queueAt(stop: JourneyStop, arrivalTimestamp: number): QueueEstimate {
    const report = reports.get(stop.id)
    const key = `${stop.id}:${Math.floor((arrivalTimestamp + 19_800_000) / 3_600_000)}:${isFreshCrowdReport(report, stop.id, arrivalTimestamp)}`
    let queue = queueCache.get(key)
    if (!queue) {
      queue = (!stop.kind || stop.kind === 'pandal') && stop.popularity !== undefined
        ? estimateCrowd({ id: stop.id, popularity: stop.popularity! }, arrivalTimestamp, report)
        : {
          level: 'unknown', queueMinutes: { ...(stop.queueMinutes ?? { min: 0, max: 0 }) },
          basis: stop.queueMinutes ? 'provided' : 'unspecified', istHour: getIstHour(arrivalTimestamp),
          label: stop.queueMinutes ? 'Supplied queue allowance' : 'Queue unknown; no allowance supplied',
          uncertainty: 'No pandal crowd model is applied to this place. A zero allowance is not evidence of no wait. No reservation or booking is made.',
        }
      queueCache.set(key, queue)
    }
    return queue
  }

  function evaluate(order: readonly JourneyStop[]) {
    let clock = input.departureTimestamp
    let earliest = clock
    let latest = clock
    let position: Coordinate = origin
    const stops: PlannedStop<JourneyStop>[] = []
    const plannedBreaks: PlannedBreak[] = []
    const totals: PlanTotals = {
      travelMinutes: { min: 0, max: 0 },
      queueMinutes: { min: 0, max: 0 },
      visitMinutes: 0,
      breakMinutes: input.activeBreakRemainingMinutes ?? 0,
      activeDwellMinutes: input.activeDwellRemainingMinutes ?? 0,
      durationMinutes: { min: 0, max: 0 },
      estimatedMinutes: 0,
      walkMetres: 0,
      walkKm: 0,
    }
    function wait(minutes: number) {
      clock += minutes * 60_000
      earliest += minutes * 60_000
      latest += minutes * 60_000
    }
    wait(totals.activeDwellMinutes + totals.breakMinutes)
    function travel(to: Coordinate) {
      const options = legOptions(position, to, clock)
      const leg = options.recommended
      clock += midpoint(leg.durationMinutes) * 60_000
      earliest += leg.durationMinutes.min * 60_000
      latest += leg.durationMinutes.max * 60_000
      totals.travelMinutes.min += leg.durationMinutes.min
      totals.travelMinutes.max += leg.durationMinutes.max
      totals.walkMetres += leg.walkMetres
      position = to
      return options
    }
    const dueBreaks = breaks.filter((pause) => !pause.afterStopId
      || order.some((stop) => stop.id === pause.afterStopId) || avoided.has(pause.afterStopId))
    const appliedBreaks = new Set<string>()
    function applyBreaks(afterStopId?: string, finishing = false) {
      let applied = true
      while (applied) {
        applied = false
        for (const pause of dueBreaks) {
          if (appliedBreaks.has(pause.id)) continue
          const due = pause.afterStopId
            ? pause.afterStopId === afterStopId || (afterStopId === undefined && avoided.has(pause.afterStopId))
            : finishing || clock >= scheduleStart + (pause.afterMinutes ?? 0) * 60_000
          if (!due) continue
          appliedBreaks.add(pause.id)
          const leg = pause.place && haversineMetres(position, pause.place) > 0 ? travel(pause.place).recommended : undefined
          const startTimestamp = clock
          const startWindow = { earliest, latest }
          wait(pause.minutes)
          totals.breakMinutes += pause.minutes
          plannedBreaks.push({ id: pause.id, minutes: pause.minutes, startTimestamp, endTimestamp: clock,
            startWindow, endWindow: { earliest, latest }, leg,
            ...(pause.place ? { place: { name: pause.place.name, lat: pause.place.lat, lng: pause.place.lng } } : {}) })
          applied = true
        }
      }
    }
    if (!locked) applyBreaks()
    for (const pandal of order) {
      const options = travel(pandal)
      const leg = options.recommended
      const arrivalTimestamp = clock
      const arrivalWindow = { earliest, latest }
      const crowd = queueAt(pandal, arrivalTimestamp)
      const visitMinutes = Math.ceil(pandal.visitMinutes * (input.pace === 'relaxed' && pandal.kind !== 'restaurant' ? 1.25 : 1))
      clock = arrivalTimestamp + (midpoint(crowd.queueMinutes) + visitMinutes) * 60_000
      earliest = arrivalWindow.earliest + (crowd.queueMinutes.min + visitMinutes) * 60_000
      latest = arrivalWindow.latest + (crowd.queueMinutes.max + visitMinutes) * 60_000
      stops.push({
        pandalId: pandal.id, kind: pandal.kind ?? 'pandal', arrivalTimestamp, arrivalWindow, departureTimestamp: clock,
        departureWindow: { earliest, latest }, leg, alternatives: options.alternatives, crowd, queue: crowd, visitMinutes,
      })
      totals.queueMinutes.min += crowd.queueMinutes.min
      totals.queueMinutes.max += crowd.queueMinutes.max
      totals.visitMinutes += visitMinutes
      applyBreaks(pandal.id)
      if (pandal.id === locked?.id) applyBreaks()
    }
    applyBreaks(undefined, true)
    let homeLeg: LegEstimate | undefined
    if (input.returnToOrigin !== false && haversineMetres(position, returnOrigin) > 0) {
      homeLeg = travel(returnOrigin).recommended
    }
    totals.durationMinutes = {
      min: totals.travelMinutes.min + totals.queueMinutes.min + totals.visitMinutes + totals.breakMinutes + totals.activeDwellMinutes,
      max: totals.travelMinutes.max + totals.queueMinutes.max + totals.visitMinutes + totals.breakMinutes + totals.activeDwellMinutes,
    }
    totals.estimatedMinutes = midpoint(totals.durationMinutes)
    totals.walkKm = totals.walkMetres / 1_000
    return { order: [...order], stops, breaks: plannedBreaks, totals, finishTimestamp: clock, homeLeg,
      estimatedFinish: { earliest, latest } }
  }

  type Evaluation = ReturnType<typeof evaluate>
  const evaluations = new Map<string, Evaluation>()
  const orderKey = (order: readonly JourneyStop[]) => JSON.stringify(order.map((stop) => stop.id))
  function assess(order: readonly JourneyStop[]): Evaluation | undefined {
    const key = orderKey(order)
    const known = evaluations.get(key)
    if (known) return known
    if (evaluations.size >= MAX_ROUTE_EVALUATIONS) return undefined
    const result = evaluate(order)
    evaluations.set(key, result)
    return result
  }
  function compare(first: Evaluation, second: Evaluation): number {
    return first.totals.estimatedMinutes - second.totals.estimatedMinutes
      || first.totals.durationMinutes.max - second.totals.durationMinutes.max
      || orderKey(first.order).localeCompare(orderKey(second.order), 'en')
  }
  const nearest = [...prefix, ...orderNearestFirst(movable, locked ?? origin)]
  let best = assess(nearest)!
  if (input.orderMode !== 'nearest' && movable.length <= 5) {
    function search(selected: JourneyStop[], remaining: JourneyStop[]) {
      if (!remaining.length) {
        const candidate = assess(selected)!
        if (compare(candidate, best) < 0) best = candidate
        return
      }
      remaining.forEach((stop, index) => search([...selected, stop], remaining.filter((_, other) => other !== index)))
    }
    search(prefix, movable)
  } else if (input.orderMode !== 'nearest') {
    const farthest: JourneyStop[] = [...prefix]
    const remaining = [...movable]
    let position: Coordinate = locked ?? origin
    while (remaining.length) {
      remaining.sort((first, second) => haversineMetres(position, second) - haversineMetres(position, first)
        || first.id.localeCompare(second.id, 'en'))
      const stop = remaining.shift()!
      farthest.push(stop)
      position = stop
    }
    const seeds = [nearest, [...prefix, ...nearest.slice(prefix.length).reverse()], farthest,
      ...movable.map((first) => [...prefix, first, ...orderNearestFirst(movable.filter((stop) => stop !== first), first)])]
    const greedy = [...prefix]
    const unchosen = [...movable]
    while (unchosen.length) {
      const choices = unchosen.map((stop) => assess([...greedy, stop])!).sort(compare)
      const next = choices[0].order[choices[0].order.length - 1]
      greedy.push(next)
      unchosen.splice(unchosen.indexOf(next), 1)
    }
    seeds.push(greedy)
    const starts = seeds.map((seed) => assess(seed)!).sort(compare).slice(0, 3)
    for (const start of starts) {
      let current = start
      let attempts = 0
      while (attempts < 350 && evaluations.size < MAX_ROUTE_EVALUATIONS) {
        let improved = current
        for (let from = prefix.length; from < current.order.length; from += 1) {
          for (let to = prefix.length; to < current.order.length; to += 1) {
            if (from === to || attempts >= 350) continue
            const relocated = [...current.order]
            relocated.splice(to, 0, relocated.splice(from, 1)[0])
            const options = [relocated]
            if (from < to) options.push([...current.order.slice(0, from), ...current.order.slice(from, to + 1).reverse(), ...current.order.slice(to + 1)])
            for (const order of options) {
              if (attempts >= 350) break
              attempts += 1
              const candidate = assess(order)
              if (candidate && compare(candidate, improved) < 0) improved = candidate
            }
          }
        }
        if (compare(improved, current) >= 0) break
        current = improved
      }
      if (compare(current, best) < 0) best = current
    }
  }
  const overBudget = best.totals.durationMinutes.max > input.availableMinutes
  let suggestion: RoutePlan<JourneyStop>['suggestion']
  if (overBudget) {
    for (let count = best.order.length - 1; count >= (locked ? 1 : 0); count -= 1) {
      const candidate = evaluate(best.order.slice(0, count))
      if (candidate.totals.durationMinutes.max <= input.availableMinutes) {
        suggestion = { ids: candidate.order.map((stop) => stop.id), breakIds: candidate.breaks.map((pause) => pause.id),
          durationMinutes: candidate.totals.durationMinutes, estimatedFinish: candidate.estimatedFinish }
        break
      }
    }
  }
  return {
    origin: { name: origin.name, lat: origin.lat, lng: origin.lng },
    departureTimestamp: input.departureTimestamp,
    finishTimestamp: best.finishTimestamp,
    returnOrigin: { name: returnOrigin.name, lat: returnOrigin.lat, lng: returnOrigin.lng },
    homeLeg: best.homeLeg,
    ...(input.returnToOrigin !== false ? { returnArrivalWindow: best.estimatedFinish } : {}),
    estimatedFinish: best.estimatedFinish,
    availableMinutes: input.availableMinutes,
    selectedIds: input.pandals.map((pandal) => pandal.id),
    orderedIds: best.order.map((pandal) => pandal.id),
    excludedVisitedIds,
    stops: best.stops,
    breaks: best.breaks,
    totals: best.totals,
    overBudget,
    budgetComparison: 'upper-estimate',
    ...(suggestion ? { suggestedIds: suggestion.ids, suggestion } : {}),
    orderMode: input.orderMode ?? 'fastest',
    transport: input.transport ?? 'public',
    returnToOrigin: input.returnToOrigin !== false,
    endLabel: input.returnToOrigin !== false ? 'Return home' : 'Last stop',
    evaluatedOrders: evaluations.size,
    estimateKind: 'model-estimate',
    label: 'Optimized estimate',
    optimization: input.orderMode === 'nearest' ? 'nearest-neighbour-geographic'
      : movable.length <= 5 ? 'exact-estimated-duration' : 'bounded-estimated-duration',
    uncertainty: 'Model-estimated journey duration, not a globally shortest real-world route. Actual road navigation is separate. Queues and travel are recalculated at sequential midpoint arrivals; ranges are approximate, not guarantees. Scheduled breaks begin at stop boundaries, before returning home at the latest. Return travel is included unless explicitly disabled. The budget flag compares the upper total; suggestions include their return leg and never remove selected stops. Default origin is a landmark, not device location. Confirm service, parking and closures locally; no live traffic or bus timetable is supplied.',
  }
}