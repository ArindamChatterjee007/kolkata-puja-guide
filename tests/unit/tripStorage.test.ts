import { describe, expect, it } from 'vitest'
import { createTrip, estimateRemainingTrip, startTrip } from '../../src/domain/trip'
import type { TripHome } from '../../src/domain/trip'
import { decodeTripLink, encodeTripLink, defaultTripSettings, parseTripSettings, resolveStoredHome, restoreStoredTrip,
  saveTripSettings, snapshotTripSettings, TRIP_STORAGE_KEY } from '../../src/domain/tripStorage'
import { defaultSavedPlan, parseSavedPlan } from '../../src/domain/storage'

const now = Date.parse('2026-10-18T02:30:00Z')
const landmarks = [{ id: 'public-home', name: 'Public landmark', lat: 23.52, lng: 87.31 }]
const privateHome: TripHome = { kind: 'coordinate', location: { name: 'Private start', lat: 23.521234, lng: 87.312345 } }

describe('separate, privacy-safe trip settings', () => {
  it('leaves the legacy v1 plan intact and defaults new trips to fastest round trips', () => {
    const legacy = defaultSavedPlan(['stop'], 'public-home')
    expect(parseSavedPlan(JSON.stringify(legacy), ['stop'], ['public-home'], now)).toEqual(legacy)
    expect(defaultTripSettings('public-home')).toMatchObject({ orderMode: 'fastest', transport: 'public',
      autoArrival: true, rememberHome: false, home: { kind: 'landmark', id: 'public-home' } })
  })

  it('starts a new trip without a home: the legacy plan start is never promoted automatically', () => {
    const fresh = defaultTripSettings()
    expect(fresh.home).toBeNull()
    expect(resolveStoredHome(fresh.home, landmarks)).toBeNull()
    expect(restoreStoredTrip(fresh, null, now)).toBeNull()
    expect(parseTripSettings(JSON.stringify(fresh), landmarks, now)).toEqual(fresh)
    const explicit = parseTripSettings(JSON.stringify(defaultTripSettings('public-home')), landmarks, now)!
    expect(resolveStoredHome(explicit.home, landmarks)).toEqual({ kind: 'landmark', id: 'public-home',
      location: { name: 'Public landmark', lat: 23.52, lng: 87.31 } })
  })

  it('retains progress but never serializes private home coordinates without opt-in', () => {
    const trip = startTrip(createTrip({ home: privateHome }, now), now)
    const snapshot = snapshotTripSettings(defaultTripSettings(), privateHome, trip)
    const raw = JSON.stringify(snapshot)
    expect(raw).not.toMatch(/Private start|23\.521234|87\.312345|"lat"|"lng"/)
    const restored = parseTripSettings(raw, landmarks, now + 60_000)!
    expect(restored.checkpoint?.startedAt).toBe(now)
    expect(restoreStoredTrip(restored, resolveStoredHome(restored.home, landmarks), now + 60_000)).toBeNull()
    expect(restoreStoredTrip(restored, privateHome, now + 60_000)?.startedAt).toBe(now)
  })

  it('restores public landmarks by ID, and private coordinates only with explicit remembering', () => {
    const home: TripHome = { kind: 'landmark', id: landmarks[0].id, location: landmarks[0] }
    const settings = snapshotTripSettings(defaultTripSettings(), home, null)
    expect(JSON.stringify(settings)).not.toContain('"lat"')
    expect(resolveStoredHome(parseTripSettings(JSON.stringify(settings), landmarks, now)!.home, landmarks)).toEqual({
      kind: 'landmark', id: 'public-home', location: { name: 'Public landmark', lat: 23.52, lng: 87.31 },
    })
    const remembered = snapshotTripSettings({ ...settings, rememberHome: true }, privateHome, null)
    expect(parseTripSettings(JSON.stringify(remembered), landmarks, now)?.home).toEqual(privateHome)
    expect(parseTripSettings(JSON.stringify({ ...remembered, rememberHome: false }), landmarks, now)).toBeNull()
  })

  it('keeps home independent of later device movement and does not subtract elapsed twice', () => {
    const home: TripHome = structuredClone(privateHome)
    const trip = startTrip(createTrip({ home }, now), now)
    home.location.lat += 0.1
    const plan = estimateRemainingTrip(trip, { origin: { name: 'Moved', lat: 23.54, lng: 87.33 },
      pandals: [], metroStations: [], preference: 'walk', pace: 'steady', totalAvailableMinutes: 180 }, now + 30 * 60_000)
    expect(plan.returnOrigin).toEqual(privateHome.location)
    expect(plan.origin.lat).toBe(23.54)
    expect(plan.availableMinutes).toBe(150)
    expect(plan.finishTimestamp).toBeGreaterThan(now + 30 * 60_000)
  })

  it('rejects tampering, future checkpoints, oversize data and conflicting break anchors', () => {
    const settings = snapshotTripSettings(defaultTripSettings(), privateHome,
      startTrip(createTrip({ home: privateHome }, now), now))
    for (const invalid of [{ ...settings, rawGps: [] }, { ...settings, home: { kind: 'landmark', id: 'unknown' } },
      { ...settings, checkpoint: { ...settings.checkpoint, home: privateHome } },
      { ...settings, checkpoint: { ...settings.checkpoint, updatedAt: now + 120_000 } },
      { ...settings, checkpoint: { ...settings.checkpoint, activities: Array(257).fill({}) } },
      { ...settings, breaks: [{ id: 'tea', minutes: 10, afterStopId: 'stop', afterMinutes: 30 }] },
      { ...settings, breaks: [{ id: 'tea', minutes: 121 }] }]) {
      expect(parseTripSettings(JSON.stringify(invalid), landmarks, now)).toBeNull()
    }
    expect(parseTripSettings(' '.repeat(100_001), landmarks, now)).toBeNull()
    expect(parseTripSettings('{', landmarks, now)).toBeNull()
  })

  it('uses its own key and handles blocked storage without losing the in-memory trip', () => {
    const stored = new Map<string, string>()
    const settings = defaultTripSettings('public-home')
    expect(saveTripSettings({ setItem: (key, value) => { stored.set(key, value) } }, settings, landmarks, now)).toBeNull()
    expect([...stored.keys()]).toEqual([TRIP_STORAGE_KEY])
    expect(saveTripSettings({ setItem: () => { throw new Error('blocked') } }, settings, landmarks, now)).toMatch(/could not be saved/)
  })

  it('shares public stops and settings without private coordinates, local pins or progress, and reads legacy links', () => {
    const plan = { ...defaultSavedPlan(['stop'], 'public-home'), stopIds: ['stop', 'manual-hidden-1'] }
    const settings = snapshotTripSettings({ ...defaultTripSettings(), rememberHome: true, transport: 'personal' }, privateHome,
      startTrip(createTrip({ home: privateHome }, now), now))
    const hash = encodeTripLink(plan, settings, ['stop'])
    expect(hash).not.toMatch(/manual|23\.521234|87\.312345|Private|startedAt|checkpoint|lat|lng/)
    expect(decodeTripLink(hash, ['stop'], landmarks, now)).toMatchObject({ plan: { stopIds: ['stop'] },
      settings: { home: null, transport: 'personal', orderMode: 'fastest', checkpoint: null, rememberHome: false } })
    expect(decodeTripLink('#plan=v=1&stops=stop&start=public-home&preference=balanced&pace=steady&hours=4', ['stop'], landmarks, now)?.settings.home)
      .toEqual({ kind: 'landmark', id: 'public-home' })
    expect(decodeTripLink(hash.replace('transport=personal', 'transport=invalid'), ['stop'], landmarks, now)).toBeNull()
  })
})