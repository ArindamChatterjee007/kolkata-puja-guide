import { describe, expect, it } from 'vitest'
import { createDrivingMatrixEstimator, drivingPointKey, drivingProfileHour, DrivingLegUnavailable } from '../../src/domain/drivingAdapter'
import type { DrivingMatrices } from '../../src/domain/drivingAdapter'
import type { DrivingMetrics } from '../../src/domain/driving'
import { validateLegOptions } from '../../src/domain/travel'
import type { LegRequest } from '../../src/domain/travel'
import { planRoute } from '../../src/domain/route'
import type { JourneyStop } from '../../src/types'
import { REGIONAL_PANDALS } from '../../src/data/regionalPlaces'

const points = [{ lat: 23.55, lng: 87.31 }, { lat: 23.551, lng: 87.31 }, { lat: 23.57, lng: 87.32 }]
const now = Date.parse('2026-10-18T06:30:00Z')
const request: LegRequest = { from: points[0], to: points[1], preference: 'balanced', pace: 'steady',
  transport: 'personal', departureTimestamp: now }

function matrices(): DrivingMatrices {
  const costs = [[0, 1, 5], [30, 0, 40], [1, 1, 0]]
  const rows = (factor: number): DrivingMetrics[][] => points.map((from, fromIndex) => points.map((to, toIndex) => ({
    status: 'ok', unknownFallback: false, geometryKind: 'car-network', metres: costs[fromIndex][toIndex] * 100,
    planningSeconds: costs[fromIndex][toIndex] * 60 * factor,
    estimatedSeconds: { min: costs[fromIndex][toIndex] * 60 * factor, max: costs[fromIndex][toIndex] * 60 * factor },
    durationMinutes: { min: costs[fromIndex][toIndex] * factor, max: costs[fromIndex][toIndex] * factor },
    timeProfile: { name: 'fixture', urbanFactor: factor, corridorFactor: factor },
    snaps: { origin: { edgeIndex: 0, fraction: 0, coordinate: from, offsetMetres: 0, maxOffsetMetres: 120,
      osmNodeId: null, accessVerified: false, endpointCoverage: 'city-local' },
    destination: { edgeIndex: 0, fraction: 1, coordinate: to, offsetMetres: 0, maxOffsetMetres: 120,
      osmNodeId: null, accessVerified: false, endpointCoverage: 'city-local' } },
    source: { provider: 'OpenStreetMap', distributor: 'Geofabrik', license: 'ODbL-1.0', attribution: 'OpenStreetMap contributors',
      attributionUrl: 'https://www.openstreetmap.org/copyright', licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      timestamp: '2026-10-14T20:21:12Z', pbfSha256: 'fixture', url: 'https://example.org/fixture' },
    coverage: { cities: [], corridorHighways: [], maxSnapMetres: 120, localRoadsOutsideCities: false, boundaryConnectors: false },
    restrictionsApplied: { viaNodeRelations: 0, conservativelyBlockedRelations: 0, malformedRelationsExcluded: 0,
      forbiddenTransitions: 0, immediateReversalsBlocked: 0 }, warnings: [],
  })))
  return { points, profiles: { 12: rows(1), 9: rows(2), 18: rows(3) } }
}

describe('validated directed car matrices', () => {
  it('accepts explicit regional pandals without fabricating a Kolkata popularity score', () => {
    const sepco = REGIONAL_PANDALS.find((place) => place.id === 'durgapur-sepco')!
    const marconi = REGIONAL_PANDALS.find((place) => place.id === 'durgapur-marconi')!
    const plan = planRoute({ pandals: [marconi], origin: sepco, metroStations: [], preference: 'balanced', pace: 'steady',
      departureTimestamp: now, availableMinutes: 240 })
    expect(plan.orderedIds).toEqual([marconi.id])
    expect(plan.stops[0].queue).toMatchObject({ level: 'unknown', basis: 'unspecified' })
    expect(plan.homeLeg).toBeDefined()
    expect(marconi.popularity).toBeUndefined()
  })

  it('uses exact directed return costs and fastest round trip can start farther away', () => {
    const places: JourneyStop[] = points.slice(1).map((point, index) => ({ ...point, id: `stop-${index}`, name: `Stop ${index}`,
      nameBn: '', kind: 'sight', visitMinutes: 0, queueMinutes: { min: 0, max: 0 }, address: '', description: '',
      descriptionBn: '', highlight: '', highlightBn: '', sourceUrl: 'https://example.org', sourceLabel: 'Fixture',
      verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate' }))
    const input = { pandals: places, origin: { ...points[0], name: 'Home' }, metroStations: [], preference: 'balanced' as const,
      pace: 'steady' as const, departureTimestamp: now, availableMinutes: 100, transport: 'personal' as const,
      legEstimator: createDrivingMatrixEstimator(matrices()) }
    const fastest = planRoute(input)
    const nearest = planRoute({ ...input, orderMode: 'nearest' })
    expect(fastest.orderedIds).toEqual(['stop-1', 'stop-0'])
    expect(fastest.totals.travelMinutes.min).toBe(36)
    expect(nearest.totals.travelMinutes.min).toBe(42)
    expect(fastest.homeLeg?.durationMinutes.min).toBe(30)
    expect(fastest.homeLeg?.geometryKind).toBe('straight-connectors')
    expect(fastest.homeLeg?.offStreetAccess).toBe('unknown')
  })

  it('selects morning/evening/off-peak by each actual departure hour and never rounds cache keys', () => {
    const estimator = createDrivingMatrixEstimator(matrices())
    for (const [hour, factor] of [[7, 1], [8, 2], [10, 2], [11, 1], [17, 3], [21, 3], [22, 1]]) {
      const timestamp = Date.parse(`2026-10-18T${String(hour).padStart(2, '0')}:00:00+05:30`)
      expect(estimator({ ...request, departureTimestamp: timestamp }).recommended.durationMinutes.min).toBe(factor)
    }
    expect(drivingProfileHour(Date.parse('2026-10-19T00:00:00+05:30'))).toBe(12)
    expect(drivingPointKey(points[0])).not.toBe(drivingPointKey({ ...points[0], lat: points[0].lat + 0.000001 }))
  })

  it('rejects missing, invalid, unsnapped and unavailable legs instead of geographic fallback', () => {
    const data = matrices()
    const first = data.profiles[12][0][1]
    if (first.status !== 'ok') throw new Error('fixture')
    data.profiles[12][0][1] = { ...first, status: 'unavailable', reason: 'no-road' }
    expect(() => createDrivingMatrixEstimator(data)(request)).toThrow(DrivingLegUnavailable)
    expect(() => createDrivingMatrixEstimator(matrices())({ ...request, from: { lat: 0, lng: 0 } })).toThrow('point-not-in-matrix')
    expect(() => createDrivingMatrixEstimator({ ...matrices(), points: [...points, points[0]] })).toThrow(RangeError)
    const bad = matrices()
    const metric = bad.profiles[9][0][1]
    if (metric.status === 'ok') metric.estimatedSeconds.max = NaN
    expect(() => createDrivingMatrixEstimator(bad)).toThrow(RangeError)
  })

  it('only accepts car-network geometry with bounded road snaps and explicit unknown access', () => {
    const leg = createDrivingMatrixEstimator(matrices())(request).recommended
    const car = { ...leg, geometryKind: 'car-network' as const, geometry: [{ ...points[0], lat: points[0].lat + 0.0001 }, points[1]] }
    expect(validateLegOptions({ recommended: car, alternatives: [car] }, request).recommended.geometryKind).toBe('car-network')
    for (const invalid of [{ ...car, parking: undefined }, { ...car, geometry: [{ lat: 0, lng: 0 }, points[1]] },
      { ...car, provenance: 'geographic-model' as const }]) {
      expect(() => validateLegOptions({ recommended: invalid, alternatives: [invalid] }, request)).toThrow(RangeError)
    }
  })
})