import { describe, expect, it } from 'vitest'
import { streetRouteProgress } from '../../src/domain/streets'
import { formatTripClock } from '../../src/i18n'
import { foodDetour } from '../../src/components/TripPanel'
import { ALL_PLACES } from '../../src/data/regions'

describe('generic geometric car progress and trip presentation', () => {
  it('tracks car step indices including roundabouts without a walking-route cast', () => {
    const route = { geometry: [{ lat: 23.55, lng: 87.31 }, { lat: 23.551, lng: 87.31 }, { lat: 23.552, lng: 87.31 }],
      cumulativeMetres: [0, 111, 222], metres: 222,
      steps: [{ endGeometryIndex: 1, maneuver: 'enter-roundabout' }, { endGeometryIndex: 2, maneuver: 'exit-roundabout' }] }
    expect(streetRouteProgress(route, route.geometry[1]).stepIndex).toBe(1)
    expect(streetRouteProgress(route, route.geometry[2]).status).toBe('arrived')
    expect(streetRouteProgress(route, route.geometry[1], 0, 100).status).toBe('uncertain')
  })

  it('includes the date when a return estimate crosses an IST day boundary', () => {
    const start = Date.parse('2026-10-18T23:00:00+05:30')
    expect(formatTripClock('en', start + 2 * 3_600_000, start)).toMatch(/19/)
    expect(formatTripClock('bn', start + 2 * 3_600_000, start)).toMatch(/১৯/)
  })

  it('labels food detours as approximate distance when no real matrix is available', () => {
    const food = ALL_PLACES.find((place) => place.kind === 'restaurant')!
    const detour = foodDetour(food, { ...food, lat: food.lat + 0.01 }, { ...food, lng: food.lng + 0.01 }, 1_000, null)
    expect(detour.minutes).toBeNull()
    expect(detour.metres).toBeGreaterThanOrEqual(0)
    expect(food.visitMinutes).toBe(45)
  })
})