import { describe, expect, it } from 'vitest'
import type { City, JourneyStop } from '../../src/types'
import { PANDALS } from '../../src/data/pandals'
import { CURATED_REGIONAL_PANDALS, FOOD_BREAK_MINUTES, FOOD_STOPS, REGIONAL_COVERAGE_NOTICES, REGIONAL_CURATION_CHECKED_AT, REGIONAL_FOLLOWUP_CHECKED_AT, REGIONAL_ID_ALIASES, REGIONAL_PANDALS, REGIONAL_PLACES, REGIONAL_SELECTION, REGIONAL_SOURCE_CHECKED_AT, REGIONAL_THEME_SEEDS, SIGHT_STOPS, THEMED_REGIONAL_IDS, UNLOCATED_PUJA_LEADS } from '../../src/data/regionalPlaces'
import { PLACE_INSIGHT_LABELS, PLACE_INSIGHTS, RECENT_COVERAGE } from '../../src/data/placeInsights'
import { getRegionalPreviewEmbedUrl, REGIONAL_POST_PREVIEWS } from '../../src/data/regionalCuration'

const bounds: Record<City, { lat: [number, number]; lng: [number, number] }> = {
  kolkata: { lat: [22.3, 23], lng: [88.15, 88.6] },
  asansol: { lat: [23.5, 23.85], lng: [86.8, 87.15] },
  durgapur: { lat: [23.35, 23.7], lng: [87.15, 87.55] },
}

describe('regional place contract', () => {
  it('merges with the untouched Kolkata catalogue using unique stable IDs', () => {
    const combined: JourneyStop[] = [...PANDALS, ...REGIONAL_PLACES]
    expect(new Set(combined.map((place) => place.id)).size).toBe(combined.length)
    for (const place of REGIONAL_PLACES) {
      expect(place.id).toMatch(/^[a-z]+(?:-[a-z0-9]+)+$/)
      const prefix = place.kind === 'pandal' ? place.city : `${place.kind === 'restaurant' ? 'food' : 'sight'}-${place.city}`
      expect(place.id.startsWith(`${prefix}-`)).toBe(true)
      expect(['kolkata', 'asansol', 'durgapur']).toContain(place.city)
      expect(['pandal', 'restaurant', 'sight']).toContain(place.kind)
      expect(place.district).not.toBe('')
      expect(place.nameBn).not.toBe('')
      expect(place.coordinateAccuracy).toBe('approximate')
      expect(place.entrySurveyed).toBe(false)
      expect(place.lat).toBeGreaterThanOrEqual(bounds[place.city].lat[0])
      expect(place.lat).toBeLessThanOrEqual(bounds[place.city].lat[1])
      expect(place.lng).toBeGreaterThanOrEqual(bounds[place.city].lng[0])
      expect(place.lng).toBeLessThanOrEqual(bounds[place.city].lng[1])
      expect(new URL(place.sourceUrl).protocol).toBe('https:')
      expect(place.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not turn a planning allowance into a measured queue', () => {
    for (const place of REGIONAL_PLACES) {
      expect(place.visitMinutes).toBeGreaterThan(0)
      expect(place.queueMinutes).toBeUndefined()
      expect(place.popularity).toBeUndefined()
    }
  })

  it('preserves the published temple coordinate as a sight, not a pandal', () => {
    expect(SIGHT_STOPS.find((place) => place.id === 'sight-asansol-kalyaneshwari-temple')).toMatchObject({
      city: 'asansol', kind: 'sight', lat: 23.777222, lng: 86.828333,
    })
  })

  it('keeps evidence and missing photography explicit for every regional place', () => {
    for (const place of REGIONAL_PLACES) {
      const insight = PLACE_INSIGHTS[place.id]
      expect(insight?.placeId).toBe(place.id)
      expect(insight?.city).toBe(place.city)
      expect(insight?.sources.some((source) => source.supports.includes('coordinate'))).toBe(true)
      expect(insight?.sources.some((source) => source.supports.includes('identity'))).toBe(true)
      expect(insight?.sources.some((source) => source.url === place.sourceUrl)).toBe(true)
      expect(insight?.trending).toBe(false)
      expect(insight?.media.status).toBe(insight?.media.previews?.length ? 'external-posts' : 'unavailable')
      if (insight?.history) expect(insight.history.split(/\s+/).length).toBeLessThanOrEqual(160)
    }
  })

  it('marks food durations as estimates and leaves unverified practical details unknown', () => {
    expect(FOOD_BREAK_MINUTES).toBe(45)
    for (const place of FOOD_STOPS) {
      const insight = PLACE_INSIGHTS[place.id]
      expect(place.kind).toBe('restaurant')
      expect(place.visitMinutes).toBe(FOOD_BREAK_MINUTES)
      expect(insight?.recommendationLabel).toBe('Suggested food stop')
      expect(insight?.food?.durationBasis).toBe('planning-estimate')
      expect(insight?.food?.mealBreakMinutes).toBe(45)
      expect(insight?.food?.bookingMade).toBe(false)
      expect(insight?.food?.detourMinutes).toBeNull()
      expect(insight?.food?.cost).toBeNull()
      expect(insight?.food?.wheelchairAccessible).toBeNull()
      if (insight?.food?.cuisine) {
        expect(insight.sources.some((source) => source.supports.includes('cuisine'))).toBe(true)
      }
      if (insight?.food?.openingHours) {
        expect(insight.food.openingHoursAsOf).not.toBeNull()
        expect(insight.sources.some((source) => source.supports.includes('opening-hours'))).toBe(true)
      }
    }
  })

  it('retains dated recent coverage without manufacturing trends or mapped locations', () => {
    const knownPlaceIds = new Set([...PANDALS, ...REGIONAL_PLACES].map((place) => place.id))
    const knownInsightIds = new Set([...knownPlaceIds, ...UNLOCATED_PUJA_LEADS.map((lead) => lead.id)])
    const coverageIds = new Set(RECENT_COVERAGE.map((coverage) => coverage.id))
    expect(coverageIds.size).toBe(RECENT_COVERAGE.length)
    for (const coverage of RECENT_COVERAGE) {
      expect(coverage.publishedAt).toMatch(/^2026-\d{2}-\d{2}$/)
      const ageDays = (Date.parse(coverage.checkedAt) - Date.parse(coverage.publishedAt)) / 86_400_000
      expect(ageDays).toBeGreaterThanOrEqual(0)
      expect(ageDays).toBeLessThanOrEqual(14)
      expect(coverage.placeName).not.toBe('')
      expect(new URL(coverage.url).protocol).toBe('https:')
      expect(coverage.summary.split(/\s+/).length).toBeLessThanOrEqual(80)
      expect(coverage.comparativeEvidence).toBeNull()
      if (coverage.placeId !== null) expect(knownPlaceIds.has(coverage.placeId)).toBe(true)
    }
    for (const [placeId, insight] of Object.entries(PLACE_INSIGHTS)) {
      expect(knownInsightIds.has(placeId)).toBe(true)
      expect(insight?.placeId).toBe(placeId)
      expect(insight?.trending).toBe(false)
      for (const coverageId of insight?.recentCoverageIds ?? []) {
        expect(coverageIds.has(coverageId)).toBe(true)
        expect(RECENT_COVERAGE.find((coverage) => coverage.id === coverageId)?.city).toBe(insight?.city)
      }
    }
  })

  it('meets the food coverage target without counting restaurants or sights as pandals', () => {
    expect(FOOD_STOPS.filter((place) => place.city === 'kolkata')).toHaveLength(2)
    expect(FOOD_STOPS.filter((place) => place.city === 'asansol')).toHaveLength(3)
    expect(FOOD_STOPS.filter((place) => place.city === 'durgapur')).toHaveLength(3)
    expect(SIGHT_STOPS.map((place) => place.kind)).toEqual(['sight', 'sight', 'sight', 'sight'])
    expect(PANDALS).toHaveLength(33)
  })

  it('does not fill the pandal target with guessed locations or duplicate grounds', () => {
    expect(REGIONAL_PANDALS.map((place) => place.id)).toEqual(expect.arrayContaining(['durgapur-sepco', 'durgapur-marconi']))
    expect(REGIONAL_PLACES).toEqual([...REGIONAL_PANDALS, ...FOOD_STOPS, ...SIGHT_STOPS])
    expect(new Set(REGIONAL_PANDALS.map((place) => `${place.lat},${place.lng}`)).size).toBe(REGIONAL_PANDALS.length)
    for (const place of REGIONAL_PANDALS) {
      const sources = PLACE_INSIGHTS[place.id]?.sources ?? []
      const identitySources = sources.filter((source) => source.supports.includes('identity'))
      const coordinateSources = sources.filter((source) => source.supports.includes('coordinate'))
      expect(identitySources.some((identity) => coordinateSources.some((coordinate) => coordinate.url !== identity.url))).toBe(true)
    }
    expect(REGIONAL_COVERAGE_NOTICES.asansol.en).toContain('Partial coverage')
    expect(REGIONAL_COVERAGE_NOTICES.durgapur.en).toContain('Partial coverage')
  })

  it('keeps reported but unlocated pujas separate from every mapped or routable stop', () => {
    const mappedIds = new Set([...PANDALS, ...REGIONAL_PLACES].map((place) => place.id))
    const excludedIds = ['durgapur-tn-school', 'asansol-kalikrishna-ashram', 'asansol-burnpur-town']
    for (const id of excludedIds) {
      expect(mappedIds.has(id)).toBe(false)
      expect(UNLOCATED_PUJA_LEADS.some((lead) => lead.id === id)).toBe(false)
      expect(PLACE_INSIGHTS[id]).toBeUndefined()
    }
    expect(UNLOCATED_PUJA_LEADS.some((lead) => /T\.?\s*N\.?\s*School/i.test(lead.name))).toBe(false)
    expect(new Set(UNLOCATED_PUJA_LEADS.map((lead) => lead.id)).size).toBe(UNLOCATED_PUJA_LEADS.length)
    expect(REGIONAL_PANDALS.filter((place) => place.id.startsWith('asansol-kalyanpur-')).map((place) => place.id)).toEqual([
      'asansol-kalyanpur-k-sector', 'asansol-kalyanpur-adi-puja', 'asansol-kalyanpur-scheme-2',
    ])
    for (const lead of UNLOCATED_PUJA_LEADS) {
      expect(mappedIds.has(lead.id)).toBe(false)
      expect(lead.requiresManualPin).toBe(true)
      expect(lead.eligibleMain).toBe(false)
      expect(['asansol', 'durgapur']).toContain(lead.city)
      expect(lead.name).not.toBe('')
      expect(lead.nameBn).not.toBe('')
      expect(lead.locationNote).not.toBe('')
      expect(new URL(lead.sourceUrl).protocol).toBe('https:')
      expect(Number.isFinite(Date.parse(lead.checkedAt))).toBe(true)
      for (const field of ['lat', 'lng', 'coordinates', 'kind', 'visitMinutes', 'popularity', 'queueMinutes']) {
        expect(lead).not.toHaveProperty(field)
      }
    }
  })

  it('keeps source-backed manual lead insights without granting them pin evidence or a ranking', () => {
    expect(PLACE_INSIGHT_LABELS.locateReportedPandal.en).toBe('Research only')
    expect(PLACE_INSIGHT_LABELS.awaitingMapLocation.en).toBe('Awaiting map location')
    for (const lead of UNLOCATED_PUJA_LEADS) {
      const insight = PLACE_INSIGHTS[lead.id]
      expect(insight?.city).toBe(lead.city)
      expect(insight?.sources.some((source) => source.url === lead.sourceUrl && source.supports.includes('identity'))).toBe(true)
      if (lead.address) {
        expect(insight?.sources.some((source) => source.url === (lead.addressSourceUrl ?? lead.sourceUrl) && source.supports.includes('address'))).toBe(true)
      }
      expect(insight?.locationEvidence).toBeUndefined()
      expect(insight?.sources.some((source) => source.supports.includes('coordinate'))).toBe(false)
      expect(insight?.media.status).toBe(insight?.media.previews?.length ? 'external-posts' : 'unavailable')
      expect(insight?.recommendationLabel).toBeNull()
      expect(insight?.trending).toBe(false)
      if (insight?.history) {
        expect(insight.sources.some((source) => source.supports.includes('history'))).toBe(true)
        expect(insight.history.split(/\s+/).length).toBeLessThanOrEqual(80)
      }
    }
  })

  it('uses newly matched grounds without reusing wrong historical links or duplicating aliases', () => {
    const mappedIds = new Set(REGIONAL_PANDALS.map((place) => place.id))
    expect(mappedIds.has('asansol-new-upper-chelidanga')).toBe(false)
    expect(UNLOCATED_PUJA_LEADS.find((lead) => lead.id === 'asansol-new-upper-chelidanga')?.locationNote).toContain('2023 throwback')
    expect(PLACE_INSIGHTS['durgapur-chaturanga']?.locationEvidence).toMatchObject({
      coordinateSourceUrl: 'https://maps.app.goo.gl/PCQyARt5FecyAUyD8', matchedName: 'Chaturanga Durga Puja',
    })
    expect(PLACE_INSIGHTS['durgapur-chaturanga']?.locationEvidence?.caveat).toContain('Cement Park is rejected')
    expect(PLACE_INSIGHTS['durgapur-agrani']?.locationEvidence?.matchedName).toBe('New Agrani Puja Ground')
    expect(REGIONAL_ID_ALIASES['durgapur-khudiram-math']).toBe('durgapur-54-foot-benachity')
    expect(mappedIds.has('durgapur-khudiram-math')).toBe(false)
    expect(UNLOCATED_PUJA_LEADS.some((lead) => lead.id === 'durgapur-khudiram-math')).toBe(false)
    expect(REGIONAL_PANDALS.find((place) => place.id === 'durgapur-shankarpur')).toMatchObject({ lat: 23.5269002, lng: 87.3571152 })
    expect(REGIONAL_PANDALS.find((place) => place.id === 'durgapur-bhiringi-nabarun')).toMatchObject({ lat: 23.5480658, lng: 87.2699157 })
    expect(REGIONAL_PANDALS.some((place) => place.lat === 23.5480562 && place.lng === 87.2699434)).toBe(false)
  })

  it('retains the other thirteen original coordinates and explicitly replaces the generic Marconi anchor', () => {
    const originalCoordinates = [
      ['durgapur-sepco', 23.5498992, 87.31662885],
      ['food-kolkata-college-street-coffee-house', 22.576097, 88.3638913],
      ['food-kolkata-kewpies', 22.5365892, 88.3509509],
      ['food-asansol-66-grand-trunk', 23.6817, 86.988],
      ['food-asansol-gangar-hotel', 23.6889, 86.9497],
      ['food-asansol-garam-masala', 23.6857872, 86.974351],
      ['food-durgapur-roor', 23.540114, 87.2925209],
      ['food-durgapur-qmin', 23.4857607, 87.3856893],
      ['food-durgapur-saffron-grill', 23.5696998, 87.33568665],
      ['sight-kolkata-victoria-memorial', 22.5449, 88.3425],
      ['sight-asansol-kalyaneshwari-temple', 23.777222, 86.828333],
      ['sight-durgapur-barrage', 23.4754, 87.3023],
      ['sight-durgapur-garh-jungle', 23.6061, 87.4296],
    ] as const
    for (const [id, lat, lng] of originalCoordinates) {
      expect(REGIONAL_PLACES.find((place) => place.id === id)).toMatchObject({ lat, lng })
    }
    expect(REGIONAL_PANDALS.find((place) => place.id === 'durgapur-marconi')).toMatchObject({ lat: 23.5666714, lng: 87.3117825 })
    expect(PLACE_INSIGHTS['durgapur-marconi']?.locationEvidence).toMatchObject({
      coordinateSourceUrl: 'https://maps.app.goo.gl/T2D3uK17GeWnmN4K9', matchedName: 'Marconi Dakshin Pally Durgapuja Maidan',
    })
    expect(REGIONAL_PANDALS.some((place) => place.lat === 23.5663757 && place.lng === 87.3107181)).toBe(false)
    expect(REGIONAL_PLACES).toHaveLength(REGIONAL_PANDALS.length + FOOD_STOPS.length + SIGHT_STOPS.length)
    expect(Object.keys(PLACE_INSIGHTS)).toHaveLength(REGIONAL_PLACES.length + UNLOCATED_PUJA_LEADS.length + 2)
    expect(new Set([...PANDALS, ...REGIONAL_PLACES, ...UNLOCATED_PUJA_LEADS].map((place) => place.id)).size)
      .toBe(PANDALS.length + REGIONAL_PLACES.length + UNLOCATED_PUJA_LEADS.length)
  })

  it('links each new pin to an annual identity, matched host address and separate coordinate source', () => {
    expect(REGIONAL_PANDALS.find((place) => place.id === 'durgapur-buddha-bihar')).toMatchObject({
      lat: 23.5517329, lng: 87.3110228, coordinateRole: 'named-grounds',
    })
    const existingIds = new Set(['durgapur-sepco'])
    for (const place of REGIONAL_PANDALS.filter((candidate) => !existingIds.has(candidate.id))) {
      const insight = PLACE_INSIGHTS[place.id]
      const evidence = insight?.locationEvidence
      expect(evidence).toBeDefined()
      expect(evidence?.identitySourceUrl).not.toBe(evidence?.coordinateSourceUrl)
      expect(evidence?.matchedName).not.toBe('')
      expect(evidence?.matchedAddress).toBe(place.address)
      expect(evidence?.confidence).toBe('approximate-host')
      expect(evidence?.caveat).not.toBe('')
      for (const [fact, url] of [
        ['identity', evidence?.identitySourceUrl],
        ['address', evidence?.addressSourceUrl],
        ['coordinate', evidence?.coordinateSourceUrl],
      ] as const) {
        expect(insight?.sources.some((source) => source.url === url && source.supports.includes(fact))).toBe(true)
      }
    }
  })

  it('separates the UTC source review from old map edits and undated listings', () => {
    expect(REGIONAL_SOURCE_CHECKED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(REGIONAL_FOLLOWUP_CHECKED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    for (const insight of Object.values(PLACE_INSIGHTS)) {
      for (const source of insight?.sources ?? []) {
        expect(new URL(source.url).protocol).toBe('https:')
        expect(source.publisher).not.toBe('')
        expect(source.title).not.toBe('')
        expect([REGIONAL_SOURCE_CHECKED_AT, REGIONAL_FOLLOWUP_CHECKED_AT, REGIONAL_CURATION_CHECKED_AT]).toContain(source.checkedAt)
        if (source.publishedAt === null) {
          expect(source.dateBasis).toBe('undated')
        } else {
          expect(Date.parse(source.publishedAt)).toBeLessThanOrEqual(Date.parse(source.checkedAt))
          expect(source.dateBasis).not.toBe('undated')
        }
        if (source.snapshotAt) {
          expect(Date.parse(source.snapshotAt)).toBeLessThanOrEqual(Date.parse(source.checkedAt))
          expect(source.licenseUrl).toBe('https://www.openstreetmap.org/copyright')
        }
      }
    }
  })

  it('selects only qualified themed hosts and keeps unlocated, heritage and unqualified entries out of the main flow', () => {
    expect(THEMED_REGIONAL_IDS).toEqual(CURATED_REGIONAL_PANDALS.map((place) => place.id))
    expect(CURATED_REGIONAL_PANDALS.filter((place) => place.city === 'asansol').length).toBeGreaterThanOrEqual(5)
    expect(CURATED_REGIONAL_PANDALS.filter((place) => place.city === 'durgapur').length).toBeGreaterThanOrEqual(8)
    expect(THEMED_REGIONAL_IDS).toContain('durgapur-shankarpur')
    for (const place of [...REGIONAL_PANDALS, ...UNLOCATED_PUJA_LEADS]) {
      const selection = REGIONAL_SELECTION[place.id]
      expect(selection?.reasonEn).not.toBe('')
      expect(selection?.reasonBn).not.toBe('')
      expect(selection?.availability).toBe('unknown')
      expect(selection?.parking).toBe('unknown')
      expect(selection?.carAccess).toBe('unknown')
      expect(selection?.eligibleMain).toBe(selection?.eligible === true)
      expect(place.eligibleMain).toBe(selection?.eligibleMain)
      expect(THEMED_REGIONAL_IDS.includes(place.id)).toBe(selection?.eligibleMain)
    }
    expect(REGIONAL_SELECTION['durgapur-sepco']).toMatchObject({ eligible: false, eligibleMain: false, locationStatus: 'approximate-host', qualityGate: 'not-met' })
    expect(REGIONAL_SELECTION['durgapur-palashdiha']).toMatchObject({ eligible: false, eligibleMain: false })
    expect(REGIONAL_SELECTION['durgapur-gopalmath']).toMatchObject({ eligible: 'needs-location', eligibleMain: false, locationStatus: 'needs-location', availability: 'unknown' })
    expect(REGIONAL_SELECTION['asansol-new-upper-chelidanga']).toMatchObject({ classification: 'heritage', eligibleMain: false })
    expect(RECENT_COVERAGE.find((coverage) => coverage.id === 'asansol-kalikrishna-20261010')?.eligibleMain).toBe(false)
    for (const id of ['durgapur-tn-school', 'asansol-kalikrishna-ashram', 'asansol-burnpur-town']) {
      expect(REGIONAL_SELECTION[id]).toBeUndefined()
      expect(REGIONAL_POST_PREVIEWS.some((preview) => preview.placeId === id)).toBe(false)
    }
  })

  it('requires theme, visitor-appeal and independent location evidence for every default regional pandal', () => {
    for (const place of CURATED_REGIONAL_PANDALS) {
      const selection = REGIONAL_SELECTION[place.id]
      const insight = PLACE_INSIGHTS[place.id]
      expect(selection?.classification).toBe('major-themed')
      expect(selection?.qualityGate).toBe('two-local-guides')
      expect(new Set(selection?.sourceUrls).size).toBeGreaterThanOrEqual(2)
      const selectionSources = insight?.sources.filter((entry) => selection?.sourceUrls.includes(entry.url)) ?? []
      expect(new Set(selectionSources.map((entry) => entry.publisher)).size).toBeGreaterThanOrEqual(2)
      expect(selectionSources.some((entry) => entry.supports.includes('theme'))).toBe(true)
      expect(selectionSources.some((entry) => entry.supports.includes('visitor-appeal'))).toBe(true)
      expect(insight?.locationEvidence?.matchedAddress).toBe(place.address)
      expect(insight?.locationEvidence?.identitySourceUrl).not.toBe(insight?.locationEvidence?.coordinateSourceUrl)
      expect(insight?.sources.some((entry) => entry.url === insight.locationEvidence?.coordinateSourceUrl && entry.supports.includes('coordinate'))).toBe(true)
      for (const url of selection?.sourceUrls ?? []) expect(selectionSources.some((entry) => entry.url === url)).toBe(true)
      if (selection?.themeStatus === 'conflicting') expect(selection.currentTheme).toBeNull()
      if (selection?.historicalTheme) expect(selection.historicalTheme.year).toBe(2021)
    }
    for (const id of ['asansol-rabindranagar', 'asansol-netaji-sporting']) {
      expect(REGIONAL_SELECTION[id]).toMatchObject({ currentTheme: null, themeYear: 2026, themeStatus: 'conflicting' })
    }
  })

  it('keeps Kalyanpur organisers distinct and never stores a directions endpoint as a puja feature', () => {
    const expected = [
      ['asansol-kalyanpur-k-sector', 23.6999792, 86.9584407],
      ['asansol-kalyanpur-adi-puja', 23.7019336, 86.9582026],
      ['asansol-kalyanpur-scheme-2', 23.7044255, 86.9564085],
      ['asansol-rabindranagar', 23.6885322, 86.9442909],
      ['asansol-netaji-sporting', 23.6723739, 86.9445177],
    ] as const
    for (const [id, lat, lng] of expected) {
      expect(REGIONAL_PANDALS.find((place) => place.id === id)).toMatchObject({ lat, lng, eligibleMain: true })
      expect(PLACE_INSIGHTS[id]?.locationEvidence?.coordinateSourceUrl).toContain(`!3d${lat}!4d${lng}`)
    }
    expect(REGIONAL_PANDALS.some((place) => place.lat === 23.6884884 && place.lng === 86.9443292)).toBe(false)
    expect(REGIONAL_PANDALS.some((place) => place.lat === 23.7022148 && place.lng === 86.9580927)).toBe(false)
    for (const [id, url] of [
      ['asansol-kalyanpur-k-sector', 'https://bharatbz.com/west-bengal/k-sector-kalyanpur-housing-durga-puja-70160'],
      ['asansol-kalyanpur-adi-puja', 'https://bharatbz.com/west-bengal/kalyanpur-adi-puja-1490102'],
    ]) expect(PLACE_INSIGHTS[id]?.sources.some((entry) => entry.url === url && entry.supports.includes('address'))).toBe(true)
  })

  it('exports canonical dated source previews without social thumbnails, HTML or guessed footage years', () => {
    const knownIds = new Set([...REGIONAL_PLACES, ...UNLOCATED_PUJA_LEADS].map((place) => place.id))
    expect(new Set(REGIONAL_POST_PREVIEWS.map((preview) => preview.id)).size).toBe(REGIONAL_POST_PREVIEWS.length)
    expect(new Set(REGIONAL_POST_PREVIEWS.map((preview) => `${preview.placeId}:${preview.url}`)).size).toBe(REGIONAL_POST_PREVIEWS.length)
    for (const preview of REGIONAL_POST_PREVIEWS) {
      const url = new URL(preview.url)
      expect(knownIds.has(preview.placeId)).toBe(true)
      expect(preview.previewType).toBe('external-post')
      expect(['youtube', 'instagram', 'facebook', 'news']).toContain(preview.sourceType)
      expect(url.protocol).toBe('https:')
      expect(url.username).toBe('')
      expect(url.hash).toBe('')
      expect([...url.searchParams.keys()]).toEqual(preview.sourceType === 'youtube' ? ['v'] : [])
      expect(preview.thumbnail).toBeNull()
      expect(preview.title).not.toBe('')
      expect(preview.publisher).not.toBe('')
      expect(preview.caption).not.toBe('')
      expect(JSON.stringify(preview)).not.toMatch(/<\/?(?:iframe|script|img)|fbcdn\.net|ytimg\.com|thumbnail_url/i)
      expect(preview.checkedAt).toBe(REGIONAL_CURATION_CHECKED_AT)
      if (preview.publishedAt === null) expect(preview.datePrecision).toBe('unknown')
      else {
        expect(Date.parse(preview.publishedAt)).toBeLessThanOrEqual(Date.parse(preview.checkedAt))
        expect(preview.datePrecision).toBe(preview.publishedAt.includes('T') ? 'second' : 'day')
      }
      if (preview.contentKind === 'theme-plan' || preview.contentKind === 'unverified-footage') expect(preview.footageYear).toBeNull()
      if (preview.footageYear === 2026) expect(preview.footageYearBasis).toBe('title-and-description')
      expect(PLACE_INSIGHTS[preview.placeId]?.media.previews).toContainEqual(preview)
      expect(PLACE_INSIGHTS[preview.placeId]?.sources.some((entry) => entry.url === preview.url && entry.supports.includes('coverage'))).toBe(true)
    }
    expect(REGIONAL_POST_PREVIEWS.find((preview) => preview.id === 'asansol-new-upper-chelidanga-retrospective-2023')).toMatchObject({
      publishedAt: '2026-09-11T14:52:17Z', footageYear: 2023, year: 2023, contentKind: 'retrospective',
    })
    expect(REGIONAL_POST_PREVIEWS.find((preview) => preview.id === 'durgapur-agrani-pandal-2026')?.publishedAt).toBe('2026-10-16T06:47:06Z')
    expect(REGIONAL_POST_PREVIEWS.find((preview) => preview.id === 'durgapur-shankarpur-first-look-2026')?.footageYear).toBeNull()
    expect(REGIONAL_POST_PREVIEWS.find((preview) => preview.id === 'asansol-apcar-garden-tour-2026')?.footageYear).toBeNull()
    for (const insight of Object.values(PLACE_INSIGHTS)) {
      const dates = (insight?.media.previews ?? []).map((preview) => preview.publishedAt === null ? -Infinity : Date.parse(preview.publishedAt))
      for (let index = 1; index < dates.length; index++) expect(dates[index]).toBeLessThanOrEqual(dates[index - 1])
    }
  })

  it('requires explicit consent for verified YouTube embeds and always retains an external link', () => {
    for (const preview of REGIONAL_POST_PREVIEWS) {
      expect(getRegionalPreviewEmbedUrl(preview.id)).toBeNull()
      expect(getRegionalPreviewEmbedUrl(preview.id, false)).toBeNull()
      expect(preview.url).toMatch(/^https:/)
      if (preview.embed) {
        expect(preview.sourceType).toBe('youtube')
        expect(preview.embed).toMatchObject({ requiresConsent: true, autoplay: false, verification: 'public-player-and-oembed', referrerPolicy: 'strict-origin-when-cross-origin' })
        expect(getRegionalPreviewEmbedUrl(preview.id, true)).toBe(`https://www.youtube-nocookie.com/embed/${new URL(preview.url).searchParams.get('v')}`)
      } else expect(getRegionalPreviewEmbedUrl(preview.id, true)).toBeNull()
    }
    expect(getRegionalPreviewEmbedUrl('unknown-preview', true)).toBeNull()
  })

  it('offers source-qualified seed sets without pretending they are an automatic route or a complete day plan', () => {
    for (const ids of Object.values(REGIONAL_THEME_SEEDS)) {
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(REGIONAL_SELECTION[id]?.eligibleMain).toBe(true)
    }
    expect(new Set(REGIONAL_THEME_SEEDS.crossCity.map((id) => REGIONAL_SELECTION[id]?.city))).toEqual(new Set(['asansol', 'durgapur']))
  })
})