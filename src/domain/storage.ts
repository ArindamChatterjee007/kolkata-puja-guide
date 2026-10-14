import type { CrowdReport, Language, Pace, TravelPreference, Visit } from '../types'
import { REPORT_TTL_MS } from './crowd'

export interface SavedPlan {
  version: 1
  stopIds: string[]
  startId: string
  language: Language
  preference: TravelPreference
  pace: Pace
  availableMinutes: number
  visits: Visit[]
  reports: CrowdReport[]
}

export const STORAGE_KEY = 'kolkata-puja-guide:plan:v1'

const MAX_STORAGE_BYTES = 100_000
const MAX_STOPS = 12
const FUTURE_TOLERANCE_MS = 60_000

type SharedPlan = Pick<SavedPlan,
  'version' | 'stopIds' | 'startId' | 'preference' | 'pace' | 'availableMinutes'>

export function defaultSavedPlan(knownIds: string[], defaultStartId: string): SavedPlan {
  return {
    version: 1,
    stopIds: knownIds.slice(0, 0),
    startId: defaultStartId,
    language: 'en',
    preference: 'balanced',
    pace: 'steady',
    availableMinutes: 240,
    visits: [],
    reports: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1_440
}

function isTimestamp(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isFinite(value)
    && value >= 0 && value <= now + FUTURE_TOLERANCE_MS
}

function fitsStorage(raw: string): boolean {
  return raw.length <= MAX_STORAGE_BYTES
    && new TextEncoder().encode(raw).byteLength <= MAX_STORAGE_BYTES
}

function readSharedFields(
  value: unknown,
  knownIds: ReadonlySet<string> | null,
  knownLandmarkIds: ReadonlySet<string> | null,
): SharedPlan | null {
  if (!isRecord(value) || value.version !== 1
    || !Array.isArray(value.stopIds) || !value.stopIds.every(isId)
    || !isId(value.startId)
    || (knownLandmarkIds !== null && !knownLandmarkIds.has(value.startId))
    || (value.preference !== 'balanced' && value.preference !== 'walk' && value.preference !== 'less-walking')
    || (value.pace !== 'relaxed' && value.pace !== 'steady')
    || !isDuration(value.availableMinutes)) return null

  const stopIds = new Set<string>()
  for (const stopId of value.stopIds) {
    if ((knownIds === null || knownIds.has(stopId)) && stopIds.size < MAX_STOPS) stopIds.add(stopId)
  }
  return {
    version: 1,
    stopIds: Array.from(stopIds),
    startId: value.startId,
    preference: value.preference,
    pace: value.pace,
    availableMinutes: value.availableMinutes,
  }
}

function readPlan(
  value: unknown,
  knownIds: ReadonlySet<string> | null,
  knownLandmarkIds: ReadonlySet<string> | null,
  now: number,
): SavedPlan | null {
  if (!Number.isFinite(now) || now < 0 || !isRecord(value)) return null
  const shared = readSharedFields(value, knownIds, knownLandmarkIds)
  if (shared === null || (value.language !== 'en' && value.language !== 'bn')
    || !Array.isArray(value.visits) || !Array.isArray(value.reports)) return null

  const visits = new Map<string, Visit>()
  for (const entry of value.visits) {
    if (!isRecord(entry) || !isId(entry.pandalId) || !isTimestamp(entry.at, now)
      || (entry.method !== 'manual' && entry.method !== 'auto')) return null
    if (knownIds !== null && !knownIds.has(entry.pandalId)) continue
    const previous = visits.get(entry.pandalId)
    if (previous === undefined || entry.at > previous.at) {
      visits.set(entry.pandalId, { pandalId: entry.pandalId, at: entry.at, method: entry.method })
    }
  }

  const reports = new Map<string, CrowdReport>()
  for (const entry of value.reports) {
    if (!isRecord(entry) || !isId(entry.pandalId) || !isTimestamp(entry.reportedAt, now)
      || (entry.level !== 'light' && entry.level !== 'moderate' && entry.level !== 'heavy')) return null
    if ((knownIds !== null && !knownIds.has(entry.pandalId)) || now - entry.reportedAt >= REPORT_TTL_MS) continue
    const previous = reports.get(entry.pandalId)
    if (previous === undefined || entry.reportedAt > previous.reportedAt) {
      reports.set(entry.pandalId, {
        pandalId: entry.pandalId, level: entry.level, reportedAt: entry.reportedAt,
      })
    }
  }

  return {
    version: 1,
    stopIds: shared.stopIds,
    startId: shared.startId,
    language: value.language,
    preference: shared.preference,
    pace: shared.pace,
    availableMinutes: shared.availableMinutes,
    visits: Array.from(visits.values()),
    reports: Array.from(reports.values()).slice(0, MAX_STOPS),
  }
}

export function parseSavedPlan(
  raw: string | null,
  knownIds: string[],
  knownLandmarkIds: string[],
  now: number = Date.now(),
): SavedPlan | null {
  if (typeof raw !== 'string' || !fitsStorage(raw)) return null
  try {
    const value: unknown = JSON.parse(raw)
    return readPlan(value, new Set(knownIds), new Set(knownLandmarkIds), now)
  } catch {
    return null
  }
}

export function loadSavedPlan(
  storage: Pick<Storage, 'getItem'>,
  knownIds: string[],
  knownLandmarkIds: string[],
  now: number = Date.now(),
): { state: SavedPlan | null, error: string | null } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const state = parseSavedPlan(raw, knownIds, knownLandmarkIds, now)
    return {
      state,
      error: raw !== null && state === null ? 'Saved plan is invalid, unsupported, or larger than 100 KB.' : null,
    }
  } catch {
    return { state: null, error: 'Unable to read the saved plan. Browser storage may be unavailable or blocked.' }
  }
}

export function savePlan(
  storage: Pick<Storage, 'setItem'>,
  state: SavedPlan,
): { ok: boolean, error: string | null } {
  let raw: string
  try {
    const plan = readPlan(state, null, null, Date.now())
    if (plan === null) return { ok: false, error: 'Cannot save an invalid plan.' }
    raw = JSON.stringify(plan)
    if (!fitsStorage(raw)) return { ok: false, error: 'Saved plan exceeds the 100 KB limit.' }
  } catch {
    return { ok: false, error: 'Cannot save an invalid plan.' }
  }
  try {
    storage.setItem(STORAGE_KEY, raw)
    return { ok: true, error: null }
  } catch {
    return { ok: false, error: 'Unable to save the plan. Browser storage may be full, unavailable, or blocked.' }
  }
}

export function encodeSharedPlan(state: SavedPlan): string {
  try {
    const shared = readSharedFields(state, null, null)
    if (shared === null || !isDuration(shared.availableMinutes / 60)) return ''
    const params = new URLSearchParams({
      v: '1',
      stops: shared.stopIds.join(','),
      start: shared.startId,
      preference: shared.preference,
      pace: shared.pace,
      hours: String(shared.availableMinutes / 60),
    })
    const hash = '#plan=' + params.toString()
    return fitsStorage(hash) ? hash : ''
  } catch {
    return ''
  }
}

export function decodeSharedPlan(
  hash: string,
  knownIds: string[],
  knownLandmarkIds: string[],
): Partial<SavedPlan> | null {
  if (typeof hash !== 'string' || !hash.startsWith('#plan=') || !fitsStorage(hash)) return null
  try {
    const query = hash.slice('#plan='.length)
    decodeURIComponent(query)
    const params = new URLSearchParams(query)
    const keys = ['v', 'stops', 'start', 'preference', 'pace', 'hours']
    if (keys.some(key => params.getAll(key).length !== 1) || params.get('v') !== '1') return null
    const hours = params.get('hours')!
    if (!/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(hours)) return null
    const stops = params.get('stops')!
    return readSharedFields({
      version: 1,
      stopIds: stops === '' ? [] : stops.split(','),
      startId: params.get('start'),
      preference: params.get('preference'),
      pace: params.get('pace'),
      availableMinutes: Number(hours) * 60,
    }, new Set(knownIds), new Set(knownLandmarkIds))
  } catch {
    return null
  }
}