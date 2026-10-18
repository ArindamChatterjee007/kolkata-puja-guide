import { describe, expect, it } from 'vitest'
import { arriveAtStop, completeTrip, createTrip, endTripBreak, estimateRemainingTrip, getTripProgress,
  isTripState, leaveStop, pauseTrip, restoreTrip, resumeTrip, skipTripBreak, startTrip, startTripBreak,
  unvisitTripStop } from '../../src/domain/trip'
import type { RemainingTripInput, TripHome } from '../../src/domain/trip'
import type { JourneyStop } from '../../src/types'

const start = Date.parse('2026-10-18T02:30:00Z')
const minute = 60_000
const home: TripHome = { kind: 'coordinate', location: { name: 'Explicit home', lat: 23.52, lng: 87.31 } }
const stop: JourneyStop = {
  id: 'meal', name: 'Synthetic meal place', nameBn: '', city: 'durgapur', kind: 'restaurant', lat: 23.525, lng: 87.32,
  address: 'Fixture', description: '', descriptionBn: '', highlight: '', highlightBn: '', visitMinutes: 30,
  sourceUrl: 'https://example.org', sourceLabel: 'Fixture', verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
}

function request(): RemainingTripInput {
  return { pandals: [stop], origin: { name: 'Live position', lat: stop.lat, lng: stop.lng },
    metroStations: [], preference: 'balanced', pace: 'steady', totalAvailableMinutes: 180 }
}

function running() {
  return startTrip(createTrip({ home, transport: 'personal' }, start), start, stop.id)
}

describe('pure trip lifecycle', () => {
  it('only starts on the explicit transition and uses absolute timestamps instead of timer ticks', () => {
    const idle = createTrip({ home }, start)
    expect(getTripProgress(idle, start + 10 * minute).elapsedMinutes).toBe(0)
    const state = startTrip(idle, start + 10 * minute, stop.id)
    const before = JSON.stringify(state)
    expect(getTripProgress(state, start + 20 * minute).elapsedActiveMinutes).toBe(10)
    expect(getTripProgress(state, start + 60 * minute).elapsedWallMinutes).toBe(50)
    expect(() => startTrip(state, start + 11 * minute)).toThrow(RangeError)
    expect(JSON.stringify(state)).toBe(before)
    expect(idle.status).toBe('idle')
  })

  it('freezes active time and dwell while paused but includes pauses in wall time and the return budget', () => {
    let state = arriveAtStop(running(), { stopId: stop.id, kind: 'restaurant', visitMinutes: 30 }, start + 2 * minute)
    state = pauseTrip(state, start + 7 * minute)
    const paused = getTripProgress(state, start + 17 * minute)
    expect(paused.elapsedActiveMinutes).toBe(7)
    expect(paused.elapsedWallMinutes).toBe(17)
    expect(paused.dwellRemainingMinutes).toBe(25)
    expect(paused.breakRemainingMinutes).toBe(25)
    expect(paused.finishAssumesImmediateResume).toBe(true)
    state = resumeTrip(state, start + 17 * minute)
    const progress = getTripProgress(state, start + 22 * minute)
    expect(progress.elapsedActiveMinutes).toBe(12)
    expect(progress.pausedMinutes).toBe(10)
    expect(progress.activities[0].visitConsumedMinutes).toBe(10)
    const plan = estimateRemainingTrip(state, request(), start + 22 * minute)
    expect(plan.availableMinutes).toBe(158)
    expect(plan.totals.activeDwellMinutes).toBe(20)
    expect(isTripState(state)).toBe(true)
  })

  it('marks arrival once yet retains queue and visit dwell until an explicit early departure', () => {
    const arrival = { stopId: stop.id, kind: 'restaurant' as const, visitMinutes: 30, queueMinutes: 5, method: 'auto' as const }
    const arrived = arriveAtStop(running(), arrival, start + 2 * minute)
    expect(arriveAtStop(arrived, arrival, start + 3 * minute)).toBe(arrived)
    const plan = estimateRemainingTrip(arrived, request(), start + 12 * minute)
    expect(plan.orderedIds).toEqual([])
    expect(plan.totals.activeDwellMinutes).toBe(25)
    expect(plan.totals.visitMinutes).toBe(0)
    expect(plan.homeLeg?.geometry.at(-1)).toEqual({ lat: home.location.lat, lng: home.location.lng })
    expect(getTripProgress(arrived, start + 12 * minute, plan).remainingEstimate).toEqual(plan.totals.durationMinutes)
    const left = leaveStop(arrived, start + 12 * minute)
    expect(estimateRemainingTrip(left, request(), start + 12 * minute).totals.activeDwellMinutes).toBe(0)
    expect(getTripProgress(left, start + 12 * minute).activities[0].visitConsumedMinutes).toBe(5)
    expect(left.activities[0].departedAt).toBe(start + 12 * minute)
    expect(JSON.stringify(left.activities)).not.toMatch(/"(?:lat|lng|accuracyMetres)"/)
  })

  it('restores validated plain data after offline time without resetting the clock or a paused deadline', () => {
    const state = arriveAtStop(running(), { stopId: stop.id, visitMinutes: 30 }, start + minute)
    const restored = restoreTrip(JSON.parse(JSON.stringify(state)), start + 60 * minute)
    expect(getTripProgress(restored, start + 60 * minute).elapsedMinutes).toBe(60)
    expect(getTripProgress(restored, start + 60 * minute).dwellRemainingMinutes).toBe(0)
    const paused = pauseTrip(state, start + 6 * minute)
    const restoredPaused = restoreTrip(JSON.parse(JSON.stringify(paused)), start + 60 * minute)
    expect(restoredPaused.status).toBe('paused')
    expect(getTripProgress(restoredPaused, start + 60 * minute).dwellRemainingMinutes).toBe(25)
    expect(resumeTrip(restoredPaused, start + 60 * minute).startedAt).toBe(start)
    expect(restored).not.toBe(state)
    expect(restored.home.location).not.toBe(state.home.location)
  })

  it('counts a running break only once, freezes it on pause and excludes completed or skipped IDs', () => {
    const breaks = [{ id: 'tea', minutes: 10 }, { id: 'skip', minutes: 50 }]
    let state = startTripBreak(running(), breaks[0], start + minute)
    state = skipTripBreak(state, 'skip', start + minute)
    const plan = estimateRemainingTrip(state, { ...request(), breaks }, start + 4 * minute)
    expect(plan.totals.breakMinutes).toBe(7)
    expect(plan.breaks).toEqual([])
    state = pauseTrip(state, start + 4 * minute)
    expect(getTripProgress(state, start + 14 * minute).breakRemainingMinutes).toBe(7)
    state = resumeTrip(state, start + 14 * minute)
    expect(getTripProgress(state, start + 16 * minute).breakRemainingMinutes).toBe(5)
    state = endTripBreak(state, start + 16 * minute)
    expect(state.completedBreakIds).toEqual(['tea'])
    expect(estimateRemainingTrip(state, { ...request(), breaks }, start + 16 * minute).totals.breakMinutes).toBe(0)
    expect(() => startTripBreak(state, breaks[0], start + 17 * minute)).toThrow(RangeError)
  })

  it('keeps an unplanned arrival separate from the locked destination and permits explicit unvisit', () => {
    let state = arriveAtStop(running(), { stopId: 'unplanned', visitMinutes: 10 }, start + minute)
    expect(state.lockedNextStopId).toBe(stop.id)
    expect(estimateRemainingTrip(state, request(), start + 2 * minute).orderedIds[0]).toBe(stop.id)
    state = unvisitTripStop(state, 'unplanned', start + 3 * minute)
    expect(state.activities).toEqual([])
    expect(getTripProgress(state, start + 3 * minute).dwellRemainingMinutes).toBe(0)
    expect(state.home).toEqual(home)
  })

  it('returns to the original home from the current position after every selected stop has arrived', () => {
    const arrived = arriveAtStop(running(), { stopId: stop.id, visitMinutes: 0 }, start + 20 * minute)
    const now = start + 30 * minute
    const plan = estimateRemainingTrip(arrived, { ...request(), totalAvailableMinutes: 31 }, now)
    expect(plan.orderedIds).toEqual([])
    expect(plan.origin).toEqual(request().origin)
    expect(plan.returnOrigin).toEqual(home.location)
    expect(plan.totals.durationMinutes.max).toBeGreaterThan(1)
    expect(plan.overBudget).toBe(true)
    expect(plan.suggestedIds).toBeUndefined()
    const progress = getTripProgress(arrived, now, plan)
    expect(progress.elapsedMinutes).toBe(30)
    expect(progress.remainingEstimate).toEqual(plan.totals.durationMinutes)
    expect(progress.finishWindow).toEqual(plan.estimatedFinish)
    expect(plan.finishTimestamp).toBeGreaterThan(now)
    expect(() => estimateRemainingTrip(arrived, { ...request(), origin: undefined as never }, now)).toThrow('explicit live origin')
  })

  it('ends only on an explicit completion and freezes completed clocks without claiming GPS arrival', () => {
    const paused = pauseTrip(running(), start + 5 * minute)
    const done = completeTrip(paused, start + 15 * minute)
    const progress = getTripProgress(done, start + 100 * minute)
    expect(progress.status).toBe('completed')
    expect(progress.elapsedWallMinutes).toBe(15)
    expect(progress.elapsedActiveMinutes).toBe(5)
    expect(progress.remainingEstimate).toEqual({ min: 0, max: 0 })
    expect(progress.finishWindow).toEqual({ earliest: start + 15 * minute, latest: start + 15 * minute })
    expect(isTripState(done)).toBe(true)
    expect(() => resumeTrip(done, start + 16 * minute)).toThrow(RangeError)
  })

  it('rejects invalid snapshots, clocks, duplicate activities and overlapping dwell or breaks', () => {
    const state = running()
    for (const changed of [{ ...state, startedAt: NaN }, { ...state, status: 'paused', pausedAt: null },
      { ...state, pausedTotalMs: -1 }, { ...state, gpsSamples: [] },
      { ...state, home: { kind: 'coordinate', location: { name: 'Invalid', lat: 190, lng: 0 } } }]) {
      expect(isTripState(changed)).toBe(false)
      expect(() => restoreTrip(changed, start + minute)).toThrow(RangeError)
    }
    expect(() => getTripProgress(state, start - 1)).toThrow(RangeError)
    expect(() => resumeTrip(state, start + minute)).toThrow(RangeError)
    const arrived = arriveAtStop(state, { stopId: stop.id, visitMinutes: 30 }, start + minute)
    expect(isTripState({ ...arrived, activities: [arrived.activities[0], arrived.activities[0]] })).toBe(false)
    const paused = pauseTrip(arrived, start + 5 * minute)
    expect(isTripState({ ...paused, updatedAt: start + 20 * minute, activities: [{ ...paused.activities[0],
      arrivedAt: start + 7 * minute, dwellUntil: start + 37 * minute }] })).toBe(false)
    expect(isTripState({ ...paused, pausedTotalMs: 5 * minute, activities: [{ ...paused.activities[0],
      pausedMs: 5 * minute, dwellUntil: paused.activities[0].dwellUntil + 5 * minute }] })).toBe(false)
    expect(() => startTripBreak(arrived, { id: 'overlap', minutes: 10 }, start + 2 * minute)).toThrow(RangeError)
    expect(() => arriveAtStop(state, { stopId: 'bad', visitMinutes: -1 }, start + minute)).toThrow(RangeError)
  })
})