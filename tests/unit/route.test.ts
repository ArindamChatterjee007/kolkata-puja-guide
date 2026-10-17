import { describe, expect, it } from 'vitest'
import { DEFAULT_ORIGIN, orderNearestFirst, planRoute } from '../../src/domain/route'
import type { PlanInput } from '../../src/domain/route'
import { haversineMetres } from '../../src/domain/geo'
import type { Pandal } from '../../src/types'

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
    pandals, metroStations: [], preference: 'walk', pace: 'steady',
    departureTimestamp: Date.parse('2026-10-13T04:30:00Z'), availableMinutes: 600,
  }
}

describe('itinerary planning', () => {
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