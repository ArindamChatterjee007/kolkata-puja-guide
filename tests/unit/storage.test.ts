import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { METRO_STATIONS, PANDALS, START_POINTS } from '../../src/data/pandals'
import { planRoute } from '../../src/domain/route'
import {
  decodeSharedPlan, defaultSavedPlan, encodeSharedPlan, loadSavedPlan, parseSavedPlan, savePlan, STORAGE_KEY,
} from '../../src/domain/storage'
import type { SavedPlan } from '../../src/domain/storage'

const now = Date.parse('2026-10-14T12:00:00Z')
const knownIds = ['first', 'second', 'third']
const landmarkIds = ['public-start', 'other-start']

function samplePlan(): SavedPlan {
  return {
    version: 1, stopIds: ['first', 'second'], startId: 'public-start', language: 'bn',
    preference: 'less-walking', pace: 'relaxed', availableMinutes: 90,
    visits: [{ pandalId: 'first', at: now - 1_000, method: 'manual' }],
    reports: [{ pandalId: 'second', reportedAt: now - 2_000, level: 'heavy' }],
  }
}

function parse(value: unknown): SavedPlan | null {
  return parseSavedPlan(JSON.stringify(value), knownIds, landmarkIds, now)
}

describe('versioned plan storage', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(now) })
  afterEach(() => { vi.restoreAllMocks() })

  it('defaults to no selected stops and creates independent arrays', () => {
    const knownIds = ['first', 'second']
    const state = defaultSavedPlan(knownIds, 'public-start')
    expect(state).toEqual({
      version: 1, stopIds: [], startId: 'public-start', language: 'en',
      preference: 'balanced', pace: 'steady', availableMinutes: 240,
      visits: [], reports: [],
    })
    state.stopIds.push('first')
    state.visits.push({ pandalId: 'first', at: 0, method: 'manual' })
    state.reports.push({ pandalId: 'first', reportedAt: 0, level: 'light' })
    expect(defaultSavedPlan(knownIds, 'public-start').stopIds).toEqual([])
    expect(defaultSavedPlan([], 'public-start').visits).toEqual([])
    expect(defaultSavedPlan([], 'public-start').reports).toEqual([])
    expect(knownIds).toEqual(['first', 'second'])
  })

  it('round trips through only the supplied storage key', () => {
    const entries = new Map<string, string>()
    const setItem = vi.fn((key: string, value: string) => { entries.set(key, value) })
    const getItem = vi.fn((key: string) => entries.get(key) ?? null)
    const state = samplePlan()
    const before = JSON.stringify(state)
    expect(savePlan({ setItem }, state)).toEqual({ ok: true, error: null })
    expect(setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, expect.any(String))
    expect(JSON.parse(entries.get(STORAGE_KEY)!)).toEqual(state)
    expect(loadSavedPlan({ getItem }, knownIds, landmarkIds)).toEqual({ state, error: null })
    expect(getItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY)
    expect(JSON.stringify(state)).toBe(before)
  })

  it('projects only allowed keys at every level when parsing and saving', () => {
    const injected = Object.assign(samplePlan(), {
      lat: 22.5647, lng: 88.3519, coords: { latitude: 22.5647, longitude: 88.3519 },
      gps: { accuracy: 5 }, userLocation: 'private-location', departureTime: now,
      padding: 'x'.repeat(110_000),
    })
    Object.assign(injected.visits[0], { lat: 22.5647, coords: { lng: 88.3519 } })
    Object.assign(injected.reports[0], { lng: 88.3519, userLocation: 'private-location' })
    const setItem = vi.fn()
    expect(savePlan({ setItem }, injected)).toEqual({ ok: true, error: null })
    const raw: string = setItem.mock.calls[0][1]
    expect(JSON.parse(raw)).toEqual(samplePlan())
    expect(raw).not.toMatch(/lat|lng|coords|gps|userLocation|departureTime|padding|22\.5647|88\.3519/)
    injected.padding = ''
    expect(parse(injected)).toEqual(samplePlan())
    expect(injected.lat).toBe(22.5647)
  })

  it('never reads unknown getters, cycles, or custom serializers', () => {
    const state = samplePlan()
    Object.defineProperty(state, 'coords', { get: () => { throw new Error('private data') } })
    Object.defineProperty(state, 'toJSON', { get: () => { throw new Error('custom serializer') } })
    Object.assign(state.visits[0], { coords: state, toJSON: () => ({ lat: 22.5647 }) })
    Object.assign(state.reports[0], { coords: state, toJSON: () => ({ lng: 88.3519 }) })
    const setItem = vi.fn()
    expect(savePlan({ setItem }, state)).toEqual({ ok: true, error: null })
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual(samplePlan())
  })

  it('ignores prototype keys without changing object prototypes', () => {
    const raw = JSON.stringify(samplePlan()).replace('{', '{"__proto__":{"polluted":true},"constructor":{"lat":22},')
    const parsed = parseSavedPlan(raw, knownIds, landmarkIds, now)
    expect(parsed).toEqual(samplePlan())
    expect(parsed).not.toHaveProperty('polluted')
    expect(Object.hasOwn(parsed!, '__proto__')).toBe(false)
    expect(Object.hasOwn(parsed!, 'constructor')).toBe(false)
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  })

  it.each([null, '', '{', 'null', '[]', '1', 'true', '"plan"'])('rejects absent or malformed input: %s', raw => {
    expect(parseSavedPlan(raw, knownIds, landmarkIds, now)).toBeNull()
  })

  it('requires every version 1 field and rejects unsupported versions', () => {
    for (const key of Object.keys(samplePlan())) {
      const state: Record<string, unknown> = { ...samplePlan() }
      delete state[key]
      expect(parse(state), key).toBeNull()
    }
    for (const version of [0, 2, '1', null]) {
      expect(parse(Object.assign(samplePlan(), { version }))).toBeNull()
    }
  })

  it('rejects invalid field types, enums, identifiers, and durations', () => {
    const invalidFields = [
      { stopIds: 'first' }, { stopIds: [null] }, { stopIds: [1] }, { stopIds: [''] },
      { startId: { lat: 22.5, lng: 88.3 } }, { startId: '22.5,88.3' },
      { language: 'fr' }, { preference: 'drive' }, { pace: 'fast' },
      { availableMinutes: '90' }, { availableMinutes: 0 }, { availableMinutes: -1 },
      { availableMinutes: 1_440.01 }, { availableMinutes: 1_500 },
      { availableMinutes: NaN }, { availableMinutes: Infinity },
      { visits: {} }, { reports: null },
      { visits: [null] }, { visits: [{ pandalId: 'first', at: now, method: 'gps' }] },
      { reports: [null] }, { reports: [{ pandalId: 'first', reportedAt: now, level: 'quiet' }] },
    ]
    for (const fields of invalidFields) expect(parse(Object.assign(samplePlan(), fields))).toBeNull()
  })

  it('accepts the planner maximum of 24 hours', () => {
    const state = { ...samplePlan(), availableMinutes: 1_440 }
    expect(parse(state)).toEqual(state)
  })

  it('accepts all supported enum alternatives and optional-clock parsing', () => {
    const state = samplePlan()
    state.language = 'en'
    state.pace = 'steady'
    state.visits[0].method = 'auto'
    for (const preference of ['balanced', 'walk', 'less-walking'] as const) {
      state.preference = preference
      for (const level of ['light', 'moderate', 'heavy'] as const) {
        state.reports[0].level = level
        expect(parseSavedPlan(JSON.stringify(state), knownIds, landmarkIds)).toEqual(state)
      }
    }
  })

  it('deduplicates known IDs and keeps the newest histories without changing input', () => {
    const state = samplePlan()
    state.stopIds = ['unknown', 'second', 'first', 'second']
    state.visits = [
      { pandalId: 'unknown', at: now, method: 'auto' },
      { pandalId: 'first', at: now - 1, method: 'manual' },
      { pandalId: 'first', at: now, method: 'auto' },
      { pandalId: 'first', at: now - 2, method: 'manual' },
    ]
    state.reports = [
      { pandalId: 'unknown', reportedAt: now, level: 'light' },
      { pandalId: 'second', reportedAt: now - 1, level: 'light' },
      { pandalId: 'second', reportedAt: now, level: 'heavy' },
      { pandalId: 'second', reportedAt: now - 2, level: 'moderate' },
    ]
    const before = JSON.stringify(state)
    const parsed = parse(state)!
    expect(parsed.stopIds).toEqual(['second', 'first'])
    expect(parsed.visits).toEqual([{ pandalId: 'first', at: now, method: 'auto' }])
    expect(parsed.reports).toEqual([{ pandalId: 'second', reportedAt: now, level: 'heavy' }])
    expect(JSON.stringify(state)).toBe(before)
    expect(parseSavedPlan(before, [], landmarkIds, now)).toEqual(Object.assign(samplePlan(), {
      stopIds: [], visits: [], reports: [],
    }))
  })

  it('caps selections and reports at 12 but retains one visit per known stop', () => {
    const allIds = Array.from({ length: 16 }, (_value, index) => `stop-${index}`)
    const state = samplePlan()
    state.stopIds = ['unknown'].concat(allIds, allIds)
    state.visits = allIds.concat(allIds).map(pandalId => ({ pandalId, at: now, method: 'manual' }))
    state.reports = allIds.concat(allIds).map(pandalId => ({ pandalId, reportedAt: now, level: 'light' }))
    const parsed = parseSavedPlan(JSON.stringify(state), allIds.concat(allIds), landmarkIds, now)!
    expect(parsed.stopIds).toEqual(allIds.slice(0, 12))
    expect(parsed.reports.map(report => report.pandalId)).toEqual(allIds.slice(0, 12))
    expect(parsed.visits.map(visit => visit.pandalId)).toEqual(allIds)
  })

  it('requires the start ID to belong to the public landmark allowlist', () => {
    for (const startId of ['unknown', 'first', 'gps', 'current-location']) {
      expect(parse(Object.assign(samplePlan(), { startId }))).toBeNull()
    }
    expect(parseSavedPlan(JSON.stringify(samplePlan()), knownIds, [], now)).toBeNull()
  })

  it('enforces finite nonnegative timestamps and the exact 60-second future tolerance', () => {
    for (const timestamp of [-1, NaN, Infinity, '123', null, now + 60_001]) {
      expect(parse(Object.assign(samplePlan(), {
        visits: [{ pandalId: 'first', at: timestamp, method: 'auto' }],
      }))).toBeNull()
      expect(parse(Object.assign(samplePlan(), {
        reports: [{ pandalId: 'first', reportedAt: timestamp, level: 'light' }],
      }))).toBeNull()
    }
    const state = samplePlan()
    state.visits[0].at = now + 60_000
    state.reports[0].reportedAt = now + 60_000
    expect(parse(state)).toEqual(state)
    state.visits[0].at = 0
    expect(parse(state)?.visits[0].at).toBe(0)
    for (const clock of [NaN, Infinity, -1]) {
      expect(parseSavedPlan(JSON.stringify(state), knownIds, landmarkIds, clock)).toBeNull()
    }
    expect(parseSavedPlan(JSON.stringify(state).replace('"at":0', '"at":1e999'), knownIds, landmarkIds, now)).toBeNull()
  })

  it('expires reports at two hours without expiring visit history', () => {
    const state = samplePlan()
    state.visits[0].at = now - 24 * 60 * 60 * 1_000
    state.reports = [
      { pandalId: 'first', level: 'light', reportedAt: now - 7_200_000 },
      { pandalId: 'second', level: 'moderate', reportedAt: now - 7_199_999 },
      { pandalId: 'third', level: 'heavy', reportedAt: now - 7_200_001 },
    ]
    const parsed = parse(state)!
    expect(parsed.reports).toEqual([state.reports[1]])
    expect(parsed.visits).toEqual(state.visits)
    const setItem = vi.fn()
    expect(savePlan({ setItem }, state).ok).toBe(true)
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual(parsed)
  })

  it('bounds raw storage by UTF-8 bytes, including ignored fields', () => {
    const raw = JSON.stringify(samplePlan())
    expect(parseSavedPlan(raw.padEnd(100_000, ' '), knownIds, landmarkIds, now)).toEqual(samplePlan())
    expect(parseSavedPlan(raw.padEnd(100_001, ' '), knownIds, landmarkIds, now)).toBeNull()
    const oversized = JSON.stringify(Object.assign(samplePlan(), { extra: '\u0985'.repeat(34_000) }))
    expect(oversized.length).toBeLessThan(100_000)
    expect(parseSavedPlan(oversized, knownIds, landmarkIds, now)).toBeNull()
  })

  it('does not write invalid or oversized plans', () => {
    const setItem = vi.fn()
    for (const minutes of [NaN, Infinity, -1]) {
      expect(savePlan({ setItem }, Object.assign(samplePlan(), { availableMinutes: minutes })).ok).toBe(false)
    }
    expect(savePlan({ setItem }, Object.assign(samplePlan(), { startId: 'a'.repeat(100_000) }))).toEqual({
      ok: false, error: expect.stringMatching(/100 KB/),
    })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('distinguishes empty storage from corrupt content without overwriting either', () => {
    expect(loadSavedPlan({ getItem: () => null }, knownIds, landmarkIds, now)).toEqual({ state: null, error: null })
    expect(loadSavedPlan({ getItem: () => '{' }, knownIds, landmarkIds, now)).toEqual({
      state: null, error: expect.stringMatching(/invalid/),
    })
  })

  it('returns clear errors for blocked reads, quota errors, and unavailable writes', () => {
    const getItem = vi.fn(() => { throw new DOMException('private details', 'SecurityError') })
    expect(loadSavedPlan({ getItem }, knownIds, landmarkIds, now)).toEqual({
      state: null, error: expect.stringMatching(/unavailable or blocked/),
    })
    for (const name of ['QuotaExceededError', 'SecurityError']) {
      const setItem = vi.fn(() => { throw new DOMException('private details', name) })
      const result = savePlan({ setItem }, samplePlan())
      expect(result).toEqual({ ok: false, error: expect.stringMatching(/full, unavailable, or blocked/) })
      expect(result.error).not.toContain('private details')
      expect(setItem).toHaveBeenCalledOnce()
    }
  })
})

describe('public plan sharing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('round trips only the version and public route fields using URLSearchParams', () => {
    const state = samplePlan()
    const hash = encodeSharedPlan(state)
    expect(hash).toBe('#plan=v=1&stops=first%2Csecond&start=public-start&preference=less-walking&pace=relaxed&hours=1.5')
    const decoded = decodeSharedPlan(hash, knownIds, landmarkIds)
    expect(decoded).toEqual({
      version: 1, stopIds: ['first', 'second'], startId: 'public-start',
      preference: 'less-walking', pace: 'relaxed', availableMinutes: 90,
    })
    const params = new URLSearchParams(hash.slice('#plan='.length))
    expect(Array.from(params.keys())).toEqual(['v', 'stops', 'start', 'preference', 'pace', 'hours'])
    expect(Object.assign(defaultSavedPlan(knownIds, 'public-start'), decoded)).toEqual({
      version: 1, stopIds: ['first', 'second'], startId: 'public-start', language: 'en',
      preference: 'less-walking', pace: 'relaxed', availableMinutes: 90, visits: [], reports: [],
    })
  })

  it('round trips an empty selection without inventing stops', () => {
    const state = defaultSavedPlan(knownIds, 'public-start')
    const hash = encodeSharedPlan(state)
    expect(hash).toContain('&stops=&')
    expect(decodeSharedPlan(hash, knownIds, landmarkIds)?.stopIds).toEqual([])
  })

  it('round trips exactly 24 shared hours within the route planner contract', () => {
    const ids = PANDALS.map((pandal) => pandal.id)
    const starts = START_POINTS.map((point) => point.id)
    const state = {
      ...defaultSavedPlan(ids, starts[0]), stopIds: [ids[0]], availableMinutes: 1_440,
    }
    const hash = encodeSharedPlan(state)
    expect(new URLSearchParams(hash.slice('#plan='.length)).get('hours')).toBe('24')
    const decoded = decodeSharedPlan(hash, ids, starts)!
    expect(decoded.availableMinutes).toBe(1_440)
    expect(encodeSharedPlan({ ...state, ...decoded })).toBe(hash)
    const route = planRoute({
      pandals: PANDALS.filter((pandal) => decoded.stopIds!.includes(pandal.id)),
      origin: START_POINTS.find((point) => point.id === decoded.startId)!,
      metroStations: METRO_STATIONS,
      preference: decoded.preference!, pace: decoded.pace!,
      departureTimestamp: now, availableMinutes: decoded.availableMinutes!,
    })
    expect(route.availableMinutes).toBe(1_440)
    expect(route.orderedIds).toEqual(state.stopIds)
    expect(route.overBudget).toBe(false)
  })

  it('never reads or shares local history, language, departure time, or coordinates', () => {
    const state = samplePlan()
    const expected = encodeSharedPlan(state)
    const privateRead = vi.fn(() => { throw new Error('private field read') })
    for (const key of ['language', 'visits', 'reports', 'coords', 'lat', 'lng', 'gps', 'departureTime', 'toJSON']) {
      Object.defineProperty(state, key, { get: privateRead })
    }
    expect(encodeSharedPlan(state)).toBe(expected)
    expect(privateRead).not.toHaveBeenCalled()
  })

  it('strips injected private and unknown query fields instead of importing them', () => {
    const hash = encodeSharedPlan(samplePlan())
    const params = new URLSearchParams(hash.slice('#plan='.length))
    params.set('lat', '22.5647')
    params.set('lng', '88.3519')
    params.set('coords', JSON.stringify({ latitude: 22.5647, longitude: 88.3519 }))
    params.set('visits', JSON.stringify(samplePlan().visits))
    params.set('reports', JSON.stringify(samplePlan().reports))
    params.set('language', 'bn')
    params.set('departureTime', String(now))
    params.set('__proto__', JSON.stringify({ polluted: true }))
    const decoded = decodeSharedPlan('#plan=' + params.toString(), knownIds, landmarkIds)
    expect(decoded).toEqual(decodeSharedPlan(hash, knownIds, landmarkIds))
    const restored = Object.assign(defaultSavedPlan(knownIds, 'public-start'), decoded)
    expect(encodeSharedPlan(restored)).toBe(hash)
  })

  it('filters unknown stops before capping and deduplicates known public IDs', () => {
    const allIds = Array.from({ length: 16 }, (_value, index) => `stop-${index}`)
    const params = new URLSearchParams(encodeSharedPlan(samplePlan()).slice('#plan='.length))
    params.set('stops', ['unknown'].concat(allIds, allIds).join(','))
    const hash = '#plan=' + params.toString()
    expect(decodeSharedPlan(hash, allIds, landmarkIds)?.stopIds).toEqual(allIds.slice(0, 12))
    expect(decodeSharedPlan(hash, [], landmarkIds)?.stopIds).toEqual([])
    const state = Object.assign(samplePlan(), { stopIds: allIds.concat(allIds) })
    const before = JSON.stringify(state)
    expect(decodeSharedPlan(encodeSharedPlan(state), allIds, landmarkIds)?.stopIds).toEqual(allIds.slice(0, 12))
    expect(JSON.stringify(state)).toBe(before)
  })

  it('rejects starts outside the landmark allowlist, including GPS and stop IDs', () => {
    const params = new URLSearchParams(encodeSharedPlan(samplePlan()).slice('#plan='.length))
    for (const start of ['unknown', 'first', 'gps', 'current-location', '22.5647,88.3519', '{"lat":22.5647}']) {
      params.set('start', start)
      expect(decodeSharedPlan('#plan=' + params.toString(), knownIds, landmarkIds)).toBeNull()
    }
    expect(decodeSharedPlan(encodeSharedPlan(samplePlan()), knownIds, [])).toBeNull()
  })

  it.each(['', '#', '#other=v=1', '?plan=v=1', '#plan=', '#plan=%', '#plan=%GG', '#plan=%E0%A4']) (
    'rejects malformed share fragments: %s', hash => {
      expect(decodeSharedPlan(hash, knownIds, landmarkIds)).toBeNull()
    },
  )

  it('rejects missing and duplicate required query parameters', () => {
    const hash = encodeSharedPlan(samplePlan())
    for (const key of ['v', 'stops', 'start', 'preference', 'pace', 'hours']) {
      const missing = new URLSearchParams(hash.slice('#plan='.length))
      missing.delete(key)
      expect(decodeSharedPlan('#plan=' + missing.toString(), knownIds, landmarkIds), key).toBeNull()
      const duplicate = new URLSearchParams(hash.slice('#plan='.length))
      duplicate.append(key, duplicate.get(key)!)
      expect(decodeSharedPlan('#plan=' + duplicate.toString(), knownIds, landmarkIds), key).toBeNull()
    }
  })

  it('rejects unsupported versions, bad enums, malformed lists, and invalid hours', () => {
    const invalidParams = [
      ['v', '2'], ['v', '01'], ['preference', 'drive'], ['pace', 'fast'],
      ['stops', 'first,,second'], ['stops', 'first,'], ['stops', '22.5,88.3'],
      ['hours', ''], ['hours', '0'], ['hours', '-1'], ['hours', 'Infinity'], ['hours', 'NaN'],
      ['hours', '25'], ['hours', '24.0001'],
      ['hours', '1e999'], ['hours', '1e308'], ['hours', '0x10'], ['hours', ' 2'], ['hours', '2hours'],
    ]
    for (const [key, value] of invalidParams) {
      const params = new URLSearchParams(encodeSharedPlan(samplePlan()).slice('#plan='.length))
      params.set(key, value)
      expect(decodeSharedPlan('#plan=' + params.toString(), knownIds, landmarkIds), `${key}=${value}`).toBeNull()
    }
  })

  it('does not encode invalid route values or coordinate-shaped identifiers', () => {
    const invalidFields = [
      { version: 2 }, { stopIds: ['first,second'] }, { stopIds: [{ lat: 22.5, lng: 88.3 }] },
      { startId: { lat: 22.5, lng: 88.3 } }, { startId: 'geo:22.5,88.3' },
      { preference: 'drive' }, { pace: 'fast' }, { availableMinutes: NaN },
      { availableMinutes: Infinity }, { availableMinutes: 0 },
      { availableMinutes: 1_440.01 }, { availableMinutes: 1_500 },
    ]
    for (const fields of invalidFields) expect(encodeSharedPlan(Object.assign(samplePlan(), fields))).toBe('')
  })

  it('bounds both encoded and incoming fragments by UTF-8 bytes', () => {
    const state = Object.assign(samplePlan(), { startId: 'a'.repeat(100_000) })
    expect(encodeSharedPlan(state)).toBe('')
    const hash = encodeSharedPlan(samplePlan()) + '&extra='
    expect(decodeSharedPlan(hash.padEnd(100_001, 'a'), knownIds, landmarkIds)).toBeNull()
    const unicode = hash + '\u0985'.repeat(34_000)
    expect(unicode.length).toBeLessThan(100_000)
    expect(decodeSharedPlan(unicode, knownIds, landmarkIds)).toBeNull()
  })

  it('has no ambient storage, GPS, network, navigation, or clock side effects', () => {
    const unexpected = vi.fn(() => { throw new Error('unexpected side effect') })
    vi.stubGlobal('localStorage', { getItem: unexpected, setItem: unexpected })
    vi.stubGlobal('sessionStorage', { getItem: unexpected, setItem: unexpected })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: unexpected, watchPosition: unexpected } })
    vi.stubGlobal('fetch', unexpected)
    vi.stubGlobal('location', { assign: unexpected, replace: unexpected })
    vi.spyOn(Date, 'now').mockImplementation(unexpected)
    const hash = encodeSharedPlan(samplePlan())
    expect(decodeSharedPlan(hash, knownIds, landmarkIds)?.startId).toBe('public-start')
    expect(parseSavedPlan(JSON.stringify(samplePlan()), knownIds, landmarkIds, now)).toEqual(samplePlan())
    expect(unexpected).not.toHaveBeenCalled()
  })
})