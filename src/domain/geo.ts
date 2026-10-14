import type { Coordinate } from '../types'

export function isCoordinate(value: unknown): value is Coordinate {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.lat === 'number' && Number.isFinite(candidate.lat)
    && Math.abs(candidate.lat) <= 90
    && typeof candidate.lng === 'number' && Number.isFinite(candidate.lng)
    && Math.abs(candidate.lng) <= 180
}

export function isInKolkata(coordinate: Coordinate): boolean {
  return isCoordinate(coordinate)
    && coordinate.lat >= 22.3 && coordinate.lat <= 22.85
    && coordinate.lng >= 88.15 && coordinate.lng <= 88.65
}

export function haversineMetres(from: Coordinate, to: Coordinate): number {
  if (!isCoordinate(from) || !isCoordinate(to)) throw new RangeError('Invalid coordinate')
  const radians = Math.PI / 180
  const latitudeDelta = (to.lat - from.lat) * radians
  const longitudeDelta = (to.lng - from.lng) * radians
  const chord = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(from.lat * radians) * Math.cos(to.lat * radians)
    * Math.sin(longitudeDelta / 2) ** 2
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, chord))))
}