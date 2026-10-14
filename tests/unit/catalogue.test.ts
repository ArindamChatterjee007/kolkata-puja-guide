import { describe, expect, it } from 'vitest'
import { CURATED_ROUTES, METRO_STATIONS, PANDALS, SOURCE_CHECKED_ON, START_POINTS } from '../../src/data/pandals'
import { createLegEstimator } from '../../src/domain/travel'
import { haversineMetres } from '../../src/domain/geo'

describe('curated catalogue', () => {
  it('has unique stable IDs and source-backed approximate points in Kolkata', () => {
    expect(PANDALS.length).toBeGreaterThanOrEqual(30)
    expect(PANDALS.length).toBeLessThanOrEqual(40)
    expect(new Set(PANDALS.map((pandal) => pandal.id)).size).toBe(PANDALS.length)
    for (const pandal of PANDALS) {
      expect(pandal.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(pandal.lat).toBeGreaterThanOrEqual(22.40)
      expect(pandal.lat).toBeLessThanOrEqual(22.70)
      expect(pandal.lng).toBeGreaterThanOrEqual(88.20)
      expect(pandal.lng).toBeLessThanOrEqual(88.56)
      expect(pandal.coordinateAccuracy).toBe('approximate')
      expect(new URL(pandal.sourceUrl).protocol).toBe('https:')
      expect(pandal.sourceLabel).toContain('approximate')
      expect(pandal.verifiedOn).toBe(SOURCE_CHECKED_ON)
    }
  })

  it('has bilingual copy and finite planning fields', () => {
    for (const pandal of PANDALS) {
      for (const text of [pandal.nameBn, pandal.descriptionBn, pandal.highlightBn]) {
        expect(text).toMatch(/[\u0980-\u09ff]/)
      }
      for (const text of [pandal.name, pandal.description, pandal.highlight, pandal.address]) {
        expect(text.trim().length).toBeGreaterThan(0)
      }
      expect([1, 2, 3]).toContain(pandal.popularity)
      expect(Number.isFinite(pandal.visitMinutes)).toBe(true)
      expect(Number.isInteger(pandal.visitMinutes)).toBe(true)
      expect(pandal.visitMinutes).toBeGreaterThan(0)
      expect(pandal.visitMinutes).toBeLessThanOrEqual(90)
    }
  })

  it('covers every requested zone without treating Sreebhumi as Salt Lake', () => {
    expect(new Set(PANDALS.map((pandal) => pandal.zone))).toEqual(new Set([
      'North', 'Central', 'South', 'Behala', 'Salt Lake', 'New Town',
    ]))
    expect(PANDALS.find((pandal) => pandal.id === 'sreebhumi')?.zone).toBe('North')
  })

  it('keeps station references valid and line orders contiguous', () => {
    const stationIds = new Set(METRO_STATIONS.map((station) => station.id))
    expect(stationIds.size).toBe(METRO_STATIONS.length)
    for (const pandal of PANDALS) {
      if (pandal.nearestMetro) expect(stationIds.has(pandal.nearestMetro)).toBe(true)
    }
    for (const line of ['blue', 'green']) {
      const ordered = METRO_STATIONS.filter((station) => station.line === line)
        .sort((first, second) => first.order - second.order)
      expect(ordered.map((station) => station.order)).toEqual(ordered.map((_station, index) => index + 1))
    }
    for (const point of [...METRO_STATIONS, ...START_POINTS]) {
      expect(point.nameBn).toMatch(/[\u0980-\u09ff]/)
      expect(Number.isFinite(point.lat) && Number.isFinite(point.lng)).toBe(true)
      expect(point.lat).toBeGreaterThanOrEqual(22.40)
      expect(point.lat).toBeLessThanOrEqual(22.70)
      expect(point.lng).toBeGreaterThanOrEqual(88.20)
      expect(point.lng).toBeLessThanOrEqual(88.56)
    }
  })

  it('uses two distinct Esplanade nodes and a working inter-line path', () => {
    const interchange = METRO_STATIONS.filter((station) => station.name === 'Esplanade')
    expect(interchange).toHaveLength(2)
    expect(new Set(interchange.map((station) => station.line))).toEqual(new Set(['blue', 'green']))
    expect(haversineMetres(interchange[0], interchange[1])).toBeLessThanOrEqual(450)
    const estimate = createLegEstimator([...METRO_STATIONS].reverse())({
      from: METRO_STATIONS.find((station) => station.id === 'blue-mahanayak-uttam-kumar')!,
      to: METRO_STATIONS.find((station) => station.id === 'green-sector-v')!,
      preference: 'balanced', pace: 'steady', departureTimestamp: Date.parse('2026-10-13T13:00:00Z'),
    })
    const metro = estimate.alternatives.find((leg) => leg.mode === 'metro')
    expect(metro?.stationIds).toContain('blue-esplanade')
    expect(metro?.stationIds).toContain('green-esplanade')
    expect(metro?.transfers).toBe(1)
  })

  it('has compact examples starting at manually selected landmarks', () => {
    expect(START_POINTS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(START_POINTS.map((point) => point.id)).size).toBe(START_POINTS.length)
    expect(CURATED_ROUTES.length).toBeGreaterThanOrEqual(3)
    expect(CURATED_ROUTES.length).toBeLessThanOrEqual(4)
    expect(new Set(CURATED_ROUTES.map((route) => route.id)).size).toBe(CURATED_ROUTES.length)
    for (const route of CURATED_ROUTES) {
      expect(route.nameBn).toMatch(/[\u0980-\u09ff]/)
      expect(route.descriptionBn).toMatch(/[\u0980-\u09ff]/)
      expect(route.name && route.description).toBeTruthy()
      const start = START_POINTS.find((point) => point.id === route.startId)
      expect(start).toBeDefined()
      expect(route.stopIds.length).toBeGreaterThanOrEqual(2)
      expect(new Set(route.stopIds).size).toBe(route.stopIds.length)
      let previous = start!
      let distance = 0
      for (const id of route.stopIds) {
        const stop = PANDALS.find((pandal) => pandal.id === id)
        expect(stop).toBeDefined()
        const metres = haversineMetres(previous, stop!)
        expect(metres).toBeLessThan(2_000)
        distance += metres
        previous = stop!
      }
      expect(distance).toBeLessThan(5_000)
    }
  })
})