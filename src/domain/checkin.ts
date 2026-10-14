import type { Coordinate, Visit } from '../types'
import { haversineMetres, isInKolkata } from './geo'

export const CHECKIN_LIMITS = Object.freeze({
  maxAccuracyMetres: 60,
  radiusMetres: 90,
  minDwellMs: 45_000,
  minSamples: 2,
  maxGapMs: 20_000,
})

export interface CheckInStop extends Coordinate {
  id: string
}

export interface LocationSample extends Coordinate {
  accuracyMetres: number
  at: number
}

export interface CheckInState {
  targetId: string | null
  startedAt: number | null
  lastSampleAt: number | null
  sampleCount: number
}

export interface CheckInInput {
  orderedStops: readonly CheckInStop[]
  activeStopId: string | null
  sample: LocationSample | null
  now: number
  foreground: boolean
  optedIn: boolean
  visits: readonly Visit[]
}

export type CheckInStatus = 'paused' | 'not-active' | 'invalid-sample' | 'stale-sample'
  | 'outside-area' | 'outside-radius' | 'dwelling' | 'checked-in'

export interface CheckInResult {
  state: CheckInState
  visits: Visit[]
  checkedInId: string | null
  status: CheckInStatus
}

export function createCheckInState(): CheckInState {
  return { targetId: null, startedAt: null, lastSampleAt: null, sampleCount: 0 }
}

function validClock(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp >= 0 && Number.isFinite(new Date(timestamp).getTime())
}

function copyVisits(visits: readonly Visit[]): Visit[] {
  return visits.map(({ pandalId, at, method }) => ({ pandalId, at, method }))
}

export function advanceCheckIn(state: CheckInState, input: CheckInInput): CheckInResult {
  const visits = copyVisits(input.visits)
  const reset = (status: CheckInStatus): CheckInResult => ({
    state: createCheckInState(), visits, checkedInId: null, status,
  })
  if (!input.optedIn || !input.foreground) return reset('paused')
  const visited = new Set(visits.map((visit) => visit.pandalId))
  const next = input.orderedStops.find((stop) => !visited.has(stop.id))
  if (!next || next.id !== input.activeStopId) return reset('not-active')
  const sample = input.sample
  if (!sample || !validClock(input.now) || !validClock(sample.at)
    || sample.at > input.now || input.now - sample.at >= CHECKIN_LIMITS.maxGapMs
    || !Number.isFinite(sample.accuracyMetres) || sample.accuracyMetres < 0
    || sample.accuracyMetres > CHECKIN_LIMITS.maxAccuracyMetres) return reset('invalid-sample')
  if (!isInKolkata(next) || !isInKolkata(sample)) return reset('outside-area')
  if (haversineMetres(sample, next) > CHECKIN_LIMITS.radiusMetres) return reset('outside-radius')
  const sameTarget = state.targetId === next.id
  if (sameTarget && state.lastSampleAt !== null && sample.at <= state.lastSampleAt) return reset('stale-sample')
  const continuous = sameTarget && state.startedAt !== null && state.lastSampleAt !== null
    && validClock(state.startedAt) && state.startedAt <= state.lastSampleAt
    && Number.isInteger(state.sampleCount) && state.sampleCount >= 1
    && sample.at - state.lastSampleAt < CHECKIN_LIMITS.maxGapMs
  const nextState: CheckInState = {
    targetId: next.id,
    startedAt: continuous ? state.startedAt : sample.at,
    lastSampleAt: sample.at,
    sampleCount: continuous ? state.sampleCount + 1 : 1,
  }
  if (nextState.sampleCount >= CHECKIN_LIMITS.minSamples
    && sample.at - nextState.startedAt! >= CHECKIN_LIMITS.minDwellMs) {
    return {
      state: createCheckInState(),
      visits: [...visits, { pandalId: next.id, at: sample.at, method: 'auto' }],
      checkedInId: next.id,
      status: 'checked-in',
    }
  }
  return { state: nextState, visits, checkedInId: null, status: 'dwelling' }
}

export function toggleManualVisit(
  visits: readonly Visit[],
  pandalId: string,
  knownPandalIds: readonly string[],
  now: number,
): Visit[] {
  if (!knownPandalIds.includes(pandalId) || !validClock(now)) {
    throw new RangeError('Manual visit requires a known pandal and a valid clock')
  }
  return visits.some((visit) => visit.pandalId === pandalId)
    ? copyVisits(visits.filter((visit) => visit.pandalId !== pandalId))
    : [...copyVisits(visits), { pandalId, at: now, method: 'manual' }]
}