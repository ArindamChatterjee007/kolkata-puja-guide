import { describe, expect, it } from 'vitest'
import { DEFAULT_ORIGIN, MAX_ROUTE_EVALUATIONS, orderNearestFirst, planRoute } from '../../src/domain/route'
import type { PlanInput } from '../../src/domain/route'
import { haversineMetres } from '../../src/domain/geo'
import { estimateCrowd, getIstHour } from '../../src/domain/crowd'
import type { JourneyStop, Pandal } from '../../src/types'
import type { LegEstimator, LegRequest } from '../../src/domain/travel'

function pandal(id: string, lat = DEFAULT_ORIGIN.lat, popularity: 1 | 2 | 3 = 1): Pandal {
  return {
    id, name: id, nameBn: '', zone: 'Central', lat, lng: DEFAULT_ORIGIN.lng,
    address: 'Synthetic fixture', description: '', descriptionBn: '', highlight: '', highlightBn: '',
    popularity, visitMinutes: 15, sourceUrl: 'https://example.org', sourceLabel: 'Test fixture',
    verifiedOn: '2026-10-13', coordinateAccuracy: 'approximate',
  }
}

function input(pandals: Pandal[] = []): PlanInput {
  return {
    pandals, metroStations: [], preference: 'walk', pace: 'steady', orderMode: 'nearest',
    departureTimestamp: Date.parse('2026-10-13T04:30:00Z'), availableMinutes: 600,
  }
}

function matrixEstimator(cost: (request: LegRequest) => number, spread = 0): LegEstimator {
  return (request) => {
    const minutes = cost(request)
    const leg = {
      mode: 'road' as const, durationMinutes: { min: minutes, max: minutes + spread },
      distanceMetres: haversineMetres(request.from, request.to), walkMetres: 0, walkKm: 0,
      geometry: [request.from, request.to], geometryKind: 'straight-connectors' as const,
      scoreMinutes: minutes, uncertainty: 'Synthetic matrix for unit tests; no actual traffic.',
    }
    return { recommended: leg, alternatives: [leg] }
  }
}

function permutations<Stop>(stops: Stop[]): Stop[][] {
  return stops.length === 0 ? [[]] : stops.flatMap((stop, index) =>
    permutations(stops.filter((_, other) => index !== other)).map((rest) => [stop, ...rest]))
}

describe('itinerary planning', () => {
  it('defaults to the faster complete journey when the farther stop has a costly return', () => {
    const near = pandal('near', DEFAULT_ORIGIN.lat + 0.001)
    const far = pandal('far', DEFAULT_ORIGIN.lat + 0.01)
    const legEstimator = ({ from, to }: LegRequest) => {
      const minutes = from.lat === far.lat && to.lat === DEFAULT_ORIGIN.lat ? 100
        : from.lat === DEFAULT_ORIGIN.lat && to.lat === far.lat ? 5 : 1
      const leg = {
        mode: 'road' as const, durationMinutes: { min: minutes, max: minutes },
        distanceMetres: 100, walkMetres: 0, walkKm: 0, geometry: [from, to],
        geometryKind: 'straight-connectors' as const, scoreMinutes: minutes,
        uncertainty: 'Synthetic asymmetric travel matrix, not actual traffic.',
      }
      return { recommended: leg, alternatives: [leg] }
    }
    const settings = { ...input([near, far]), legEstimator }
    const nearest = planRoute(settings)
    const fastest = planRoute({ ...settings, orderMode: undefined })
    expect(nearest.orderedIds).toEqual(['near', 'far'])
    expect(fastest.orderedIds).toEqual(['far', 'near'])
    expect(fastest.totals.estimatedMinutes).toBeLessThan(nearest.totals.estimatedMinutes)
    expect(fastest.homeLeg?.durationMinutes).toEqual({ min: 1, max: 1 })
    expect(fastest.finishTimestamp).toBe((fastest.estimatedFinish.earliest + fastest.estimatedFinish.latest) / 2)
    expect(fastest.returnArrivalWindow).toEqual(fastest.estimatedFinish)
    expect(planRoute({ ...settings, orderMode: 'fastest', returnToOrigin: false }).orderedIds).toEqual(['near', 'far'])
  })

  it('includes returning from the live position with no pending stops and budgets that leg', () => {
    const origin = { name: 'Current position', lat: DEFAULT_ORIGIN.lat + 0.02, lng: DEFAULT_ORIGIN.lng }
    const plan = planRoute({ ...input(), origin, returnOrigin: DEFAULT_ORIGIN, availableMinutes: 1 })
    expect(plan.orderedIds).toEqual([])
    expect(plan.homeLeg).toBeDefined()
    expect(plan.totals.durationMinutes.min).toBeGreaterThan(0)
    expect(plan.returnOrigin).toEqual({ name: DEFAULT_ORIGIN.name, lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng })
    expect(plan.overBudget).toBe(true)
    expect(plan.suggestedIds).toBeUndefined()
    expect(plan.suggestion).toBeUndefined()
  })

  it('matches an independent exhaustive round-trip reference for up to four stops across departure times', () => {
    const selected = [pandal('alpha', 22.57, 3), pandal('beta', 22.58, 1), pandal('gamma', 22.56, 2), pandal('delta', 22.55, 1)]
    selected[0].visitMinutes = 45
    const legEstimator = matrixEstimator(({ from, to, departureTimestamp }) =>
      Math.ceil(haversineMetres(from, to) / 250) + (getIstHour(departureTimestamp) >= 17 && to.lat < from.lat ? 18 : 2), 3)
    for (const departureTimestamp of [Date.parse('2026-10-13T04:30:00Z'), Date.parse('2026-10-13T10:55:00Z')]) {
      for (const count of [2, 3, 4]) {
        const choices = selected.slice(0, count)
        const candidates = permutations(choices).map((order) => {
          let clock = departureTimestamp
          let position = { lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng }
          let upper = 0
          for (const stop of order) {
            const leg = legEstimator({ from: position, to: stop, departureTimestamp: clock, pace: 'steady', preference: 'balanced' }).recommended
            clock += (leg.durationMinutes.min + leg.durationMinutes.max) / 2 * 60_000
            const queue = estimateCrowd(stop, clock).queueMinutes
            clock += ((queue.min + queue.max) / 2 + stop.visitMinutes) * 60_000
            upper += leg.durationMinutes.max + queue.max + stop.visitMinutes
            position = stop
          }
          const home = legEstimator({ from: position, to: DEFAULT_ORIGIN, departureTimestamp: clock, pace: 'steady', preference: 'balanced' }).recommended
          clock += (home.durationMinutes.min + home.durationMinutes.max) / 2 * 60_000
          return { ids: order.map((stop) => stop.id), clock, upper: upper + home.durationMinutes.max }
        }).sort((first, second) => first.clock - second.clock || first.upper - second.upper
          || JSON.stringify(first.ids).localeCompare(JSON.stringify(second.ids), 'en'))
        const plan = planRoute({ ...input(choices), orderMode: 'fastest', departureTimestamp, legEstimator })
        expect(plan.orderedIds).toEqual(candidates[0].ids)
        expect(plan.finishTimestamp).toBe(candidates[0].clock)
        expect(plan.totals.durationMinutes.max).toBe(candidates[0].upper)
        expect(plan.optimization).toBe('exact-estimated-duration')
      }
    }
  })

  it('keeps the current destination locked while optimizing the remainder and preserving the original home', () => {
    const selected = [pandal('near', 22.57), pandal('far', 22.59), pandal('middle', 22.58)]
    const current = { name: 'Current position', lat: 22.575, lng: DEFAULT_ORIGIN.lng }
    const plan = planRoute({ ...input(selected), origin: current, returnOrigin: DEFAULT_ORIGIN,
      orderMode: 'fastest', lockedNextStopId: 'far', transport: 'personal',
      breaks: [{ id: 'rest', minutes: 5, place: { name: 'Rest place', lat: 22.55, lng: DEFAULT_ORIGIN.lng } }] })
    expect(plan.orderedIds[0]).toBe('far')
    expect(plan.stops[0].leg.geometry[0]).toEqual({ lat: current.lat, lng: current.lng })
    expect(plan.breaks[0].startTimestamp).toBeGreaterThanOrEqual(plan.stops[0].departureTimestamp)
    expect(new Set(plan.orderedIds)).toEqual(new Set(selected.map((stop) => stop.id)))
    expect(plan.homeLeg?.geometry.at(-1)).toEqual({ lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng })
    expect(plan.homeLeg?.transport).toBe('personal')
    expect(() => planRoute({ ...input(selected), lockedNextStopId: 'absent' })).toThrow('Locked destination')
  })

  it('includes break detours, elapsed schedule anchors and active dwell without reusing completed breaks', () => {
    const selected = [pandal('first'), pandal('second')]
    const place = { name: 'Break place', lat: 22.57, lng: DEFAULT_ORIGIN.lng }
    const settings = { ...input(selected), activeDwellRemainingMinutes: 7,
      scheduleStartTimestamp: input().departureTimestamp - 60 * 60_000,
      breaks: [{ id: 'rest', afterStopId: 'first', minutes: 12, place },
        { id: 'due', afterMinutes: 30, minutes: 5 }, { id: 'finished', minutes: 90 }, { id: 'skipped', minutes: 60 }],
      completedBreakIds: ['finished'], skippedBreakIds: ['skipped'], legEstimator: matrixEstimator(() => 2) }
    const plan = planRoute(settings)
    expect(plan.breaks.map((pause) => pause.id)).toEqual(['due', 'rest'])
    expect(plan.breaks[0].startTimestamp).toBe(plan.departureTimestamp + 7 * 60_000)
    expect(plan.breaks[1].leg?.geometry.at(-1)).toEqual({ lat: place.lat, lng: place.lng })
    expect(plan.stops[1].arrivalTimestamp).toBe(plan.breaks[1].endTimestamp + 2 * 60_000)
    expect(plan.totals.breakMinutes).toBe(17)
    expect(plan.totals.activeDwellMinutes).toBe(7)
    expect(plan.totals.estimatedMinutes).toBe((plan.finishTimestamp - plan.departureTimestamp) / 60_000)
    expect(plan.totals.durationMinutes.max).toBe(plan.totals.travelMinutes.max + plan.totals.queueMinutes.max
      + plan.totals.visitMinutes + 17 + 7)
    expect(plan.breaks[1].startWindow.latest).toBeGreaterThanOrEqual(plan.breaks[1].startWindow.earliest)
  })

  it('supports city-specific places with fixed meal time and no fabricated pandal crowd', () => {
    const meal: JourneyStop = { ...pandal('meal', 23.685), lng: 86.975, city: 'asansol', kind: 'restaurant',
      zone: 'Local district', popularity: undefined, visitMinutes: 40 }
    const sight: JourneyStop = { ...meal, id: 'sight', kind: 'sight', queueMinutes: { min: 2, max: 6 }, visitMinutes: 10 }
    const plan = planRoute({ ...input(), pandals: [meal, sight], origin: { name: 'City origin', lat: meal.lat, lng: meal.lng },
      pace: 'relaxed', orderMode: 'fastest' })
    expect(plan.stops.find((stop) => stop.pandalId === 'meal')).toMatchObject({ kind: 'restaurant', visitMinutes: 40,
      queue: { level: 'unknown', basis: 'unspecified', queueMinutes: { min: 0, max: 0 } } })
    expect(plan.stops.find((stop) => stop.pandalId === 'sight')?.queue).toMatchObject({ level: 'unknown', basis: 'provided' })
    expect(plan.totals.queueMinutes).toEqual({ min: 2, max: 6 })
    expect(plan.stops[0].queue.uncertainty).toContain('No reservation')
  })

  it('only suggests a reduced selection when that prefix including home really fits', () => {
    const first = { ...pandal('first', 22.57), visitMinutes: 0 }
    const second = { ...pandal('second', 22.58), visitMinutes: 0 }
    const legEstimator = matrixEstimator(({ from, to }) => to.lat === DEFAULT_ORIGIN.lat
      ? from.lat === first.lat ? 20 : 5 : 1)
    const plan = planRoute({ ...input([first, second]), availableMinutes: 25, legEstimator })
    expect(plan.overBudget).toBe(true)
    expect(plan.suggestedIds).toEqual([])
    expect(plan.suggestion?.durationMinutes.max).toBeLessThanOrEqual(25)
    expect(plan.orderedIds).toEqual(['first', 'second'])
  })

  it('bounds large searches, keeps all twelve stops and is deterministic without mutating inputs', () => {
    const selected = Array.from({ length: 12 }, (_, index) => pandal(`stop-${index}`,
      DEFAULT_ORIGIN.lat + Math.sin(index) * 0.04, (index % 3 + 1) as 1 | 2 | 3))
    const settings = { ...input(selected), orderMode: 'fastest' as const, transport: 'personal' as const }
    const before = JSON.stringify(settings)
    const plan = planRoute(settings)
    expect(plan.optimization).toBe('bounded-estimated-duration')
    expect(plan.evaluatedOrders).toBeGreaterThan(12)
    expect(plan.evaluatedOrders).toBeLessThanOrEqual(MAX_ROUTE_EVALUATIONS)
    expect(plan.orderedIds).toHaveLength(12)
    expect(plan.totals.estimatedMinutes).toBeLessThanOrEqual(planRoute({ ...settings, orderMode: 'nearest' }).totals.estimatedMinutes)
    expect(planRoute(settings)).toEqual(plan)
    expect(JSON.stringify(settings)).toBe(before)
  })

  it('rejects invalid schedules, dwell values and injected legs before using their costs', () => {
    const settings = input([pandal('first', 22.57)])
    expect(() => planRoute({ ...settings, activeDwellRemainingMinutes: -1 })).toThrow(RangeError)
    expect(() => planRoute({ ...settings, breaks: [{ id: 'break', minutes: -1 }] })).toThrow(RangeError)
    expect(() => planRoute({ ...settings, breaks: [{ id: 'break', minutes: 5, afterStopId: 'missing' }] })).toThrow(RangeError)
    expect(() => planRoute({ ...settings, legEstimator: matrixEstimator(() => NaN) })).toThrow(RangeError)
  })

  it('starts at an explicit approximate landmark and handles an empty plan', () => {
    const plan = planRoute(input())
    expect(plan.origin.name).toContain('Esplanade')
    expect(plan.origin.name).toContain('landmark')
    expect(plan.orderedIds).toEqual([])
    expect(plan.totals.durationMinutes).toEqual({ min: 0, max: 0 })
    expect(plan.overBudget).toBe(false)
    expect(plan.finishTimestamp).toBe(plan.departureTimestamp)
  })

  it('keeps all stops on an over-budget plan and separates a conservative suggestion', () => {
    const settings = { ...input([pandal('first'), pandal('second')]), availableMinutes: 30 }
    const plan = planRoute(settings)
    expect(new Set(plan.orderedIds)).toEqual(new Set(['first', 'second']))
    expect(plan.overBudget).toBe(true)
    expect(plan.budgetComparison).toBe('upper-estimate')
    expect(plan.suggestedIds).toEqual([plan.orderedIds[0]])
    expect(plan.totals.durationMinutes.max).toBe(plan.totals.travelMinutes.max
      + plan.totals.queueMinutes.max + plan.totals.visitMinutes)
    expect(planRoute({ ...settings, availableMinutes: 1 }).suggestedIds).toEqual([])
  })

  it('orders a simple corridor deterministically without changing the selected objects', () => {
    const selected = [pandal('far', 22.58), pandal('near', 22.566), pandal('middle', 22.572)]
    const snapshot = JSON.stringify(selected)
    const plan = planRoute(input(selected))
    expect(plan.orderedIds).toEqual(['near', 'middle', 'far'])
    expect(planRoute(input(selected))).toEqual(plan)
    expect(JSON.stringify(selected)).toBe(snapshot)
    expect(plan.label).toBe('Optimized estimate')
    expect(plan.uncertainty).toContain('not a globally shortest')
  })

  it('recalculates queue conditions sequentially across the IST evening boundary', () => {
    const selected = [pandal('first', DEFAULT_ORIGIN.lat, 2), pandal('second', DEFAULT_ORIGIN.lat, 2)]
    selected.forEach((stop) => { stop.visitMinutes = 30 })
    const plan = planRoute({ ...input(selected), departureTimestamp: Date.parse('2026-10-13T11:10:00Z') })
    expect(plan.stops[0].crowd.istHour).toBe(16)
    expect(plan.stops[0].crowd.level).toBe('moderate')
    expect(plan.stops[1].crowd.istHour).toBe(17)
    expect(plan.stops[1].crowd.level).toBe('heavy')
    expect(plan.stops[1].arrivalTimestamp).toBe(plan.stops[0].departureTimestamp)
    expect(plan.stops[1].arrivalWindow.latest).toBe(plan.stops[0].departureWindow.latest)
    const relaxed = planRoute({ ...input(selected), pace: 'relaxed' })
    expect(relaxed.totals.visitMinutes).toBeGreaterThan(plan.totals.visitMinutes)
  })

  it('visits the closest busy stop before a quieter farther stop for every travel preference', () => {
    const closest = { ...pandal('busy', 22.565, 3), visitMinutes: 200 }
    const farther = { ...pandal('quiet', 22.566), visitMinutes: 0 }
    for (const preference of ['walk', 'balanced', 'less-walking'] as const) {
      const plan = planRoute({
        ...input([farther, closest]), preference,
        departureTimestamp: Date.parse('2026-10-13T13:30:00Z'),
      })
      expect(plan.orderedIds).toEqual(['busy', 'quiet'])
      expect(plan.optimization).toBe('nearest-neighbour-geographic')
      expect(plan.stops[1].arrivalTimestamp).toBeGreaterThanOrEqual(plan.stops[0].departureTimestamp)
    }
  })

  it('chooses the nearest unvisited stop at every hop from the supplied southern origin', () => {
    const selected = [pandal('north', 22.58), pandal('south', 22.52, 3),
      pandal('middle', 22.55), pandal('visited', 22.519), pandal('west', 22.535)]
    selected[4] = { ...selected[4], lng: 88.33 }
    const origin = { name: 'Southern fixture', lat: 22.518, lng: 88.3519 }
    const snapshot = JSON.stringify(selected)
    const plan = planRoute({ ...input(selected), origin, avoidedVisited: ['visited'] })
    expect(plan.orderedIds[0]).toBe('south')
    expect(plan.origin).toEqual(origin)
    const remaining = selected.filter((stop) => stop.id !== 'visited')
    let position = origin
    for (const id of plan.orderedIds) {
      const next = remaining.find((stop) => stop.id === id)!
      for (const candidate of remaining) {
        expect(haversineMetres(position, next)).toBeLessThanOrEqual(haversineMetres(position, candidate))
      }
      remaining.splice(remaining.indexOf(next), 1)
      position = next
    }
    expect(remaining).toEqual([])
    expect(JSON.stringify(selected)).toBe(snapshot)
  })

  it('breaks equal-distance ties by id without mutating caller order', () => {
    const selected = [pandal('zeta'), pandal('alpha'), pandal('middle')]
    expect(orderNearestFirst(selected, DEFAULT_ORIGIN).map((stop) => stop.id)).toEqual(['alpha', 'middle', 'zeta'])
    expect(selected.map((stop) => stop.id)).toEqual(['zeta', 'alpha', 'middle'])
    expect(orderNearestFirst([], DEFAULT_ORIGIN)).toEqual([])
  })

  it('supports twelve stops and explicit visited exclusions without mutating history', () => {
    const selected = Array.from({ length: 12 }, (_, index) => pandal(`stop-${index}`, 22.565 + index * 0.001))
    const history = [{ pandalId: selected[2].id, at: 1_790_000_000_000, method: 'manual' as const }]
    const original = JSON.stringify(history)
    const avoidedVisited = history.map((visit) => visit.pandalId)
    const plan = planRoute({ ...input(selected), avoidedVisited })
    expect(plan.selectedIds).toHaveLength(12)
    expect(plan.orderedIds).toHaveLength(11)
    expect(plan.excludedVisitedIds).toEqual([selected[2].id])
    expect(JSON.stringify(history)).toBe(original)
    expect(avoidedVisited).toEqual([selected[2].id])
    expect(planRoute(input(selected)).orderedIds).toHaveLength(12)
  })

  it('rejects too many stops, duplicates, invalid clocks and non-finite budgets', () => {
    expect(() => planRoute(input(Array.from({ length: 13 }, (_, index) => pandal(`stop-${index}`))))).toThrow('at most 12')
    expect(() => planRoute(input([pandal('same'), pandal('same')]))).toThrow('duplicate')
    expect(() => planRoute({ ...input(), departureTimestamp: NaN })).toThrow(RangeError)
    expect(() => planRoute({ ...input(), availableMinutes: Infinity })).toThrow(RangeError)
    expect(() => planRoute({ ...input(), origin: { name: '', lat: 22.5, lng: 88.3 } })).toThrow(RangeError)
  })
})