import { describe, expect, it } from 'vitest'
import { ALL_PLACES, BROWSABLE_PLACES, PLACE_BY_ID, ALL_START_POINTS, areaCorners, cityForCoordinate, createManualPlace, isInGuideCoverage } from '../../src/data/regions'
import { CURATED_REGIONAL_PANDALS, REGIONAL_PLACES, REGIONAL_SELECTION, UNLOCATED_PUJA_LEADS } from '../../src/data/regionalPlaces'
import { PANDALS } from '../../src/data/pandals'
import { planningFixIssue } from '../../src/components/uiState'

describe('combined regional catalogue and explicit manual points', () => {
  it('keeps all known IDs but browses only located, source-qualified regional theme pandals', () => {
    expect(ALL_PLACES).toHaveLength(PANDALS.length + REGIONAL_PLACES.length)
    expect(BROWSABLE_PLACES.filter((place) => place.kind === 'pandal')).toHaveLength(PANDALS.length + CURATED_REGIONAL_PANDALS.length)
    expect(ALL_PLACES.filter((place) => place.kind === 'restaurant')).toHaveLength(8)
    expect(ALL_PLACES.filter((place) => place.kind === 'sight')).toHaveLength(4)
    expect(BROWSABLE_PLACES.filter((place) => place.city === 'asansol' && place.kind === 'pandal')).toHaveLength(6)
    expect(BROWSABLE_PLACES.filter((place) => place.city === 'durgapur' && place.kind === 'pandal')).toHaveLength(11)
    expect(new Set(ALL_PLACES.map((place) => place.id)).size).toBe(ALL_PLACES.length)
    expect(BROWSABLE_PLACES).toHaveLength(PANDALS.length + CURATED_REGIONAL_PANDALS.length + 8 + 4)
    expect(BROWSABLE_PLACES.filter((place) => place.city !== 'kolkata' && place.kind === 'pandal')
      .every((place) => REGIONAL_SELECTION[place.id]?.eligibleMain === true)).toBe(true)
    expect(UNLOCATED_PUJA_LEADS.every((lead) => !ALL_PLACES.some((place) => place.id === lead.id))).toBe(true)
    expect(ALL_START_POINTS.every(isInGuideCoverage)).toBe(true)
  })

  it('keeps deprecated SEPCO history addressable and Shankarpur browseable with its sourced map point', () => {
    expect(PLACE_BY_ID.has('durgapur-sepco')).toBe(true)
    expect(BROWSABLE_PLACES.some((place) => place.id === 'durgapur-sepco')).toBe(false)
    const shankarpur = BROWSABLE_PLACES.find((place) => place.id === 'durgapur-shankarpur')!
    expect(shankarpur.name).toContain('Shankarpur')
    expect(cityForCoordinate(shankarpur)).toBe('durgapur')
    expect(new URL(shankarpur.sourceUrl).protocol).toBe('https:')
    expect(REGIONAL_SELECTION[shankarpur.id]?.sourceUrls.length).toBeGreaterThan(0)
    expect(BROWSABLE_PLACES.some((place) => /tn.?school|t\.n\.|t n school/i.test(`${place.id} ${place.name}`))).toBe(false)
  })

  it('accepts fresh city fixes and corridor planning without attributing corridor check-ins to a city', () => {
    for (const point of [{ lat: 22.56, lng: 88.35 }, { lat: 23.7, lng: 86.96 }, { lat: 23.55, lng: 87.31 }]) {
      expect(planningFixIssue({ ...point, at: 1_000, accuracyMetres: 20 }, 1_000)).toBeNull()
      expect(cityForCoordinate(point)).not.toBeNull()
    }
    expect(cityForCoordinate({ lat: 23.2, lng: 87.7 })).toBeNull()
    expect(isInGuideCoverage({ lat: 23.2, lng: 87.7 })).toBe(true)
    expect(isInGuideCoverage({ lat: 28.6, lng: 77.2 })).toBe(false)
    expect(areaCorners('all')).toEqual([{ lat: 22.4, lng: 86.8 }, { lat: 23.9, lng: 88.55 }])
  })

  it('creates an unverified session-only place only from an explicit chosen point', () => {
    const lead = UNLOCATED_PUJA_LEADS[0]
    const point = { lat: 23.7, lng: 86.96 }
    const place = createManualPlace(lead, point, 1_000)
    expect(place).toMatchObject({ ...point, id: `manual-${lead.id}-1000`, kind: 'pandal', sourceUrl: lead.sourceUrl })
    expect(place.popularity).toBeUndefined()
    expect(() => createManualPlace(lead, { lat: 0, lng: 0 }, 1_000)).toThrow(RangeError)
  })
})