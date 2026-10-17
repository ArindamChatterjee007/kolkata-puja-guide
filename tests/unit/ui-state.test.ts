import { describe, expect, it } from 'vitest'
import { PANDALS, START_POINTS } from '../../src/data/pandals'
import { getIstHour, isFreshCrowdReport, REPORT_TTL_MS } from '../../src/domain/crowd'
import { haversineMetres } from '../../src/domain/geo'
import { planRoute } from '../../src/domain/route'
import { METRO_STATIONS } from '../../src/data/metro'
import { defaultSavedPlan, encodeSharedPlan } from '../../src/domain/storage'
import type { LegEstimate } from '../../src/domain/travel'
import {
  applyOptimizedOrder, buildShareUrl, clampStops, departureOptions, directionsUrl, explainLeg, foldLatin,
  isInPlanningArea, matchesPandal, moveItem, nextPendingStopId, orderKey, planFreshness, reportTimeLeftMs,
  reportsKey, resolveDeparture, settingsKey, sortPandals, visitedKey, navigationUrl, navigationMode, navigationQuery,
  deviceOriginKey, nearbyPandals, planningFixIssue, NEARBY_RADIUS_METRES, PLANNING_FIX_LIMITS,
} from '../../src/components/uiState'
import type { PlanSettings } from '../../src/components/uiState'
import { formatClock, formatMinuteRange, formatNumber, t } from '../../src/i18n'

const byId = (id: string) => PANDALS.find((pandal) => pandal.id === id)!
const now = Date.parse('2026-10-14T12:00:00Z')

function leg(mode: LegEstimate['mode'], min: number, max: number, walkMetres: number): LegEstimate {
  return {
    mode, durationMinutes: { min, max }, distanceMetres: walkMetres, walkMetres, walkKm: walkMetres / 1000,
    geometry: [], geometryKind: 'straight-connectors', scoreMinutes: (min + max) / 2, uncertainty: '',
    ...(mode === 'metro' ? { stationNames: ['A', 'B'], stationIds: ['a', 'b'], transfers: 0 } : {}),
  }
}

describe('search folding and matching', () => {
  it.each([
    ['Sovabazar', 'Shobhabazar'],
    ['Kumartuli', 'Kumortuli'],
    ['Deshapriya', 'Deshopriyo'],
    ['Sreebhumi', 'Shreebhumi'],
    ['Notun Dal', 'Nutan Dal'],
    ['Pally', 'Palli'],
  ])('folds %s and %s to the same key', (first, second) => {
    expect(foldLatin(first)).toBe(foldLatin(second))
  })

  it('matches Latin variants, Bengali text and ids, and rejects unrelated words', () => {
    const sovabazar = byId('sovabazar-rajbari')
    expect(matchesPandal(sovabazar, 'shobhabazar', 'উত্তর')).toBe(true)
    expect(matchesPandal(sovabazar, 'শোভাবাজার', 'উত্তর')).toBe(true)
    expect(matchesPandal(sovabazar, 'উত্তর', 'উত্তর')).toBe(true)
    expect(matchesPandal(sovabazar, '   ', 'উত্তর')).toBe(true)
    expect(matchesPandal(sovabazar, 'gariahat', 'উত্তর')).toBe(false)
    expect(matchesPandal(byId('66-pally'), '66 pali', 'দক্ষিণ')).toBe(true)
  })

  it('sorts by zone order, name, popularity and distance', () => {
    const zones = sortPandals(PANDALS, 'zone', 'en', null).map((pandal) => pandal.zone)
    expect(zones.indexOf('South')).toBeGreaterThan(zones.lastIndexOf('Central'))
    const names = sortPandals(PANDALS, 'name', 'en', null).map((pandal) => pandal.name)
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names)
    const popular = sortPandals(PANDALS, 'popular', 'en', null)
    expect(popular[0].popularity).toBe(3)
    const nearest = sortPandals(PANDALS, 'nearest', 'en', byId('bagbazar'))
    expect(nearest[0].id).toBe('bagbazar')
  })
})

describe('plan list helpers', () => {
  it('moves items within bounds only', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
  })

  it('finds the next pending stop in list order', () => {
    const visits = [{ pandalId: 'a', at: now, method: 'manual' as const }]
    expect(nextPendingStopId(['a', 'b', 'c'], visits)).toBe('b')
    expect(nextPendingStopId(['a'], visits)).toBeNull()
  })

  it('keeps visited stops ahead of the optimized pending order', () => {
    const stops = ['bagbazar', 'kumartuli-park', 'sovabazar-rajbari', 'ahiritola'].map(byId)
    const plan = planRoute({
      pandals: stops, origin: START_POINTS[0], metroStations: METRO_STATIONS, preference: 'balanced',
      departureTimestamp: now, availableMinutes: 240, pace: 'steady', avoidedVisited: ['sovabazar-rajbari'],
    })
    const ordered = applyOptimizedOrder(stops.map((stop) => stop.id), plan)
    expect(ordered[0]).toBe('sovabazar-rajbari')
    expect(ordered.slice(1)).toEqual(plan.orderedIds)
    expect(ordered).toHaveLength(4)
  })

  it('tracks plan freshness through order, settings, visits and report changes', () => {
    const stops = ['bagbazar', 'kumartuli-park'].map(byId)
    const plan = planRoute({
      pandals: stops, origin: START_POINTS[0], metroStations: METRO_STATIONS, preference: 'balanced',
      departureTimestamp: now, availableMinutes: 240, pace: 'steady',
    })
    const settings: PlanSettings = { preference: 'balanced', pace: 'steady', availableMinutes: 240, originKey: 'x', departureKey: 'now' }
    const snapshot = {
      plan, orderKey: orderKey(plan.orderedIds), settingsKey: settingsKey(settings),
      visitedKey: visitedKey(plan.orderedIds, []), reportsKey: reportsKey(plan.orderedIds, []), createdAt: now,
    }
    expect(planFreshness(null, plan.orderedIds, [], settings, [])).toBe('none')
    expect(planFreshness(snapshot, plan.orderedIds, [], settings, [])).toBe('fresh')
    expect(planFreshness(snapshot, plan.orderedIds, [{ pandalId: plan.orderedIds[0], at: now, method: 'auto' }], settings, [])).toBe('visits-changed')
    expect(planFreshness(snapshot, [...plan.orderedIds].reverse(), [], settings, [])).toBe('changed')
    expect(planFreshness(snapshot, plan.orderedIds, [], { ...settings, pace: 'relaxed' }, [])).toBe('changed')
    const reports = [{ pandalId: plan.orderedIds[0], level: 'heavy' as const, reportedAt: now }]
    expect(planFreshness(snapshot, plan.orderedIds, [], settings, reports)).toBe('changed')
    const reportedSnapshot = { ...snapshot, reportsKey: reportsKey(plan.orderedIds, reports) }
    expect(planFreshness(reportedSnapshot, plan.orderedIds, [], settings, reports)).toBe('fresh')
    expect(planFreshness(reportedSnapshot, plan.orderedIds, [], settings, [{ ...reports[0], level: 'light' }])).toBe('changed')
    expect(planFreshness(reportedSnapshot, plan.orderedIds, [], settings, [{ ...reports[0], reportedAt: now + 1 }])).toBe('changed')
    expect(planFreshness(reportedSnapshot, plan.orderedIds, [], settings, [])).toBe('changed')
    const pruned = reports.filter((report) => isFreshCrowdReport(report, report.pandalId, now + REPORT_TTL_MS))
    expect(pruned).toEqual([])
    expect(planFreshness(reportedSnapshot, plan.orderedIds, [], settings, pruned)).toBe('changed')
    expect(planFreshness(snapshot, plan.orderedIds, [], settings, [{ ...reports[0], pandalId: 'unselected' }])).toBe('fresh')
  })

  it('keys relevant reports independently of array order without mutating them', () => {
    const stops = ['kumartuli-park', 'bagbazar']
    const reports = [
      { pandalId: stops[0], level: 'light' as const, reportedAt: now },
      { pandalId: stops[1], level: 'heavy' as const, reportedAt: now - 1 },
      { pandalId: 'unselected', level: 'moderate' as const, reportedAt: now },
    ]
    const original = structuredClone(reports)
    expect(reportsKey(stops, reports)).toBe(reportsKey([...stops].reverse(), [...reports].reverse()))
    expect(reportsKey(stops, reports)).toBe(reportsKey(stops, reports.slice(0, 2)))
    expect(reportsKey(stops, reports)).not.toBe(reportsKey(stops, reports.slice(0, 1)))
    expect(reports).toEqual(original)
    expect(stops).toEqual(['kumartuli-park', 'bagbazar'])
  })

  it('clamps stops to known, unique ids and the 12-stop limit', () => {
    const known = new Set(['a', 'b', 'c'])
    expect(clampStops(['a', 'zzz', 'a', 'c'], known)).toEqual(['a', 'c'])
    expect(clampStops(Array.from({ length: 20 }, (_, index) => `s${index}`), new Set(Array.from({ length: 20 }, (_, index) => `s${index}`)))).toHaveLength(12)
  })
})

describe('nearby planning', () => {
  const south = { lat: 22.5201, lng: 88.3449, accuracyMetres: 20, at: now }
  const north = { lat: 22.6013, lng: 88.3726, accuracyMetres: 20, at: now }

  it.each([south, north])('ranks the full catalogue from the actual fix and excludes completed visits', (origin) => {
    const original = JSON.stringify(PANDALS)
    const expected = [...PANDALS].sort((first, second) => haversineMetres(origin, first) - haversineMetres(origin, second)
      || first.id.localeCompare(second.id, 'en'))
    const visits = [{ pandalId: expected[0].id, at: now, method: 'manual' as const }]
    const result = nearbyPandals(PANDALS, visits, origin)
    expect(result.withinRadius).toBe(true)
    expect(result.candidates.map(({ pandal }) => pandal.id)).toEqual(expected.slice(1, 5).map((pandal) => pandal.id))
    expect(result.candidates.every(({ distanceMetres }) => distanceMetres <= NEARBY_RADIUS_METRES)).toBe(true)
    expect(result.candidates[0].distanceMetres).toBe(haversineMetres(origin, expected[1]))
    expect(nearbyPandals(PANDALS, [], origin).candidates[0].pandal.id).toBe(expected[0].id)
    expect(JSON.stringify(PANDALS)).toBe(original)
    expect(visits).toHaveLength(1)
  })

  it('labels distant catalogue matches as closest, and handles an exhausted catalogue', () => {
    const result = nearbyPandals(PANDALS, [], { lat: 22.41, lng: 88.21 })
    expect(result.withinRadius).toBe(false)
    expect(result.candidates).toHaveLength(4)
    expect(result.candidates.every(({ distanceMetres }) => distanceMetres > NEARBY_RADIUS_METRES)).toBe(true)
    expect(nearbyPandals([], [], south).candidates).toEqual([])
    expect(nearbyPandals(PANDALS, PANDALS.map((pandal) => ({ pandalId: pandal.id, at: now, method: 'manual' })), south).candidates).toEqual([])
    expect(nearbyPandals(PANDALS, [], { lat: 12.97, lng: 77.59 }).candidates).toEqual([])
    const tied = [{ ...PANDALS[0], id: 'zeta' }, { ...PANDALS[0], id: 'alpha' }]
    expect(nearbyPandals(tied, [], tied[0]).candidates.map(({ pandal }) => pandal.id)).toEqual(['alpha', 'zeta'])
  })

  it('accepts a fresh planning fix through 200 metres but rejects inaccurate and stale fixes', () => {
    expect(planningFixIssue(south, now)).toBeNull()
    expect(planningFixIssue({ ...south, accuracyMetres: 200 }, now)).toBeNull()
    expect(planningFixIssue({ ...south, accuracyMetres: 201 }, now)).toBe('inaccurate')
    expect(planningFixIssue({ ...south, accuracyMetres: 5000 }, now)).toBe('inaccurate')
    expect(planningFixIssue({ ...south, at: now - PLANNING_FIX_LIMITS.maxAgeMs - 1 }, now)).toBe('stale')
    expect(planningFixIssue({ ...south, at: now + PLANNING_FIX_LIMITS.futureToleranceMs + 1 }, now)).toBe('stale')
    expect(planningFixIssue({ ...south, lat: 12.97, lng: 77.59 }, now)).toBe('outside')
  })

  it.each([
    { lat: NaN }, { lng: Infinity }, { accuracyMetres: -1 }, { accuracyMetres: NaN },
    { accuracyMetres: Infinity }, { at: NaN }, { at: Infinity }, { at: -1 },
  ])('rejects malformed fixes: %j', (invalid) => {
    expect(planningFixIssue({ ...south, ...invalid }, now)).toBe('invalid')
  })

  it.each([
    { label: '11 m jitter across a decimal boundary', origin: { ...south, lat: 22.52049 }, next: { ...south, lat: 22.52059 }, expected: 'fresh' },
    { label: '150 m watch movement', origin: south, next: { ...south, lat: south.lat + 0.00135 }, expected: 'location-changed' },
    { label: '33 m movement within a decimal cell', origin: south, next: { ...south, lat: south.lat + 0.0003 }, expected: 'location-changed' },
    { label: 'a refreshed North fix', origin: south, next: north, expected: 'location-changed' },
  ])('compares the snapshot location by distance for $label', ({ origin, next, expected }) => {
    const stops = PANDALS.slice(0, 4)
    const route = planRoute({ pandals: stops, origin: { ...origin, name: 'Current location' }, metroStations: METRO_STATIONS,
      preference: 'balanced', pace: 'steady', availableMinutes: 240, departureTimestamp: now })
    const settings: PlanSettings = { preference: 'balanced', pace: 'steady', availableMinutes: 240,
      originKey: deviceOriginKey(origin), deviceOrigin: origin, departureKey: 'now' }
    const snapshot = { plan: route, orderKey: orderKey(route.orderedIds), settingsKey: settingsKey(settings), deviceOrigin: origin,
      visitedKey: '', reportsKey: reportsKey(route.orderedIds, []), createdAt: now }
    expect(planFreshness(snapshot, route.orderedIds, [], settings, [])).toBe('fresh')
    const moved = { ...settings, originKey: deviceOriginKey(next), deviceOrigin: next }
    expect(settingsKey(moved)).toBe(snapshot.settingsKey)
    expect(planFreshness(snapshot, route.orderedIds, [], moved, [])).toBe(expected)
    expect(planFreshness(snapshot, route.orderedIds, [], { ...settings, originKey: 'manual', deviceOrigin: undefined }, [])).toBe('location-changed')
    expect(planFreshness(snapshot, route.orderedIds, [], { ...settings, pace: 'relaxed' }, [])).toBe('changed')
  })
})

describe('leg explanations', () => {
  it('explains walking, metro and road recommendations in both languages', () => {
    const walk = leg('walk', 10, 14, 800)
    const metro = leg('metro', 22, 30, 500)
    const road = leg('road', 25, 40, 150)
    expect(explainLeg('en', walk, [walk, road, metro], 'balanced')).toBe(t('en', 'whyWalkShort'))
    expect(explainLeg('en', walk, [walk, road], 'balanced')).toBe(t('en', 'whyWalkOnly'))
    expect(explainLeg('en', walk, [walk, road, metro], 'walk')).toContain('Walking')
    const longWalk = leg('walk', 40, 55, 3200)
    expect(explainLeg('en', metro, [longWalk, road, metro], 'less-walking')).toContain('2,700')
    expect(explainLeg('bn', metro, [longWalk, road, metro], 'less-walking')).toContain('২,৭০০')
    expect(explainLeg('en', metro, [leg('walk', 20, 26, 600), road, metro], 'balanced')).toBe(t('en', 'whyMetroFaster'))
    expect(explainLeg('bn', road, [walk, road], 'balanced')).toBe(t('bn', 'whyRoad'))
  })
})

describe('external links and sharing', () => {
  it('builds Google Maps directions with approximate coordinates and optional origin', () => {
    const url = new URL(directionsUrl({ lat: 22.604701, lng: 88.366134 }, { lat: 22.6013, lng: 88.3726 }, 'transit'))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('destination')).toBe('22.60470,88.36613')
    expect(url.searchParams.get('origin')).toBe('22.60130,88.37260')
    expect(url.searchParams.get('travelmode')).toBe('transit')
    expect(new URL(directionsUrl({ lat: 1, lng: 2 }, null, 'walking')).searchParams.has('origin')).toBe(false)
  })

  it.each(['walking', 'transit', 'driving'] as const)('hands off %s without exporting a device origin', (mode) => {
    const url = new URL(navigationUrl(byId('bagbazar'), null, mode)!)
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('22.60470,88.36613')
    expect(url.searchParams.has('origin')).toBe(false)
    expect(url.searchParams.get('travelmode')).toBe(mode)
    expect(url.searchParams.get('dir_action')).toBe(mode === 'transit' ? null : 'navigate')
  })

  it('previews an explicitly selected public or typed origin', () => {
    const url = new URL(navigationUrl(byId('bagbazar'), { lat: 22.6013, lng: 88.3726 }, 'driving')!)
    expect(url.searchParams.get('origin')).toBe('22.60130,88.37260')
    expect(url.searchParams.has('dir_action')).toBe(false)
    const typed = new URL(navigationUrl(' Howrah Station ', ' Esplanade, Kolkata ')!)
    expect(typed.searchParams.get('destination')).toBe('Howrah Station')
    expect(typed.searchParams.get('origin')).toBe('Esplanade, Kolkata')
    expect(typed.searchParams.get('travelmode')).toBe('walking')
  })

  it.each(['হাওড়া স্টেশন', 'javascript:alert(1)&origin=private#<script>'])('encodes a typed destination as data: %s', (query) => {
    const url = new URL(navigationUrl(`  ${query}  `)!)
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('destination')).toBe(query)
    expect(url.searchParams.has('origin')).toBe(false)
    expect([...url.searchParams.keys()]).toEqual(['api', 'destination', 'travelmode', 'dir_action'])
    expect(url.hash).toBe('')
    expect(url.href).not.toContain('<script>')
  })

  it('caps queries and refuses blank destinations, blank explicit origins and invalid coordinates', () => {
    expect(navigationQuery(`  ${'ক'.repeat(220)}  `)).toHaveLength(200)
    expect(new URL(navigationUrl('x'.repeat(220))!).searchParams.get('destination')).toHaveLength(200)
    expect(navigationUrl(' \n ')).toBeNull()
    expect(navigationUrl('Howrah Station', '   ')).toBeNull()
    expect(navigationUrl({ lat: Number.NaN, lng: 88 })).toBeNull()
    expect(navigationUrl({ lat: 91, lng: 88 })).toBeNull()
  })

  it('uses a mode recommendation only from a fresh planned leg', () => {
    expect(navigationMode(leg('walk', 10, 14, 800), 'fresh')).toBe('walking')
    expect(navigationMode(leg('metro', 20, 30, 300), 'fresh')).toBe('transit')
    expect(navigationMode(leg('road', 25, 40, 150), 'fresh')).toBe('driving')
    for (const freshness of ['none', 'changed', 'visits-changed'] as const) {
      expect(navigationMode(leg('road', 25, 40, 150), freshness)).toBe('walking')
      expect(navigationMode(leg('metro', 20, 30, 300), freshness)).toBe('walking')
    }
    expect(navigationMode(undefined, 'fresh')).toBe('walking')
  })

  it('accepts only encoded plan hashes for share URLs', () => {
    const plan = { ...defaultSavedPlan(PANDALS.map((pandal) => pandal.id), START_POINTS[0].id), stopIds: ['bagbazar', 'ahiritola'] }
    const hash = encodeSharedPlan(plan)
    expect(hash.startsWith('#plan=')).toBe(true)
    expect(buildShareUrl({ origin: 'https://example.test', pathname: '/puja/' }, hash)).toBe(`https://example.test/puja/${hash}`)
    expect(buildShareUrl({ origin: 'https://example.test', pathname: '/' }, '')).toBeNull()
    expect(buildShareUrl({ origin: 'https://example.test', pathname: '/' }, '#plan=<script>')).toBeNull()
    expect(buildShareUrl({ origin: 'https://example.test', pathname: '/' }, '#other=1')).toBeNull()
  })
})

describe('time helpers', () => {
  it('builds future IST departure options and resolves them', () => {
    const options = departureOptions(now)
    expect(options).toHaveLength(10)
    for (const option of options) {
      expect(option.timestamp).toBeGreaterThan(now)
      expect(getIstHour(option.timestamp)).toBe(option.istHour)
    }
    // 12:00Z is 17:30 IST, so 10:00-17:00 roll to tomorrow while 18:00+ stay today.
    expect(options.find((option) => option.istHour === 17)?.tomorrow).toBe(true)
    expect(options.find((option) => option.istHour === 18)?.tomorrow).toBe(false)
    expect(resolveDeparture('now', now)).toBe(now)
    expect(resolveDeparture('h20', now)).toBe(options.find((option) => option.istHour === 20)?.timestamp)
    expect(resolveDeparture('bogus', now)).toBe(now)
  })

  it('reports remaining report time and planning-area membership', () => {
    expect(reportTimeLeftMs(undefined, now)).toBe(0)
    expect(reportTimeLeftMs({ pandalId: 'a', level: 'heavy', reportedAt: now - 60 * 60_000 }, now)).toBe(60 * 60_000)
    expect(reportTimeLeftMs({ pandalId: 'a', level: 'heavy', reportedAt: now - 3 * 60 * 60_000 }, now)).toBe(0)
    expect(isInPlanningArea({ lat: 22.55, lng: 88.36 })).toBe(true)
    expect(isInPlanningArea({ lat: 28.61, lng: 77.2 })).toBe(false)
  })

  it('formats clocks, ranges and numbers in English and Bengali', () => {
    expect(formatClock('en', now)).toMatch(/5:30/)
    expect(formatClock('bn', now)).toContain('৫:৩০')
    expect(formatMinuteRange('en', { min: 12.2, max: 29.6 })).toBe('12–30 min')
    expect(formatMinuteRange('bn', { min: 5, max: 5 })).toBe('৫ মিনিট')
    expect(formatNumber('bn', 12)).toBe('১২')
  })
})
