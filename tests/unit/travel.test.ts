import { describe, expect, it } from 'vitest'
import { getLegAlternatives } from '../../src/domain/travel'
import type { LegInput } from '../../src/domain/travel'
import type { MetroStation } from '../../src/types'

const evening = Date.parse('2026-10-13T13:00:00Z')
const esplanade = { lat: 22.5647, lng: 88.3519 }
const stations: MetroStation[] = [
  { id: 'blue-south', name: 'South fixture', nameBn: '', lat: 22.48, lng: 88.34, line: 'blue', order: 1 },
  { id: 'blue-esplanade', name: 'Esplanade', nameBn: '', ...esplanade, line: 'blue', order: 2 },
  { id: 'green-esplanade', name: 'Esplanade', nameBn: '', ...esplanade, line: 'green', order: 1 },
  { id: 'green-east', name: 'East fixture', nameBn: '', lat: 22.58, lng: 88.44, line: 'green', order: 2 },
]

function request(overrides: Partial<LegInput> = {}): LegInput {
  return {
    from: esplanade,
    to: { lat: 22.566, lng: 88.354 },
    metroStations: [],
    preference: 'balanced',
    departureTimestamp: evening,
    pace: 'steady',
    ...overrides,
  }
}

describe('travel alternatives', () => {
  it('recommends walking for a short crowded trip and labels road and geometry honestly', () => {
    const options = getLegAlternatives(request({ metroStations: stations }))
    expect(options.recommended.mode).toBe('walk')
    expect(options.recommended.walkMetres).toBeGreaterThan(300)
    expect(options.recommended.geometryKind).toBe('straight-connectors')
    expect(options.recommended.uncertainty).toContain('not turn-by-turn')
    const road = options.alternatives.find((leg) => leg.mode === 'road')!
    expect(road.durationMinutes.min).toBeGreaterThan(10)
    expect(road.uncertainty).toContain('not a bus timetable')
    expect(options.alternatives.some((leg) => leg.mode === 'metro')).toBe(false)
  })

  it('respects walking preference and pace while less-walking can choose a road transfer', () => {
    const input = request({ to: { lat: 22.5747, lng: 88.3519 } })
    const walking = getLegAlternatives({ ...input, preference: 'walk' }).recommended
    const lessWalking = getLegAlternatives({ ...input, preference: 'less-walking' }).recommended
    expect(walking.mode).toBe('walk')
    expect(lessWalking.mode).toBe('road')
    expect(lessWalking.walkMetres).toBeLessThan(walking.walkMetres)
    const relaxed = getLegAlternatives({ ...input, preference: 'walk', pace: 'relaxed' }).recommended
    expect(relaxed.durationMinutes.min).toBeGreaterThan(walking.durationMinutes.min)
  })

  it('uses line order and weighted paths through the only permitted Esplanade interchange', () => {
    const options = getLegAlternatives(request({
      from: stations[0], to: stations[3], metroStations: [...stations].reverse(),
    }))
    const metro = options.alternatives.find((leg) => leg.mode === 'metro')!
    expect(metro).toBeDefined()
    expect(metro.stationIds).toEqual(['blue-south', 'blue-esplanade', 'green-esplanade', 'green-east'])
    expect(metro.transfers).toBe(1)
    expect(metro.components!.accessMinutes.min).toBeGreaterThan(3)
    expect(metro.components!.waitMinutes.min).toBeGreaterThan(0)
    expect(metro.components!.exitMinutes.min).toBeGreaterThan(2)
    expect(metro.components!.transferMinutes.min).toBeGreaterThan(3)
    expect(metro.walkMetres).toBeGreaterThanOrEqual(450)
    expect(metro.geometry[0]).toEqual({ lat: stations[0].lat, lng: stations[0].lng })
    expect(metro.uncertainty).toContain('operating hours')
  })

  it('excludes distant station access and never invents a same-name transfer elsewhere', () => {
    const far = getLegAlternatives(request({
      from: { lat: 22.51, lng: 88.30 }, to: stations[3], metroStations: stations,
    }))
    expect(far.alternatives.some((leg) => leg.mode === 'metro')).toBe(false)
    const disconnected = stations.map((station) => ({
      ...station, name: station.name === 'Esplanade' ? 'Other intersection' : station.name,
    }))
    const result = getLegAlternatives(request({ from: stations[0], to: stations[3], metroStations: disconnected }))
    expect(result.alternatives.some((leg) => leg.mode === 'metro')).toBe(false)
  })

  it('models typical IST traffic rather than live service and rejects ambiguous station order', () => {
    const input = request({ to: stations[0] })
    const peakRoad = getLegAlternatives(input).alternatives.find((leg) => leg.mode === 'road')!
    const morningRoad = getLegAlternatives({ ...input, departureTimestamp: evening - 9 * 3_600_000 })
      .alternatives.find((leg) => leg.mode === 'road')!
    expect(peakRoad.durationMinutes.max).toBeGreaterThan(morningRoad.durationMinutes.max)
    expect(() => getLegAlternatives({ ...input, metroStations: [stations[0], { ...stations[1], order: 1 }] })).toThrow(RangeError)
  })
})