import type { Coordinate } from '../types'
import { haversineMetres, isCoordinate } from '../domain/geo'
import type { DevicePosition } from '../hooks/useGeolocation'

// Below this displacement a bearing is GPS jitter, not travel: keep the previous heading instead of inventing one.
export const HEADING_MIN_MOVE_METRES = 25
// Device headings reported while nearly stationary are noise; the W3C spec already yields NaN at zero speed.
export const HEADING_MIN_SPEED_MPS = 0.5
export const VEHICLE_ANIMATION_MIN_MS = 120
export const VEHICLE_ANIMATION_MAX_MS = 900

export function validHeading(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 360) return null
  return value % 360
}

export function bearingDegrees(from: Coordinate, to: Coordinate): number | null {
  if (!isCoordinate(from) || !isCoordinate(to)) return null
  const toRadians = Math.PI / 180
  const lat1 = from.lat * toRadians
  const lat2 = to.lat * toRadians
  const dLng = (to.lng - from.lng) * toRadians
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  if (x === 0 && y === 0) return null
  return ((Math.atan2(y, x) / toRadians) + 360) % 360
}

// Returns the heading to show after `sample`, or null when nothing trustworthy changed (callers keep the last one).
export function nextVehicleHeading(previous: DevicePosition | null, sample: DevicePosition): number | null {
  const reported = validHeading(sample.heading)
  if (reported !== null && (sample.speed === null || sample.speed === undefined || sample.speed >= HEADING_MIN_SPEED_MPS)) return reported
  if (!previous || sample.at < previous.at) return null
  const moved = haversineMetres(previous, sample)
  if (!Number.isFinite(moved) || moved < Math.max(HEADING_MIN_MOVE_METRES, Math.min(previous.accuracyMetres, sample.accuracyMetres))) return null
  return bearingDegrees(previous, sample)
}

export function vehicleAnimationMs(metres: number, reducedMotion: boolean): number {
  if (reducedMotion || !Number.isFinite(metres) || metres <= 0) return 0
  return Math.min(VEHICLE_ANIMATION_MAX_MS, Math.max(VEHICLE_ANIMATION_MIN_MS, metres * 4))
}
