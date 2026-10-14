import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { PANDALS, CURATED_ROUTES } from '../../src/data/pandals'
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
  for (const anchor of await detail.locator('.link-row a').all()) {
    const destination = new URL((await anchor.getAttribute('href'))!)
    expect(destination.origin).toBe('https://www.google.com')
    expect(destination.searchParams.has('origin')).toBe(false)
    expect(destination.searchParams.get('destination')).toBe('22.60470,88.36613')
  }
  await detail.getByRole('button', { name: 'Close', exact: true }).click()
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
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
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