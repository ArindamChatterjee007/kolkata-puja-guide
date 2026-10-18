import type { City, Coordinate, Visit } from '../types'
import { haversineMetres, isCoordinate, isInKolkata } from './geo'

export const CHECKIN_LIMITS = Object.freeze({
  maxAccuracyMetres: 60,
  radiusMetres: 90,
  minDwellMs: 45_000,
  minSamples: 2,
  maxGapMs: 20_000,
})

export interface CheckInStop extends Coordinate {
  id: string
  city?: City
}

export interface LocationSample extends Coordinate {
  accuracyMetres: number
  at: number
  speedMetresPerSecond?: number | null
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

export interface CheckInBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export const CITY_CHECKIN_BOUNDS: Readonly<Record<City, Readonly<CheckInBounds>>> = Object.freeze({
  kolkata: Object.freeze({ minLat: 22.3, maxLat: 22.85, minLng: 88.15, maxLng: 88.65 }),
  asansol: Object.freeze({ minLat: 23.55, maxLat: 23.85, minLng: 86.8, maxLng: 87.15 }),
  durgapur: Object.freeze({ minLat: 23.35, maxLat: 23.7, minLng: 87.15, maxLng: 87.5 }),
})

export const NEARBY_CHECKIN_LIMITS = Object.freeze({
  ...CHECKIN_LIMITS,
  maxSpeedMetresPerSecond: 2,
  stationaryRadiusMetres: 35,
  ambiguityMarginMetres: 10,
})

export interface NearbyCheckInState extends CheckInState {
  stationaryAnchor: Coordinate | null
}

export interface NearbyCheckInInput extends Omit<CheckInInput, 'orderedStops' | 'activeStopId'> {
  catalogue: readonly CheckInStop[]
  city?: City
  allowedBounds?: CheckInBounds
  suppressedIds?: readonly string[]
}

export interface NearbyCheckInResult extends Omit<CheckInResult, 'state' | 'status'> {
  state: NearbyCheckInState
  status: CheckInStatus | 'ambiguous' | 'moving' | 'suppressed'
  candidateIds: string[]
  suppressedIds: string[]
  notice: string
}

export function createNearbyCheckInState(): NearbyCheckInState {
  return { ...createCheckInState(), stationaryAnchor: null }
}

function validBounds(bounds: CheckInBounds | undefined): bounds is CheckInBounds {
  return bounds !== undefined && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].every(Number.isFinite)
    && bounds.minLat >= -90 && bounds.maxLat <= 90 && bounds.minLat < bounds.maxLat
    && bounds.minLng >= -180 && bounds.maxLng <= 180 && bounds.minLng < bounds.maxLng
}

function withinBounds(coordinate: Coordinate, bounds: CheckInBounds): boolean {
  return isCoordinate(coordinate) && coordinate.lat >= bounds.minLat && coordinate.lat <= bounds.maxLat
    && coordinate.lng >= bounds.minLng && coordinate.lng <= bounds.maxLng
}

export function advanceNearbyCheckIn(state: NearbyCheckInState, input: NearbyCheckInInput): NearbyCheckInResult {
  const visits = [...new Map(copyVisits(input.visits).map((visit) => [visit.pandalId, visit])).values()]
  let suppressedIds = [...new Set(input.suppressedIds ?? [])]
  let candidateIds: string[] = []
  const notice = 'Auto arrival means sustained proximity to an approximate pin, not confirmed entry. Traffic stops can resemble visits. City bounds are operational estimates. Keep the stationary anchor in memory only; manual confirmation remains available.'
  const result = (status: NearbyCheckInResult['status'], nextState = createNearbyCheckInState(), checkedInId: string | null = null): NearbyCheckInResult => ({
    state: nextState, visits, checkedInId, status, candidateIds, suppressedIds, notice,
  })
  if (!input.optedIn || !input.foreground) return result('paused')
  const sample = input.sample
  if (!sample || !isCoordinate(sample) || !validClock(input.now) || !validClock(sample.at)
    || sample.at > input.now || input.now - sample.at >= CHECKIN_LIMITS.maxGapMs
    || !Number.isFinite(sample.accuracyMetres) || sample.accuracyMetres < 0
    || sample.accuracyMetres > CHECKIN_LIMITS.maxAccuracyMetres
    || (sample.speedMetresPerSecond != null && (!Number.isFinite(sample.speedMetresPerSecond) || sample.speedMetresPerSecond < 0))) {
    return result('invalid-sample')
  }
  if (input.city !== undefined && !Object.hasOwn(CITY_CHECKIN_BOUNDS, input.city)) return result('outside-area')
  const bounds = input.allowedBounds ?? (input.city ? CITY_CHECKIN_BOUNDS[input.city] : undefined)
  if (!validBounds(bounds) || !withinBounds(sample, bounds)) return result('outside-area')
  const catalogue = new Map<string, CheckInStop>()
  const conflictingIds = new Set<string>()
  const nearbyConflicts = new Set<string>()
  for (const stop of input.catalogue) {
    if (!stop.id || !withinBounds(stop, bounds) || (input.city && stop.city && stop.city !== input.city)) continue
    const previous = catalogue.get(stop.id)
    if (previous && (previous.lat !== stop.lat || previous.lng !== stop.lng)) {
      conflictingIds.add(stop.id)
      if (Math.min(haversineMetres(sample, previous), haversineMetres(sample, stop)) <= CHECKIN_LIMITS.radiusMetres) {
        nearbyConflicts.add(stop.id)
      }
    } else catalogue.set(stop.id, stop)
  }
  suppressedIds = suppressedIds.filter((id) => {
    const stop = catalogue.get(id)
    return !stop || conflictingIds.has(id) || haversineMetres(sample, stop)
      <= CHECKIN_LIMITS.radiusMetres + sample.accuracyMetres + NEARBY_CHECKIN_LIMITS.stationaryRadiusMetres
  })
  if ((sample.speedMetresPerSecond ?? 0) > NEARBY_CHECKIN_LIMITS.maxSpeedMetresPerSecond) return result('moving')
  const visited = new Set(visits.map((visit) => visit.pandalId))
  const nearby = [...catalogue.values()].map((stop) => ({ stop, metres: haversineMetres(sample, stop) }))
    .filter((candidate) => candidate.metres <= CHECKIN_LIMITS.radiusMetres)
    .sort((first, second) => first.metres - second.metres || first.stop.id.localeCompare(second.stop.id, 'en'))
  candidateIds = nearby.map((candidate) => candidate.stop.id)
  if (nearbyConflicts.size) {
    candidateIds = [...new Set([...candidateIds, ...nearbyConflicts])]
    return result('ambiguous')
  }
  const candidate = nearby.find(({ stop }) => !visited.has(stop.id) && !suppressedIds.includes(stop.id))
  if (!candidate) {
    if (nearby.some(({ stop }) => suppressedIds.includes(stop.id))) return result('suppressed')
    return result([...catalogue.keys()].some((id) => !visited.has(id)) ? 'outside-radius' : 'not-active')
  }
  const competitor = nearby.find(({ stop }) => stop.id !== candidate.stop.id)
  if (conflictingIds.has(candidate.stop.id) || (competitor && competitor.metres - candidate.metres
    <= 2 * sample.accuracyMetres + NEARBY_CHECKIN_LIMITS.ambiguityMarginMetres)) return result('ambiguous')
  const sameTarget = state.targetId === candidate.stop.id
  if (sameTarget && state.lastSampleAt !== null && sample.at <= state.lastSampleAt) return result('stale-sample')
  const continuous = sameTarget && state.startedAt !== null && state.lastSampleAt !== null
    && validClock(state.startedAt) && validClock(state.lastSampleAt) && state.startedAt <= state.lastSampleAt
    && Number.isInteger(state.sampleCount) && state.sampleCount >= 1
    && sample.at - state.lastSampleAt < CHECKIN_LIMITS.maxGapMs && isCoordinate(state.stationaryAnchor)
  if (continuous && haversineMetres(state.stationaryAnchor!, sample) > NEARBY_CHECKIN_LIMITS.stationaryRadiusMetres) {
    return result('moving')
  }
  const nextState: NearbyCheckInState = {
    targetId: candidate.stop.id, startedAt: continuous ? state.startedAt : sample.at,
    lastSampleAt: sample.at, sampleCount: continuous ? state.sampleCount + 1 : 1,
    stationaryAnchor: continuous ? { ...state.stationaryAnchor! } : { lat: sample.lat, lng: sample.lng },
  }
  if (nextState.sampleCount >= CHECKIN_LIMITS.minSamples && sample.at - nextState.startedAt! >= CHECKIN_LIMITS.minDwellMs) {
    visits.push({ pandalId: candidate.stop.id, at: sample.at, method: 'auto' })
    return result('checked-in', createNearbyCheckInState(), candidate.stop.id)
  }
  return result('dwelling', nextState)
}