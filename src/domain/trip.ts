import type { JourneyStop, MinuteRange, NamedCoordinate, StopKind, Transport, Visit } from '../types'
import { isCoordinate } from './geo'
import { planRoute } from './route'
import type { PlanInput, RoutePlan, TimeWindow, TripBreak } from './route'

export type TripStatus = 'idle' | 'running' | 'paused' | 'completed'

export type TripHome = { kind: 'landmark'; id: string; location: NamedCoordinate }
  | { kind: 'coordinate'; location: NamedCoordinate }

export interface TripActivity {
  stopId: string
  kind: StopKind
  method: Visit['method']
  arrivedAt: number
  departedAt: number | null
  visitMinutes: number
  queueMinutes: number
  dwellUntil: number
  pausedMs: number
}

export interface ActiveTripBreak {
  id: string
  minutes: number
  startedAt: number
  endsAt: number
  pausedMs: number
}

export interface TripState {
  version: 1
  status: TripStatus
  home: TripHome
  transport: Transport
  startedAt: number | null
  pausedAt: number | null
  pausedTotalMs: number
  completedAt: number | null
  updatedAt: number
  currentLegStartedAt: number | null
  lockedNextStopId: string | null
  activities: TripActivity[]
  activeBreak: ActiveTripBreak | null
  completedBreakIds: string[]
  skippedBreakIds: string[]
}

export interface TripArrival {
  stopId: string
  kind?: StopKind
  visitMinutes: number
  queueMinutes?: number
  method?: Visit['method']
}

export interface TripProgress {
  status: TripStatus
  elapsedMinutes: number
  elapsedActiveMinutes: number
  elapsedWallMinutes: number
  pausedMinutes: number
  dwellRemainingMinutes: number
  breakRemainingMinutes: number
  remainingEstimate: MinuteRange | null
  finishWindow: TimeWindow | null
  estimateAsOf: number | null
  finishAssumesImmediateResume: boolean
  visitedIds: string[]
  activities: (TripActivity & { visitConsumedMinutes: number })[]
}

export type RemainingTripInput = Omit<PlanInput<JourneyStop>, 'origin' | 'returnOrigin' | 'transport'
  | 'departureTimestamp' | 'returnToOrigin' | 'lockedNextStopId' | 'scheduleStartTimestamp'
  | 'activeDwellRemainingMinutes' | 'activeBreakRemainingMinutes' | 'availableMinutes'> & {
  origin: NamedCoordinate
  totalAvailableMinutes: number
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    && Number.isFinite(new Date(value).getTime())
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function validHome(value: unknown): value is TripHome {
  return record(value) && record(value.location) && isCoordinate(value.location)
    && typeof value.location.name === 'string' && value.location.name.trim().length > 0
    && onlyKeys(value.location, ['name', 'lat', 'lng'])
    && (value.kind === 'coordinate' ? onlyKeys(value, ['kind', 'location'])
      : value.kind === 'landmark' && identifier(value.id) && onlyKeys(value, ['kind', 'id', 'location']))
}

function uniqueIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 4_096 && value.every(identifier) && new Set(value).size === value.length
}

export function isTripState(value: unknown): value is TripState {
  if (!record(value) || !onlyKeys(value, ['version', 'status', 'home', 'transport', 'startedAt', 'pausedAt',
    'pausedTotalMs', 'completedAt', 'updatedAt', 'currentLegStartedAt', 'lockedNextStopId', 'activities',
    'activeBreak', 'completedBreakIds', 'skippedBreakIds']) || value.version !== 1
    || !['idle', 'running', 'paused', 'completed'].includes(value.status as string) || !validHome(value.home)
    || !['personal', 'public', 'walk'].includes(value.transport as string) || !timestamp(value.updatedAt)
    || !nonnegative(value.pausedTotalMs) || !Array.isArray(value.activities) || value.activities.length > 4_096
    || !uniqueIds(value.completedBreakIds) || !uniqueIds(value.skippedBreakIds)
    || value.completedBreakIds.some((id) => (value.skippedBreakIds as string[]).includes(id))
    || (value.lockedNextStopId !== null && !identifier(value.lockedNextStopId))) return false
  const updatedAt = value.updatedAt
  const startedAt = value.startedAt
  if (value.status === 'idle') {
    return startedAt === null && value.pausedAt === null && value.completedAt === null && value.pausedTotalMs === 0
      && value.currentLegStartedAt === null && value.lockedNextStopId === null && value.activities.length === 0
      && value.activeBreak === null && value.completedBreakIds.length === 0 && value.skippedBreakIds.length === 0
  }
  if (!timestamp(startedAt) || startedAt > updatedAt || value.pausedTotalMs > updatedAt - startedAt
    || (value.currentLegStartedAt !== null && (!timestamp(value.currentLegStartedAt)
      || value.currentLegStartedAt < startedAt || value.currentLegStartedAt > updatedAt))) return false
  if (value.status === 'paused') {
    if (!timestamp(value.pausedAt) || value.pausedAt < startedAt || value.pausedAt > updatedAt
      || value.pausedTotalMs > value.pausedAt - startedAt || value.completedAt !== null) return false
  } else if (value.pausedAt !== null) return false
  if (value.status === 'completed') {
    if (!timestamp(value.completedAt) || value.completedAt < startedAt || value.completedAt > updatedAt
      || value.pausedTotalMs > value.completedAt - startedAt || value.activeBreak !== null
      || value.lockedNextStopId !== null || value.currentLegStartedAt !== null) return false
  } else if (value.completedAt !== null) return false
  const activityClock = (value.pausedAt ?? value.completedAt ?? updatedAt) as number
  if (value.currentLegStartedAt !== null && value.currentLegStartedAt > activityClock) return false
  const visited = new Set<string>()
  let activeActivities = 0
  let previousEnd = startedAt
  for (const activity of value.activities) {
    if (!record(activity) || !onlyKeys(activity, ['stopId', 'kind', 'method', 'arrivedAt', 'departedAt',
      'visitMinutes', 'queueMinutes', 'dwellUntil', 'pausedMs']) || !identifier(activity.stopId)
      || visited.has(activity.stopId) || !['pandal', 'restaurant', 'sight'].includes(activity.kind as string)
      || !['manual', 'auto'].includes(activity.method as string)
      || !timestamp(activity.arrivedAt) || activity.arrivedAt < previousEnd || activity.arrivedAt > activityClock
      || !nonnegative(activity.visitMinutes) || activity.visitMinutes > 240 || !nonnegative(activity.queueMinutes)
      || activity.visitMinutes + activity.queueMinutes > 1_440 || !nonnegative(activity.pausedMs)
      || activity.pausedMs > value.pausedTotalMs || activity.pausedMs > activityClock - activity.arrivedAt
      || !timestamp(activity.dwellUntil)
      || Math.abs(activity.dwellUntil - activity.arrivedAt - (activity.visitMinutes + activity.queueMinutes) * 60_000 - activity.pausedMs) > 1
      || (activity.departedAt !== null && (!timestamp(activity.departedAt)
        || activity.departedAt < activity.arrivedAt || activity.departedAt > activityClock
        || activity.pausedMs > activity.departedAt - activity.arrivedAt))) return false
    visited.add(activity.stopId)
    if (activity.departedAt === null) activeActivities += 1
      if (activity.departedAt === null && (value.status === 'completed' || visited.size !== value.activities.length)) return false
      previousEnd = activity.departedAt === null ? activityClock : activity.departedAt as number
  }
  if (activeActivities > 1 || (value.lockedNextStopId !== null && visited.has(value.lockedNextStopId))) return false
  if (value.activeBreak !== null) {
    const pause = value.activeBreak
    if (!record(pause) || !onlyKeys(pause, ['id', 'minutes', 'startedAt', 'endsAt', 'pausedMs'])
      || !identifier(pause.id) || value.completedBreakIds.includes(pause.id) || value.skippedBreakIds.includes(pause.id)
      || !nonnegative(pause.minutes) || pause.minutes > 240 || !timestamp(pause.startedAt)
      || pause.startedAt < previousEnd || pause.startedAt > activityClock || !timestamp(pause.endsAt)
      || !nonnegative(pause.pausedMs) || pause.pausedMs > value.pausedTotalMs
      || pause.pausedMs > activityClock - pause.startedAt || activeActivities > 0
      || Math.abs(pause.endsAt - pause.startedAt - pause.minutes * 60_000 - pause.pausedMs) > 1) return false
  }
  return true
}

function copyHome(home: TripHome): TripHome {
  const location = { name: home.location.name, lat: home.location.lat, lng: home.location.lng }
  return home.kind === 'landmark' ? { kind: 'landmark', id: home.id, location } : { kind: 'coordinate', location }
}

function copyState(state: TripState): TripState {
  return { ...state, home: copyHome(state.home), activities: state.activities.map((activity) => ({ ...activity })),
    activeBreak: state.activeBreak ? { ...state.activeBreak } : null,
    completedBreakIds: [...state.completedBreakIds], skippedBreakIds: [...state.skippedBreakIds] }
}

function check(state: TripState, now: number, statuses?: readonly TripStatus[]) {
  if (!isTripState(state) || !timestamp(now) || now < state.updatedAt || (statuses && !statuses.includes(state.status))) {
    throw new RangeError('Invalid trip state, transition or clock')
  }
}

function activeClock(state: TripState, now: number): number {
  return state.completedAt ?? state.pausedAt ?? now
}

function remainingDwell(state: TripState, now: number): number {
  const activity = state.activities.find((entry) => entry.departedAt === null)
  return activity ? Math.max(0, (activity.dwellUntil - activeClock(state, now)) / 60_000) : 0
}

function remainingBreak(state: TripState, now: number): number {
  return state.activeBreak ? Math.max(0, (state.activeBreak.endsAt - activeClock(state, now)) / 60_000) : 0
}

export function createTrip(input: { home: TripHome; transport?: Transport }, now: number): TripState {
  if (!validHome(input.home) || !timestamp(now) || !['personal', 'public', 'walk'].includes(input.transport ?? 'public')) {
    throw new RangeError('A trip requires an explicit home, transport and clock')
  }
  return { version: 1, status: 'idle', home: copyHome(input.home), transport: input.transport ?? 'public',
    startedAt: null, pausedAt: null, pausedTotalMs: 0, completedAt: null, updatedAt: now,
    currentLegStartedAt: null, lockedNextStopId: null, activities: [], activeBreak: null,
    completedBreakIds: [], skippedBreakIds: [] }
}

export function restoreTrip(value: unknown, now: number): TripState {
  if (!isTripState(value)) throw new RangeError('Invalid trip snapshot')
  check(value, now)
  return copyState(value)
}

export function startTrip(state: TripState, now: number, nextStopId?: string): TripState {
  check(state, now, ['idle'])
  if (nextStopId !== undefined && !identifier(nextStopId)) throw new RangeError('Invalid destination')
  return { ...copyState(state), status: 'running', startedAt: now, updatedAt: now,
    lockedNextStopId: nextStopId ?? null, currentLegStartedAt: now }
}

export function pauseTrip(state: TripState, now: number): TripState {
  check(state, now, ['running'])
  return { ...copyState(state), status: 'paused', pausedAt: now, updatedAt: now }
}

export function resumeTrip(state: TripState, now: number): TripState {
  check(state, now, ['paused'])
  const pauseMs = now - state.pausedAt!
  const next = copyState(state)
  next.status = 'running'
  next.pausedAt = null
  next.pausedTotalMs += pauseMs
  next.updatedAt = now
  for (const activity of next.activities) {
    if (activity.departedAt === null) {
      activity.pausedMs += pauseMs
      activity.dwellUntil += pauseMs
    }
  }
  if (next.activeBreak) {
    next.activeBreak.pausedMs += pauseMs
    next.activeBreak.endsAt += pauseMs
  }
  return next
}

export function arriveAtStop(state: TripState, arrival: TripArrival, now: number): TripState {
  check(state, now, ['running'])
  const queueMinutes = arrival.queueMinutes ?? 0
  if (!identifier(arrival.stopId) || !nonnegative(arrival.visitMinutes) || arrival.visitMinutes > 240
    || !nonnegative(queueMinutes) || arrival.visitMinutes + queueMinutes > 1_440
    || !['pandal', 'restaurant', 'sight'].includes(arrival.kind ?? 'pandal')
    || !['manual', 'auto'].includes(arrival.method ?? 'manual')) throw new RangeError('Invalid arrival allowance')
  if (state.activities.some((activity) => activity.stopId === arrival.stopId)) return state
  if (remainingBreak(state, now) > 0) throw new RangeError('End the current break before recording another arrival')
  const next = copyState(state)
  if (next.activeBreak) {
    next.completedBreakIds.push(next.activeBreak.id)
    next.activeBreak = null
  }
  next.activities = next.activities.map((activity) => activity.departedAt === null ? { ...activity, departedAt: now } : activity)
  next.activities.push({ stopId: arrival.stopId, kind: arrival.kind ?? 'pandal', method: arrival.method ?? 'manual',
    arrivedAt: now, departedAt: null, visitMinutes: arrival.visitMinutes, queueMinutes,
    dwellUntil: now + (arrival.visitMinutes + queueMinutes) * 60_000, pausedMs: 0 })
  if (next.lockedNextStopId === arrival.stopId) next.lockedNextStopId = null
  next.currentLegStartedAt = null
  next.updatedAt = now
  return next
}

export function leaveStop(state: TripState, now: number, nextStopId?: string): TripState {
  check(state, now, ['running'])
  if (remainingBreak(state, now) > 0) throw new RangeError('End the current break before leaving')
  if (nextStopId !== undefined && (!identifier(nextStopId) || state.activities.some((activity) => activity.stopId === nextStopId))) {
    throw new RangeError('Destination must be unvisited')
  }
  const next = copyState(state)
  next.activities = next.activities.map((activity) => activity.departedAt === null ? { ...activity, departedAt: now } : activity)
  if (next.activeBreak) {
    next.completedBreakIds.push(next.activeBreak.id)
    next.activeBreak = null
  }
  next.lockedNextStopId = nextStopId ?? next.lockedNextStopId
  next.currentLegStartedAt = now
  next.updatedAt = now
  return next
}

export function unvisitTripStop(state: TripState, stopId: string, now: number): TripState {
  check(state, now, ['running', 'paused'])
  if (!identifier(stopId)) throw new RangeError('Invalid stop identifier')
  const next = copyState(state)
  next.activities = next.activities.filter((activity) => activity.stopId !== stopId)
  next.updatedAt = now
  return next
}

export function startTripBreak(state: TripState, pause: Pick<TripBreak, 'id' | 'minutes'>, now: number): TripState {
  check(state, now, ['running'])
  if (!identifier(pause.id) || !nonnegative(pause.minutes) || pause.minutes > 240
    || state.completedBreakIds.includes(pause.id) || state.skippedBreakIds.includes(pause.id)
    || state.activeBreak !== null || remainingDwell(state, now) > 0) {
    throw new RangeError('Invalid, repeated or overlapping break')
  }
  const next = copyState(state)
  next.activities = next.activities.map((activity) => activity.departedAt === null ? { ...activity, departedAt: now } : activity)
  next.activeBreak = { id: pause.id, minutes: pause.minutes, startedAt: now, endsAt: now + pause.minutes * 60_000, pausedMs: 0 }
  next.currentLegStartedAt = null
  next.updatedAt = now
  return next
}

export function endTripBreak(state: TripState, now: number): TripState {
  check(state, now, ['running'])
  if (!state.activeBreak) throw new RangeError('No active break')
  const next = copyState(state)
  next.completedBreakIds.push(state.activeBreak.id)
  next.activeBreak = null
  next.updatedAt = now
  return next
}

export function skipTripBreak(state: TripState, breakId: string, now: number): TripState {
  check(state, now, ['running', 'paused'])
  if (!identifier(breakId)) throw new RangeError('Invalid break identifier')
  if (state.completedBreakIds.includes(breakId) || state.skippedBreakIds.includes(breakId)) return state
  const next = copyState(state)
  next.skippedBreakIds.push(breakId)
  if (next.activeBreak?.id === breakId) next.activeBreak = null
  next.updatedAt = now
  return next
}

export function completeTrip(state: TripState, now: number): TripState {
  check(state, now, ['running', 'paused'])
  const next = state.status === 'paused' ? resumeTrip(state, now) : copyState(state)
  next.activities = next.activities.map((activity) => activity.departedAt === null ? { ...activity, departedAt: now } : activity)
  if (next.activeBreak) {
    if (remainingBreak(next, now) > 0) next.skippedBreakIds.push(next.activeBreak.id)
    else next.completedBreakIds.push(next.activeBreak.id)
    next.activeBreak = null
  }
  return { ...next, status: 'completed', completedAt: now, updatedAt: now,
    lockedNextStopId: null, currentLegStartedAt: null }
}

export function getTripProgress(state: TripState, now: number, remainingPlan?: RoutePlan<JourneyStop>): TripProgress {
  check(state, now)
  const end = state.completedAt ?? now
  const elapsedWallMinutes = state.startedAt === null ? 0 : (end - state.startedAt) / 60_000
  const pausedMinutes = (state.pausedTotalMs + (state.pausedAt === null ? 0 : now - state.pausedAt)) / 60_000
  const elapsedActiveMinutes = Math.max(0, elapsedWallMinutes - pausedMinutes)
  const activeActivity = state.activities.find((activity) => activity.departedAt === null)
  const dwellRemainingMinutes = remainingDwell(state, now)
  const completed = state.status === 'completed'
  return {
    status: state.status, elapsedMinutes: elapsedActiveMinutes, elapsedActiveMinutes, elapsedWallMinutes, pausedMinutes,
    dwellRemainingMinutes, breakRemainingMinutes: remainingBreak(state, now)
      + (activeActivity?.kind === 'restaurant' ? dwellRemainingMinutes : 0),
    remainingEstimate: completed ? { min: 0, max: 0 } : remainingPlan ? { ...remainingPlan.totals.durationMinutes } : null,
    finishWindow: completed ? { earliest: state.completedAt!, latest: state.completedAt! }
      : remainingPlan ? { ...remainingPlan.estimatedFinish } : null,
    estimateAsOf: remainingPlan?.departureTimestamp ?? null,
    finishAssumesImmediateResume: state.status === 'paused',
    visitedIds: state.activities.map((activity) => activity.stopId),
    activities: state.activities.map((activity) => ({ ...activity,
      visitConsumedMinutes: Math.max(0, Math.min(activity.visitMinutes,
        ((activity.departedAt ?? activeClock(state, now)) - activity.arrivedAt - activity.pausedMs) / 60_000 - activity.queueMinutes)),
    })),
  }
}

export function estimateRemainingTrip(state: TripState, input: RemainingTripInput, now: number): RoutePlan<JourneyStop> {
  check(state, now, ['idle', 'running', 'paused'])
  if (!isCoordinate(input.origin) || typeof input.origin.name !== 'string' || !input.origin.name.trim()) {
    throw new RangeError('Remaining-trip estimates require an explicit live origin')
  }
  if (!nonnegative(input.totalAvailableMinutes) || input.totalAvailableMinutes > 1_440) throw new RangeError('Invalid total trip budget')
  const elapsedWall = state.startedAt === null ? 0 : (now - state.startedAt) / 60_000
  const avoidedVisited = [...new Set([...(input.avoidedVisited ?? []), ...state.activities.map((activity) => activity.stopId)])]
  return planRoute({
    ...input, origin: input.origin, returnOrigin: state.home.location, returnToOrigin: true,
    transport: state.transport, departureTimestamp: now, scheduleStartTimestamp: state.startedAt ?? now,
    availableMinutes: Math.max(0, input.totalAvailableMinutes - elapsedWall), avoidedVisited,
    lockedNextStopId: state.lockedNextStopId ?? undefined,
    activeDwellRemainingMinutes: remainingDwell(state, now), activeBreakRemainingMinutes: remainingBreak(state, now),
    breaks: input.breaks?.filter((pause) => pause.id !== state.activeBreak?.id),
    completedBreakIds: [...new Set([...(input.completedBreakIds ?? []), ...state.completedBreakIds])],
    skippedBreakIds: [...new Set([...(input.skippedBreakIds ?? []), ...state.skippedBreakIds])],
  })
}