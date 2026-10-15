import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { PANDALS, CURATED_ROUTES, START_POINTS } from '../../src/data/pandals'
import { t } from '../../src/i18n'
import {
  emitGps, expect, FIXED_TIME, geoCalls, ORIGIN, savedPlan, seedPlan, setOnline, setVisibility, sharedHash, test,
} from './planner.fixture'

test('English and Bengali controls update the document language and survive reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Puja Path', exact: true })).toBeVisible()
  const bengali = page.locator('header button[role="radio"][lang="bn"]')
  await bengali.click()
  await expect(bengali).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expect(page.getByRole('heading', { name: t('bn', 'appName'), exact: true })).toBeVisible()
  await expect.poll(async () => (await savedPlan(page)).language).toBe('bn')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expect(page.getByRole('tab', { name: new RegExp(t('bn', 'tabRoute')) })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('radio', { name: 'EN', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('44px language targets preserve the full English and Bengali brand at 320px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  for (const language of ['en', 'bn'] as const) {
    await page.locator(`header button[role="radio"][lang="${language}"]`).click()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.getByRole('heading', { name: t(language, 'appName'), exact: true })).toBeVisible()
    await page.evaluate(async () => { await document.fonts.ready })
    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.header')!
      const headerBounds = header.getBoundingClientRect()
      const heading = header.querySelector<HTMLElement>('h1')!
      const headingBounds = heading.getBoundingClientRect()
      const mark = header.querySelector<HTMLElement>('.brand__mark')!
      const markBounds = mark.getBoundingClientRect()
      const targets = [...header.querySelectorAll<HTMLButtonElement>('button')].map((button) => {
        const bounds = button.getBoundingClientRect()
        return {
          label: button.getAttribute('aria-label') ?? button.textContent?.trim(),
          language: button.lang,
          left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height,
          clientWidth: button.clientWidth, scrollWidth: button.scrollWidth,
        }
      })
      const overlaps = targets.flatMap((target, index) => targets.slice(index + 1)
        .filter((other) => target.left < other.right && target.right > other.left
          && target.top < other.bottom && target.bottom > other.top)
        .map((other) => [target.label, other.label]))
      return {
        viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
        header: { left: headerBounds.left, right: headerBounds.right, top: headerBounds.top, bottom: headerBounds.bottom },
        brand: {
          text: heading.textContent, visible: heading.checkVisibility(),
          left: headingBounds.left, right: headingBounds.right,
          clientWidth: heading.clientWidth, scrollWidth: heading.scrollWidth,
          markVisible: mark.checkVisibility(), markRight: markBounds.right,
        },
        targets, overlaps,
      }
    })
    await testInfo.attach(`320-${language}-header-geometry`, {
      contentType: 'application/json', body: JSON.stringify(geometry, null, 2),
    })
    expect(geometry.viewport).toEqual({ width: 320, height: 844 })
    expect(geometry.documentWidth).toBeLessThanOrEqual(320)
    expect(geometry.brand.visible && geometry.brand.markVisible).toBe(true)
    expect(geometry.brand.scrollWidth).toBeLessThanOrEqual(geometry.brand.clientWidth)
    expect(geometry.brand.markRight).toBeLessThanOrEqual(geometry.brand.left)
    expect(geometry.brand.right).toBeLessThanOrEqual(geometry.targets[0].left)
    expect(geometry.overlaps).toEqual([])
    expect(geometry.targets.filter((target) => target.language)).toHaveLength(2)
    for (const target of geometry.targets) {
      expect(target.width, `${language}: ${target.label} width`).toBeGreaterThanOrEqual(44)
      expect(target.height, `${language}: ${target.label} height`).toBeGreaterThanOrEqual(44)
      expect(target.scrollWidth).toBeLessThanOrEqual(target.clientWidth)
      expect(target.left).toBeGreaterThanOrEqual(geometry.header.left)
      expect(target.right).toBeLessThanOrEqual(geometry.header.right)
      expect(target.top).toBeGreaterThanOrEqual(geometry.header.top)
      expect(target.bottom).toBeLessThanOrEqual(geometry.header.bottom)
    }
    const screenshot = testInfo.outputPath(`320-${language}-header.png`)
    await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: true })
    await testInfo.attach(`320-${language}-header`, { path: screenshot, contentType: 'image/png' })
  }
})

test('privacy dialog discloses GPS, map tiles and directions requests in English and Bengali', async ({ page }, testInfo) => {
  await page.goto('/')
  for (const language of ['en', 'bn'] as const) {
    await page.locator(`header button[role="radio"][lang="${language}"]`).click()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await page.getByRole('button', { name: t(language, 'about'), exact: true }).click()
    const about = page.getByRole('dialog', { name: t(language, 'aboutTitle'), exact: true })
    const privacy = about.locator('section').filter({
      has: page.getByRole('heading', { name: t(language, 'aboutPrivacy'), exact: true }),
    }).locator('p')
    await expect(privacy).toHaveText(t(language, 'aboutPrivacyBody'))
    const phrases = language === 'en'
      ? ['raw GPS coordinates', 'in memory', 'not saved or included in shared plans', 'viewed map area', 'IP address', 'separate request']
      : ['জিপিএসের মূল স্থানাঙ্ক', 'মেমোরিতে', 'সংরক্ষিত হয় না', 'শেয়ার করা প্ল্যানে থাকে না', 'মানচিত্রের এলাকা', 'IP ঠিকানা', 'আলাদা অনুরোধ']
    for (const phrase of ['OpenStreetMap', ...phrases]) await expect(privacy).toContainText(phrase)
    await privacy.scrollIntoViewIfNeeded()
    const screenshot = testInfo.outputPath(`privacy-${language}.png`)
    await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: true })
    await testInfo.attach(`privacy-${language}`, { path: screenshot, contentType: 'image/png' })
    await about.getByRole('button', { name: t(language, 'close'), exact: true }).click()
  }
})

test('search combines English variants, Bengali, zones, sorting and an empty result', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  const rows = page.locator('.pandal-row')
  const search = page.getByRole('searchbox', { name: 'Search pandals' })
  await expect(rows).toHaveCount(PANDALS.length)
  await search.fill('Kumortuli')
  await expect(rows).toHaveCount(1)
  await expect(rows.getByRole('button', { name: 'Kumartuli Park', exact: true })).toBeVisible()
  await search.fill(PANDALS[0].nameBn)
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Bagbazar Sarbojanin')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('group', { name: 'Zone', exact: true }).getByRole('button', { name: 'South', exact: true }).click()
  const southern = PANDALS.filter((pandal) => pandal.zone === 'South')
  await expect(rows).toHaveCount(southern.length)
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('name')
  await expect(rows.locator('.link-title')).toHaveText(southern.map((pandal) => pandal.name).sort(new Intl.Collator('en').compare))
  await search.fill('Bagbazar')
  await expect(rows).toHaveCount(0)
  await expect(page.getByText('No pandals match your search.', { exact: true })).toBeVisible()
  await page.getByRole('group', { name: 'Zone', exact: true }).getByRole('button', { name: 'All', exact: true }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Bagbazar Sarbojanin')
})

test('preset replacement is explicit and adding or removing stops enforces the limit of 12', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stop-list > li')).toHaveCount(4)
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  const central = page.locator('.route-item').filter({ hasText: 'Central Kolkata squares' })
  await central.getByRole('button', { name: 'Use this route' }).click()
  const confirm = page.getByRole('dialog', { name: 'Replace your route?' })
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await savedPlan(page)).stopIds).toEqual(CURATED_ROUTES[0].stopIds)
  await central.getByRole('button', { name: 'Use this route' }).click()
  await confirm.getByRole('button', { name: 'Replace', exact: true }).click()
  await expect(page.locator('.stop-list > li')).toHaveCount(3)
  expect((await savedPlan(page)).stopIds).toEqual(CURATED_ROUTES[1].stopIds)
  await page.getByRole('button', { name: 'Clear all stops' }).click()
  await expect(page.getByRole('button', { name: 'Start journey', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Optimize route', exact: true })).toBeDisabled()
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  for (const pandal of PANDALS.slice(0, 12)) {
    await page.getByRole('button', { name: `Add ${pandal.name} to route`, exact: true }).click()
    await expect(page.getByRole('button', { name: `Remove ${pandal.name} from route`, exact: true })).toBeEnabled()
  }
  await expect(page.locator('.pandal-row button[disabled]')).toHaveCount(PANDALS.length - 12)
  const thirteenth = PANDALS[12]
  const add = page.getByRole('button', { name: `Add ${thirteenth.name} to route`, exact: true })
  await expect(add).toBeDisabled()
  await expect(add).toHaveAttribute('title', 'Route is full: 12 stops')
  await page.getByRole('button', { name: thirteenth.name, exact: true }).click()
  const detail = page.getByRole('dialog', { name: thirteenth.name, exact: true })
  await expect(detail.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
  await detail.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: `Remove ${PANDALS[0].name} from route`, exact: true }).click()
  await expect(add).toBeEnabled()
  await add.click()
  await page.getByRole('tab', { name: /^Your route/ }).click()
  await expect(page.locator('.stop-list > li')).toHaveCount(12)
  await page.reload()
  await expect(page.locator('.stop-list > li')).toHaveCount(12)
  expect((await savedPlan(page)).stopIds).toEqual(PANDALS.slice(1, 13).map((pandal) => pandal.id))
})

test('manual completion, undo and next-stop progress persist across reloads', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start journey', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('button', { name: 'Mark Bagbazar Sarbojanin as visited', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.next-stop')).toContainText('Kumartuli Park')
  await expect.poll(async () => (await savedPlan(page)).visits).toEqual([
    { pandalId: 'bagbazar', at: expect.any(Number), method: 'manual' },
  ])
  await page.reload()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('button', { name: 'Start journey', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo visited for Bagbazar Sarbojanin', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect.poll(async () => (await savedPlan(page)).visits).toEqual([])
  await page.reload()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('navigation opens the next destination without optimization or GPS', async ({ page }) => {
  await page.goto('/')
  const next = page.locator('.navigation-next')
  const first = PANDALS.find((pandal) => pandal.id === CURATED_ROUTES[0].stopIds[0])!
  await expect(next.getByRole('heading', { name: 'Next destination', exact: true })).toBeVisible()
  await expect(next.locator('strong')).toHaveText(first.name)
  await expect(page.locator('.estimate')).toHaveCount(0)
  const original = await savedPlan(page)
  const launch = next.getByRole('button', { name: t('en', 'navigateTo', { name: first.name }), exact: true })
  await launch.click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(navigation.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('current')
  await expect(navigation.getByRole('combobox', { name: 'To', exact: true })).toHaveValue(first.name)
  const link = navigation.getByRole('link', { name: 'Start walking navigation', exact: true })
  const url = new URL((await link.getAttribute('href'))!)
  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
  expect(url.searchParams.get('destination')).toBe(`${first.lat.toFixed(5)},${first.lng.toFixed(5)}`)
  expect(url.searchParams.get('travelmode')).toBe('walking')
  expect(url.searchParams.get('dir_action')).toBe('navigate')
  expect(url.searchParams.has('origin')).toBe(false)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(await savedPlan(page)).toEqual(original)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  await navigation.press('Escape')
  await expect(launch).toBeFocused()
  for (const [index, id] of original.stopIds.entries()) {
    const pandal = PANDALS.find((point) => point.id === id)!
    await page.getByRole('button', { name: `Mark ${pandal.name} as visited`, exact: true }).click()
    const pending = original.stopIds[index + 1]
    if (pending) await expect(next.locator('strong')).toHaveText(PANDALS.find((point) => point.id === pending)!.name)
  }
  await expect(next).toContainText(t('en', 'allVisited'))
  await expect(next.locator('strong')).toHaveCount(0)
  await expect(next.getByRole('button')).toHaveCount(1)
  await next.getByRole('button', { name: 'Navigate somewhere', exact: true }).click()
  await expect(navigation.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('')
  await expect(navigation.getByRole('button', { name: 'Start walking navigation', exact: true })).toBeDisabled()
  await expect(navigation.getByRole('link')).toHaveCount(0)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('navigation previews explicit public origins and resets to current location on reopening', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  const original = await savedPlan(page)
  await page.locator('.stop-list').getByRole('button', { name: 'Navigate to Kumartuli Park', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  const from = navigation.getByRole('combobox', { name: 'From', exact: true })
  const to = navigation.getByRole('combobox', { name: 'To', exact: true })
  await expect(from).toHaveValue('current')
  await from.selectOption('planned')
  const start = START_POINTS.find((point) => point.id === original.startId)!
  await expect(navigation).toContainText(start.name)
  await expect(navigation).toContainText(t('en', 'navigationPreviewNote'))
  let url = new URL((await navigation.getByRole('link', { name: 'Open route preview', exact: true }).getAttribute('href'))!)
  expect(url.searchParams.get('origin')).toBe(`${start.lat.toFixed(5)},${start.lng.toFixed(5)}`)
  expect(url.searchParams.has('dir_action')).toBe(false)
  await from.selectOption({ label: 'Previous stop: Bagbazar Sarbojanin' })
  url = new URL((await navigation.getByRole('link').getAttribute('href'))!)
  expect(url.searchParams.get('origin')).toBe('22.60470,88.36613')
  const landmark = START_POINTS.find((point) => point.id === 'start-blue-esplanade')!
  await from.selectOption(`landmark:${landmark.id}`)
  await to.fill(landmark.name)
  url = new URL((await navigation.getByRole('link').getAttribute('href'))!)
  const publicPin = `${landmark.lat.toFixed(5)},${landmark.lng.toFixed(5)}`
  expect(url.searchParams.get('origin')).toBe(publicPin)
  expect(url.searchParams.get('destination')).toBe(publicPin)
  const outsideRoute = PANDALS.find((pandal) => !original.stopIds.includes(pandal.id))!
  await to.fill(outsideRoute.name)
  url = new URL((await navigation.getByRole('link').getAttribute('href'))!)
  expect(url.searchParams.get('destination')).toBe(`${outsideRoute.lat.toFixed(5)},${outsideRoute.lng.toFixed(5)}`)
  await expect(navigation).toContainText(outsideRoute.address)
  await expect(navigation).toContainText(t('en', 'navigationApproximate'))
  await navigation.getByRole('radio', { name: 'Drive', exact: true }).click()
  await navigation.press('Escape')
  await page.locator('.navigation-next').getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  await expect(from).toHaveValue('current')
  await expect(navigation.getByRole('radio', { name: 'Walk', exact: true })).toHaveAttribute('aria-checked', 'true')
  expect(await savedPlan(page)).toEqual(original)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('navigation encodes Bengali and unsafe-looking queries without persisting or sharing them', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  const original = await savedPlan(page)
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.copies.length)).toBe(1)
  await page.locator('.navigation-next').getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  const destination = navigation.getByRole('combobox', { name: 'To', exact: true })
  for (const query of ['হাওড়া স্টেশন', 'Howrah Station', 'javascript:alert(1)&origin=private#<img src=x onerror=alert(1)>']) {
    await destination.fill(`  ${query}  `)
    await expect(navigation.getByText('Google Maps place search; no pandal pin selected.', { exact: true })).toBeVisible()
    await expect(navigation.locator('.navigation__address[aria-live]')).toHaveAttribute('aria-live', 'off')
    const url = new URL((await navigation.getByRole('link').getAttribute('href'))!)
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('destination')).toBe(query)
    expect(url.searchParams.has('origin')).toBe(false)
    expect(url.hash).toBe('')
    expect([...url.searchParams.keys()]).toEqual(['api', 'destination', 'travelmode', 'dir_action'])
    expect(url.href).not.toContain('<img')
    await expect(navigation.locator('[onerror]')).toHaveCount(0)
  }
  await destination.fill('ক'.repeat(220))
  await expect(destination).toHaveValue('ক'.repeat(200))
  expect(new URL((await navigation.getByRole('link').getAttribute('href'))!).searchParams.get('destination')).toHaveLength(200)
  await destination.fill('   ')
  await expect(navigation.getByRole('link')).toHaveCount(0)
  await expect(navigation.getByRole('button', { name: 'Start walking navigation', exact: true })).toBeDisabled()
  await destination.fill('হাওড়া স্টেশন')
  await navigation.press('Escape')
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.copies.length)).toBe(2)
  const copies = await page.evaluate(() => window.__plannerQA.copies)
  expect(copies[1]).toBe(copies[0])
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
  for (const privateText of ['হাওড়া স্টেশন', 'Howrah Station', 'javascript:', 'originId', 'destination']) {
    expect(storage).not.toContain(privateText)
    expect(copies[1]).not.toContain(privateText)
  }
  expect(await savedPlan(page)).toEqual(original)
  await page.reload()
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Navigate somewhere', exact: true }).click()
  await expect(destination).toHaveValue('')
  await expect(destination).toBeFocused()
  await expect(navigation.getByText('Destination required.', { exact: true })).toBeVisible()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

for (const location of ['denied', 'outside'] as const) {
  test(`navigation remains usable offline with ${location} GPS and preserves its draft`, async ({ page }) => {
    await seedPlan(page, { stopIds: [] })
    await page.goto('/')
    await page.getByRole('tab', { name: /^Your route/ }).click()
    await expect(page.locator('.navigation-next')).toContainText(t('en', 'navigationNoStops'))
    if (location === 'denied') await page.evaluate(() => { window.__plannerQA.denied = true })
    await page.getByRole('button', { name: 'Use my location', exact: true }).click()
    if (location === 'outside') await emitGps(page, { lat: 28.6139, lng: 77.209, accuracy: 15 })
    await expect(page.getByRole('alert')).toContainText(t('en', location === 'denied' ? 'locDenied' : 'locOutside'))
    const original = await savedPlan(page)
    await page.getByRole('button', { name: 'Navigate somewhere', exact: true }).click()
    const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
    const destination = navigation.getByRole('combobox', { name: 'To', exact: true })
    await destination.fill('হাওড়া স্টেশন')
    await navigation.getByRole('radio', { name: 'Metro + bus', exact: true }).click()
    const before = await navigation.getByRole('link').getAttribute('href')
    await setOnline(page, false)
    await expect(navigation.getByRole('status')).toHaveText(t('en', 'navigationOffline'))
    await expect(destination).toHaveValue('হাওড়া স্টেশন')
    await expect(navigation.getByRole('radio', { name: 'Metro + bus', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(navigation.getByRole('link', { name: 'Open Metro/bus directions', exact: true })).toHaveAttribute('href', before!)
    await destination.fill('Howrah Station')
    await navigation.getByRole('radio', { name: 'Drive', exact: true }).click()
    await setOnline(page, true)
    await expect(navigation.getByRole('status')).toHaveCount(0)
    await expect(destination).toHaveValue('Howrah Station')
    const url = new URL((await navigation.getByRole('link', { name: 'Start driving navigation', exact: true }).getAttribute('href'))!)
    expect(url.searchParams.get('travelmode')).toBe('driving')
    expect(url.searchParams.get('destination')).toBe('Howrah Station')
    expect(url.searchParams.has('origin')).toBe(false)
    expect(await savedPlan(page)).toEqual(original)
    expect(await geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
  })
}

test('navigation recommends only fresh planned modes and always permits an override', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page, { stopIds: ['new-town-sarbojanin', 'mudiali', 'kumartuli-park', 'bagbazar'], availableMinutes: 480 })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  const modes = new Map([['Walk', 'walking'], ['Metro', 'transit'], ['By road', 'driving']])
  const seen = new Set<string>()
  let nonWalkingName = ''
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  for (const row of await page.locator('.stop-list > li').all()) {
    const name = (await row.locator('.link-title').textContent())!
    const plannedMode = (await row.locator('.leg__main strong').textContent())!
    seen.add(plannedMode)
    if (plannedMode !== 'Walk') nonWalkingName = name
    await row.getByRole('button', { name: `Navigate to ${name}`, exact: true }).click()
    const url = new URL((await navigation.getByRole('link').getAttribute('href'))!)
    expect(url.searchParams.get('travelmode')).toBe(modes.get(plannedMode))
    expect(url.searchParams.has('origin')).toBe(false)
    await expect(navigation).toContainText(t('en', 'navigationPlannedMode'))
    await navigation.press('Escape')
  }
  expect(seen).toEqual(new Set(modes.keys()))
  await page.getByRole('radio', { name: '2 h', exact: true }).click()
  await expect(page.locator('.leg')).toHaveCount(0)
  const open = page.locator('.stop-list').getByRole('button', { name: `Navigate to ${nonWalkingName}`, exact: true })
  await open.click()
  await expect(navigation.getByRole('radio', { name: 'Walk', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(navigation.getByText(t('en', 'navigationPlannedMode'), { exact: true })).toHaveCount(0)
  await navigation.getByRole('radio', { name: 'Drive', exact: true }).click()
  await navigation.getByRole('combobox', { name: 'To', exact: true }).fill('Howrah Station')
  expect(new URL((await navigation.getByRole('link').getAttribute('href'))!).searchParams.get('travelmode')).toBe('driving')
  await navigation.press('Escape')
  await page.getByRole('button', { name: 'Re-optimize', exact: true }).click()
  await open.click()
  await expect(navigation.getByText(t('en', 'navigationPlannedMode'), { exact: true })).toBeVisible()
  await page.clock.fastForward(46 * 60_000)
  await expect(navigation.getByRole('radio', { name: 'Walk', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(navigation.getByText(t('en', 'navigationPlannedMode'), { exact: true })).toHaveCount(0)
  expect(new URL((await navigation.getByRole('link').getAttribute('href'))!).searchParams.get('travelmode')).toBe('walking')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('navigation is available from map popups and details without stacked dialogs', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  const original = await savedPlan(page)
  await page.getByTitle('Stop 1: Bagbazar Sarbojanin', { exact: true }).click()
  const popup = page.locator('.pp-popup')
  await popup.getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(navigation.getByRole('combobox', { name: 'To', exact: true })).toHaveValue('Bagbazar Sarbojanin')
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await navigation.press('Escape')
  await popup.getByRole('button', { name: 'Details', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await detail.getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  await expect(detail).not.toBeVisible()
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await expect(navigation.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('current')
  expect(await savedPlan(page)).toEqual(original)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('location is requested only by a click and denial retains a usable landmark route', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { window.__plannerQA.denied = true })
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await page.getByRole('button', { name: 'Start journey', exact: true }).click()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  const locate = page.getByRole('button', { name: 'Use my location', exact: true })
  await locate.click()
  await expect(page.getByRole('alert').filter({ hasText: 'Location permission was denied.' })).toBeVisible()
  await expect(locate).toHaveAttribute('aria-pressed', 'false')
  expect(await geoCalls(page)).toEqual({ once: 1, started: 0, active: 0 })
  await page.getByRole('combobox', { name: 'Start landmark' }).selectOption('start-blue-esplanade')
  await page.getByRole('button', { name: 'Re-optimize', exact: true }).click()
  await expect(page.locator('.estimate__meta')).toContainText('Esplanade Metro area')
  await expect(page.getByRole('switch')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Stop journey', exact: true })).toBeEnabled()
})

test('precise GPS stays out of storage, share payloads and outbound directions', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/?qa=synthetic-navigation')
  await page.getByRole('button', { name: 'Use my location', exact: true }).click()
  const precise = { lat: 22.56789123, lng: 88.34567891, accuracy: 12 }
  await emitGps(page, precise)
  await expect(page.getByText('Kept in memory only; not saved or included in shared plans.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Mark Bagbazar Sarbojanin as visited', exact: true }).click()
  await page.locator('.stop-list').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await detail.getByRole('group', { name: 'Report the crowd here' }).getByRole('button', { name: 'Heavy', exact: true }).click()
  await detail.getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await expect(detail).not.toBeVisible()
  for (const [mode, label] of [['walking', 'Walk'], ['transit', 'Metro + bus'], ['driving', 'Drive']]) {
    await navigation.getByRole('radio', { name: label, exact: true }).click()
    const anchor = navigation.getByRole('link')
    await expect(anchor).toHaveCount(1)
    const destination = new URL((await anchor.getAttribute('href'))!)
    expect(destination.origin).toBe('https://www.google.com')
    expect(destination.searchParams.get('travelmode')).toBe(mode)
    expect(destination.searchParams.has('origin')).toBe(false)
    expect(destination.searchParams.get('destination')).toBe('22.60470,88.36613')
    expect(destination.href).not.toContain(String(precise.lat))
    expect(destination.href).not.toContain(String(precise.lng))
  }
  await navigation.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.copies.length)).toBe(1)
  const copy = await page.evaluate(() => window.__plannerQA.copies[0])
  const shared = new URL(copy)
  expect(shared.origin).toBe(ORIGIN)
  expect(shared.pathname).toBe('/')
  expect(shared.search).toBe('')
  const fields = new URLSearchParams(shared.hash.slice('#plan='.length))
  expect([...fields.keys()].sort()).toEqual(['hours', 'pace', 'preference', 'start', 'stops', 'v'])
  expect(fields.get('start')).toBe('start-blue-shyambazar')
  expect(fields.get('stops')).toBe('bagbazar,kumartuli-park')
  await page.evaluate(() => { window.__plannerQA.nativeShare = true })
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.shares)).toEqual([copy])
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
  for (const value of [String(precise.lat), String(precise.lng)]) {
    expect(storage).not.toContain(value)
    expect(copy).not.toContain(value)
  }
  const saved = await savedPlan(page)
  expect(Object.keys(saved).sort()).toEqual([
    'availableMinutes', 'language', 'pace', 'preference', 'reports', 'startId', 'stopIds', 'version', 'visits',
  ])
  expect(saved.visits).toHaveLength(1)
  expect(saved.reports).toHaveLength(1)
  await page.getByRole('button', { name: 'Forget location', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Use my location', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Forget location', exact: true })).toHaveCount(0)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('shared routes import without GPS and never replace an existing route without consent', async ({ page }) => {
  await page.goto('/' + sharedHash())
  await expect(page.locator('.stop-list > li')).toHaveCount(2)
  await expect(page).toHaveURL(ORIGIN + '/')
  await expect(page.getByRole('combobox', { name: 'Start landmark' })).toHaveValue('start-blue-esplanade')
  await expect(page.getByRole('radio', { name: 'Walking', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: '6 h', exact: true })).toHaveAttribute('aria-checked', 'true')
  expect((await savedPlan(page)).stopIds).toEqual(['bagbazar', 'college-square'])
  await page.locator('.navigation-next').getByRole('button', { name: 'Navigate to Bagbazar Sarbojanin', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(navigation.getByRole('combobox', { name: 'From', exact: true })).toHaveValue('current')
  await navigation.press('Escape')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  const replacement = sharedHash({ stops: 'deshapriya-park,tridhara', start: 'start-blue-kalighat' })
  await page.goto('/?entry=keep' + replacement)
  await expect(page.getByRole('button', { name: 'Use shared route', exact: true })).toBeVisible()
  expect((await savedPlan(page)).stopIds).toEqual(['bagbazar', 'college-square'])
  await page.getByRole('button', { name: 'Keep my route', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Use shared route', exact: true })).toHaveCount(0)
  expect((await savedPlan(page)).stopIds).toEqual(['bagbazar', 'college-square'])
  await page.goto('/?entry=replace' + replacement)
  await page.getByRole('button', { name: 'Use shared route', exact: true }).click()
  await expect(page.locator('.stop-list .link-title')).toHaveText(['Deshapriya Park', 'Tridhara Sammilani'])
  expect((await savedPlan(page)).stopIds).toEqual(['deshapriya-park', 'tridhara'])
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('a second shared link in the same tab is handled without reloading', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await expect(page.locator('.stop-list > li')).toHaveCount(2)
  await page.goto('/' + sharedHash())
  await expect(page.getByRole('button', { name: 'Use shared route', exact: true })).toBeVisible()
  await expect(page).toHaveURL(ORIGIN + '/')
  expect((await savedPlan(page)).stopIds).toEqual(['bagbazar', 'kumartuli-park'])
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('malformed and hostile shared URLs preserve the local plan and execute no markup', async ({ page }) => {
  await seedPlan(page)
  const cases = [
    ['invalid encoding', '#plan=%E0%A4%A'],
    ['unsupported version', sharedHash({ v: '2' })],
    ['duplicate parameter', sharedHash() + '&hours=4'],
    ['script landmark', sharedHash({ start: 'javascript:alert(1)' })],
    ['HTML stop', sharedHash({ stops: '<img src=x onerror=alert(1)>' })],
    ['nonfinite time', sharedHash({ hours: '1e999' })],
    ['negative time', sharedHash({ hours: '-1' })],
    ['over 24 hours', sharedHash({ hours: '25' })],
    ['just over 24 hours', sharedHash({ hours: '24.0001' })],
    ['oversized link', sharedHash() + '&padding=' + 'a'.repeat(100_001)],
  ]
  for (const [label, hash] of cases) {
    await test.step(label, async () => {
      const path = '/?case=' + encodeURIComponent(label)
      await page.goto(path + hash)
      await expect(page.getByRole('alert')).toContainText('The shared link was not recognised')
      await expect(page.locator('.stop-list > li')).toHaveCount(2)
      await expect(page).toHaveURL(ORIGIN + path)
      expect((await savedPlan(page)).stopIds).toEqual(['bagbazar', 'kumartuli-park'])
      expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
      await expect(page.locator('[onerror]')).toHaveCount(0)
    })
  }
  await page.goto('/?case=filtered-ids' + sharedHash({ stops: ['bagbazar', 'bagbazar', 'unknown-stop', ...PANDALS.map((pandal) => pandal.id)].join(',') }))
  await page.getByRole('button', { name: 'Use shared route', exact: true }).click()
  await expect(page.locator('.stop-list > li')).toHaveCount(12)
  expect((await savedPlan(page)).stopIds).toEqual(PANDALS.slice(0, 12).map((pandal) => pandal.id))
})

test('a 24-hour shared route imports, optimizes and shares at the planner boundary', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto('/' + sharedHash({ hours: '24', stops: 'bagbazar' }))
  await expect(page).toHaveURL(ORIGIN + '/')
  await expect(page.locator('.stop-list > li')).toHaveCount(1)
  expect((await savedPlan(page)).availableMinutes).toBe(1_440)
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Optimized estimate', exact: true })).toBeVisible()
  await expect(page.locator('.estimate__budget')).toHaveCount(0)
  await page.getByRole('button', { name: 'Share route', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__plannerQA.copies.length)).toBe(1)
  const copy = await page.evaluate(() => window.__plannerQA.copies[0])
  const hours = new URLSearchParams(new URL(copy).hash.slice('#plan='.length)).get('hours')
  expect(hours).toBe('24')
  await testInfo.attach('shared-duration-boundary', {
    contentType: 'application/json',
    body: JSON.stringify({ importedMinutes: (await savedPlan(page)).availableMinutes, sharedHours: hours }),
  })
})

test('optimization keeps every stop and offers plausible walking, Metro and road estimates', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME)
  const selectedIds = ['new-town-sarbojanin', 'mudiali', 'kumartuli-park', 'bagbazar']
  await seedPlan(page, { stopIds: selectedIds, availableMinutes: 480 })
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Leave', exact: true }).selectOption('h18')
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Optimized estimate', exact: true })).toBeVisible()
  await expect(page.locator('.stop-list > li')).toHaveCount(4)
  await expect(page.locator('.leg')).toHaveCount(4)
  const modes = await page.locator('.leg__main strong').allTextContents()
  expect(new Set(modes)).toEqual(new Set(['Walk', 'Metro', 'By road']))
  const metro = page.locator('.leg').filter({ has: page.locator('.leg__main strong', { hasText: /^Metro$/ }) })
  await expect(metro.first().locator('.leg__main')).toContainText(/via .+\u2192 .+/)
  const minutes = await page.locator('.leg__main').allTextContents()
  for (const label of minutes) {
    const range = label.match(/(\d+)(?:\u2013(\d+))? min/)
    expect(range, `Missing travel range: ${label}`).not.toBeNull()
    expect(Number(range![1])).toBeGreaterThan(0)
    expect(Number(range![2] ?? range![1])).toBeGreaterThanOrEqual(Number(range![1]))
    expect(Number(range![2] ?? range![1])).toBeLessThan(240)
  }
  const ordered = (await savedPlan(page)).stopIds
  expect([...ordered].sort()).toEqual([...selectedIds].sort())
  expect(Math.abs(ordered.indexOf('bagbazar') - ordered.indexOf('kumartuli-park'))).toBe(1)
  await expect(page.locator('.estimate')).toContainText('Ranges are planning estimates, not live times.')
  await expect(page.locator('.estimate__breakdown')).toContainText(/Travel .+queues .+visits .+walking about/)
  await page.locator('.leg__alternatives summary').first().click()
  await expect(page.locator('.leg__alternatives[open]')).toContainText('taxi, auto or bus; not a timetable')
  await page.getByRole('radio', { name: '2 h', exact: true }).click()
  await expect(page.getByText('Stops, settings or crowd reports changed since the last estimate.', { exact: false })).toBeVisible()
  await expect(page.locator('.estimate')).toHaveCount(0)
  await page.getByRole('button', { name: 'Re-optimize', exact: true }).click()
  await expect(page.locator('.estimate__budget')).toContainText('No stop is removed automatically.')
  await expect(page.locator('.stop-list > li')).toHaveCount(4)
  await page.getByRole('button', { name: 'Start journey', exact: true }).click()
  await expect(page.locator('.journey-strip')).toContainText('Journey in progress')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '4')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('a 10:30 IST crowd report invalidates queues and budget until explicit re-optimization', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(FIXED_TIME)
  await seedPlan(page, { stopIds: ['bagbazar'], availableMinutes: 120 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await expect(page.locator('.estimate__meta')).toContainText('10:30')
  await expect(page.locator('.stop__meta .crowd')).toHaveText('Moderate')
  await expect(page.locator('.estimate__budget')).toHaveCount(0)
  const original = {
    queue: await page.locator('.stop__meta').innerText(),
    total: await page.locator('.estimate__total').innerText(),
    breakdown: await page.locator('.estimate__breakdown').innerText(),
    order: (await savedPlan(page)).stopIds,
  }
  await page.locator('.stop-list').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await detail.getByRole('group', { name: 'Report the crowd here' }).getByRole('button', { name: 'Heavy', exact: true }).click()
  await detail.getByRole('button', { name: 'Close', exact: true }).click()
  const stale = page.getByText(t('en', 'planChanged'), { exact: true })
  await expect(stale).toBeVisible()
  await expect(page.locator('.estimate, .leg, .stop__meta .crowd')).toHaveCount(0)
  await expect(page.locator('.stop__meta')).not.toContainText('queue')
  expect((await savedPlan(page)).stopIds).toEqual(original.order)
  const staleScreenshot = testInfo.outputPath('crowd-report-stale.png')
  await page.screenshot({ path: staleScreenshot, animations: 'disabled', fullPage: true })
  await testInfo.attach('crowd-report-stale', { path: staleScreenshot, contentType: 'image/png' })
  await page.getByRole('button', { name: 'Re-optimize', exact: true }).click()
  await expect(stale).toHaveCount(0)
  await expect(page.locator('.stop__meta .crowd')).toHaveText('Heavy')
  await expect(page.locator('.stop__meta')).not.toHaveText(original.queue)
  await expect(page.locator('.estimate__total')).not.toHaveText(original.total)
  await expect(page.locator('.estimate__breakdown')).not.toHaveText(original.breakdown)
  await expect(page.locator('.estimate__budget')).toContainText('No stop is removed automatically.')
  expect((await savedPlan(page)).stopIds).toEqual(original.order)
  await testInfo.attach('crowd-reoptimization-values', {
    contentType: 'application/json',
    body: JSON.stringify({
      fixedTime: FIXED_TIME.toISOString(), original,
      heavy: {
        queue: await page.locator('.stop__meta').innerText(),
        total: await page.locator('.estimate__total').innerText(),
        breakdown: await page.locator('.estimate__breakdown').innerText(),
        budget: await page.locator('.estimate__budget').innerText(),
        order: (await savedPlan(page)).stopIds,
      },
    }, null, 2),
  })
  const updatedScreenshot = testInfo.outputPath('crowd-report-reoptimized.png')
  await page.screenshot({ path: updatedScreenshot, animations: 'disabled', fullPage: true })
  await testInfo.attach('crowd-report-reoptimized', { path: updatedScreenshot, contentType: 'image/png' })
  await page.locator('.stop-list').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click()
  await detail.getByRole('button', { name: 'Clear report', exact: true }).click()
  await detail.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(stale).toBeVisible()
  await expect(page.locator('.estimate, .leg, .stop__meta .crowd')).toHaveCount(0)
  expect((await savedPlan(page)).stopIds).toEqual(original.order)
  await page.getByRole('button', { name: 'Re-optimize', exact: true }).click()
  await expect(page.locator('.stop__meta')).toHaveText(original.queue)
  await expect(page.locator('.estimate__total')).toHaveText(original.total)
  await expect(page.locator('.estimate__budget')).toHaveCount(0)
})

async function toggleAutoCheckIn(page: Page, enabled: boolean) {
  await page.getByText('Auto-mark visited with GPS', { exact: true }).click()
  await expect(page.getByRole('switch', { name: /Auto-mark visited with GPS/ })).toBeChecked({ checked: enabled })
}

test('auto check-in rejects poor accuracy and hidden time before a continuous foreground dwell', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start journey', exact: true })).toBeVisible()
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
  await page.getByRole('button', { name: 'Start journey', exact: true }).click()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  await toggleAutoCheckIn(page, true)
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 1 })
  const point = { lat: 22.60470, lng: 88.36613, accuracy: 120 }
  for (let sample = 0; sample < 5; sample += 1) {
    if (sample > 0) await page.clock.runFor(15_000)
    await emitGps(page, point)
    await expect(page.getByRole('status').filter({ hasText: 'is too low for auto check-in' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  }
  const good = { ...point, accuracy: 15 }
  await page.clock.runFor(1_000)
  await emitGps(page, good)
  await expect(page.getByRole('status').filter({ hasText: 'Near Bagbazar Sarbojanin' })).toBeVisible()
  for (let sample = 0; sample < 2; sample += 1) {
    await page.clock.runFor(15_000)
    await emitGps(page, good)
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  }
  await setVisibility(page, 'hidden')
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 1, active: 0 })
  await page.clock.runFor(10_000)
  await emitGps(page, good)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await setVisibility(page, 'visible')
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 1 })
  await emitGps(page, good)
  await page.clock.runFor(5_000)
  await emitGps(page, good)
  await expect.soft(page.getByRole('progressbar'), 'Ten hidden seconds must reset the 45-second dwell').toHaveAttribute('aria-valuenow', '0')
  await toggleAutoCheckIn(page, false)
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 2, active: 0 })
  if ((await savedPlan(page)).visits.length > 0) {
    await page.getByRole('button', { name: 'Undo visited for Bagbazar Sarbojanin', exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  }
  await toggleAutoCheckIn(page, true)
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 3, active: 1 })
  await page.clock.runFor(1_000)
  await emitGps(page, good)
  for (const elapsed of [15_000, 15_000, 14_000]) {
    await page.clock.runFor(elapsed)
    await emitGps(page, good)
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  }
  await page.clock.runFor(1_000)
  await emitGps(page, good)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  expect((await savedPlan(page)).visits).toEqual([
    { pandalId: 'bagbazar', at: expect.any(Number), method: 'auto' },
  ])
  await expect(page.locator('.navigation-next strong')).toHaveText('Kumartuli Park')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.navigation-next strong')).toHaveText('Bagbazar Sarbojanin')
  await page.clock.runFor(1_000)
  await emitGps(page, good)
  await expect(page.getByRole('status').filter({ hasText: 'Auto-marking is held for Bagbazar' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop journey', exact: true }).click()
  await expect.poll(() => geoCalls(page)).toEqual({ once: 0, started: 3, active: 0 })
})

test('crowd reports expire after two hours in the UI and persistent storage', async ({ page }) => {
  await page.clock.install({ time: FIXED_TIME })
  await seedPlan(page)
  await page.goto('/')
  await expect(page.locator('.stop-list > li')).toHaveCount(2)
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
  await page.locator('.stop-list').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await expect(detail.getByText('Typical pattern for this hour (IST), not a live observation')).toBeVisible()
  const heavy = detail.getByRole('group', { name: 'Report the crowd here' }).getByRole('button', { name: 'Heavy', exact: true })
  await heavy.click()
  await expect.soft(detail.getByText('Based on your local report', { exact: true }), 'A new report should take effect immediately').toBeVisible()
  await expect(heavy).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await savedPlan(page)).reports).toEqual([
    { pandalId: 'bagbazar', level: 'heavy', reportedAt: expect.any(Number) },
  ])
  await page.clock.runFor(60_000)
  await expect(detail.getByText('Based on your local report', { exact: true })).toBeVisible()
  await page.clock.fastForward(118 * 60_000)
  await expect(detail.getByText('Based on your local report', { exact: true })).toBeVisible()
  await page.clock.fastForward(2 * 60_000)
  await expect(detail.getByText('Typical pattern for this hour (IST), not a live observation')).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Clear report', exact: true })).toHaveCount(0)
  await expect.soft(heavy, 'An expired report must not remain selected').toHaveAttribute('aria-pressed', 'false')
  await expect.configure({ soft: true }).poll(async () => (await savedPlan(page)).reports, {
    message: 'The UI promises reports are saved for two hours, not until the next edit or reload',
  }).toEqual([])
  await page.reload()
  await expect(page.locator('.stop-list > li')).toHaveCount(2)
  await expect.poll(async () => (await savedPlan(page)).reports).toEqual([])
})

for (const failure of ['all', 'partial'] as const) {
  test(`street tiles fall back after ${failure} failure in a later zoom cycle`, async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    let abortedTiles = 0
    await page.route('https://tile.openstreetmap.org/**', async (route) => {
      if (failure === 'all' || abortedTiles === 0) {
        abortedTiles += 1
        await route.abort('aborted')
      } else await route.fallback()
    })
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await expect.poll(() => abortedTiles).toBeGreaterThan(0)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
    await expect(page.locator('.header .status-pill')).toHaveText('Online')
    await expect(page.getByText('Schematic: river, Metro lines and pins are approximate; no streets are shown.')).toBeVisible()
    await expect(page.locator('.leaflet-tile-pane img')).toHaveCount(0)
    const screenshot = testInfo.outputPath(`tiles-${failure}-failure.png`)
    await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: true })
    await testInfo.attach(`tiles-${failure}-failure`, { path: screenshot, contentType: 'image/png' })
    await page.unroute('https://tile.openstreetmap.org/**')
    await page.getByRole('button', { name: /Retry street map/ }).click()
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  })
}

test('street tiles fall back within 12 seconds of a stalled cycle and retry clears its timer', async ({ page }, testInfo) => {
  await page.clock.install({ time: FIXED_TIME })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
  let stalledTiles = 0
  await page.route('https://tile.openstreetmap.org/**', () => { stalledTiles += 1 })
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.clock.runFor(300)
  await expect.poll(() => stalledTiles).toBeGreaterThan(0)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'loading')
  await page.clock.runFor(11_000)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'loading')
  await page.clock.runFor(1_000)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
  await expect(page.locator('.header .status-pill')).toHaveText('Online')
  await expect(page.getByText('Schematic: river, Metro lines and pins are approximate; no streets are shown.')).toBeVisible()
  const screenshot = testInfo.outputPath('tiles-stalled-fallback.png')
  await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: true })
  await testInfo.attach('tiles-stalled-fallback', { path: screenshot, contentType: 'image/png' })
  await page.unroute('https://tile.openstreetmap.org/**')
  await page.getByRole('button', { name: /Retry street map/ }).click()
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await page.clock.runFor(13_000)
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
})

test('offline and online events preserve edits and switch the map between schematic and tiles', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await setOnline(page, false)
  await expect(page.locator('.header .status-pill')).toHaveText('Offline')
  await expect(page.locator('.panel__body').getByRole('status')).toContainText('Offline: your route is kept on this device.')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
  await expect(page.getByText('Schematic: river, Metro lines and pins are approximate; no streets are shown.')).toBeVisible()
  await expect(page.locator('.leaflet-tile-pane img')).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark Bagbazar Sarbojanin as visited', exact: true }).click()
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await expect(page.locator('.estimate')).toContainText('not live times')
  await expect.poll(async () => (await savedPlan(page)).visits.length).toBe(1)
  await setOnline(page, true)
  await expect(page.locator('.header .status-pill')).toHaveText('Online')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expect(page.locator('.panel__body').getByRole('status').filter({ hasText: 'Offline:' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
})

async function auditView(page: Page, testInfo: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0)
  await page.evaluate(async () => { await document.fonts.ready })
  const screenshot = testInfo.outputPath(`${label}.png`)
  await page.screenshot({ path: screenshot, animations: 'disabled', fullPage: true })
  await testInfo.attach(label, { path: screenshot, contentType: 'image/png' })
  const layout = await page.evaluate(() => {
    const selectors = '.header, .panel, .tabs, .setting, .start-row, .btn, .link-title, .section-title, dialog[open]'
    const overflows = [...document.querySelectorAll<HTMLElement>(selectors)].filter((element) => {
      return element.checkVisibility() && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2
    }).map((element) => ({
      tag: element.tagName, className: element.className,
      text: element.textContent?.trim().slice(0, 120),
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
    }))
    const map = document.querySelector('.pp-map')?.getBoundingClientRect()
    const overlays = [...document.querySelectorAll<HTMLElement>('.pp-map__banner, .pp-legend, .pp-map__tools, .leaflet-control-zoom')]
      .filter((element) => element.checkVisibility()).map((element) => element.getBoundingClientRect())
    const coveredRouteStops = document.querySelector('dialog[open]') ? []
      : [...document.querySelectorAll<HTMLElement>('.pp-pin--stop')].filter((pin) => {
        const bounds = pin.getBoundingClientRect()
        const centreX = bounds.x + bounds.width / 2
        const centreY = bounds.y + bounds.height / 2
        return map && centreX > map.left && centreX < map.right && centreY > map.top && centreY < map.bottom
          && overlays.some((overlay) => centreX > overlay.left && centreX < overlay.right
            && centreY > overlay.top && centreY < overlay.bottom)
      }).map((pin) => pin.closest<HTMLElement>('.leaflet-marker-icon')?.title)
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      overflows,
      coveredRouteStops,
    }
  })
  await testInfo.attach(`${label}-layout`, { contentType: 'application/json', body: JSON.stringify(layout, null, 2) })
  expect.soft(layout.documentWidth, `${label}: document exceeds viewport`).toBeLessThanOrEqual(layout.viewport.width)
  expect.soft(layout.overflows, `${label}: clipped or overflowing controls`).toEqual([])
  expect.soft(layout.coveredRouteStops, `${label}: map overlays obscure route-stop centres`).toEqual([])
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id, impact: violation.impact, help: violation.help, helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
  }))
  await testInfo.attach(`${label}-axe`, {
    contentType: 'application/json',
    body: JSON.stringify({ violations, incomplete: results.incomplete }, null, 2),
  })
  expect.soft(violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'),
    `${label}: serious or critical accessibility violations`).toEqual([])
}

for (const width of [1440, 390, 320]) {
  test(`navigation dialog accessibility and bilingual controls at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    await seedPlan(page)
    await page.goto('/')
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    for (const language of ['en', 'bn'] as const) {
      await page.locator(`header button[role="radio"][lang="${language}"]`).click()
      const next = page.locator('.navigation-next')
      const name = language === 'en' ? PANDALS[0].name : PANDALS[0].nameBn
      const launch = next.getByRole('button', { name: t(language, 'navigateTo', { name }), exact: true })
      await launch.scrollIntoViewIfNeeded()
      await auditView(page, testInfo, `${width}-${language}-navigation-entry`)
      await launch.click()
      const navigation = page.getByRole('dialog', { name: t(language, 'navigation'), exact: true })
      await expect(navigation.getByRole('button', { name: t(language, 'close'), exact: true })).toBeFocused()
      await expect(navigation.getByRole('combobox', { name: t(language, 'navigationFrom'), exact: true })).toHaveValue('current')
      await expect(navigation).toContainText(t(language, 'navigationApproximate'))
      await expect(navigation).toContainText(t(language, 'navigationBackground'))
      await auditView(page, testInfo, `${width}-${language}-navigation-dialog`)
      const controls = await navigation.locator('button, input, select, a').evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { label: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height, left: rect.left, right: rect.right }
      }))
      for (const control of controls) {
        expect(control.width, `${language}: ${control.label}`).toBeGreaterThanOrEqual(44)
        expect(control.height, `${language}: ${control.label}`).toBeGreaterThanOrEqual(44)
        expect(control.left).toBeGreaterThanOrEqual(0)
        expect(control.right).toBeLessThanOrEqual(width)
      }
      for (let tab = 0; tab < controls.length + 2; tab += 1) {
        await page.keyboard.press('Tab')
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')))).toBe(true)
      }
      await navigation.getByRole('button', { name: t(language, 'close'), exact: true }).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(navigation.getByRole('link')).toBeFocused()
      await navigation.getByRole('combobox', { name: t(language, 'navigationTo'), exact: true }).fill(language === 'bn' ? 'হাওড়া স্টেশন' : 'Howrah Station')
      await navigation.getByRole('radio', { name: t(language, 'navigationMetroBus'), exact: true }).click()
      await setOnline(page, false)
      await expect(navigation.getByRole('status')).toHaveText(t(language, 'navigationOffline'))
      await auditView(page, testInfo, `${width}-${language}-navigation-offline`)
      await navigation.press('Escape')
      await expect(navigation).not.toBeVisible()
      await expect(launch).toBeFocused()
      await setOnline(page, true)
      await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
      expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
    }
  })

  test(`accessibility and responsive planner controls at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    await page.goto('/')
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    await expect(page.locator('.app')).toHaveAttribute('data-layout', width === 1440 ? 'wide' : 'split')
    expect(await page.evaluate(() => innerWidth)).toBe(width)
    await setOnline(page, false)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'failed')
    await auditView(page, testInfo, `${width}-route`)
    await setOnline(page, true)
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    if (width < 760) {
      const views = page.getByRole('group', { name: 'Map', exact: true })
      await views.getByRole('button', { name: 'List', exact: true }).click()
      await expect(page.locator('.app')).toHaveAttribute('data-layout', 'list')
      await views.getByRole('button', { name: 'Map', exact: true }).click()
      await expect(page.locator('.app')).toHaveAttribute('data-layout', 'map')
      await views.getByRole('button', { name: 'Map', exact: true }).click()
      await expect(page.locator('.app')).toHaveAttribute('data-layout', 'split')
    }
    const routeTab = page.getByRole('tab', { name: /^Your route/ })
    await routeTab.focus()
    await routeTab.press('ArrowLeft')
    await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toBeFocused()
    const photo = page.locator('.strip img')
    await photo.scrollIntoViewIfNeeded()
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await auditView(page, testInfo, `${width}-explore`)
    await page.getByRole('searchbox', { name: 'Search pandals' }).fill('Bagbazar')
    await page.locator('.pandal-row').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true }).click()
    const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
    await expect(detail).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
    await auditView(page, testInfo, `${width}-detail`)
    await detail.press('Escape')
    await expect(detail).not.toBeVisible()
    await expect(page.locator('.pandal-row').getByRole('button', { name: 'Bagbazar Sarbojanin', exact: true })).toBeFocused()
    await page.evaluate(() => { window.__plannerQA.clipboardDenied = true })
    await page.getByRole('button', { name: 'Share route', exact: true }).click()
    const share = page.getByRole('dialog', { name: 'Share this route', exact: true })
    await expect(share.getByRole('textbox', { name: 'Share link' })).toHaveValue(/^http:\/\/127\.0\.0\.1:5179\/#plan=/)
    await auditView(page, testInfo, `${width}-share`)
    await share.press('Escape')
    await page.getByRole('button', { name: 'About & privacy', exact: true }).click()
    const about = page.getByRole('dialog', { name: 'About Puja Path', exact: true })
    await expect(about).toContainText('planning assumptions, not live data.')
    await auditView(page, testInfo, `${width}-about`)
    await about.press('Escape')
    await expect(page.getByRole('button', { name: 'About & privacy', exact: true })).toBeFocused()
  })
}