import type { City, Landmark, Transport } from '../types'
import type { TripBreak } from './route'
import { createTrip, isTripState, restoreTrip } from './trip'
import type { TripHome, TripState } from './trip'
import { decodeSharedPlan, encodeSharedPlan } from './storage'
import type { SavedPlan } from './storage'

export const TRIP_STORAGE_KEY = 'kolkata-puja-guide:trip:v1'
const MAX_BYTES = 100_000
const MAX_ENTRIES = 256
type StoredHome = { kind: 'landmark'; id: string } | Extract<TripHome, { kind: 'coordinate' }> | null
export type TripCheckpoint = Omit<TripState, 'home'>

export interface TripSettings {
  version: 1
  area: City | 'all'
  transport: Transport
  orderMode: 'fastest' | 'nearest'
  autoArrival: boolean
  arrivalSound: boolean
  rememberHome: boolean
  home: StoredHome
  breaks: TripBreak[]
  checkpoint: TripCheckpoint | null
}

export function defaultTripSettings(landmarkId?: string): TripSettings {
  return { version: 1, area: 'kolkata', transport: 'public', orderMode: 'fastest', autoArrival: true,
    arrivalSound: true, rememberHome: false, home: landmarkId ? { kind: 'landmark', id: landmarkId } : null,
    breaks: [], checkpoint: null }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)
}

export function resolveStoredHome(home: StoredHome, landmarks: readonly Landmark[]): TripHome | null {
  if (home?.kind === 'coordinate') return { kind: 'coordinate', location: { ...home.location } }
  const landmark = home?.kind === 'landmark' ? landmarks.find((entry) => entry.id === home.id) : undefined
  return landmark ? { kind: 'landmark', id: landmark.id,
    location: { name: landmark.name, lat: landmark.lat, lng: landmark.lng } } : null
}

export function checkpointTrip(trip: TripState): TripCheckpoint {
  return {
    version: 1, status: trip.status, transport: trip.transport, startedAt: trip.startedAt,
    pausedAt: trip.pausedAt, pausedTotalMs: trip.pausedTotalMs, completedAt: trip.completedAt,
    updatedAt: trip.updatedAt, currentLegStartedAt: trip.currentLegStartedAt,
    lockedNextStopId: trip.lockedNextStopId,
    activities: trip.activities.map((activity) => ({ stopId: activity.stopId, kind: activity.kind,
      method: activity.method, arrivedAt: activity.arrivedAt, departedAt: activity.departedAt,
      visitMinutes: activity.visitMinutes, queueMinutes: activity.queueMinutes,
      dwellUntil: activity.dwellUntil, pausedMs: activity.pausedMs })),
    activeBreak: trip.activeBreak ? { id: trip.activeBreak.id, minutes: trip.activeBreak.minutes,
      startedAt: trip.activeBreak.startedAt, endsAt: trip.activeBreak.endsAt, pausedMs: trip.activeBreak.pausedMs } : null,
    completedBreakIds: [...trip.completedBreakIds], skippedBreakIds: [...trip.skippedBreakIds],
  }
}

export function snapshotTripSettings(settings: TripSettings, home: TripHome | null, trip: TripState | null): TripSettings {
  const storedHome: StoredHome = home?.kind === 'landmark' ? { kind: 'landmark', id: home.id }
    : home && settings.rememberHome ? { kind: 'coordinate', location: {
      name: home.location.name, lat: home.location.lat, lng: home.location.lng,
    } } : null
  return {
    version: 1, area: settings.area, transport: settings.transport, orderMode: settings.orderMode,
    autoArrival: settings.autoArrival, arrivalSound: settings.arrivalSound,
    rememberHome: settings.rememberHome, home: storedHome,
    breaks: settings.breaks.map((pause) => ({ id: pause.id, minutes: pause.minutes,
      ...(pause.afterStopId ? { afterStopId: pause.afterStopId } : {}),
      ...(pause.afterMinutes !== undefined ? { afterMinutes: pause.afterMinutes } : {}) })),
    checkpoint: trip ? checkpointTrip(trip) : settings.checkpoint,
  }
}

export function parseTripSettings(raw: string | null, landmarks: readonly Landmark[], now: number): TripSettings | null {
  if (!raw || raw.length > MAX_BYTES || new TextEncoder().encode(raw).byteLength > MAX_BYTES
    || !Number.isFinite(now) || now < 0) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!record(value) || !keys(value, ['version', 'area', 'transport', 'orderMode', 'autoArrival',
      'arrivalSound', 'rememberHome', 'home', 'breaks', 'checkpoint']) || value.version !== 1
      || !['kolkata', 'asansol', 'durgapur', 'all'].includes(value.area as string)
      || !['personal', 'public', 'walk'].includes(value.transport as string)
      || !['fastest', 'nearest'].includes(value.orderMode as string)
      || typeof value.autoArrival !== 'boolean' || typeof value.arrivalSound !== 'boolean'
      || typeof value.rememberHome !== 'boolean' || !Array.isArray(value.breaks) || value.breaks.length > 24) return null
    const home = value.home
    if (home !== null) {
      if (!record(home)) return null
      if (home.kind === 'landmark') {
        if (!keys(home, ['kind', 'id']) || !landmarks.some((entry) => entry.id === home.id)) return null
      } else {
        if (home.kind !== 'coordinate' || !value.rememberHome || !keys(home, ['kind', 'location'])
          || !record(home.location) || !keys(home.location, ['name', 'lat', 'lng'])
          || typeof home.location.name !== 'string' || home.location.name.length > 120) return null
        createTrip({ home: home as unknown as TripHome }, now)
      }
    }
    const breakIds = new Set<string>()
    for (const pause of value.breaks) {
      if (!record(pause) || !keys(pause, ['id', 'minutes', 'afterStopId', 'afterMinutes'])
        || !identifier(pause.id) || breakIds.has(pause.id) || typeof pause.minutes !== 'number'
        || !Number.isFinite(pause.minutes) || pause.minutes < 5 || pause.minutes > 120
        || (pause.afterStopId !== undefined && !identifier(pause.afterStopId))
        || (pause.afterMinutes !== undefined && (typeof pause.afterMinutes !== 'number'
          || !Number.isFinite(pause.afterMinutes) || pause.afterMinutes < 0 || pause.afterMinutes > 1_440))
        || (pause.afterStopId !== undefined && pause.afterMinutes !== undefined)) return null
      breakIds.add(pause.id)
    }
    if (value.checkpoint !== null) {
      const checkpoint = value.checkpoint
      if (!record(checkpoint) || Object.hasOwn(checkpoint, 'home') || !Array.isArray(checkpoint.activities)
        || checkpoint.activities.length > MAX_ENTRIES || !Array.isArray(checkpoint.completedBreakIds)
        || checkpoint.completedBreakIds.length > MAX_ENTRIES || !Array.isArray(checkpoint.skippedBreakIds)
        || checkpoint.skippedBreakIds.length > MAX_ENTRIES || typeof checkpoint.updatedAt !== 'number'
        || checkpoint.updatedAt > now) return null
      const validationHome: TripHome = { kind: 'coordinate', location: { name: 'Validation only', lat: 0, lng: 0 } }
      if (!isTripState({ ...checkpoint, home: validationHome })) return null
    }
    return value as unknown as TripSettings
  } catch {
    return null
  }
}

export function restoreStoredTrip(settings: TripSettings, home: TripHome | null, now: number): TripState | null {
  if (!home || !settings.checkpoint) return null
  try {
    return restoreTrip({ ...settings.checkpoint, home }, now)
  } catch {
    return null
  }
}

export function saveTripSettings(storage: Pick<Storage, 'setItem'>, settings: TripSettings,
  landmarks: readonly Landmark[], now: number): string | null {
  try {
    const raw = JSON.stringify(settings)
    if (!parseTripSettings(raw, landmarks, now)) return 'Trip settings could not be validated.'
    storage.setItem(TRIP_STORAGE_KEY, raw)
    return null
  } catch {
    return 'Trip settings could not be saved on this device.'
  }
}

export function encodeTripLink(plan: SavedPlan, settings: TripSettings, publicIds: readonly string[]): string {
  const publicStops = new Set(publicIds)
  const legacy = encodeSharedPlan({ ...plan, stopIds: plan.stopIds.filter((id) => publicStops.has(id)) })
  if (!legacy || !plan.stopIds.some((id) => publicStops.has(id))) return ''
  const params = new URLSearchParams(legacy.slice('#plan='.length))
  params.set('v', '2')
  params.set('home', settings.home?.kind === 'landmark' ? settings.home.id : '')
  params.set('transport', settings.transport)
  params.set('order', settings.orderMode)
  params.set('area', settings.area)
  params.set('breaks', JSON.stringify(settings.breaks.filter((pause) => !pause.afterStopId || publicStops.has(pause.afterStopId))
    .map((pause) => ({ id: pause.id, minutes: pause.minutes,
      ...(pause.afterStopId ? { afterStopId: pause.afterStopId } : {}),
      ...(pause.afterMinutes !== undefined ? { afterMinutes: pause.afterMinutes } : {}) }))))
  return `#plan=${params.toString()}`
}

export function decodeTripLink(hash: string, publicIds: string[], landmarks: readonly Landmark[], now: number): {
  plan: Partial<SavedPlan>; settings: TripSettings
} | null {
  if (!hash.startsWith('#plan=') || hash.length > MAX_BYTES) return null
  try {
    const params = new URLSearchParams(hash.slice('#plan='.length))
    const startIds = landmarks.map((landmark) => landmark.id)
    if (params.get('v') === '1') {
      const plan = decodeSharedPlan(hash, publicIds, startIds)
      return plan ? { plan, settings: defaultTripSettings(plan.startId) } : null
    }
    if (params.get('v') !== '2' || ['home', 'transport', 'order', 'area', 'breaks'].some((key) => params.getAll(key).length !== 1)) return null
    const home = params.get('home')
    const settings = parseTripSettings(JSON.stringify({ ...defaultTripSettings(), area: params.get('area'),
      transport: params.get('transport'), orderMode: params.get('order'),
      home: home ? { kind: 'landmark', id: home } : null, breaks: JSON.parse(params.get('breaks')!) }), landmarks, now)
    if (!settings) return null
    params.set('v', '1')
    const plan = decodeSharedPlan(`#plan=${params.toString()}`, publicIds, startIds)
    return plan ? { plan, settings } : null
  } catch {
    return null
  }
}