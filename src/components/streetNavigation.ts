import type { Coordinate, CrowdReport, MinuteRange, Pace, Pandal } from '../types'
import type { DevicePosition } from '../hooks/useGeolocation'
import type { StreetHotspot, StreetManeuver } from '../domain/streets'
import { estimateCrowd } from '../domain/crowd'
import type { MessageKey } from '../i18n'

export const STREET_CROWD_MAX_AGE_MS = 15 * 60_000
export const STREET_FIX_MAX_AGE_MS = 30_000
export const STREET_CROWD_WEIGHTS = { light: 0, moderate: 1, heavy: 3 } as const
export const STREET_HOTSPOT_RADIUS_METRES = 180

export const streetManeuverKeys: Record<StreetManeuver, MessageKey> = {
  depart: 'streetDepart', continue: 'streetContinue', 'bear-left': 'streetBearLeft', 'bear-right': 'streetBearRight',
  'turn-left': 'streetTurnLeft', 'turn-right': 'streetTurnRight', 'u-turn': 'streetUTurn', arrive: 'streetArrive',
}

export interface StreetCrowdSnapshot {
  hotspots: StreetHotspot[]
  key: string
  createdAt: number
  expiresAt: number
}

export function streetCrowdSnapshot(pandals: readonly Pandal[], reports: readonly CrowdReport[], at: number): StreetCrowdSnapshot {
  const hotspots: StreetHotspot[] = []
  const entries: unknown[] = []
  let expiresAt = at + STREET_CROWD_MAX_AGE_MS
  for (const pandal of pandals) {
    const estimate = estimateCrowd(pandal, at, reports.find((report) => report.pandalId === pandal.id))
    entries.push([pandal.id, estimate.level, estimate.basis, estimate.reportedAt ?? null])
    if (estimate.expiresAt !== undefined) expiresAt = Math.min(expiresAt, estimate.expiresAt)
    const penaltyPerMetre = STREET_CROWD_WEIGHTS[estimate.level]
    if (penaltyPerMetre > 0) hotspots.push({
      id: pandal.id, lat: pandal.lat, lng: pandal.lng, radiusMetres: STREET_HOTSPOT_RADIUS_METRES, penaltyPerMetre,
    })
  }
  return { hotspots, key: JSON.stringify(entries), createdAt: at, expiresAt }
}

export function streetCrowdStale(snapshot: StreetCrowdSnapshot, currentKey: string, now: number): boolean {
  return currentKey !== snapshot.key || now >= snapshot.expiresAt || now < snapshot.createdAt
}

export function isStreetPoint(point: Coordinate): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && point.lat >= 22.44 && point.lat <= 22.64 && point.lng >= 88.28 && point.lng <= 88.49
}

export function streetFixIssue(position: DevicePosition, now: number): 'inaccurate' | 'stale' | 'outside' | null {
  if (!isStreetPoint(position)) return 'outside'
  if (!Number.isFinite(position.accuracyMetres) || position.accuracyMetres < 0 || position.accuracyMetres > 60) return 'inaccurate'
  if (!Number.isFinite(position.at) || position.at > now || now - position.at > STREET_FIX_MAX_AGE_MS) return 'stale'
  return null
}

export function streetWalkingTime(metres: number, pace: Pace): MinuteRange {
  const slowMetresPerHour = pace === 'relaxed' ? 2500 : 3000
  const fastMetresPerHour = pace === 'relaxed' ? 3000 : 3500
  return { min: Math.ceil(metres / fastMetresPerHour * 60), max: Math.ceil(metres / slowMetresPerHour * 60) }
}

export function needsLocationWatch(journeyActive: boolean, autoCheckIn: boolean, following: boolean): boolean {
  return (journeyActive && autoCheckIn) || following
}