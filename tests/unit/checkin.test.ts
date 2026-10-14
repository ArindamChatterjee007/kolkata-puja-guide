import { describe, expect, it } from 'vitest'
import { advanceCheckIn, createCheckInState, toggleManualVisit } from '../../src/domain/checkin'
import type { CheckInInput, CheckInState } from '../../src/domain/checkin'

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