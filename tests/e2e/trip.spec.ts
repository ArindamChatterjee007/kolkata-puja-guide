import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createDrivingRouter } from '../../src/domain/driving'
import { ALL_PLACES, BROWSABLE_PLACES, ALL_START_POINTS } from '../../src/data/regions'
import type { SavedPlan } from '../../src/domain/storage'
import type { TripSettings } from '../../src/domain/tripStorage'
import { formatNumber, t } from '../../src/i18n'
import { emitGps, expect, FIXED_TIME, geoCalls, savedPlan, seedPlan, setVisibility, STORAGE_KEY, test } from './planner.fixture'

const TRIP_STORAGE_KEY = 'kolkata-puja-guide:trip:v1'
const ASANSOL_HOME = { lat: 23.6812, lng: 86.9754, accuracy: 9 }
// Inside the guide coverage but west of the Durgapur city rectangle: a home may sit anywhere in the mapped region.
const WEST_OF_DURGAPUR_HOME = { lat: 23.5021, lng: 87.1512, accuracy: 12 }
const placesOf = (city: string, kind = 'pandal') => BROWSABLE_PLACES.filter((place) => (city === 'all' || place.city === city) && (place.kind ?? 'pandal') === kind).length

declare global {
  interface Window {
    __tripQA: { workers: number; terminated: number; matrices: number[]; routes: number; sounds: number;
      unavailable: boolean; hold: boolean; pending: (() => void)[] }
  }
}

async function prepare(page: Page, options: { stops?: string[]; start?: string; settings?: Partial<TripSettings>; plan?: Partial<SavedPlan>; realCar?: boolean } = {}) {
  const start = options.start ?? 'start-blue-shyambazar'
  await seedPlan(page, { stopIds: options.stops ?? ['bagbazar', 'kumartuli-park'], startId: start, availableMinutes: 360, ...options.plan })
  await page.addInitScript(({ key, settings, realCar }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(settings))
    const qa = { workers: 0, terminated: 0, matrices: [] as number[], routes: 0, sounds: 0,
      unavailable: false, hold: false, pending: [] as (() => void)[] }
    window.__tripQA = qa
    const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} })
    class QuietAudio {
      state = 'suspended'
      currentTime = 0
      destination = {}
      async resume() { this.state = 'running' }
      async close() { this.state = 'closed' }
      createOscillator() { return { type: '', frequency: parameter(), connect() {}, disconnect() {},
        start() { qa.sounds += 1 }, stop() {}, onended: null } }
      createGain() { return { gain: parameter(), connect() {}, disconnect() {} } }
    }
    Object.defineProperty(window, 'AudioContext', { value: QuietAudio, configurable: true })
    if (realCar) return
    const NativeWorker = window.Worker
    const source = { provider: 'OpenStreetMap', distributor: 'Geofabrik', license: 'ODbL-1.0', attribution: 'OpenStreetMap contributors',
      attributionUrl: 'https://www.openstreetmap.org/copyright', licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
      timestamp: '2026-10-14T20:21:12Z', pbfSha256: 'synthetic-ui-fixture', url: 'https://example.org/synthetic-ui-fixture' }
    const common = { source, unknownFallback: false, coverage: { cities: [], corridorHighways: [], maxSnapMetres: 120,
      localRoadsOutsideCities: false, boundaryConnectors: false }, restrictionsApplied: { viaNodeRelations: 0,
      conservativelyBlockedRelations: 0, malformedRelationsExcluded: 0, forbiddenTransitions: 0, immediateReversalsBlocked: 0 }, warnings: ['Synthetic UI fixture, not real routing evidence.'] }
    const snap = (coordinate: { lat: number; lng: number }) => ({ coordinate, offsetMetres: 0, edgeIndex: 0, fraction: 0,
      maxOffsetMetres: 120, osmNodeId: null, accessVerified: false, endpointCoverage: 'city-local' })
    const metric = (from: { lat: number; lng: number }, to: { lat: number; lng: number }, hour: number) => {
      if (qa.unavailable) return { ...common, status: 'unavailable', reason: 'no-road', snaps: { origin: null, destination: null } }
      const metres = Math.hypot((from.lat - to.lat) * 111_000, (from.lng - to.lng) * 102_000) * 1.4
      const seconds = metres / 8 * (hour === 9 ? 1.3 : hour === 18 ? 1.6 : 1)
      return { ...common, status: 'ok', metres, planningSeconds: seconds,
        estimatedSeconds: { min: seconds * 0.9, max: seconds * 2 }, durationMinutes: { min: seconds * 0.9 / 60, max: seconds * 2 / 60 },
        timeProfile: { name: 'ui-fixture', urbanFactor: 1, corridorFactor: 1 }, geometryKind: 'car-network', snaps: { origin: snap(from), destination: snap(to) } }
    }
    class CarWorker extends EventTarget {
      closed = false
      constructor() { super(); qa.workers += 1 }
      postMessage(request: { type: string; requestId: number; points: { lat: number; lng: number }[]; hour: number; origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }) {
        const emit = (data: object) => queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: { requestId: request.requestId, ...data } })))
        if (request.type === 'load') { emit({ type: 'progress', phase: 'static', loadedBytes: 17_000, totalBytes: 17_000 }); emit({ type: 'loaded' }) }
        if (request.type === 'matrix') {
          qa.matrices.push(request.hour)
          const finish = () => {
            const rows = request.points.map((from) => request.points.map((to) => metric(from, to, request.hour)))
            emit({ type: 'progress', phase: 'matrix', completedRows: rows.length, totalRows: rows.length, hour: request.hour, row: rows[0] })
            emit({ type: 'matrix', rows, hour: request.hour, unknownFallback: false })
          }
          if (qa.hold) qa.pending.push(finish)
          else finish()
        }
        if (request.type === 'route') {
          qa.routes += 1
          const data = metric(request.origin, request.destination, 12)
          if (data.status === 'unavailable') { emit({ type: 'route', result: data }); return }
          const geometry = [request.origin, { lat: request.origin.lat, lng: request.destination.lng }, request.destination]
          const flags = { bridge: false, flyover: false, tunnel: false, roundabout: false, toll: false }
          emit({ type: 'route', result: { ...common, status: 'ok', snaps: data.snaps, route: { strategy: 'fastest-estimated', geometryKind: 'car-network',
            metres: data.metres, estimatedSeconds: data.estimatedSeconds, planningSeconds: data.planningSeconds, timeProfile: data.timeProfile,
            geometry, cumulativeMetres: [0, data.metres! / 2, data.metres], segments: [], osmWayIds: [1], steps: [
              { maneuver: 'depart', name: 'Fixture road', ref: 'UI-1', at: geometry[0], metres: data.metres! / 2, flags, osmWayIds: [1], startGeometryIndex: 0, endGeometryIndex: 1 },
              { maneuver: 'turn-left', name: 'Fixture flyover', ref: null, at: geometry[1], metres: data.metres! / 2, flags: { ...flags, bridge: true, flyover: true }, osmWayIds: [1], startGeometryIndex: 1, endGeometryIndex: 2 },
              { maneuver: 'arrive', name: null, ref: null, at: geometry[2], metres: 0, flags, osmWayIds: [1], startGeometryIndex: 2, endGeometryIndex: 2 },
            ] } } })
        }
      }
      terminate() { if (!this.closed) qa.terminated += 1; this.closed = true }
    }
    window.Worker = function (url: string | URL, workerOptions?: WorkerOptions) {
      return String(url).includes('driving.worker') ? new CarWorker() : new NativeWorker(url, workerOptions)
    } as unknown as typeof Worker
  }, { key: TRIP_STORAGE_KEY, settings: { version: 1, area: 'kolkata', transport: 'public', orderMode: 'fastest', autoArrival: true,
    arrivalSound: true, rememberHome: false, home: { kind: 'landmark', id: start }, breaks: [], checkpoint: null, ...options.settings }, realCar: options.realCar ?? false })
}

async function tripSettings(page: Page): Promise<TripSettings> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), TRIP_STORAGE_KEY)
}

async function startTrip(page: Page) {
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true }).click()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'running')
}

async function setHomeFromGps(page: Page, fix: { lat: number; lng: number; accuracy: number }, language: 'en' | 'bn' = 'en') {
  await page.getByRole('button', { name: t(language, 'useLocationAsHome'), exact: true }).click()
  await emitGps(page, fix)
  await expect(page.locator('.trip-bar__home strong')).toHaveText(t(language, 'myHome'))
}

async function optimize(page: Page) {
  await page.locator('.optimize > button').click()
  await expect(page.locator('.estimate')).toBeVisible({ timeout: 65_000 })
}

async function dwell(page: Page, id: string) {
  const place = ALL_PLACES.find((entry) => entry.id === id)!
  for (let index = 0; index < 4; index += 1) {
    if (index) await page.clock.fastForward(15_000)
    await emitGps(page, { lat: place.lat, lng: place.lng, accuracy: 5 })
  }
}

test('trip pending numbers restart at one on route and map without changing selection or visit history', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  const rows = page.locator('.stop-list > .stop')
  await expect(rows.locator('.stop__badge')).toHaveText(['1', '2'])
  await expect(page.locator('.pp-pin-anchor[title="Stop 1: Bagbazar Sarbojanin"] .pp-pin')).toHaveText('1')
  await rows.first().getByRole('button', { name: t('en', 'markVisitedFor', { name: 'Bagbazar Sarbojanin' }), exact: true }).click()
  await expect(rows.first().locator('.stop__badge--visited svg')).toHaveCount(1)
  await expect(rows.nth(1).locator('.stop__badge')).toHaveText('1')
  await expect(page.locator('.pp-pin--visited svg')).toHaveCount(1)
  await expect(page.locator('.pp-pin-anchor[title="Stop 1: Kumartuli Park"] .pp-pin')).toHaveText('1')
  await expect(page.locator('.navigation-next__target')).toContainText('Kumartuli Park')
  await expect(page.locator('.navigation-next').getByRole('button', { name: 'Navigate to Kumartuli Park', exact: true })).toBeVisible()
  const saved = await savedPlan(page)
  expect(saved.stopIds).toEqual(['bagbazar', 'kumartuli-park'])
  expect(saved.visits.map((visit) => visit.pandalId)).toEqual(['bagbazar'])
  await optimize(page)
  await expect(page.locator('.stop.is-visited .leg')).toHaveCount(0)
  await expect(page.locator('.stop:not(.is-visited) .leg')).toHaveCount(1)
  await expect(page.getByTestId('return-home')).toBeVisible()
  expect((await savedPlan(page)).visits).toEqual(saved.visits)
})

test('trip Start waits for the finished car plan and locks its first destination, not the old selection order', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T08:45:00Z') })
  await prepare(page, { stops: ['bagbazar', 'college-square'], settings: { transport: 'personal' }, plan: { availableMinutes: 720 } })
  await page.goto('/')
  await page.evaluate(() => { window.__tripQA.hold = true })
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true }).click()
  await expect(page.getByTestId('car-progress')).toBeVisible()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'idle')
  expect((await geoCalls(page)).active).toBe(0)
  await page.evaluate(() => { window.__tripQA.hold = false; window.__tripQA.pending.splice(0).forEach((finish) => finish()) })
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'running')
  const selected = (await savedPlan(page)).stopIds
  expect([...selected].sort()).toEqual(['bagbazar', 'college-square'])
  expect(selected[0]).toBe('college-square')
  expect((await tripSettings(page)).checkpoint?.lockedNextStopId).toBe(selected[0])
  await expect(page.locator('.pp-pin-anchor[title="Stop 1: College Square"]')).toBeVisible()
  await expect(page.getByTestId('return-home')).toBeVisible()
})

test('trip empty selection starts a curated four-stop regional home loop and opens the mobile map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page, { stops: [], start: 'start-durgapur-sepco', settings: { area: 'durgapur', transport: 'personal' }, plan: { availableMinutes: 720 } })
  await page.goto('/')
  await page.getByRole('tab', { name: /^Your route/ }).click()
  await expect(page.getByRole('button', { name: 'Plan themed highlights', exact: true })).toBeEnabled()
  await startTrip(page)
  const selected = (await savedPlan(page)).stopIds
  expect(selected).toHaveLength(4)
  expect(selected.every((id) => BROWSABLE_PLACES.some((place) => place.id === id && place.city === 'durgapur' && place.kind === 'pandal'))).toBe(true)
  expect(selected).toContain('durgapur-shankarpur')
  expect((await tripSettings(page)).checkpoint?.lockedNextStopId).toBe(selected[0])
  await expect(page.locator('.app')).toHaveAttribute('data-layout', 'map')
  await expect(page.locator('.pp-pin--home')).toHaveCount(1)
  await expect(page.locator('.pp-pin-anchor[title^="Stop "]')).toHaveCount(4)
})

test('trip Start preserves custom over-budget stops and presents an explicit fit warning without starting', async ({ page }) => {
  const selected = ['asansol-dhemomain', 'durgapur-shankarpur', 'bagbazar']
  await prepare(page, { stops: selected, settings: { area: 'all', transport: 'personal' }, plan: { availableMinutes: 120 } })
  await page.goto('/')
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true }).click()
  await expect(page.locator('.estimate__budget')).toBeVisible()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'idle')
  expect([...(await savedPlan(page)).stopIds].sort()).toEqual([...selected].sort())
  expect((await tripSettings(page)).checkpoint).toBeNull()
})

test('trip legacy North plan without trip settings shows the home placeholder and keeps Start off until a choice', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await expect(page.getByTestId('trip-settings')).toBeVisible()
  await expect(page.locator('.trip-bar__home strong')).toHaveText(t('en', 'chooseHome'))
  await expect(page.locator('.trip-bar__home')).not.toContainText('Shyambazar')
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Optimize route', exact: true })).toBeDisabled()
  await expect(page.locator('.pp-pin--home')).toHaveCount(0)
  expect((await savedPlan(page)).startId).toBe('start-blue-shyambazar')
  expect((await tripSettings(page)).home).toBeNull()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('trip legacy plan start becomes the start only through the explicit alternative control', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await page.getByTestId('trip-home-other').locator('summary').click()
  await page.getByRole('button', { name: 'Use Shyambazar Metro area as start', exact: true }).click()
  await expect(page.locator('.trip-bar__home small')).toHaveText('Start')
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Shyambazar Metro area')
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-home', 'landmark')
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true })).toBeEnabled()
  await expect(page.locator('.pp-pin--home')).toHaveCount(1)
  await expect(page.locator('.leaflet-marker-icon[title="Start: Shyambazar Metro area"]')).toHaveCount(1)
  expect((await tripSettings(page)).home).toEqual({ kind: 'landmark', id: 'start-blue-shyambazar' })
  await page.getByRole('combobox', { name: 'Start landmark', exact: true }).selectOption('start-blue-esplanade')
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Esplanade Metro area')
  await page.reload()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Esplanade Metro area')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('trip new visitor choosing Durgapur gets a 12-hour own-car day trip while a saved plan keeps its budget', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Durgapur', exact: true }).click()
  const budget = page.getByRole('radiogroup', { name: 'Time budget', exact: true })
  await expect(budget.getByRole('radio', { name: '12 h', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radiogroup', { name: 'Transport', exact: true }).getByRole('radio', { name: 'Own car', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => (await savedPlan(page)).availableMinutes).toBe(720)
  expect(await savedPlan(page)).toMatchObject({ preference: 'balanced', pace: 'steady' })
  expect((await tripSettings(page)).home).toBeNull()
  await expect(page.locator('.trip-bar__home strong')).toHaveText(t('en', 'chooseHome'))
  await page.evaluate(({ planKey, tripKey }) => {
    const plan = JSON.parse(localStorage.getItem(planKey)!)
    localStorage.setItem(planKey, JSON.stringify({ ...plan, stopIds: [], availableMinutes: 240 }))
    const trip = JSON.parse(localStorage.getItem(tripKey)!)
    localStorage.setItem(tripKey, JSON.stringify({ ...trip, area: 'kolkata', transport: 'public' }))
  }, { planKey: STORAGE_KEY, tripKey: TRIP_STORAGE_KEY })
  await page.reload()
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Asansol', exact: true }).click()
  await page.getByRole('tab', { name: /^Your route/ }).click()
  await expect(page.getByRole('radiogroup', { name: 'Transport', exact: true }).getByRole('radio', { name: 'Own car', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(budget.getByRole('radio', { name: '4 h', exact: true })).toHaveAttribute('aria-checked', 'true')
  expect((await savedPlan(page)).availableMinutes).toBe(240)
})

test('trip GPS home at Asansol stays private, plans home to stop and back, and summarises Back home by', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T10:00:00+05:30') })
  await prepare(page, { start: 'start-durgapur-sepco', stops: ['asansol-dhemomain'], settings: { area: 'asansol', transport: 'personal', home: null }, plan: { availableMinutes: 720 } })
  await page.goto('/')
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true })).toBeDisabled()
  await expect(page.getByTestId('home-required')).toBeVisible()
  await setHomeFromGps(page, ASANSOL_HOME)
  await expect(page.locator('.trip-bar__home small')).toHaveText('Home')
  await expect(page.getByTestId('trip-home')).toHaveAttribute('data-home', 'coordinate')
  await expect(page.locator('.leaflet-marker-icon[title="Home: My home"]')).toHaveCount(1)
  expect(await geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
  const saved = await tripSettings(page)
  expect(saved.home).toBeNull()
  expect(JSON.stringify(saved)).not.toMatch(/23\.6812|86\.9754|"lat"|"lng"/)
  expect(JSON.stringify(await savedPlan(page))).not.toMatch(/23\.6812|86\.9754/)
  await optimize(page)
  await expect(page.locator('.estimate__meta')).toContainText('from My home')
  await expect(page.locator('.estimate__total')).toContainText('Back home by')
  await expect(page.getByTestId('return-home')).toContainText('My home')
  await expect(page.getByTestId('trip-finish')).not.toHaveText('--')
  await expect(page.getByTestId('trip-bar')).toContainText('Back home by')
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey', exact: true })).toBeEnabled()
  await expect(page.locator('.stop-list .leg__main').first()).toContainText('Own car')
  await expect(page.getByTestId('return-home')).toContainText(/\d+ min|\d+ h/)
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  const link = await page.evaluate(() => window.__plannerQA.copies.at(-1))
  expect(link).toMatch(/home=(&|$)/)
  expect(link).not.toMatch(/23\.68|86\.97|lat|lng|My%20home|My\+home/)
})

test('trip home west of Durgapur stays fixed while the car marker moves, keeps heading null when still, and greys out when stale', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page, { start: 'start-durgapur-sepco', stops: ['durgapur-marconi'], settings: { area: 'durgapur', transport: 'personal', home: null } })
  await page.goto('/')
  await setHomeFromGps(page, WEST_OF_DURGAPUR_HOME)
  await expect(page.locator('.pp-vehicle')).toHaveCount(1)
  await expect(page.locator('.pp-vehicle')).toHaveAttribute('aria-label', 'Your car · live position')
  await expect(page.locator('.pp-vehicle-anchor')).toHaveAttribute('data-heading', '')
  await optimize(page)
  await startTrip(page)
  await expect.poll(async () => (await geoCalls(page)).active).toBe(1)
  const homeMarker = page.locator('.leaflet-marker-icon[title="Home: My home"]')
  const homeBefore = await homeMarker.evaluate((element) => element.style.transform)
  const carBefore = await page.locator('.pp-vehicle-anchor').evaluate((element) => element.style.transform)
  await emitGps(page, { lat: WEST_OF_DURGAPUR_HOME.lat + 0.00005, lng: WEST_OF_DURGAPUR_HOME.lng, accuracy: 12 })
  await expect(page.locator('.pp-vehicle-anchor')).toHaveAttribute('data-heading', '')
  await emitGps(page, { lat: WEST_OF_DURGAPUR_HOME.lat, lng: WEST_OF_DURGAPUR_HOME.lng + 0.004, accuracy: 12 })
  await expect(page.locator('.pp-vehicle-anchor')).toHaveAttribute('data-heading', /^(89|90|91)$/)
  await expect(page.locator('.pp-vehicle')).toHaveClass(/pp-vehicle--arrow/)
  await expect.poll(() => page.locator('.pp-vehicle-anchor').evaluate((element) => element.style.transform)).not.toBe(carBefore)
  expect(await homeMarker.evaluate((element) => element.style.transform)).toBe(homeBefore)
  await expect(page.locator('.pp-device--live')).toHaveCount(1)
  await page.clock.fastForward(61_000)
  await expect(page.locator('.pp-vehicle')).toHaveAttribute('aria-label', 'Your car · last known location')
  await expect(page.locator('.pp-vehicle')).toHaveClass(/pp-vehicle--stale/)
  await expect(page.locator('.pp-device--stale')).toHaveCount(1)
  await expect(page.locator('.pp-device--live')).toHaveCount(0)
  await expect(page.locator('.trip-bar__home strong')).toHaveText('My home')
  expect((await tripSettings(page)).home).toBeNull()
})

test('trip map pick made while a GPS request is pending wins over the late fix, and a denied refresh keeps the saved home', async ({ page }) => {
  await prepare(page, { settings: { home: null } })
  await page.goto('/')
  await page.getByRole('button', { name: 'Use current location as home', exact: true }).click()
  await page.getByRole('button', { name: 'Pick home on map', exact: true }).click()
  await page.locator('.leaflet-container').click({ position: { x: 280, y: 180 } })
  await page.getByRole('button', { name: t('en', 'streetChoosePoint'), exact: true }).click()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Private start')
  await emitGps(page, { lat: 22.601313, lng: 88.372586, accuracy: 8 })
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Private start')
  await page.evaluate(() => { window.__plannerQA.denied = true })
  await page.getByRole('button', { name: 'Use current location as home', exact: true }).click()
  await expect(page.getByTestId('trip-home').getByRole('alert')).toContainText('Location permission was denied. Your saved home is unchanged.')
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Private start')
  expect(await geoCalls(page)).toEqual({ once: 2, started: 0, active: 0 })
})

test('trip curated route and nearby location keep an explicit home instead of replacing it', async ({ page }) => {
  await prepare(page, { settings: { home: null } })
  await page.goto('/')
  await setHomeFromGps(page, { lat: 22.5201, lng: 88.3449, accuracy: 10 })
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await page.locator('.route-item').filter({ hasText: 'Central Kolkata squares' }).getByRole('button', { name: 'Use this route' }).click()
  await page.getByRole('dialog', { name: 'Replace your route?' }).getByRole('button', { name: 'Replace', exact: true }).click()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('My home')
  expect((await savedPlan(page)).startId).toBe('start-blue-esplanade')
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await page.getByRole('button', { name: 'Use my location', exact: true }).click()
  await emitGps(page, { lat: 22.5955, lng: 88.3715, accuracy: 20 })
  await expect(page.getByRole('region', { name: 'Nearby pandals', exact: true })).toBeVisible()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('My home')
  expect(await geoCalls(page)).toEqual({ once: 2, started: 0, active: 0 })
})

test('trip area tabs keep home, mixed selection and the same map instance', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await expect(page.getByTestId('trip-settings')).toBeVisible()
  await page.locator('.leaflet-container').evaluate((element) => { element.setAttribute('data-same-map', 'yes') })
  const home = await page.locator('.trip-bar__home strong').textContent()
  const selected = (await savedPlan(page)).stopIds
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Asansol', exact: true }).click()
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await expect(page.locator('.pandal-row')).toHaveCount(placesOf('asansol'))
  await expect(page.getByTestId('regional-coverage')).toContainText('Partial coverage')
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Durgapur', exact: true }).click()
  await expect(page.locator('.pandal-row')).toHaveCount(placesOf('durgapur'))
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'All areas', exact: true }).click()
  await expect(page.locator('.pandal-row')).toHaveCount(placesOf('all'))
  await page.getByRole('radiogroup', { name: 'Place type' }).getByRole('radio', { name: 'Food', exact: true }).click()
  await expect(page.locator('.pandal-row')).toHaveCount(placesOf('all', 'restaurant'))
  await page.getByRole('radiogroup', { name: 'Place type' }).getByRole('radio', { name: 'Sights', exact: true }).click()
  await expect(page.locator('.pandal-row')).toHaveCount(placesOf('all', 'sight'))
  await expect(page.locator('.trip-bar__home strong')).toHaveText(home!)
  await expect(page.locator('.leaflet-container')).toHaveAttribute('data-same-map', 'yes')
  expect((await savedPlan(page)).stopIds).toEqual(selected)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('trip private map home is omitted on refresh, keeps timer progress and requires reselection', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Pick home on map', exact: true }).click()
  await page.locator('.leaflet-container').click({ position: { x: 280, y: 180 } })
  await page.getByRole('button', { name: t('en', 'streetChoosePoint'), exact: true }).click()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('Private start')
  await expect(page.locator('.trip-bar__home small')).toHaveText('Home')
  await startTrip(page)
  await expect.poll(async () => (await tripSettings(page)).checkpoint?.status).toBe('running')
  const saved = await tripSettings(page)
  expect(saved.home).toBeNull()
  expect(JSON.stringify(saved)).not.toMatch(/"lat"|"lng"/)
  await page.reload()
  await expect(page.getByText('Reselect home to resume', { exact: true })).toBeVisible()
  await expect(page.locator('.trip-bar__home strong')).toHaveText(t('en', 'chooseHome'))
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Resume trip' })).toBeDisabled()
  expect((await tripSettings(page)).checkpoint?.startedAt).toBe(saved.checkpoint?.startedAt)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('trip unplanned catalogue arrival sounds once, stays out of selection, and undo suppresses repeats', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page, { stops: ['college-square'] })
  await page.goto('/')
  await startTrip(page)
  await dwell(page, 'bagbazar')
  await expect.poll(async () => (await savedPlan(page)).visits.map((visit) => visit.pandalId)).toEqual(['bagbazar'])
  expect((await savedPlan(page)).stopIds).toEqual(['college-square'])
  await expect.poll(() => page.evaluate(() => window.__tripQA.sounds)).toBe(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await dwell(page, 'bagbazar')
  expect((await savedPlan(page)).visits).toEqual([])
  expect(await page.evaluate(() => window.__tripQA.sounds)).toBe(1)
})

test('trip explicit GPS home stays fixed during motion and remember is opt-in', async ({ page }) => {
  await prepare(page, { settings: { home: null } })
  await page.goto('/')
  await setHomeFromGps(page, { lat: 22.601313, lng: 88.372586, accuracy: 8 })
  expect((await tripSettings(page)).home).toBeNull()
  await page.getByLabel('Remember this start on this device', { exact: true }).check()
  await startTrip(page)
  await emitGps(page, { lat: 22.52, lng: 88.35, accuracy: 8 })
  await expect.poll(async () => (await tripSettings(page)).home).toEqual({ kind: 'coordinate', location: { name: 'My home', lat: 22.601313, lng: 88.372586 } })
  await page.reload()
  await expect(page.locator('.trip-bar__home strong')).toHaveText('My home')
  expect((await geoCalls(page)).active).toBe(0)
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Resume trip' }).click()
  await expect.poll(async () => (await geoCalls(page)).active).toBe(1)
})

test('trip pause freezes active clock, break counts once, end freezes and clears tracking', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page)
  await page.goto('/')
  await startTrip(page)
  await page.clock.fastForward(65_000)
  await page.getByRole('button', { name: 'Pause trip', exact: true }).click()
  const elapsed = await page.getByTestId('trip-elapsed').textContent()
  await page.clock.fastForward(120_000)
  await expect(page.getByTestId('trip-elapsed')).toHaveText(elapsed!)
  expect((await geoCalls(page)).active).toBe(0)
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Resume trip' }).click()
  await page.getByTestId('trip-bar').getByRole('button', { name: 'Take break now' }).click()
  await expect.poll(async () => (await tripSettings(page)).checkpoint?.activeBreak?.minutes).toBe(15)
  await page.getByRole('button', { name: 'End break', exact: true }).click()
  await expect.poll(async () => (await tripSettings(page)).checkpoint?.completedBreakIds.length).toBe(1)
  await page.getByRole('button', { name: 'End trip', exact: true }).click()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'completed')
  const ended = await page.getByTestId('trip-elapsed').textContent()
  await page.clock.fastForward(300_000)
  await expect(page.getByTestId('trip-elapsed')).toHaveText(ended!)
  expect((await geoCalls(page)).active).toBe(0)
})

test('trip hidden tab has no dwell or watch and resumes foreground tracking only when armed', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page)
  await page.goto('/')
  await startTrip(page)
  await setVisibility(page, 'hidden')
  await expect.poll(async () => (await geoCalls(page)).active).toBe(0)
  await page.clock.fastForward(60_000)
  await emitGps(page, { lat: 22.6044, lng: 88.3668, accuracy: 5 })
  expect((await savedPlan(page)).visits).toEqual([])
  await setVisibility(page, 'visible')
  await expect.poll(async () => (await geoCalls(page)).active).toBe(1)
  await page.getByRole('switch', { name: t('en', 'autoToggle'), exact: true }).uncheck()
  await setVisibility(page, 'hidden')
  await setVisibility(page, 'visible')
  expect((await geoCalls(page)).active).toBe(0)
})

test('trip food is a 45-minute stop and separate scheduled breaks are editable', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await page.locator('.trip-breaks > summary').click()
  await page.getByRole('spinbutton', { name: 'Break minutes', exact: true }).fill('20')
  await page.getByRole('button', { name: 'Add break', exact: true }).click()
  await expect.poll(async () => (await tripSettings(page)).breaks[0]?.minutes).toBe(20)
  await page.locator('.food-suggestions li').first().getByRole('button', { name: 'Add', exact: true }).click()
  const selected = (await savedPlan(page)).stopIds
  const food = selected.map((id) => ALL_PLACES.find((place) => place.id === id)).find((place) => place?.kind === 'restaurant')!
  expect(food.visitMinutes).toBe(45)
  expect((await tripSettings(page)).breaks).toHaveLength(1)
  await optimize(page)
  await expect(page.getByTestId('return-home')).toBeVisible()
  await page.getByRole('button', { name: 'Remove break', exact: true }).click()
  await expect.poll(async () => (await tripSettings(page)).breaks).toEqual([])
})

test('trip mocked car planning loads three profiles and never uses the walking estimator', async ({ page }) => {
  await prepare(page, { start: 'start-durgapur-sepco', stops: ['durgapur-marconi'], settings: { area: 'durgapur', transport: 'personal' } })
  await page.goto('/')
  expect(await page.evaluate(() => window.__tripQA.workers)).toBe(0)
  await optimize(page)
  expect(await page.evaluate(() => window.__tripQA.matrices)).toEqual([12, 9, 18])
  await expect(page.getByTestId('return-home')).toContainText('SEPCO')
  await expect(page.locator('.estimate')).toContainText('Parking and last-gap walking are unknown')
  await page.getByRole('radiogroup', { name: 'Transport', exact: true }).getByRole('radio', { name: 'Public', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__tripQA.terminated)).toBe(1)
})

test('trip unavailable car matrix disables start and does not invent a geographic route', async ({ page }) => {
  await prepare(page, { settings: { transport: 'personal' } })
  await page.goto('/')
  await page.evaluate(() => { window.__tripQA.unavailable = true })
  await page.locator('.optimize > button').click()
  await expect(page.getByText(/Car route unavailable/).first()).toBeVisible()
  await expect(page.locator('.estimate')).toHaveCount(0)
  await expect(page.getByTestId('trip-bar').getByRole('button', { name: 'Start journey' })).toBeDisabled()
})

test('trip cancelling an old car matrix ignores its late result', async ({ page }) => {
  await prepare(page, { settings: { transport: 'personal' } })
  await page.goto('/')
  await page.evaluate(() => { window.__tripQA.hold = true })
  await page.locator('.optimize > button').click()
  await expect(page.getByTestId('car-progress')).toBeVisible()
  await page.getByTestId('car-progress').getByRole('button', { name: 'Cancel' }).click()
  await page.evaluate(() => { window.__tripQA.pending.splice(0).forEach((finish) => finish()) })
  await expect(page.locator('.estimate')).toHaveCount(0)
  expect(await page.evaluate(() => window.__tripQA.terminated)).toBe(1)
})

test('trip own car directions show mapped turns and share one watch with trip arrival', async ({ page }) => {
  await prepare(page, { settings: { transport: 'personal' } })
  await page.goto('/')
  await optimize(page)
  await startTrip(page)
  await page.locator('.navigation-next').getByRole('button', { name: /^Navigate to / }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'From', exact: true }).selectOption('planned')
  await page.getByRole('button', { name: 'Show car route here', exact: true }).click()
  await expect(page.getByTestId('drive-directions')).toContainText('Fixture flyover')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-car-route', 'true')
  await page.getByRole('button', { name: 'Follow drive', exact: true }).click()
  expect((await geoCalls(page)).active).toBe(1)
  await page.getByRole('button', { name: 'End trip', exact: true }).click()
  expect((await geoCalls(page)).active).toBe(1)
  await page.getByTestId('drive-directions').getByRole('button', { name: 'Close', exact: true }).click()
  await expect.poll(async () => (await geoCalls(page)).active).toBe(0)
})

test('trip manual lead pin stays session-only, unshared, and is not automatically visited', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Asansol', exact: true }).click()
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await page.locator('.unlocated-leads > summary').click()
  const lead = page.locator('.unlocated-leads li').first()
  const leadName = (await lead.locator(':scope > strong').textContent())!
  await lead.getByRole('button', { name: 'Pin this place', exact: true }).click()
  await page.locator('.leaflet-container').click({ position: { x: 280, y: 180 } })
  await page.getByRole('button', { name: t('en', 'streetChoosePoint'), exact: true }).click()
  await expect(page.locator('.stop-list')).toContainText(leadName)
  expect(JSON.stringify(await savedPlan(page))).not.toContain('manual-')
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  const link = await page.evaluate(() => window.__plannerQA.copies.at(-1))
  expect(link).not.toMatch(/manual|lat|lng/)
  expect(link).not.toContain(encodeURIComponent(leadName))
  await page.reload()
  await expect(page.locator('.stop-list')).not.toContainText(leadName)
})

test('trip long fake clock and repeated GPS samples do not create rerender loops or duplicate sound', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page)
  await page.goto('/')
  await startTrip(page)
  await dwell(page, 'bagbazar')
  await page.clock.fastForward(30 * 60_000)
  await emitGps(page, { lat: 22.6, lng: 88.37, accuracy: 15 })
  await page.clock.fastForward(60_000)
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'running')
  expect((await tripSettings(page)).checkpoint?.activities.filter((activity) => activity.stopId === 'bagbazar')).toHaveLength(1)
  expect(await page.evaluate(() => window.__tripQA.sounds)).toBe(1)
})

test('trip curated filters, source history and regional food do not borrow Kolkata photos', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: 'Durgapur', exact: true }).click()
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await page.getByLabel('Must visit: editor picks', { exact: true }).check()
  expect(await page.locator('.pandal-row').count()).toBeGreaterThan(0)
  await page.locator('.pandal-row .link-title').first().click()
  await expect(page.getByRole('dialog')).toContainText('Verified place photo unavailable')
  await expect(page.getByRole('dialog').locator('img')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toContainText('History & sources')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByLabel('Must visit: editor picks', { exact: true }).uncheck()
  await page.getByRole('radiogroup', { name: 'Place type' }).getByRole('radio', { name: 'Food', exact: true }).click()
  await page.locator('.pandal-row .link-title').first().click()
  await expect(page.getByRole('dialog')).toContainText('Current menu, prices and opening hours unverified')
})

test('trip regional browse excludes unqualified and unlocated leads while preserving selected history and Shankarpur', async ({ page }, testInfo) => {
  const shankarpur = ALL_PLACES.find((place) => place.id === 'durgapur-shankarpur')!
  await prepare(page, { stops: ['durgapur-sepco', shankarpur.id], settings: { area: 'durgapur' },
    plan: { visits: [{ pandalId: 'durgapur-sepco', at: Date.now(), method: 'manual' }] } })
  await page.goto('/')
  await expect(page.locator('.stop.is-visited')).toContainText('SEPCO')
  await expect(page.locator('.pp-pin--visited svg')).toHaveCount(1)
  await expect(page.locator(`.pp-pin-anchor[title="Stop 1: ${shankarpur.name}"]`)).toHaveCount(1)
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  for (const area of ['Asansol', 'Durgapur', 'All areas']) {
    await page.getByRole('group', { name: 'Trip area' }).getByRole('button', { name: area, exact: true }).click()
    await expect(page.locator('.pandal-row[data-pandal="durgapur-sepco"]')).toHaveCount(0)
    await expect(page.locator('.pandal-row').filter({ hasText: /T\.?\s*N\.?\s*School/i })).toHaveCount(0)
    await expect(page.locator('.unlocated-leads[open]')).toHaveCount(0)
  }
  await page.locator(`[data-pandal="${shankarpur.id}"]`).getByRole('button', { name: shankarpur.name, exact: true }).click()
  const detail = page.getByRole('dialog', { name: shankarpur.name, exact: true })
  await expect(detail.getByRole('link', { name: shankarpur.sourceLabel, exact: true })).toHaveAttribute('href', shankarpur.sourceUrl)
  await detail.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(page.locator(`.pp-pin-anchor[title="Stop 1: ${shankarpur.name}"]`)).toBeInViewport()
  expect((await savedPlan(page)).stopIds).toEqual(['durgapur-sepco', shankarpur.id])
  expect((await savedPlan(page)).visits.map((visit) => visit.pandalId)).toEqual(['durgapur-sepco'])
  await testInfo.attach('catalogue-counts', { contentType: 'application/json', body: JSON.stringify({
    known: ALL_PLACES.length, browsable: BROWSABLE_PLACES.length, kolkataPandals: placesOf('kolkata'),
    asansolPandals: placesOf('asansol'), durgapurPandals: placesOf('durgapur'), food: placesOf('all', 'restaurant'), sights: placesOf('all', 'sight'),
  }) })
})

test('trip excluded unplanned SEPCO cannot be auto-counted as a visit', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await prepare(page, { stops: ['durgapur-marconi'], start: 'start-durgapur-sepco', settings: { area: 'durgapur', transport: 'personal' } })
  await page.goto('/')
  await startTrip(page)
  await dwell(page, 'durgapur-sepco')
  expect((await savedPlan(page)).visits).toEqual([])
  expect((await savedPlan(page)).stopIds).toEqual(['durgapur-marconi'])
})

test('trip return home is not automatic when the last selected place is marked', async ({ page }) => {
  await prepare(page, { stops: ['bagbazar'] })
  await page.goto('/')
  await startTrip(page)
  await page.getByRole('button', { name: 'Mark Bagbazar Sarbojanin as visited', exact: true }).click()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'running')
  await page.getByRole('button', { name: 'Continue to next stop', exact: true }).click()
  await expect(page.getByTestId('return-home').getByRole('button', { name: 'Arrived home', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Arrived home', exact: true }).click()
  await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'completed')
})

test('trip actual car graph routes SEPCO to Marconi and independently back to SEPCO', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000)
  const base = new URL('../../public/data/', import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('bengal-driving.manifest.json', base), 'utf8'))
  const graph: Record<string, unknown> = { ...manifest.header }
  for (const file of manifest.files) {
    const bytes = readFileSync(new URL(file.file, base))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256)
    const chunk = JSON.parse(bytes.toString())
    const rows = (graph[chunk.table] ?? []) as unknown[]
    expect(rows.length).toBe(chunk.offset)
    graph[chunk.table] = rows.concat(chunk.values)
  }
  const router = createDrivingRouter(graph)
  const sepco = ALL_PLACES.find((place) => place.id === 'durgapur-sepco')!
  const marconi = ALL_PLACES.find((place) => place.id === 'durgapur-marconi')!
  const options = { departureTimestamp: Date.parse('2026-10-18T06:30:00Z') }
  const outbound = router.route(sepco, marconi, options)
  const returning = router.route(marconi, sepco, options)
  if (outbound.status !== 'ok' || returning.status !== 'ok') throw new Error('Current sourced car endpoints must be connected')
  const staticFiles = new Set<string>()
  context.on('response', (response) => { const path = new URL(response.url()).pathname; if (path.includes('/data/bengal-driving') && response.ok()) staticFiles.add(path) })
  await page.clock.install({ time: new Date('2026-10-18T06:30:00Z') })
  await prepare(page, { realCar: true, start: 'start-durgapur-sepco', stops: ['durgapur-marconi'], settings: { area: 'durgapur', transport: 'personal', autoArrival: false } })
  await page.goto('/')
  await optimize(page)
  await startTrip(page)
  await page.locator('.navigation-next').getByRole('button', { name: /^Navigate to / }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'From', exact: true }).selectOption('planned')
  await page.getByRole('button', { name: 'Show car route here', exact: true }).click()
  await expect(page.locator('.directions__summary strong')).toHaveText(`${formatNumber('en', outbound.route.metres / 1000, 2)} km`, { timeout: 60_000 })
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', String(outbound.route.geometry.length))
  await page.getByTestId('drive-directions').getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: t('en', 'markVisitedFor', { name: marconi.name }), exact: true }).click()
  await page.getByRole('button', { name: 'Continue to next stop', exact: true }).click()
  await page.getByTestId('return-home').getByRole('button', { name: 'Return home', exact: true }).click()
  await expect(page.locator('.directions__summary strong')).toHaveText(`${formatNumber('en', returning.route.metres / 1000, 2)} km`, { timeout: 60_000 })
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', String(returning.route.geometry.length))
  expect([...staticFiles].filter((path) => /bengal-driving-(\d+)\.json$/.test(path))).toHaveLength(8)
  await testInfo.attach('actual-car-graph', { contentType: 'application/json', body: JSON.stringify({ fixture: false,
    sourceTimestamp: outbound.source.timestamp, canonicalSha256: manifest.datasetSha256,
    publicEndpoints: [sepco, marconi].map(({ id, lat, lng }) => ({ id, lat, lng })), outboundMetres: outbound.route.metres,
    returnMetres: returning.route.metres, staticFiles: [...staticFiles], memoryOnPhoneVerified: false }) })
})

for (const viewport of [{ width: 320, height: 568, language: 'bn' }, { width: 390, height: 844, language: 'en' }, { width: 1440, height: 900, language: 'en' }] as const) {
  test(`trip home CTA, dual home/car markers and 12 h summary fit ${viewport.width}px in ${viewport.language} day/night`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const { language } = viewport
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await prepare(page, { start: 'start-durgapur-sepco', stops: ['durgapur-marconi'],
      settings: { area: 'durgapur', transport: 'personal', home: null, autoArrival: false }, plan: { availableMinutes: 720 } })
    await page.goto('/')
    await page.locator(`header button[role="radio"][lang="${language}"]`).click()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    async function capture(stage: string) {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
        await page.evaluate(async () => { await document.fonts.ready })
        const geometry = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth,
          mapHeight: document.querySelector('.pp-map')!.getBoundingClientRect().height,
          bar: document.querySelector('.trip-bar')!.getBoundingClientRect().height,
          buttons: [...document.querySelectorAll<HTMLButtonElement>('.trip-bar button, .area-tabs button, .trip-home-actions button')].filter((button) => button.checkVisibility())
            .map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height, left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })) }))
        expect(geometry.document).toBeLessThanOrEqual(viewport.width)
        expect(geometry.width).toBe(viewport.width)
        expect(geometry.mapHeight).toBeGreaterThanOrEqual(125)
        expect(geometry.buttons.length).toBeGreaterThanOrEqual(5)
        for (const button of geometry.buttons) { expect(button.width).toBeGreaterThanOrEqual(43.5); expect(button.height).toBeGreaterThanOrEqual(43.5); expect(button.left).toBeGreaterThanOrEqual(0); expect(button.right).toBeLessThanOrEqual(viewport.width) }
        const name = `trip-${stage}-${viewport.width}-${language}-${colorScheme}`
        const path = testInfo.outputPath(`${name}.png`)
        await page.screenshot({ path, animations: 'disabled' })
        await testInfo.attach(name, { path, contentType: 'image/png' })
      }
    }
    await expect(page.locator('.trip-bar__home strong')).toHaveText(t(language, 'chooseHome'))
    await expect(page.getByRole('button', { name: t(language, 'useLocationAsHome'), exact: true })).toBeVisible()
    await expect(page.getByTestId('trip-bar').getByRole('button', { name: t(language, 'startJourney'), exact: true })).toBeDisabled()
    await expect(page.locator('.pp-pin--home')).toHaveCount(0)
    await capture('home-cta')
    await setHomeFromGps(page, { lat: 23.5512, lng: 87.2903, accuracy: 10 }, language)
    await expect(page.getByRole('radiogroup', { name: t(language, 'timeBudget'), exact: true })
      .getByRole('radio', { name: t(language, 'hours', { n: formatNumber(language, 12) }), exact: true })).toHaveAttribute('aria-checked', 'true')
    await optimize(page)
    await expect(page.getByTestId('trip-bar')).toContainText(t(language, 'tripBackHome'))
    await expect(page.getByTestId('trip-finish')).not.toHaveText('--')
    await page.getByTestId('trip-bar').getByRole('button', { name: t(language, 'startJourney'), exact: true }).click()
    await expect(page.getByTestId('trip-bar')).toHaveAttribute('data-status', 'running')
    await expect(page.locator('.pp-pin--home')).toHaveCount(1)
    await expect(page.locator('.pp-vehicle')).toHaveCount(1)
    await expect(page.locator('.pp-vehicle')).toHaveAttribute('aria-label', t(language, 'vehicleLive'))
    await capture('running-markers')
    expect((await tripSettings(page)).home).toBeNull()
  })
}

test('trip catalogue registry exposes real regional public starts', async () => {
  expect(ALL_START_POINTS.find((start) => start.id === 'start-durgapur-sepco')).toMatchObject({ lat: 23.5498992, lng: 87.31662885 })
})

test('trip mixed-city round trip includes home and warns about the next calendar day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T23:00:00+05:30') })
  await prepare(page, { stops: ['bagbazar', 'durgapur-marconi', 'asansol-dhemomain'], settings: { area: 'all', transport: 'personal' } })
  await page.goto('/')
  await optimize(page)
  await expect(page.getByTestId('return-home')).toContainText('Return estimate reaches the next day')
  await expect(page.getByTestId('trip-finish')).toContainText('19')
  expect(new Set((await savedPlan(page)).stopIds)).toEqual(new Set(['bagbazar', 'durgapur-marconi', 'asansol-dhemomain']))
  await expect(page.locator('.estimate__budget')).toBeVisible()
})

test('trip protects the in-flight destination while future stops remain editable', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await startTrip(page)
  const lockedId = (await tripSettings(page)).checkpoint!.lockedNextStopId!
  const locked = ALL_PLACES.find((place) => place.id === lockedId)!
  await expect(page.getByRole('button', { name: t('en', 'removeFromRoute', { name: locked.name }), exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Clear all stops', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'End trip', exact: true }).click()
  await expect(page.getByRole('button', { name: t('en', 'removeFromRoute', { name: locked.name }), exact: true })).toBeEnabled()
})

test('trip storyboard captures home areas food running and return in day and night', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page, { start: 'start-durgapur-sepco', stops: ['durgapur-marconi'], settings: { area: 'durgapur', transport: 'personal', autoArrival: false } })
  await page.goto('/')
  async function capture(stage: string) {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
      const path = testInfo.outputPath(`storyboard-${stage}-${scheme}.png`)
      await page.screenshot({ path, animations: 'disabled' })
      await testInfo.attach(`storyboard-${stage}-${scheme}`, { path, contentType: 'image/png' })
    }
  }
  await page.getByTestId('trip-settings').locator('section').first().scrollIntoViewIfNeeded()
  await capture('home')
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await capture('areas')
  await page.getByRole('radiogroup', { name: 'Place type' }).getByRole('radio', { name: 'Food', exact: true }).click()
  await page.locator('.pandal-row').first().scrollIntoViewIfNeeded()
  await capture('food')
  await page.getByRole('tab', { name: /^Your route/ }).click()
  await optimize(page)
  await startTrip(page)
  await page.getByRole('button', { name: t('en', 'viewList'), exact: true }).click()
  await page.locator('.navigation-next').scrollIntoViewIfNeeded()
  await capture('running')
  const marconi = ALL_PLACES.find((place) => place.id === 'durgapur-marconi')!
  await page.getByRole('button', { name: t('en', 'markVisitedFor', { name: marconi.name }), exact: true }).click()
  await page.getByRole('button', { name: 'Continue to next stop', exact: true }).click()
  await page.getByTestId('return-home').scrollIntoViewIfNeeded()
  await capture('return')
})