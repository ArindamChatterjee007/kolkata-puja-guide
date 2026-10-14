import { describe, expect, it } from 'vitest'
import { estimateCrowd, getIstHour, REPORT_TTL_MS } from '../../src/domain/crowd'
import { haversineMetres, isCoordinate, isInKolkata } from '../../src/domain/geo'

const esplanade = { lat: 22.5647, lng: 88.3519 }
const evening = Date.parse('2026-10-13T12:30:00Z')

describe('distance and crowd estimates', () => {
  it('measures haversine distance in metres, symmetrically and with zero identity', () => {
    expect(haversineMetres(esplanade, esplanade)).toBe(0)
    const north = { lat: esplanade.lat + 0.01, lng: esplanade.lng }
    expect(haversineMetres(esplanade, north)).toBeCloseTo(1_111.95, 1)
    expect(haversineMetres(north, esplanade)).toBe(haversineMetres(esplanade, north))
  })

  it('rejects invalid coordinates and recognizes clearly out-of-city locations', () => {
    expect(isCoordinate({ lat: NaN, lng: 88 })).toBe(false)
    expect(isCoordinate({ lat: 91, lng: 88 })).toBe(false)
    expect(() => haversineMetres(esplanade, { lat: 22, lng: Infinity })).toThrow(RangeError)
    expect(isInKolkata(esplanade)).toBe(true)
    expect(isInKolkata({ lat: 28.6139, lng: 77.209 })).toBe(false)
  })

  it('uses IST and typical deterministic patterns, not a date-specific live claim', () => {
    expect(getIstHour(evening)).toBe(18)
    expect(getIstHour(Date.parse('2026-10-13T19:00:00Z'))).toBe(0)
    const popular = { id: 'north', popularity: 3 as const }
    const result = estimateCrowd(popular, evening)
    expect(result).toEqual(estimateCrowd(popular, Date.parse('2027-03-01T12:30:00Z')))
    expect(result.level).toBe('heavy')
    expect(result.basis).toBe('typical-model')
    expect(result.label).toContain('not a live observation')
    expect(result.queueMinutes.min).toBeLessThan(result.queueMinutes.max)
    expect(estimateCrowd({ id: 'quiet', popularity: 1 }, evening - 8 * 3_600_000).level).toBe('light')
  })

  it('labels fresh local reports and ignores expired, future, or mismatched reports', () => {
    const pandal = { id: 'north', popularity: 3 as const }
    const report = { pandalId: pandal.id, level: 'light' as const, reportedAt: evening }
    const local = estimateCrowd(pandal, evening + REPORT_TTL_MS - 1, report)
    expect(local.level).toBe('light')
    expect(local.basis).toBe('local-report')
    expect(local.label).toContain('Your local report')
    expect(local.expiresAt).toBe(evening + REPORT_TTL_MS)
    expect(estimateCrowd(pandal, evening + REPORT_TTL_MS, report).basis).toBe('typical-model')
    expect(estimateCrowd(pandal, evening - 1, report).basis).toBe('typical-model')
    expect(estimateCrowd({ ...pandal, id: 'other' }, evening, report).basis).toBe('typical-model')
  })

  it('fails explicitly for invalid estimate clocks and popularity', () => {
    expect(() => getIstHour(Infinity)).toThrow(RangeError)
    expect(() => getIstHour(9e15)).toThrow(RangeError)
    expect(() => estimateCrowd({ id: 'bad', popularity: 0 as 1 }, evening)).toThrow(RangeError)
  })
})