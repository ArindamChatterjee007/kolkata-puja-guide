import { describe, expect, it } from 'vitest'
import { advanceCheckIn, advanceNearbyCheckIn, CITY_CHECKIN_BOUNDS, createCheckInState,
  createNearbyCheckInState, toggleManualVisit } from '../../src/domain/checkin'
import type { CheckInInput, CheckInState, NearbyCheckInInput } from '../../src/domain/checkin'

const start = Date.parse('2026-10-13T12:00:00Z')
const stop = { id: 'first', lat: 22.5647, lng: 88.3519 }
const second = { id: 'second', lat: 22.58, lng: 88.36 }

function sample(offset: number, overrides: Partial<CheckInInput> = {}): CheckInInput {
  return {
    orderedStops: [stop, second], activeStopId: stop.id,
    sample: { lat: stop.lat, lng: stop.lng, accuracyMetres: 25, at: start + offset },
    now: start + offset, foreground: true, optedIn: true, visits: [], ...overrides,
  }
}

function nearbySample(offset: number, overrides: Partial<NearbyCheckInInput> = {}): NearbyCheckInInput {
  const input = sample(offset)
  return { catalogue: [stop, second], city: 'kolkata', sample: input.sample, now: input.now,
    foreground: true, optedIn: true, visits: [], ...overrides }
}

describe('catalogue-wide arrival checks', () => {
  it('recognizes an unplanned catalogue place in each city after accurate continuous dwell', () => {
    const fixtures = [{ city: 'kolkata' as const, lat: 22.5647, lng: 88.3519 },
      { city: 'asansol' as const, lat: 23.685, lng: 86.975 },
      { city: 'durgapur' as const, lat: 23.52, lng: 87.31 }]
    for (const fixture of fixtures) {
      const unplanned = { id: 'unplanned', ...fixture }
      const catalogue = [unplanned, { ...unplanned, id: 'planned', lat: fixture.lat + 0.02 }]
      const before = JSON.stringify(catalogue)
      let state = createNearbyCheckInState()
      for (const offset of [0, 15_000, 30_000, 45_000]) {
        const result = advanceNearbyCheckIn(state, nearbySample(offset, { catalogue, city: fixture.city,
          sample: { lat: fixture.lat, lng: fixture.lng, accuracyMetres: 20, speedMetresPerSecond: 0, at: start + offset } }))
        state = result.state
        if (offset < 45_000) expect(result.checkedInId).toBeNull()
        else {
          expect(result.checkedInId).toBe('unplanned')
          expect(result.visits).toEqual([{ pandalId: 'unplanned', at: start + offset, method: 'auto' }])
          expect(state.stationaryAnchor).toBeNull()
          expect(result.notice).toContain('not confirmed entry')
        }
      }
      expect(JSON.stringify(catalogue)).toBe(before)
    }
  })

  it('does not choose between pins within GPS uncertainty but permits a clearly nearer pin', () => {
    const other = { ...stop, id: 'other', lat: stop.lat + 0.00025 }
    const input = nearbySample(0, { catalogue: [stop, other] })
    const ambiguous = advanceNearbyCheckIn(createNearbyCheckInState(), input)
    expect(ambiguous.status).toBe('ambiguous')
    expect(ambiguous.checkedInId).toBeNull()
    expect(ambiguous.candidateIds).toEqual(['first', 'other'])
    const accurate = { ...input, sample: { ...input.sample!, accuracyMetres: 5 } }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), accurate).state.targetId).toBe(stop.id)
    const previousVisit = [{ pandalId: stop.id, at: start - 1, method: 'manual' as const }]
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, visits: previousVisit }).status).toBe('ambiguous')
  })

  it('requires a declared local scope and rejects poor fixes, stale fixes and outside-city samples', () => {
    const input = nearbySample(0)
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, city: undefined }).status).toBe('outside-area')
    for (const accuracyMetres of [61, -1, NaN]) {
      expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input,
        sample: { ...input.sample!, accuracyMetres } }).status).toBe('invalid-sample')
    }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, now: start + 20_000 }).status).toBe('invalid-sample')
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, now: start - 1 }).status).toBe('invalid-sample')
    const outside = { id: 'outside', lat: 28.6139, lng: 77.209 }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, catalogue: [outside],
      sample: { ...outside, accuracyMetres: 10, at: start } }).status).toBe('outside-area')
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, city: 'asansol' }).status).toBe('outside-area')
  })

  it('resets drive-bys, nonstationary fixes, gaps and hidden dwell instead of carrying time forward', () => {
    const first = advanceNearbyCheckIn(createNearbyCheckInState(), nearbySample(0))
    for (const speedMetresPerSecond of [3, 9]) {
      const input = nearbySample(15_000)
      expect(advanceNearbyCheckIn(first.state, { ...input, sample: { ...input.sample!, speedMetresPerSecond } }).status).toBe('moving')
    }
    const moved = nearbySample(15_000)
    moved.sample!.lat += 0.0004
    expect(advanceNearbyCheckIn(first.state, moved).status).toBe('moving')
    expect(advanceNearbyCheckIn(first.state, nearbySample(20_000)).state.sampleCount).toBe(1)
    expect(advanceNearbyCheckIn(first.state, nearbySample(0)).status).toBe('stale-sample')
    expect(advanceNearbyCheckIn(first.state, nearbySample(15_000, { foreground: false })).state).toEqual(createNearbyCheckInState())
    expect(advanceNearbyCheckIn(first.state, nearbySample(15_000, { optedIn: false })).status).toBe('paused')
  })

  it('preserves manual-unvisit suppression until a reliable move away and never duplicates a visit', () => {
    const history = [{ pandalId: second.id, at: start - 1, method: 'manual' as const }]
    const held = advanceNearbyCheckIn(createNearbyCheckInState(), nearbySample(0,
      { visits: [...history, ...history], suppressedIds: [stop.id, stop.id] }))
    expect(held.status).toBe('suppressed')
    expect(held.visits).toHaveLength(1)
    expect(held.suppressedIds).toEqual([stop.id])
    const away = nearbySample(15_000, { visits: history, suppressedIds: held.suppressedIds })
    away.sample!.lat += 0.003
    const released = advanceNearbyCheckIn(held.state, away)
    expect(released.suppressedIds).toEqual([])
    let result = released
    for (const offset of [30_000, 45_000, 60_000, 75_000]) {
      result = advanceNearbyCheckIn(result.state, nearbySample(offset,
        { visits: result.visits, suppressedIds: result.suppressedIds }))
    }
    expect(result.checkedInId).toBe(stop.id)
    expect(result.visits).toHaveLength(2)
    const repeated = advanceNearbyCheckIn(result.state, nearbySample(76_000, { visits: result.visits }))
    expect(repeated.checkedInId).toBeNull()
    expect(repeated.visits).toHaveLength(2)
  })

  it('supports explicit bounds, deduplicates catalogue IDs and refuses conflicting pin coordinates', () => {
    const input = nearbySample(0, { catalogue: [stop, { ...stop }], city: undefined,
      allowedBounds: CITY_CHECKIN_BOUNDS.kolkata })
    const result = advanceNearbyCheckIn(createNearbyCheckInState(), input)
    expect(result.status).toBe('dwelling')
    expect(result.candidateIds).toEqual([stop.id])
    const conflict = { ...input, catalogue: [stop, { ...stop, lat: stop.lat + 0.0001 }] }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), conflict).status).toBe('ambiguous')
    const reversedConflict = { ...input, catalogue: [{ ...stop, lat: stop.lat + 0.02 }, stop, { ...stop, id: 'alternative' }] }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), reversedConflict).status).toBe('ambiguous')
    const otherCity = nearbySample(0, { catalogue: [{ ...stop, city: 'durgapur' }] })
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), otherCity).checkedInId).toBeNull()
    const badBounds = { minLat: 24, maxLat: 23, minLng: 87, maxLng: 88 }
    expect(advanceNearbyCheckIn(createNearbyCheckInState(), { ...input, allowedBounds: badBounds }).status).toBe('outside-area')
  })
})

describe('privacy-preserving check-ins', () => {
  it('requires sustained foreground dwell and returns an auto visit with no coordinates', () => {
    let state = createCheckInState()
    for (const offset of [0, 15_000, 30_000]) {
      const result = advanceCheckIn(state, sample(offset))
      expect(result.checkedInId).toBeNull()
      state = result.state
    }
    const result = advanceCheckIn(state, sample(45_000))
    expect(result.checkedInId).toBe(stop.id)
    expect(result.visits).toEqual([{ pandalId: stop.id, at: start + 45_000, method: 'auto' }])
    expect(Object.keys(result.state).sort()).toEqual(['lastSampleAt', 'sampleCount', 'startedAt', 'targetId'])
    expect(JSON.stringify(result)).not.toMatch(/"(?:lat|lng|accuracyMetres)"/)
    const repeated = advanceCheckIn(result.state, sample(46_000, { visits: result.visits }))
    expect(repeated.checkedInId).toBeNull()
    expect(repeated.visits).toHaveLength(1)
  })

  it('resets on poor accuracy, invalid accuracy, or leaving the 90 metre radius', () => {
    const state = advanceCheckIn(createCheckInState(), sample(0)).state
    for (const accuracyMetres of [61, NaN, -1]) {
      const input = sample(15_000)
      input.sample!.accuracyMetres = accuracyMetres
      expect(advanceCheckIn(state, input).state).toEqual(createCheckInState())
    }
    const outside = sample(15_000)
    outside.sample!.lat += 0.001
    expect(advanceCheckIn(state, outside).status).toBe('outside-radius')
    const boundary = sample(15_000)
    boundary.sample!.accuracyMetres = 60
    expect(advanceCheckIn(state, boundary).status).toBe('dwelling')
  })

  it('discards dwell while hidden or opted out and restarts only after foreground opt-in', () => {
    const state = advanceCheckIn(createCheckInState(), sample(0)).state
    const hidden = advanceCheckIn(state, sample(15_000, { foreground: false }))
    expect(hidden.status).toBe('paused')
    const resumed = advanceCheckIn(hidden.state, sample(45_000))
    expect(resumed.state.startedAt).toBe(start + 45_000)
    expect(resumed.checkedInId).toBeNull()
    const optedOut = advanceCheckIn(resumed.state, sample(60_000, { optedIn: false }))
    expect(optedOut.state).toEqual(createCheckInState())
  })

  it('resets a 20 second gap and rejects stale, repeated, or future samples', () => {
    const first = advanceCheckIn(createCheckInState(), sample(0))
    expect(advanceCheckIn(first.state, sample(20_000)).state.sampleCount).toBe(1)
    expect(advanceCheckIn(first.state, sample(45_000)).checkedInId).toBeNull()
    expect(advanceCheckIn(first.state, sample(0)).status).toBe('stale-sample')
    expect(advanceCheckIn(first.state, sample(0, { now: start + 20_000 })).status).toBe('invalid-sample')
    expect(advanceCheckIn(first.state, sample(15_000, { now: start + 14_999 })).status).toBe('invalid-sample')
  })

  it('checks only the active next unvisited stop and never accepts out-of-city fixes', () => {
    const wrong = sample(0, { activeStopId: second.id })
    wrong.sample = { ...second, accuracyMetres: 20, at: start }
    expect(advanceCheckIn(createCheckInState(), wrong).status).toBe('not-active')
    const visited = [{ pandalId: stop.id, at: start - 1, method: 'manual' as const }]
    const next = advanceCheckIn(createCheckInState(), { ...wrong, visits: visited })
    expect(next.state.targetId).toBe(second.id)
    const oldState: CheckInState = { targetId: stop.id, startedAt: start - 45_000, lastSampleAt: start - 1, sampleCount: 4 }
    expect(advanceCheckIn(oldState, { ...wrong, visits: visited }).state.startedAt).toBe(start)
    const delhi = { id: 'delhi', lat: 28.6139, lng: 77.209 }
    const elsewhere = sample(0, {
      orderedStops: [delhi], activeStopId: delhi.id,
      sample: { ...delhi, accuracyMetres: 5, at: start },
    })
    expect(advanceCheckIn(createCheckInState(), elsewhere).status).toBe('outside-area')
  })

  it('allows explicit manual toggles without GPS but guards IDs, clocks and other history', () => {
    const history = [{ pandalId: second.id, at: start - 100, method: 'auto' as const }]
    const before = JSON.stringify(history)
    const added = toggleManualVisit(history, stop.id, [stop.id, second.id], start)
    expect(added[1]).toEqual({ pandalId: stop.id, at: start, method: 'manual' })
    expect(toggleManualVisit(added, stop.id, [stop.id, second.id], start + 1)).toEqual(history)
    expect(JSON.stringify(history)).toBe(before)
    expect(() => toggleManualVisit(history, 'unknown', [stop.id], start)).toThrow(RangeError)
    expect(() => toggleManualVisit(history, stop.id, [stop.id], NaN)).toThrow(RangeError)
  })
})