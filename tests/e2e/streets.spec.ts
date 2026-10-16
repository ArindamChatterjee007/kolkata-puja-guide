import type { Page, Route, Worker as BrowserWorker } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PANDALS, START_POINTS } from '../../src/data/pandals'
import { REPORT_TTL_MS } from '../../src/domain/crowd'
import type { StreetRoute, StreetRouteResult } from '../../src/domain/streets'
import type { Coordinate } from '../../src/types'
import { formatNumber, t } from '../../src/i18n'
import { test, expect, seedPlan, savedPlan, geoCalls, emitGps, setVisibility, setOnline, FIXED_TIME, ORIGIN } from './planner.fixture'

const streetConsoleErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  streetConsoleErrors.set(page, errors)
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
})

test.afterEach(async ({ page }, testInfo) => {
  const errors = streetConsoleErrors.get(page) ?? []
  await testInfo.attach('street-console-errors', { contentType: 'application/json', body: JSON.stringify(errors) })
  expect(errors.filter((message) => /maximum update depth|too many re-renders/i.test(message)), 'No React render loops in street flows').toEqual([])
})

async function beginWalking(page: Page, originId: string, destinationId: string) {
  const destination = PANDALS.find((point) => point.id === destinationId)!
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.locator('.navigation-next').getByRole('button', { name: `Navigate to ${destination.name}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await dialog.getByRole('combobox', { name: 'From', exact: true }).selectOption(originId)
  await dialog.getByRole('radio', { name: 'Walk', exact: true }).click()
  await dialog.getByRole('button', { name: 'Show walking routes', exact: true }).click()
}

async function openWalking(page: Page, originId: string, destinationId: string) {
  await beginWalking(page, originId, destinationId)
  await expect(page.locator('.directions__summary')).toBeVisible({ timeout: 30_000 })
}

async function clickMapAtMarker(page: Page, selector: string) {
  const marker = await page.locator(selector).boundingBox()
  const canvas = await page.locator('.pp-map__canvas').boundingBox()
  expect(marker).not.toBeNull()
  expect(canvas).not.toBeNull()
  await page.locator('.pp-map__canvas').click({ position: { x: marker!.x + marker!.width / 2 - canvas!.x, y: marker!.y + marker!.height / 2 - canvas!.y } })
}

test('real street worker draws the Shyambazar route, named turns and snap gaps without GPS or route exports', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  const requests: { url: string; method: string; body: string | null }[] = []
  context.on('request', (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() }))
  await page.goto('/')
  const before = await savedPlan(page)
  await openWalking(page, 'landmark:start-blue-shyambazar', 'bagbazar')
  await expect(page.getByRole('tab', { name: 'Directions', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m')
  await expect(page.locator('.directions__steps > li')).toHaveCount(8)
  await expect(page.locator('.directions__road').first()).toHaveText('Bupendra Bose Avenue')
  await expect(page.locator('.directions__no-alternative')).toHaveText('No different lower-exposure route found')
  await expect(page.locator('.street-alternative')).toHaveCount(0)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', '32')
  const path = await page.locator('path.street-route').getAttribute('d')
  expect(path?.match(/[ML]/g)?.length).toBeGreaterThan(5)
  await expect(page.locator('path[stroke-dasharray="8 8"]')).toHaveCount(0)
  await expect(page.locator('.directions__gaps')).toContainText('Start pin to mapped road: 8 m')
  await expect(page.locator('.directions__gaps')).toContainText('Destination pin to mapped road: 49 m')
  await page.locator('.directions__step').nth(2).click()
  await expect(page.locator('.directions__step').nth(2)).toHaveClass(/is-selected/)
  await expect(page.locator('.street-step-highlight')).toHaveCount(1)
  await page.locator('.directions__source summary').click()
  await expect(page.locator('.directions__source')).toContainText('14 October 2026')
  await expect(page.getByRole('link', { name: 'Local ODbL notice' })).toHaveAttribute('href', /data\/Kolkata-walking\.LICENSE\.md$/)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  expect(await savedPlan(page)).toEqual(before)
  const dataRequests = requests.filter((request) => request.url.includes('kolkata-walking.json'))
  expect(dataRequests).toEqual([{ url: `${ORIGIN}/data/kolkata-walking.json`, method: 'GET', body: null }])
  for (const request of requests) {
    expect(request.body).toBeNull()
    for (const point of [PANDALS[0], START_POINTS[0]]) {
      expect(request.url).not.toContain(String(point.lat))
      expect(request.url).not.toContain(String(point.lng))
    }
  }
})

for (const journey of [
  { from: 'pandal:bagbazar', to: 'kumartuli-park', metres: '1,024 m', points: '39' },
  { from: 'landmark:start-blue-kalighat', to: 'chetla-agrani', metres: '1,025 m', points: '47' },
]) {
  test(`real street worker routes ${journey.from} to ${journey.to}`, async ({ page }) => {
    await page.clock.install({ time: FIXED_TIME })
    await seedPlan(page, { stopIds: [journey.to] })
    await page.goto('/')
    await openWalking(page, journey.from, journey.to)
    await expect(page.locator('.directions__summary strong')).toHaveText(journey.metres)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', journey.points)
    expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
    expect((await savedPlan(page)).visits).toEqual([])
  })
}

test('real BJ component remains unavailable without a distant snap or invented connector', async ({ page }) => {
  await seedPlan(page, { stopIds: ['salt-lake-bj-block'] })
  await page.goto('/')
  const before = await savedPlan(page)
  await beginWalking(page, 'landmark:start-blue-esplanade', 'salt-lake-bj-block')
  await expect(page.getByRole('alert')).toContainText('No connected walking path in this dataset.', { timeout: 30_000 })
  await expect(page.locator('.street-route')).toHaveCount(0)
  await expect(page.locator('path[stroke-dasharray="8 8"]')).toHaveCount(0)
  await expect(page.getByTestId('external-navigation-launch')).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\//)
  expect(await savedPlan(page)).toEqual(before)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('dialog cancellation preserves the committed Bagbazar geometry, progress and following state', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await openWalking(page, 'landmark:start-blue-shyambazar', 'bagbazar')
  await page.getByRole('button', { name: 'Start walking', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  await emitGps(page, { lat: 22.601384258878337, lng: 88.37256363005778, accuracy: 8 })
  await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
  const geometry = await page.locator('path.street-route').getAttribute('d')
  const remaining = await page.locator('.directions__turn > small').textContent()
  const fallback = await page.getByTestId('external-navigation-launch').getAttribute('href')
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  const expectCommitted = async () => {
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m')
    await expect(page.locator('.directions__summary')).toHaveAttribute('data-strategy', 'shortest')
    await expect(page.locator('.directions__places h2')).toHaveText('Bagbazar Sarbojanin')
    await expect(page.locator('.directions__places > span')).toHaveText('Shyambazar Metro area')
    await expect(page.locator('path.street-route')).toHaveAttribute('d', geometry!)
    await expect(page.getByTestId('external-navigation-launch')).toHaveAttribute('href', fallback!)
    await expect(page.locator('.directions__turn > small')).toHaveText(remaining!)
    await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
    expect(await geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  }
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  await page.keyboard.press('Escape')
  await expectCommitted()
  for (const dismissal of ['escape', 'close', 'backdrop']) {
    await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
    await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Bagbazar Sarbojanin')
    await expect(dialog.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('landmark:start-blue-shyambazar')
    await expect(dialog.getByRole('radio', { name: 'Walk', exact: true })).toBeChecked()
    await dialog.getByRole('combobox', { name: 'To', exact: true }).fill('Kum')
    await dialog.getByRole('combobox', { name: 'From', exact: true }).selectOption('landmark:start-blue-kalighat')
    await dialog.getByRole('radio', { name: t('en', 'navigationMetroBus'), exact: true }).click()
    await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m')
    if (dismissal === 'escape') await page.keyboard.press('Escape')
    else if (dismissal === 'close') await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    else await page.mouse.click(4, 4)
    await expectCommitted()
  }
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Bagbazar Sarbojanin')
  await expect(dialog.getByRole('radio', { name: 'Walk', exact: true })).toBeChecked()
})

test('map picking cancels without losing the draft, then routes two explicit ephemeral points', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  const before = await savedPlan(page)
  await page.locator('.navigation-next').getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await dialog.getByRole('combobox', { name: 'From', exact: true }).selectOption('planned')
  await dialog.getByRole('combobox', { name: 'To', exact: true }).fill('Unknown private meeting place')
  await expect(dialog.getByRole('button', { name: 'Show walking routes', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Pick destination on map', exact: true }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.locator('.pp-map')).toHaveClass(/is-picking/)
  for (let zoom = 0; zoom < 3; zoom += 1) {
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(1)
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
  }
  const mapBox = await page.locator('.pp-map__canvas').boundingBox()
  await page.locator('.pp-map__canvas').click({ position: { x: mapBox!.width / 2, y: 40 } })
  await expect(page.locator('.pp-map__picker')).toContainText('Outside this walking dataset.')
  await expect(page.getByRole('button', { name: 'Choose this point', exact: true })).toBeDisabled()
  await page.locator('.pp-map__picker').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Unknown private meeting place')
  await expect(dialog.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('planned')
  await dialog.getByRole('button', { name: 'Pick start on map', exact: true }).click()
  await clickMapAtMarker(page, '.pp-pin--start')
  await page.getByRole('button', { name: 'Choose this point', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('point')
  await dialog.getByRole('button', { name: 'Pick destination on map', exact: true }).click()
  await clickMapAtMarker(page, '[title="Stop 1: Bagbazar Sarbojanin"]')
  await page.getByRole('button', { name: 'Choose this point', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Selected map point')
  await dialog.getByRole('button', { name: 'Show walking routes', exact: true }).click()
  await expect(page.locator('.street-route')).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('.directions__places h2')).toHaveText('Selected map point')
  expect(await savedPlan(page)).toEqual(before)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  for (const value of ['Unknown private meeting place', 'originPoint', 'destination', '22.601', '88.372']) expect(storage).not.toContain(value)
  await page.getByRole('button', { name: 'Close directions', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Directions', exact: true })).toHaveCount(0)
  await page.getByTitle('Stop 1: Bagbazar Sarbojanin', { exact: true }).click()
  await expect(page.locator('.pp-popup').getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true })).toBeVisible()
})

for (const failure of ['denied', 'inaccurate', 'stale', 'outside'] as const) {
  test(`current-location route refuses ${failure} GPS without choosing an invented start`, async ({ page }) => {
    await page.clock.install({ time: FIXED_TIME })
    await seedPlan(page)
    await page.goto('/')
    if (failure === 'denied') await page.evaluate(() => { window.__plannerQA.denied = true })
    await beginWalking(page, 'current', 'bagbazar')
    if (failure !== 'denied') {
      const at = await page.evaluate(() => Date.now())
      await emitGps(page, { lat: failure === 'outside' ? 28.6139 : 22.601313, lng: 88.372586, accuracy: failure === 'inaccurate' ? 100 : 8, at: failure === 'stale' ? at - 31_000 : at })
    }
    const expected = { denied: 'Location permission was denied.', inaccurate: 'GPS accuracy is worse than 60 m.', stale: 'Location is older than 30 seconds', outside: 'Outside this walking dataset.' }[failure]
    await expect(page.locator('.directions')).toContainText(expected)
    await expect(page.locator('.street-route')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Retry walking route', exact: true })).toBeVisible()
    expect(await geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
    expect((await savedPlan(page)).visits).toEqual([])
  })
}

test('guidance follows fresh fixes, freezes poor fixes and shares one visibility-aware watch with check-in', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await openWalking(page, 'landmark:start-blue-shyambazar', 'bagbazar')
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 10_000))
  await page.getByRole('button', { name: 'Start walking', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  await page.clock.runFor(1100)
  const start = { lat: 22.601384258878337, lng: 88.37256363005778, accuracy: 8 }
  await emitGps(page, start)
  await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
  const remaining = await page.locator('.directions__turn > small').textContent()
  await emitGps(page, { lat: 22.6047, lng: 88.36613, accuracy: 150 })
  await expect(page.locator('.directions__follow-state')).toHaveText('Location uncertain. Progress paused.')
  await expect(page.locator('.directions__turn > small')).toHaveText(remaining!)
  await setVisibility(page, 'hidden')
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 0 })
  await expect(page.locator('.directions__follow-state')).toHaveText('Paused while the tab is hidden.')
  await page.clock.fastForward(31_000)
  await setVisibility(page, 'visible')
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  await emitGps(page, start)
  await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.getByRole('button', { name: 'Start journey', exact: true }).click()
  await page.getByRole('switch').click()
  await expect(page.getByRole('switch')).toBeChecked()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  await page.getByRole('tab', { name: 'Directions', exact: true }).click()
  await page.getByRole('button', { name: 'Pause guidance', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  await page.getByRole('button', { name: 'Start walking', exact: true }).click()
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.getByRole('button', { name: 'Stop journey', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  await page.getByRole('tab', { name: 'Directions', exact: true }).click()
  await page.getByRole('button', { name: 'Close directions', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 0 })
  expect((await savedPlan(page)).visits).toEqual([])
})

test('real-clock guidance bounds renders across three GPS samples, pause and visibility changes', async ({ page, context }, testInfo) => {
  await page.addInitScript(() => {
    const diagnostics = { commits: 0 }
    Object.assign(window, {
      __streetRenderQA: diagnostics,
      __REACT_DEVTOOLS_GLOBAL_HOOK__: {
        supportsFiber: true,
        renderers: new Map(),
        inject: () => 1,
        onCommitFiberRoot: () => { diagnostics.commits += 1 },
      },
    })
  })
  await seedPlan(page)
  await context.route('**/src/workers/streets.worker.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: MOCK_WORKER }))
  await page.goto('/')
  const created = page.waitForEvent('worker')
  await beginWalking(page, 'planned', 'bagbazar')
  const worker = await created
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(1)
  await replyFromMock(worker, (await pendingWorkerRequests(worker))[0].requestId)
  await expect(page.locator('.directions__summary strong')).toHaveText('1,000 m')
  const commits = () => page.evaluate(() => (window as unknown as { __streetRenderQA: { commits: number } }).__streetRenderQA.commits)
  expect(await commits()).toBeGreaterThan(0)
  const renderCounts: number[] = []
  const bounded = async (action: () => Promise<void>) => {
    const before = await commits()
    await action()
    await page.evaluate(() => new Promise<void>((resolve) => {
      let frames = 0
      const next = () => { if (++frames === 8) resolve(); else requestAnimationFrame(next) }
      requestAnimationFrame(next)
    }))
    const count = await commits() - before
    renderCounts.push(count)
    expect(count, 'Bounded React commits after a guidance event').toBeLessThanOrEqual(12)
  }
  await page.getByRole('button', { name: 'Start walking', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  await bounded(async () => {
    await emitGps(page, { lat: 22.6013, lng: 88.3726, accuracy: 8 })
    await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
    await expect(page.locator('.directions__turn > small')).toHaveText('1,000 m remaining')
  })
  await bounded(async () => {
    await emitGps(page, { lat: 22.6013, lng: (88.3726 + 88.36613) / 2, accuracy: 8 })
    await expect(page.locator('.directions__turn > small')).toHaveText('750 m remaining')
  })
  await bounded(async () => {
    await page.getByRole('button', { name: 'Pause guidance', exact: true }).click()
    await expect(page.locator('.directions__follow-state')).toHaveText('Guidance paused')
    await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 0 })
    await page.getByRole('button', { name: 'Start walking', exact: true }).click()
    await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  })
  await bounded(async () => {
    await setVisibility(page, 'hidden')
    await expect(page.locator('.directions__follow-state')).toHaveText('Paused while the tab is hidden.')
    await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 0 })
    await setVisibility(page, 'visible')
    await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 3, active: 1 })
    await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
  })
  const beforeExpiry = await page.evaluate(() => Date.now())
  await bounded(async () => {
    await emitGps(page, { lat: 22.6013, lng: 88.36613, accuracy: 8, at: beforeExpiry - 28_000 })
    await expect(page.locator('.directions__turn > small')).toHaveText('500 m remaining')
  })
  const beforeTick = await commits()
  await expect(page.locator('.directions__follow-state')).toHaveText('Location uncertain. Progress paused.', { timeout: 8_000 })
  await expect(page.locator('.directions__turn > small')).toHaveText('500 m remaining')
  const elapsed = await page.evaluate(() => Date.now()) - beforeExpiry
  const tickCommits = await commits() - beforeTick
  expect(elapsed).toBeGreaterThanOrEqual(2_000)
  expect(tickCommits).toBeLessThanOrEqual(4)
  await testInfo.attach('real-clock-guidance', { contentType: 'application/json', body: JSON.stringify({ renderCounts, tickCommits, elapsed }) })
})

test('a failed static-data validation preserves the plan and retries the real asset', async ({ page, context }) => {
  await seedPlan(page)
  await context.route('**/data/kolkata-walking.json', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }))
  await page.goto('/')
  const before = await savedPlan(page)
  await beginWalking(page, 'planned', 'bagbazar')
  await expect(page.getByRole('alert')).toContainText('Walking data could not be validated.')
  await expect(page.locator('.street-route')).toHaveCount(0)
  await expect(page.getByTestId('external-navigation-launch')).toBeVisible()
  expect(await savedPlan(page)).toEqual(before)
  await context.unroute('**/data/kolkata-walking.json')
  await page.getByRole('button', { name: 'Retry walking route', exact: true }).click()
  await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m', { timeout: 30_000 })
})

for (const online of [true, false]) {
  test(`a throwing worker constructor ${online ? 'online stays non-network' : 'offline reports network failure'} and retries`, async ({ page }) => {
    await page.addInitScript(() => {
      const diagnostics = { attempts: 0 }
      Object.assign(window, { __streetConstructorQA: diagnostics })
      window.Worker = new Proxy(window.Worker, {
        construct(WorkerClass, args) {
          diagnostics.attempts += 1
          if (diagnostics.attempts === 1) throw new Error('Synthetic worker constructor failure')
          return Reflect.construct(WorkerClass, args)
        },
      })
    })
    await seedPlan(page)
    await page.goto('/')
    await setOnline(page, online)
    await beginWalking(page, 'planned', 'bagbazar')
    await expect(page.locator('.directions').getByRole('alert')).toHaveText(t('en', online ? 'streetDataError' : 'streetNetworkError'))
    await expect(page.locator('.street-route')).toHaveCount(0)
    await setOnline(page, true)
    await page.getByRole('button', { name: 'Retry walking route', exact: true }).click()
    await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m', { timeout: 30_000 })
    expect(await page.evaluate(() => (window as unknown as { __streetConstructorQA: { attempts: number } }).__streetConstructorQA.attempts)).toBe(2)
    expect(page.workers()).toHaveLength(1)
  })
}

test('offline before the first worker explains the network failure and reconnecting Retry creates a fresh worker', async ({ page, context }, testInfo) => {
  const offlinePage = await context.newPage()
  const consoleErrors: { text: string; url: string }[] = []
  const pageErrors: string[] = []
  const failedRequests: { error: string | undefined; url: string }[] = []
  const cancelledRequests: string[] = []
  let navigations = 0
  offlinePage.on('console', (message) => {
    if (message.type() !== 'error') return
    consoleErrors.push({ text: message.text(), url: message.location().url })
    streetConsoleErrors.get(page)!.push(message.text())
  })
  offlinePage.on('pageerror', (error) => pageErrors.push(error.message))
  offlinePage.on('requestfailed', (request) => {
    const error = request.failure()?.errorText
    if (error === 'net::ERR_ABORTED') cancelledRequests.push(request.url())
    else failedRequests.push({ error, url: request.url() })
  })
  offlinePage.on('framenavigated', (frame) => { if (frame === offlinePage.mainFrame()) navigations += 1 })
  try {
    await offlinePage.addInitScript(() => {
      const attempts: { errors: number; terminated: boolean }[] = []
      Object.assign(window, { __streetWorkerQA: attempts })
      window.Worker = new Proxy(window.Worker, {
        construct(WorkerClass, args) {
          const worker = Reflect.construct(WorkerClass, args) as Worker
          const attempt = { errors: 0, terminated: false }
          attempts.push(attempt)
          worker.addEventListener('error', () => { attempt.errors += 1 })
          const terminate = worker.terminate.bind(worker)
          worker.terminate = () => { attempt.terminated = true; terminate() }
          return worker
        },
      })
    })
    await seedPlan(offlinePage)
    await offlinePage.goto('/')
    await expect(offlinePage.getByRole('tab', { name: /Your route/ })).toBeVisible()
    await offlinePage.evaluate(() => document.fonts.ready)
    await offlinePage.evaluate(() => { Reflect.deleteProperty(navigator, 'onLine') })
    const before = await savedPlan(offlinePage)
    expect(offlinePage.workers()).toHaveLength(0)
    await context.setOffline(true)
    await expect.poll(() => offlinePage.evaluate(() => navigator.onLine)).toBe(false)
    await beginWalking(offlinePage, 'planned', 'bagbazar')
    await expect(offlinePage.locator('.directions').getByRole('alert')).toHaveText(t('en', 'streetNetworkError'))
    await expect(offlinePage.locator('.street-route')).toHaveCount(0)
    const attempts = () => offlinePage.evaluate(() => (window as unknown as { __streetWorkerQA: { errors: number; terminated: boolean }[] }).__streetWorkerQA)
    expect(await attempts()).toEqual([{ errors: 1, terminated: true }])
    await context.setOffline(false)
    await expect.poll(() => offlinePage.evaluate(() => navigator.onLine)).toBe(true)
    await offlinePage.getByRole('button', { name: 'Retry walking route', exact: true }).click()
    await expect(offlinePage.locator('.directions__summary strong')).toHaveText('1,145 m', { timeout: 30_000 })
    await expect(offlinePage.locator('.pp-map')).toHaveAttribute('data-route-points', '32')
    expect(await attempts()).toEqual([{ errors: 1, terminated: true }, { errors: 0, terminated: false }])
    expect(navigations).toBe(1)
    expect(await savedPlan(offlinePage)).toEqual(before)
    expect(pageErrors).toEqual([])
    expect(consoleErrors.filter(({ text, url }) => !(/net::ERR_INTERNET_DISCONNECTED/.test(text) && url.startsWith(`${ORIGIN}/src/workers/`)))).toEqual([])
    expect(failedRequests.filter(({ error, url }) => !(error === 'net::ERR_INTERNET_DISCONNECTED' && url.startsWith(`${ORIGIN}/src/workers/`)))).toEqual([])
  } finally {
    await testInfo.attach('offline-worker-diagnostics', { contentType: 'application/json', body: JSON.stringify({ consoleErrors, pageErrors, failedRequests, cancelledRequests, navigations }) })
    await context.setOffline(false)
    await offlinePage.close()
  }
})

test('expired reports and elapsed crowd estimates stay marked stale until explicit recalculation', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page, { reports: [{ pandalId: 'tala-prattoy', level: 'heavy', reportedAt: FIXED_TIME.getTime() - REPORT_TTL_MS + 90_000 }] })
  let dataLoads = 0
  context.on('request', (request) => { if (request.url() === `${ORIGIN}/data/kolkata-walking.json`) dataLoads += 1 })
  await page.goto('/')
  await openWalking(page, 'planned', 'bagbazar')
  await page.clock.fastForward(2 * 60_000)
  await expect(page.locator('.directions .banner')).toContainText('Crowd estimate is out of date')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', '32')
  await page.getByRole('button', { name: 'Recalculate', exact: true }).click()
  await expect(page.locator('.directions__summary')).toBeVisible()
  await expect(page.locator('.directions .banner')).toHaveCount(0)
  await page.clock.fastForward(16 * 60_000)
  await expect(page.locator('.directions .banner')).toContainText('Crowd estimate is out of date')
  expect(dataLoads).toBe(1)
  expect((await savedPlan(page)).visits).toEqual([])
})

test('current GPS is requested by the walking action, reused while fresh and never exported', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  const outbound: { url: string; body: string | null }[] = []
  context.on('request', (request) => outbound.push({ url: request.url(), body: request.postData() }))
  await page.goto('/')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  await beginWalking(page, 'current', 'bagbazar')
  await expect.poll(() => geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
  const position = { lat: 22.601384258878337, lng: 88.37256363005778, accuracy: 8 }
  await emitGps(page, position)
  await expect(page.locator('.directions__summary')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.directions__places > span')).toHaveText('Your location')
  const fallback = new URL((await page.getByTestId('external-navigation-launch').getAttribute('href'))!)
  expect(fallback.searchParams.has('origin')).toBe(false)
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  await page.getByRole('button', { name: 'Show walking routes', exact: true }).click()
  await expect(page.locator('.directions__summary')).toBeVisible()
  expect(await geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
  expect(outbound.filter((request) => request.url.includes('kolkata-walking.json'))).toHaveLength(1)
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.copies.length)).toBe(1)
  const retained = await page.evaluate(() => JSON.stringify({ storage: { ...localStorage, ...sessionStorage }, shares: window.__plannerQA.copies }))
  for (const coordinate of [position.lat, position.lng]) {
    expect(retained).not.toContain(String(coordinate))
    expect(fallback.href).not.toContain(String(coordinate))
    expect(outbound.some((request) => request.url.includes(String(coordinate)) || request.body?.includes(String(coordinate)))).toBe(false)
  }
})

test('off-route guidance waits for explicit recalculation and road arrival never marks a visit', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await openWalking(page, 'planned', 'bagbazar')
  const worker = page.workers()[0]
  await worker.evaluate(() => {
    const scope = self as unknown as { lastResult?: StreetRouteResult; postMessage: (message: { type: string; result?: StreetRouteResult }) => void }
    const send = scope.postMessage.bind(scope)
    scope.postMessage = (message) => {
      if (message.type === 'result') scope.lastResult = message.result
      send(message)
    }
  })
  await page.getByRole('button', { name: 'Start walking', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  const offRoute = START_POINTS.find((point) => point.id === 'start-blue-girish-park')!
  await emitGps(page, { ...offRoute, accuracy: 8 })
  await expect(page.locator('.directions__follow-state')).toHaveText('Off mapped route. Progress paused.')
  await page.clock.fastForward(3000)
  await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m')
  await page.getByRole('button', { name: 'Recalculate from here', exact: true }).click()
  await expect(page.locator('.directions__summary')).toBeVisible()
  await expect(page.locator('.directions__summary strong')).not.toHaveText('1,145 m')
  await expect(page.locator('.directions__places > span')).toHaveText('Your location')
  await expect(page.locator('.directions__follow-state')).toHaveText('Following location')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  const result = await worker.evaluate(() => (self as unknown as { lastResult?: StreetRouteResult }).lastResult)
  expect(result?.status).toBe('ok')
  if (result?.status !== 'ok') throw new Error('Expected actual worker route')
  await emitGps(page, { ...result.destinationSnap.coordinate, accuracy: 8 })
  await expect(page.locator('.directions__follow-state')).toHaveText('Near mapped destination')
  await page.clock.fastForward(60_000)
  expect((await savedPlan(page)).visits).toEqual([])
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.getByRole('button', { name: 'Mark Bagbazar Sarbojanin as visited', exact: true }).click()
  await expect(page.locator('.navigation-next strong')).toHaveText('Kumartuli Park')
  expect((await savedPlan(page)).visits).toEqual([{ pandalId: 'bagbazar', at: expect.any(Number), method: 'manual' }])
})

function syntheticRoute(strategy: 'shortest' | 'quieter', geometry: Coordinate[], metres: number, penalty: number): StreetRoute {
  const partMetres = metres / (geometry.length - 1)
  return {
    strategy, metres, estimatedPenaltyMetres: penalty, cost: strategy === 'shortest' ? metres : metres + penalty,
    geometry, cumulativeMetres: geometry.map((_point, index) => index * partMetres),
    segments: geometry.slice(1).map((_point, index) => ({ edgeIndex: index, fromFraction: 0, toFraction: 1, metres: partMetres, startGeometryIndex: index, endGeometryIndex: index + 1 })),
    steps: [
      ...geometry.slice(0, -1).map((at, index) => ({ maneuver: index === 0 ? 'depart' as const : 'turn-left' as const, name: strategy === 'shortest' ? 'Synthetic direct street' : 'Synthetic detour street', at, metres: partMetres, startGeometryIndex: index, endGeometryIndex: index + 1, flags: 0 })),
      { maneuver: 'arrive', name: null, at: geometry.at(-1)!, metres: 0, startGeometryIndex: geometry.length - 1, endGeometryIndex: geometry.length - 1, flags: 0 },
    ],
  }
}

function syntheticResult(): Extract<StreetRouteResult, { status: 'ok' }> {
  const origin = { lat: 22.6013, lng: 88.3726 }
  const destination = { lat: 22.6047, lng: 88.36613 }
  const snap = (coordinate: Coordinate) => ({ edgeIndex: 0, fraction: 0, coordinate, offsetMetres: 10, osmNodeId: null, component: 0, accessVerified: false as const })
  return {
    status: 'ok', originSnap: snap(origin), destinationSnap: snap(destination), alternativesDiffer: true,
    shortest: syntheticRoute('shortest', [origin, { lat: 22.6013, lng: 88.36613 }, destination], 1000, 1200),
    quieter: syntheticRoute('quieter', [origin, { lat: 22.6003, lng: 88.371 }, { lat: 22.6003, lng: 88.36613 }, destination], 1300, 100),
    sourceTimestamp: '2026-10-14T20:21:12Z', warnings: [],
  }
}

async function pendingWorkerRequests(worker: BrowserWorker) {
  return worker.evaluate(() => (self as unknown as { requests: { requestId: number }[] }).requests)
}

async function replyFromMock(worker: BrowserWorker, requestId: number, result: StreetRouteResult = syntheticResult()) {
  await worker.evaluate(({ requestId, result }) => self.postMessage({ type: 'result', requestId, result }), { requestId, result })
}

const MOCK_WORKER = `self.requests = []; self.addEventListener('message', ({ data }) => { if (data.type === 'route') self.requests.push(data); });`

test('mocked worker: distinct-route controls show real fixture distances, extra time and preserve the chosen strategy', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await context.route('**/src/workers/streets.worker.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: MOCK_WORKER }))
  await page.goto('/')
  const created = page.waitForEvent('worker')
  await beginWalking(page, 'planned', 'bagbazar')
  const worker = await created
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(1)
  await replyFromMock(worker, (await pendingWorkerRequests(worker))[0].requestId)
  await expect(page.locator('.directions__summary')).toHaveAttribute('data-strategy', 'shortest')
  await expect(page.locator('.street-alternative')).toHaveCount(1)
  await expect(page.locator('#map-legend')).toContainText('Other option: Lower estimated crowd')
  await page.getByRole('radio', { name: 'Lower estimated crowd', exact: true }).click()
  await expect(page.locator('.directions__summary')).toHaveAttribute('data-strategy', 'quieter')
  await expect(page.locator('.directions__summary strong')).toHaveText('1,300 m')
  await expect(page.locator('.directions__extra')).toHaveText('Extra 300 m · 6 min')
  await expect(page.locator('#map-legend')).toContainText('Other option: Shortest')
  await page.locator('.directions__source summary').click()
  await expect(page.locator('.directions__source')).toContainText('Lower estimated crowd: compared with the shortest mapped route')
  await expect(page.locator('.directions__source')).toContainText('not live, not crowd-free and not safer')
  await expect(page.locator('.directions__source')).not.toContainText('Shortest within this mapped walking network.')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', '4')
  await expect(page.locator('.directions__road').first()).toHaveText('Synthetic detour street')
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await dialog.getByRole('combobox', { name: 'To', exact: true }).fill('Kum')
  await dialog.getByRole('radio', { name: t('en', 'navigationMetroBus'), exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.directions__summary')).toHaveAttribute('data-strategy', 'quieter')
  await expect(page.locator('.directions__summary strong')).toHaveText('1,300 m')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', '4')
  expect(await pendingWorkerRequests(worker)).toHaveLength(1)
  await page.clock.fastForward(16 * 60_000)
  await page.getByRole('button', { name: 'Recalculate', exact: true }).click()
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(2)
  await replyFromMock(worker, (await pendingWorkerRequests(worker)).at(-1)!.requestId)
  await expect(page.locator('.directions__summary')).toHaveAttribute('data-strategy', 'quieter')
})

test('mocked worker: committing dialog edits clears a ready route and rejects its late replies', async ({ page, context }) => {
  await seedPlan(page)
  await context.route('**/src/workers/streets.worker.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: MOCK_WORKER }))
  await page.goto('/')
  const created = page.waitForEvent('worker')
  await beginWalking(page, 'planned', 'bagbazar')
  const worker = await created
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(1)
  const originalId = (await pendingWorkerRequests(worker))[0].requestId
  await replyFromMock(worker, originalId)
  await expect(page.locator('.directions__summary strong')).toHaveText('1,000 m')
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await dialog.getByRole('combobox', { name: 'From', exact: true }).selectOption('landmark:start-blue-kalighat')
  await dialog.getByRole('combobox', { name: 'To', exact: true }).fill('Chetla Agrani')
  await expect(page.locator('.directions__summary strong')).toHaveText('1,000 m')
  expect(await pendingWorkerRequests(worker)).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Show walking routes', exact: true }).click()
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(2)
  await expect(page.locator('.directions__summary')).toHaveCount(0)
  await expect(page.locator('.street-route')).toHaveCount(0)
  await expect(page.locator('.directions__places h2')).toHaveText('Chetla Agrani')
  await replyFromMock(worker, originalId)
  await expect(page.locator('.directions__summary')).toHaveCount(0)
  const replacement = syntheticResult()
  replacement.shortest = syntheticRoute('shortest', replacement.shortest.geometry, 1600, 1200)
  await replyFromMock(worker, (await pendingWorkerRequests(worker))[1].requestId, replacement)
  await expect(page.locator('.directions__summary strong')).toHaveText('1,600 m')
  await replyFromMock(worker, originalId)
  await expect(page.locator('.directions__summary strong')).toHaveText('1,600 m')
  await expect(page.locator('.directions__places h2')).toHaveText('Chetla Agrani')
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Chetla Agrani')
  await expect(dialog.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('landmark:start-blue-kalighat')
})

test('mocked worker: late replies cannot replace newer origins or departure settings', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await context.route('**/src/workers/streets.worker.ts*', (route) => route.fulfill({ contentType: 'application/javascript', body: MOCK_WORKER }))
  await page.goto('/')
  const created = page.waitForEvent('worker')
  await beginWalking(page, 'planned', 'bagbazar')
  const worker = await created
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(1)
  await page.getByRole('button', { name: 'Edit directions', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await dialog.getByRole('combobox', { name: 'From', exact: true }).selectOption('landmark:start-blue-kalighat')
  await dialog.getByRole('combobox', { name: 'To', exact: true }).fill('Chetla Agrani')
  await dialog.getByRole('button', { name: 'Show walking routes', exact: true }).click()
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(2)
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.getByRole('combobox', { name: 'Leave', exact: true }).selectOption('h18')
  await expect.poll(async () => (await pendingWorkerRequests(worker)).length).toBe(3)
  await page.getByRole('tab', { name: 'Directions', exact: true }).click()
  const requests = await pendingWorkerRequests(worker)
  await replyFromMock(worker, requests[1].requestId)
  await replyFromMock(worker, requests[0].requestId)
  await expect(page.locator('.directions__summary')).toHaveCount(0)
  await expect(page.locator('.directions__places h2')).toHaveText('Chetla Agrani')
  await replyFromMock(worker, requests[2].requestId)
  await expect(page.locator('.directions__summary')).toBeVisible()
  await page.getByRole('tab', { name: /Your route/ }).click()
  await page.getByRole('combobox', { name: 'Leave', exact: true }).selectOption('h20')
  await page.getByRole('tab', { name: 'Directions', exact: true }).click()
  await expect(page.locator('.directions .banner')).toContainText('Crowd estimate is out of date or settings changed.')
  expect(await pendingWorkerRequests(worker)).toHaveLength(3)
})

test('a loaded real street graph still recalculates when connectivity is lost', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await openWalking(page, 'planned', 'bagbazar')
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
  await expect(page.locator('.leaflet-tile:not(.leaflet-tile-loaded)')).toHaveCount(0)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await context.route('**/data/kolkata-walking.json', (route) => route.abort('internetdisconnected'))
  await setOnline(page, false)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
  await expect(page.locator('.street-route')).toHaveCount(1)
  await expect(page.locator('.pp-map__banner')).toContainText('Street route retained; background tiles unavailable.')
  await page.clock.fastForward(16 * 60_000)
  await page.getByRole('button', { name: 'Recalculate', exact: true }).click()
  await expect(page.locator('.directions__summary strong')).toHaveText('1,145 m')
  await expect(page.locator('.directions .banner')).toHaveCount(0)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

type Box = { x: number; y: number; width: number; height: number }

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function box(page: Page, selector: string): Promise<Box> {
  const bounds = await page.locator(selector).boundingBox()
  expect(bounds, `${selector} must be rendered`).not.toBeNull()
  return bounds!
}

// Opens the legend and proves the toggle stays clickable while the open legend keeps clear of every other map control.
async function expectLegendSheetUsable(page: Page, language: 'en' | 'bn') {
  const toggle = page.locator('.pp-map__legend-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const legend = page.locator('#map-legend')
  await expect(legend).toBeVisible()
  await expect(legend).toContainText(t(language, 'streetLegend'))
  const [legendBox, toggleBox, toolsBox, attributionBox, canvasBox] = await Promise.all([
    box(page, '#map-legend'), box(page, '.pp-map__legend-toggle'), box(page, '.pp-map__tools'),
    box(page, '.leaflet-control-attribution'), box(page, '.pp-map__canvas'),
  ])
  expect(overlaps(legendBox, toggleBox), 'open legend must not cover its own toggle').toBe(false)
  expect(overlaps(legendBox, toolsBox), 'open legend must not cover the map tools column').toBe(false)
  expect(overlaps(legendBox, attributionBox), 'open legend must not cover the attribution').toBe(false)
  expect(legendBox.y).toBeGreaterThanOrEqual(canvasBox.y)
  expect(legendBox.y + legendBox.height).toBeLessThanOrEqual(attributionBox.y)
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.pp-map__legend-toggle') !== null,
    [toggleBox.x + toggleBox.width / 2, toggleBox.y + toggleBox.height / 2] as const)
  expect(hit, 'toggle centre must hit-test to the toggle while the legend is open').toBe(true)
  const fits = await legend.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, items: element.querySelectorAll('li').length }))
  expect(fits.scrollHeight, 'every legend item must be visible without scrolling').toBeLessThanOrEqual(fits.clientHeight + 1)
  expect(fits.items).toBeGreaterThanOrEqual(6)
  return { legendBox, toggleBox }
}

async function focusedClass(page: Page) {
  return page.evaluate(() => `${document.activeElement?.tagName.toLowerCase()} ${document.activeElement?.className ?? ''}`.trim())
}

// Leaflet keeps removed tooltips at opacity 0 for a 200 ms fade (slower under the fake clock); axe must see the settled DOM.
async function expectMapSettled(page: Page) {
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0)
  await expect(page.locator('.leaflet-tooltip:empty')).toHaveCount(0)
}

async function expectNoAxeViolations(page: Page) {
  await expectMapSettled(page)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations).toEqual([])
}

const RESULT_CAPTURE = () => {
  const results: unknown[] = []
  Object.assign(window, { __streetResults: results })
  window.Worker = new Proxy(window.Worker, {
    construct(WorkerClass, args) {
      const worker = Reflect.construct(WorkerClass, args) as Worker
      worker.addEventListener('message', (event: MessageEvent<{ type?: string; result?: unknown }>) => {
        if (event.data?.type === 'result') results.push(event.data.result)
      })
      return worker
    },
  })
}

async function latestWorkerResult(page: Page) {
  const result = await page.evaluate(() => (window as unknown as { __streetResults: StreetRouteResult[] }).__streetResults.at(-1))
  expect(result?.status).toBe('ok')
  if (result?.status !== 'ok') throw new Error('Expected a real worker route')
  return result
}

for (const language of ['en', 'bn'] as const) {
  test(`320x568 ${language}: legend sheet keeps the Layers toggle reachable and live guidance stays above the fold`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.clock.install({ time: FIXED_TIME })
    await page.addInitScript(RESULT_CAPTURE)
    await seedPlan(page)
    await page.goto('/')
    await openWalking(page, 'landmark:start-blue-shyambazar', 'bagbazar')
    await expect.poll(() => focusedClass(page), 'ready route moves lost focus to the destination heading').toBe('h2')
    if (language === 'bn') await page.locator('header button[role="radio"][lang="bn"]').click()
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
    const result = await latestWorkerResult(page)
    const canvas = await box(page, '.pp-map__canvas')
    expect(canvas.height).toBeLessThanOrEqual(230)

    // Idle: the Start call to action and the first manoeuvre are visible without scrolling.
    await expect(page.locator('.directions__follow-state')).toHaveText(t(language, 'streetReady'))
    const start = await box(page, `.directions > .btn--primary.btn--block`)
    expect(start.y + start.height).toBeLessThanOrEqual(568)
    const firstManoeuvre = await box(page, '.directions__turn > div')
    expect(firstManoeuvre.y + firstManoeuvre.height).toBeLessThanOrEqual(568)
    await expect(page.locator('.directions__turn > small')).toHaveCount(0)

    // Online legend sheet: the zoom control under it is hidden whole instead of half-covered.
    await expectLegendSheetUsable(page, language)
    await expect(page.locator('.leaflet-control-zoom')).toBeHidden()
    await page.screenshot({ path: testInfo.outputPath(`short-legend-online-320-${language}.png`), animations: 'disabled' })
    await page.locator('.pp-map__legend-toggle').click()
    await expect(page.locator('.pp-map__legend-toggle')).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible()
    await page.locator('.pp-map__legend-toggle').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.pp-map__legend-toggle')).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(page.locator('.pp-map__legend-toggle')).toHaveAttribute('aria-expanded', 'false')

    // Schematic (offline): the notice keeps clear of every control, and steps aside while the legend sheet is open.
    await setOnline(page, false)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
    await expect(page.locator('.pp-map__banner')).toContainText(t(language, 'offlineOverview'))
    const banner = await box(page, '.pp-map__banner')
    expect(overlaps(banner, await box(page, '.leaflet-control-zoom'))).toBe(false)
    expect(overlaps(banner, await box(page, '.pp-map__tools'))).toBe(false)
    expect(overlaps(banner, await box(page, '.leaflet-control-attribution'))).toBe(false)
    await page.screenshot({ path: testInfo.outputPath(`short-schematic-notice-320-${language}.png`), animations: 'disabled' })
    await expectLegendSheetUsable(page, language)
    await expect(page.locator('.pp-map__banner')).toBeHidden()
    await expectNoAxeViolations(page)
    await page.screenshot({ path: testInfo.outputPath(`short-legend-schematic-320-${language}.png`), animations: 'disabled' })
    await page.locator('.pp-map__legend-toggle').click()
    await expect(page.locator('.pp-map__banner')).toBeVisible()
    await setOnline(page, true)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')

    // Following: the current turn, next turn, remaining distance and pause control fit the first viewport.
    await page.getByRole('button', { name: t(language, 'streetStartWalking'), exact: true }).click()
    await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
    await emitGps(page, { ...result.originSnap.coordinate, accuracy: 8 })
    await expect(page.locator('.directions__follow-state')).toHaveText(t(language, 'streetFollowing'))
    expect(await focusedClass(page)).toMatch(/^div directions__turn/)
    expect(await page.locator('.panel__body').evaluate((element) => element.scrollTop)).toBe(0)
    const turn = await box(page, '.directions__turn')
    expect(turn.y + turn.height).toBeLessThanOrEqual(568)
    await expect(page.locator('.directions__turn p')).toContainText(t(language, 'streetTurnLeft'))
    await expect(page.locator('.directions__turn p')).toContainText('State Highway 1')
    await expect(page.locator('.directions__turn > small')).toHaveText(t(language, 'streetRemaining', { distance: t(language, 'metres', { m: formatNumber(language, Math.round(result.shortest.metres)) }) }))
    const pause = await box(page, '.directions__pause')
    expect(pause.y + pause.height).toBeLessThanOrEqual(568)
    await expectNoAxeViolations(page)
    await page.screenshot({ path: testInfo.outputPath(`short-following-320-${language}.png`), animations: 'disabled' })

    // Arrival at the snapped road point names the destination and keeps the off-street gap prominent.
    await emitGps(page, { ...result.destinationSnap.coordinate, accuracy: 8 })
    await expect(page.locator('.directions__follow-state')).toHaveText(t(language, 'streetNearDestination'))
    const destination = PANDALS.find((pandal) => pandal.id === 'bagbazar')!
    await expect(page.locator('.directions__turn strong')).toHaveText(language === 'bn' ? destination.nameBn : destination.name)
    await expect(page.locator('.directions__turn')).not.toContainText(t(language, 'streetUnnamed'))
    const gap = t(language, 'metres', { m: formatNumber(language, Math.round(result.destinationSnap.offsetMetres)) })
    await expect(page.locator('.directions__gap-note')).toHaveText(t(language, 'streetArrivedGap', { distance: gap }))
    await expect(page.locator('.directions__turn > small')).toHaveText(t(language, 'streetRemainingMapped', { distance: t(language, 'metres', { m: formatNumber(language, 0) }) }))
    await expect(page.locator('.directions__step').last()).toContainText(t(language, 'streetArrivedGap', { distance: gap }))
    await expect(page.locator('.directions__step').last().locator('.directions__distance')).toHaveCount(0)
    expect((await savedPlan(page)).visits).toEqual([])
    expect(await geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
    await page.screenshot({ path: testInfo.outputPath(`short-arrived-320-${language}.png`), animations: 'disabled' })

    // Picking from the panel collapses it, so keyboard focus is handed to the map canvas (Enter picks the centre).
    await page.getByRole('button', { name: t(language, 'streetPickDestination'), exact: true }).click()
    await expect(page.locator('.pp-map')).toHaveClass(/is-picking/)
    await expect(page.locator('.pp-map__canvas')).toBeFocused()
    await page.locator('.pp-map__picker').getByRole('button', { name: t(language, 'cancel'), exact: true }).click()
    await expect(page.locator('.pp-map')).not.toHaveClass(/is-picking/)
    await expect(page.locator('.directions__summary')).toBeVisible()
  })
}

test('micro junction steps stay listed as compact rows and the panel keeps 44px targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await openWalking(page, 'landmark:start-blue-shyambazar', 'bagbazar')
  const rows = page.locator('.directions__step')
  await expect(rows).toHaveCount(8)
  await expect(rows.nth(1)).toHaveClass(/is-short/)
  await expect(rows.nth(1)).toContainText('State Highway 1')
  await expect(rows.nth(1).locator('.directions__distance')).toHaveText('8 m')
  await expect(rows.nth(2)).toHaveClass(/is-short/)
  await expect(rows.nth(0)).not.toHaveClass(/is-short/)
  await expect(rows.nth(3)).not.toHaveClass(/is-short/)
  const heights = await rows.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)))
  expect(heights[1]).toBeGreaterThanOrEqual(44)
  expect(heights[1]).toBeLessThan(heights[0])
  expect(heights[2]).toBeLessThan(heights[3])
  const order = await page.locator('.directions > *').evaluateAll((elements) => elements.map((element) => element.className.split(' ')[0]))
  expect(order.indexOf('directions__turn')).toBeLessThan(order.indexOf('directions__summary'))
  expect(order.indexOf('directions__summary')).toBeLessThan(order.indexOf('directions__steps'))
})

test('a slow tile server keeps its requests alive behind the overview instead of reporting an outage', async ({ page, context }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  const held: Route[] = []
  await context.route('https://tile.openstreetmap.org/**', (route) => { held.push(route) })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'loading')
  await expect.poll(() => held.length).toBeGreaterThan(0)
  await page.clock.fastForward(12_500)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'slow')
  await expect(page.locator('.pp-map')).toHaveClass(/is-schematic/)
  await expect(page.locator('.pp-map__banner')).toContainText('Street map is slow to load')
  await expect(page.locator('.pp-map__banner')).toContainText('Overview shown until street tiles arrive.')
  await expect(page.getByRole('button', { name: 'Retry street map', exact: true })).toBeVisible()
  await expect(page.locator('.leaflet-tile-pane img[src^="https://tile.openstreetmap.org/"]')).not.toHaveCount(0)
  expect(await page.locator('.leaflet-tile-pane').evaluate((element) => getComputedStyle(element).visibility)).toBe('hidden')
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S9sAAAAASUVORK5CYII=', 'base64')
  // Tiles abandoned by Leaflet's zoom change are already cancelled by the browser; only live ones can be answered.
  for (const route of held.splice(0)) await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => undefined)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expect(page.locator('.pp-map')).not.toHaveClass(/is-schematic/)
  await expect(page.locator('.pp-map__banner')).toHaveCount(0)
  expect(await page.locator('.leaflet-tile-pane').evaluate((element) => getComputedStyle(element).visibility)).toBe('visible')
  await context.unroute('https://tile.openstreetmap.org/**')
})

test.describe('real-data directions responsive screenshots', () => {
  const realTiles = process.env.REAL_OSM_TILES === '1'
  test.use({ realStreetTiles: realTiles })

  for (const screen of [
    { width: 320, height: 568, language: 'bn' as const },
    { width: 390, height: 844, language: 'en' as const },
    { width: 1440, height: 900, language: 'en' as const },
  ]) {
    test(`${screen.width}px ${screen.language} shows readable directions and actual road geometry`, async ({ page }, testInfo) => {
      test.setTimeout(realTiles ? 90_000 : 45_000)
      const tileResponses: number[] = []
      const startedAt = Date.now()
      page.on('response', (response) => {
        if (response.url().startsWith('https://tile.openstreetmap.org/') && response.ok()) tileResponses.push(Date.now() - startedAt)
      })
      await page.setViewportSize({ width: screen.width, height: screen.height })
      await page.clock.install({ time: FIXED_TIME })
      await seedPlan(page)
      await page.goto('/')
      await openWalking(page, 'planned', 'bagbazar')
      if (screen.language === 'bn') await page.locator('header button[role="radio"][lang="bn"]').click()
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveAttribute('lang', screen.language)
      await expect(page.getByRole('tab', { name: t(screen.language, 'streetDirections'), exact: true })).toHaveAttribute('aria-selected', 'true')
      try {
        await expect(page.locator('.pp-map'), realTiles ? 'Real OpenStreetMap tile check' : 'Controlled background tiles with the real Kolkata street graph').toHaveAttribute('data-streets', 'ready', { timeout: realTiles ? 45_000 : 15_000 })
      } finally {
        await testInfo.attach('background-tile-responses', { contentType: 'application/json', body: JSON.stringify({ provenance: realTiles ? 'real-osm' : 'fixture', streetGraph: 'real-kolkata-data', count: tileResponses.length, firstMs: tileResponses[0] ?? null, lastMs: tileResponses.at(-1) ?? null }) })
      }
      await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
      await expect(page.locator('path.street-route')).toBeVisible()
      await expect(page.locator('path.street-route')).toHaveAttribute('stroke', '#14664d')
      const paint = await page.locator('path.street-route').evaluate((element) => {
        const route = element as SVGPathElement
        const first = route.getPointAtLength(0)
        const last = route.getPointAtLength(route.getTotalLength())
        const toScreen = (point: { x: number; y: number }, path: SVGGraphicsElement) => new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM()!)
        const gap = (point: { x: number; y: number }, selector: string) => {
          const snap = document.querySelector<SVGPathElement>(selector)!
          const box = snap.getBBox()
          const target = toScreen({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, snap)
          const actual = toScreen(point, route)
          return Math.hypot(actual.x - target.x, actual.y - target.y)
        }
        return { startGap: gap(first, '.street-snap-origin'), endGap: gap(last, '.street-snap-destination'), scale: route.getScreenCTM()?.a, path: route.getAttribute('d') }
      })
      await testInfo.attach('rendered-street-endpoints', { contentType: 'application/json', body: JSON.stringify(paint) })
      expect(paint.startGap).toBeLessThan(2)
      expect(paint.endGap).toBeLessThan(2)
      expect(paint.scale).toBe(1)
      await expect.poll(() => page.locator('img.leaflet-tile-loaded').evaluateAll((images, minimum) => images.filter((image) => (image as HTMLImageElement).naturalWidth >= minimum).length, realTiles ? 256 : 1)).toBeGreaterThan(0)
      await expect(page.locator('.pp-map')).toHaveAttribute('data-route-points', '32')
      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        overflow: [...document.querySelectorAll<HTMLElement>('.directions, .panel__body, .directions button, .directions a, .directions summary')]
          .filter((element) => element.checkVisibility())
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => element.className),
        targets: [...document.querySelectorAll<HTMLElement>('.directions button, .directions a, .directions summary')]
          .filter((element) => element.checkVisibility())
          .filter((element) => element.getBoundingClientRect().height < 44 || element.getBoundingClientRect().width < 44)
          .map((element) => element.className),
      }))
      expect(layout).toEqual({ viewport: screen.width, width: screen.width, overflow: [], targets: [] })
      await expect(page.locator('.directions__follow-state')).toHaveText(t(screen.language, 'streetReady'))
      const start = await box(page, '.directions > .btn--primary.btn--block')
      expect(start.y + start.height, 'Start walking must be visible before scrolling').toBeLessThanOrEqual(screen.height)
      const turn = await box(page, '.directions__turn')
      expect(turn.y, 'the guidance card must begin inside the first viewport').toBeLessThan(screen.height - 44)
      if (screen.height >= 800) expect(turn.y + turn.height).toBeLessThanOrEqual(screen.height)
      await expectNoAxeViolations(page)
      await page.locator('.panel__body').evaluate((element) => { element.scrollTop = 0 })
      const screenshot = testInfo.outputPath(`street-directions-${screen.width}-${screen.language}.png`)
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
      await testInfo.attach('real-street-directions', { path: screenshot, contentType: 'image/png' })
      if (screen.height < 600) {
        await expectLegendSheetUsable(page, screen.language)
        await page.screenshot({ path: testInfo.outputPath(`street-legend-open-${screen.width}-${screen.language}.png`), animations: 'disabled' })
        await page.locator('.pp-map__legend-toggle').click()
        await expect(page.locator('.pp-map__legend-toggle')).toHaveAttribute('aria-expanded', 'false')
        const originSnap = await page.locator('.directions__gaps p').first().textContent()
        expect(originSnap).toContain(t(screen.language, 'metres', { m: formatNumber(screen.language, 8) }))
        await page.getByRole('button', { name: t(screen.language, 'streetStartWalking'), exact: true }).click()
        await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
        await emitGps(page, { lat: 22.601384258878337, lng: 88.37256363005778, accuracy: 8 })
        await expect(page.locator('.directions__follow-state')).toHaveText(t(screen.language, 'streetFollowing'))
        const following = await box(page, '.directions__turn')
        expect(following.y + following.height, 'live guidance must fit the first viewport while following').toBeLessThanOrEqual(screen.height)
        expect(await page.locator('.panel__body').evaluate((element) => element.scrollTop)).toBe(0)
        await page.screenshot({ path: testInfo.outputPath(`street-following-${screen.width}-${screen.language}.png`), animations: 'disabled' })
        expect(await geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
      } else {
        expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
      }
    })
  }
})