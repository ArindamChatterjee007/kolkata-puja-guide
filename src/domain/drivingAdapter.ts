import type { Coordinate } from '../types'
import type { DrivingMetrics, DrivingRouteResult } from './driving'
import type { LegEstimate, LegEstimator, LegRequest } from './travel'
import { validateLegOptions } from './travel'
import { getIstHour } from './crowd'
import { haversineMetres, isCoordinate } from './geo'

export const DRIVING_PROFILE_HOURS = [12, 9, 18] as const
export type DrivingProfileHour = typeof DRIVING_PROFILE_HOURS[number]
export interface DrivingMatrices {
  points: Coordinate[]
  profiles: Record<DrivingProfileHour, DrivingMetrics[][]>
}

export class DrivingLegUnavailable extends Error {
  readonly fromIndex: number
  readonly toIndex: number
  readonly reason: string
  constructor(fromIndex: number, toIndex: number, reason: string) {
    super(`Car road leg unavailable: ${reason}`)
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.reason = reason
  }
}

export function drivingProfileHour(timestamp: number): DrivingProfileHour {
  const hour = getIstHour(timestamp)
  return hour >= 8 && hour < 11 ? 9 : hour >= 17 && hour < 22 ? 18 : 12
}

export function drivingPointKey(point: Coordinate): string {
  return `${point.lat},${point.lng}`
}

function validMetric(metric: DrivingMetrics, from: Coordinate, to: Coordinate): boolean {
  if (!metric || metric.unknownFallback !== false) return false
  if (metric.status === 'unavailable') return ['invalid-coordinate', 'outside-bounds', 'no-road', 'disconnected-or-restricted'].includes(metric.reason)
  if (metric.status !== 'ok' || metric.geometryKind !== 'car-network' || !metric.estimatedSeconds
    || !Number.isFinite(metric.metres) || metric.metres < 0 || !Number.isFinite(metric.planningSeconds) || metric.planningSeconds < 0
    || !Number.isFinite(metric.estimatedSeconds.min) || metric.estimatedSeconds.min < 0
    || !Number.isFinite(metric.estimatedSeconds.max) || metric.estimatedSeconds.max < metric.estimatedSeconds.min) return false
  return [metric.snaps?.origin, metric.snaps?.destination].every((snap, index) => snap
    && snap.accessVerified === false && isCoordinate(snap.coordinate)
    && Number.isFinite(snap.offsetMetres) && snap.offsetMetres >= 0 && snap.offsetMetres <= 120.1
    && haversineMetres(index === 0 ? from : to, snap.coordinate) <= 120.1)
}

export function createDrivingMatrixEstimator(matrices: DrivingMatrices): LegEstimator {
  const { points, profiles } = matrices
  if (points.length < 1 || points.length > 25 || !points.every(isCoordinate)
    || new Set(points.map(drivingPointKey)).size !== points.length) throw new RangeError('Invalid car matrix points')
  for (const hour of DRIVING_PROFILE_HOURS) {
    const rows = profiles[hour]
    if (!Array.isArray(rows) || rows.length !== points.length || rows.some((row, fromIndex) => !Array.isArray(row)
      || row.length !== points.length || row.some((metric, toIndex) => !validMetric(metric, points[fromIndex], points[toIndex])))) {
      throw new RangeError('Incomplete or invalid car matrix')
    }
  }
  const indices = new Map(points.map((point, index) => [drivingPointKey(point), index]))
  return (request) => {
    if (request.transport !== 'personal') throw new RangeError('Car matrices require personal transport')
    const fromIndex = indices.get(drivingPointKey(request.from))
    const toIndex = indices.get(drivingPointKey(request.to))
    if (fromIndex === undefined || toIndex === undefined) throw new DrivingLegUnavailable(fromIndex ?? -1, toIndex ?? -1, 'point-not-in-matrix')
    const metric = profiles[drivingProfileHour(request.departureTimestamp)][fromIndex][toIndex]
    if (metric.status !== 'ok') throw new DrivingLegUnavailable(fromIndex, toIndex, metric.reason)
    const recommended: LegEstimate = {
      mode: 'road', transport: 'personal', provenance: 'osm-car-network', offStreetAccess: 'unknown', parking: 'unknown',
      durationMinutes: { min: metric.estimatedSeconds.min / 60, max: metric.estimatedSeconds.max / 60 },
      distanceMetres: metric.metres, walkMetres: 0, walkKm: 0, scoreMinutes: metric.planningSeconds / 60,
      geometry: [{ ...request.from }, { ...request.to }], geometryKind: 'straight-connectors',
      uncertainty: 'Directed OSM car-road estimate with static IST time profiles, not live traffic. Overview line is schematic. Parking and off-road walking are unknown and excluded; zero recorded walking is not a no-walking claim.',
    }
    return validateLegOptions({ alternatives: [recommended], recommended }, request)
  }
}

export function drivingRouteLeg(result: DrivingRouteResult, request: LegRequest): LegEstimate {
  if (result.status !== 'ok') throw new DrivingLegUnavailable(-1, -1, result.reason)
  const route = result.route
  const recommended: LegEstimate = {
    mode: 'road', transport: 'personal', provenance: 'osm-car-network', offStreetAccess: 'unknown', parking: 'unknown',
    durationMinutes: { min: route.estimatedSeconds.min / 60, max: route.estimatedSeconds.max / 60 },
    distanceMetres: route.metres, walkMetres: 0, walkKm: 0, scoreMinutes: route.planningSeconds / 60,
    geometry: route.geometry.map((point) => ({ ...point })), geometryKind: 'car-network',
    uncertainty: 'Mapped car roads to road snaps, not entrances. Parking and off-road walking are unknown and excluded. Static estimate, no live traffic; obey signs and police directions.',
  }
  return validateLegOptions({ alternatives: [recommended], recommended }, request).recommended
}