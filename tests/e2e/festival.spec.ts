import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { FESTIVAL_PORTRAIT } from '../../src/data/pandalMedia'
import { t } from '../../src/i18n'
import type { Language } from '../../src/types'
import { expect, FIXED_TIME, geoCalls, savedPlan, seedPlan, setVisibility, STORAGE_KEY, test } from './planner.fixture'

test.use({ autoSkipFestivalIntro: false })

const PHOTO_PATH = `/${FESTIVAL_PORTRAIT.image}`
const SOURCE_URL = FESTIVAL_PORTRAIT.sourceUrl
const LICENSE_URL = FESTIVAL_PORTRAIT.licenseUrl
// Measured on the 960x1444 frame (yellow face paint / dark hair pixel bands): forehead, eyes, nose, mouth, chin
// rows and the face's horizontal extent. Every row must land inside the viewport and clear of the text block.
const FACE = { left: 0.31, right: 0.63, forehead: 0.33, eyes: 0.43, nose: 0.5, mouth: 0.56, chin: 0.61 }
const OLD_CREDIT = ['HridoyKundu', '2024', 'CC BY-SA', 'puja-kolkata']

function introDialog(page: Page, language: Language = 'en') {
  return page.getByRole('dialog', { name: t(language, 'introTitle'), exact: true })
}

function skipButton(page: Page, language: Language = 'en') {
  return introDialog(page, language).getByRole('button', { name: t(language, 'introSkipLabel'), exact: true })
}

async function capture(page: Page, testInfo: TestInfo, label: string) {
  const path = testInfo.outputPath(`${label}.png`)
  await page.screenshot({ path })
  await testInfo.attach(label, { path, contentType: 'image/png' })
}

// Entrance motion (photo 900 ms, text reveal ends ~660 ms) must finish before static geometry is judged.
async function waitSince(page: Page, since: number, elapsedMs: number) {
  await page.waitForTimeout(Math.max(0, elapsedMs - (Date.now() - since)))
}

// axe-core defers between rules with setTimeout(0); under a paused clock those timers are pumped 1 ms at a time.
// @axe-core/playwright finishes in a short-lived blank page of the same context, so a pump can race its close.
async function auditUnderPausedClock(page: Page) {
  let settled = false
  let failure: unknown = null
  const analysis = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    .then((result) => { settled = true; return result }, (error: unknown) => { settled = true; failure = error; return null })
  let pumpedMs = 0
  while (!settled && pumpedMs < 1_200) {
    try {
      await page.clock.runFor(1)
    } catch {
      break
    }
    pumpedMs += 1
  }
  const accessibility = await analysis
  if (!accessibility) throw failure
  return { accessibility, pumpedMs }
}

async function focusState(page: Page) {
  return page.evaluate(() => ({
    active: document.activeElement?.tagName ?? null,
    insideIntro: Boolean(document.activeElement?.closest('dialog.festival-intro')),
    openIntros: document.querySelectorAll('dialog.festival-intro[open]').length,
  }))
}

async function storageState(page: Page) {
  return page.evaluate(() => ({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage) }))
}

type IntroTiming = { openedAt: number | null, closedAt: number | null }

// Records when the dialog's open attribute appears and disappears, in page time, for real-clock tests only.
async function instrumentIntroTiming(page: Page) {
  await page.addInitScript(() => {
    const timing: IntroTiming = { openedAt: null, closedAt: null }
    ;(window as Window & { __festivalTiming?: IntroTiming }).__festivalTiming = timing
    new MutationObserver(() => {
      const dialog = document.querySelector('dialog.festival-intro')
      if (!dialog) return
      if (dialog.hasAttribute('open')) {
        if (timing.openedAt === null) timing.openedAt = performance.now()
      } else if (timing.openedAt !== null && timing.closedAt === null) {
        timing.closedAt = performance.now()
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
  })
}

async function introTiming(page: Page) {
  const timing = await page.evaluate(() => (window as Window & { __festivalTiming?: IntroTiming }).__festivalTiming ?? null)
  expect(timing?.openedAt).not.toBeNull()
  expect(timing?.closedAt).not.toBeNull()
  return { ...timing!, openForMs: timing!.closedAt! - timing!.openedAt! }
}

// After a reload the intro may already have auto-dismissed on a slow machine; the observer still proves it replayed.
async function expectIntroReplayedThenDismiss(page: Page, language: Language) {
  await expect.poll(() => page.evaluate(() => (window as Window & { __festivalTiming?: IntroTiming }).__festivalTiming?.openedAt ?? null), { timeout: 10_000 }).not.toBeNull()
  if (await page.locator('dialog.festival-intro[open]').count() > 0) await skipButton(page, language).click()
  await expect(introDialog(page, language)).toBeHidden()
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
}

async function introGeometry(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog.festival-intro')!
    const rect = (element: Element | null) => element ? element.getBoundingClientRect().toJSON() as DOMRect : null
    const photo = dialog.querySelector<HTMLImageElement>('.festival-intro__photo')
    const about = document.querySelector<HTMLElement>('.header .icon-btn')!
    const aboutBounds = about.getBoundingClientRect()
    const hit = document.elementFromPoint(aboutBounds.left + aboutBounds.width / 2, aboutBounds.top + aboutBounds.height / 2)
    about.focus()
    const aboutFocusable = document.activeElement === about
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      modal: dialog.matches(':modal'),
      firstChild: document.querySelector('.app')?.firstElementChild === dialog,
      nested: document.querySelectorAll('dialog dialog').length,
      dialog: rect(dialog),
      skip: rect(dialog.querySelector('.festival-intro__skip')),
      text: rect(dialog.querySelector('.festival-intro__text')),
      title: rect(dialog.querySelector('.festival-intro__title')),
      photo: photo ? {
        src: new URL(photo.currentSrc || photo.src).pathname, alt: photo.alt, complete: photo.complete,
        naturalWidth: photo.naturalWidth, objectFit: getComputedStyle(photo).objectFit,
        animation: getComputedStyle(photo).animationName, opacity: getComputedStyle(photo).opacity,
        transform: getComputedStyle(photo).transform,
      } : null,
      textAnimation: getComputedStyle(dialog.querySelector('.festival-intro__text')!).animationName,
      photoState: dialog.dataset.photo,
      headerHitInsideIntro: Boolean(hit?.closest('dialog.festival-intro')),
      aboutFocusable,
    }
  })
}

function expectWithinViewport(box: DOMRect | null, viewport: { width: number, height: number }, label: string) {
  expect(box, label).not.toBeNull()
  expect(box!.left, `${label} left`).toBeGreaterThanOrEqual(0)
  expect(box!.top, `${label} top`).toBeGreaterThanOrEqual(0)
  expect(box!.right, `${label} right`).toBeLessThanOrEqual(viewport.width + 0.5)
  expect(box!.bottom, `${label} bottom`).toBeLessThanOrEqual(viewport.height + 0.5)
}

// Projects the measured face rows through the rendered object-fit/object-position onto viewport pixels.
async function faceGeometry(page: Page) {
  return page.evaluate((face) => {
    const photo = document.querySelector<HTMLImageElement>('.festival-intro__photo')!
    const box = photo.getBoundingClientRect()
    const style = getComputedStyle(photo)
    const [px, py] = style.objectPosition.split(' ').map((value) => Number.parseFloat(value) / 100)
    const natural = { width: photo.naturalWidth, height: photo.naturalHeight }
    const scale = style.objectFit === 'cover'
      ? Math.max(box.width / natural.width, box.height / natural.height)
      : Math.min(box.width / natural.width, box.height / natural.height)
    const drawn = { width: natural.width * scale, height: natural.height * scale }
    const originX = box.left + (box.width - drawn.width) * px
    const originY = box.top + (box.height - drawn.height) * py
    const x = (fraction: number) => originX + fraction * drawn.width
    const y = (fraction: number) => originY + fraction * drawn.height
    const faceBox = { left: x(face.left), right: x(face.right), top: y(face.forehead), bottom: y(face.chin) }
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const text = rect('.festival-intro__text')
    const skip = rect('.festival-intro__skip')
    const intersects = (a: { left: number, right: number, top: number, bottom: number }, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    return {
      viewport: { width: innerWidth, height: innerHeight },
      natural, objectFit: style.objectFit, objectPosition: style.objectPosition, transform: style.transform,
      faceBox,
      rows: { forehead: y(face.forehead), eyes: y(face.eyes), nose: y(face.nose), mouth: y(face.mouth), chin: y(face.chin) },
      textCoversFace: intersects(faceBox, text),
      skipCoversFace: intersects(faceBox, skip),
      credit: document.querySelector('.festival-intro__credit')?.getBoundingClientRect().toJSON() as DOMRect | undefined,
    }
  }, FACE)
}

async function expectWholeFaceVisible(page: Page, testInfo: TestInfo, label: string) {
  const face = await faceGeometry(page)
  await testInfo.attach(`${label}-face-geometry`, { contentType: 'application/json', body: JSON.stringify(face, null, 2) })
  expect(face.natural).toEqual({ width: FESTIVAL_PORTRAIT.width, height: FESTIVAL_PORTRAIT.height })
  // `animation-fill-mode: both` leaves the identity matrix in place once the entrance scale has settled.
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'], `${label}: entrance motion must have settled`).toContain(face.transform)
  for (const [row, position] of Object.entries(face.rows)) {
    expect(position, `${label}: ${row} row inside the viewport`).toBeGreaterThanOrEqual(0)
    expect(position, `${label}: ${row} row inside the viewport`).toBeLessThanOrEqual(face.viewport.height)
  }
  expect(face.faceBox.left, `${label}: face left edge`).toBeGreaterThanOrEqual(0)
  expect(face.faceBox.right, `${label}: face right edge`).toBeLessThanOrEqual(face.viewport.width)
  expect(face.textCoversFace, `${label}: text block must not cover the face`).toBe(false)
  expect(face.skipCoversFace, `${label}: Skip must not cover the face`).toBe(false)
  expect(face.credit, `${label}: credit`).toBeDefined()
  expect(face.credit!.right).toBeLessThanOrEqual(face.viewport.width + 0.5)
  return face
}

async function expectPortraitCredit(dialog: ReturnType<Page['locator']>, language: Language) {
  const credit = dialog.locator('.festival-intro__credit')
  await expect(credit).toHaveAttribute('lang', language)
  await expect(credit).toContainText(t(language, 'introCredit'))
  await expect(credit).toContainText(language === 'bn' ? FESTIVAL_PORTRAIT.captionBn : FESTIVAL_PORTRAIT.caption)
  await expect(credit).toContainText(FESTIVAL_PORTRAIT.author)
  await expect(credit).toContainText(t(language, 'mediaChanges'))
  await expect(credit.getByRole('link', { name: t(language, 'mediaSourceCommons'), exact: true })).toHaveAttribute('href', SOURCE_URL)
  await expect(credit.getByRole('link', { name: FESTIVAL_PORTRAIT.license, exact: true })).toHaveAttribute('href', LICENSE_URL)
  for (const stale of OLD_CREDIT) await expect(dialog).not.toContainText(stale)
  await expect(dialog).not.toContainText('2026')
}

test('opens above an inert planner, credits the licensed photo, and Skip returns focus to the page', async ({ page }, testInfo) => {
  await page.goto('/')
  const dialog = introDialog(page)
  await expect(dialog).toBeVisible()
  const visibleAt = Date.now()
  const skip = skipButton(page)
  await expect(skip).toBeVisible()
  await expect(skip).toBeFocused()
  await expect(skip).toHaveText(t('en', 'introSkip'))
  for (const text of ['Puja Path', 'পুজোর পথে', 'Durga Puja', 'দুর্গাপুজো', 'Biswarup Ganguly', '2015', 'pandal not identified', 'CC BY 3.0']) {
    await expect(dialog).toContainText(text)
  }
  await expectPortraitCredit(dialog, 'en')
  await expect(dialog.getByRole('link', { name: 'Wikimedia Commons', exact: true })).toHaveAttribute('href', SOURCE_URL)
  await expect(dialog.getByRole('link', { name: 'CC BY 3.0', exact: true })).toHaveAttribute('href', LICENSE_URL)
  await waitSince(page, visibleAt, 300)
  await capture(page, testInfo, '1440-en-intro-0.3s')
  await waitSince(page, visibleAt, 1_100)
  const geometry = await introGeometry(page)
  await testInfo.attach('1440-en-intro-geometry', { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
  expect(geometry.modal).toBe(true)
  expect(geometry.firstChild).toBe(true)
  expect(geometry.nested).toBe(0)
  expect(geometry.headerHitInsideIntro).toBe(true)
  expect(geometry.aboutFocusable).toBe(false)
  expect(geometry.dialog).toMatchObject({ x: 0, y: 0, width: 1440, height: 1000 })
  expect(geometry.skip!.width).toBeGreaterThanOrEqual(44)
  expect(geometry.skip!.height).toBeGreaterThanOrEqual(44)
  expectWithinViewport(geometry.skip, geometry.viewport, 'skip')
  expectWithinViewport(geometry.text, geometry.viewport, 'text')
  expect(geometry.photo).toMatchObject({ src: PHOTO_PATH, alt: FESTIVAL_PORTRAIT.alt, objectFit: 'cover', animation: 'festival-photo', complete: true })
  expect(geometry.photo!.naturalWidth).toBe(FESTIVAL_PORTRAIT.width)
  expect(geometry.textAnimation).toBe('festival-text')
  await expect.poll(() => page.locator('dialog.festival-intro').getAttribute('data-photo')).toBe('ready')
  const face = await expectWholeFaceVisible(page, testInfo, '1440-en')
  // Desktop: the text block sits lower-left over the drape, entirely left of the face.
  expect(geometry.text!.right).toBeLessThan(face.faceBox.left)
  await skip.click()
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
  await expect(dialog).toBeHidden()
  expect(await focusState(page)).toEqual({ active: 'BODY', insideIntro: false, openIntros: 0 })
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: t('en', 'skipToPlanner'), exact: true })).toBeFocused()
  await capture(page, testInfo, '1440-en-after-skip')
  await page.getByRole('button', { name: t('en', 'about'), exact: true }).click()
  const about = page.getByRole('dialog', { name: t('en', 'aboutTitle'), exact: true })
  await expect(about).toBeVisible()
  await about.press('Escape')
  await expect(about).toBeHidden()
  // Re-renders (tab switch, language change, replan) never replay the intro; only a full page load does.
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await page.locator('header button[role="radio"][lang="bn"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await page.locator('header button[role="radio"][lang="en"]').click()
  await page.getByRole('tab', { name: /^Your route/ }).click()
  await page.getByRole('button', { name: 'Optimize route', exact: true }).click()
  await expect(page.locator('.estimate')).toBeVisible()
  await page.waitForTimeout(300)
  expect(await focusState(page)).toMatchObject({ openIntros: 0 })
  expect(await storageState(page)).toEqual({ local: [STORAGE_KEY], session: [] })
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(skipButton(page)).toBeFocused()
})

test('Escape dismisses the intro and keyboard focus continues at the skip links', async ({ page }) => {
  await page.goto('/')
  const dialog = introDialog(page)
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
  await expect(dialog).toBeHidden()
  expect(await focusState(page)).toEqual({ active: 'BODY', insideIntro: false, openIntros: 0 })
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: t('en', 'skipToPlanner'), exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('auto-dismisses by 1.8 s under a paused clock, closes on return from a throttled hidden tab, and passes axe while open', async ({ page }, testInfo) => {
  await page.clock.install({ time: FIXED_TIME })
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
  await page.goto('/')
  const dialog = introDialog(page)
  await expect(dialog).toBeVisible()
  await page.clock.runFor(1_000)
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(1)
  const { accessibility, pumpedMs } = await auditUnderPausedClock(page)
  const violations = accessibility.violations.map((violation) => ({
    id: violation.id, impact: violation.impact, help: violation.help,
    nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  }))
  await testInfo.attach('intro-axe', { contentType: 'application/json', body: JSON.stringify({ pumpedMs, violations, incomplete: accessibility.incomplete.map((item) => item.id) }, null, 2) })
  expect(violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(1)
  await page.clock.runFor(Math.max(0, 800 - pumpedMs))
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
  await expect(dialog).toBeHidden()
  expect(await focusState(page)).toEqual({ active: 'BODY', insideIntro: false, openIntros: 0 })
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true')

  // Hidden tabs can throttle the timer: when the deadline passed while hidden, becoming visible closes it at once.
  await page.reload()
  await expect(dialog).toBeVisible()
  await setVisibility(page, 'hidden')
  await page.clock.setSystemTime(new Date(FIXED_TIME.getTime() + 60_000))
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(1)
  await setVisibility(page, 'visible')
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
  await expect(dialog).toBeHidden()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('auto-dismisses in real time without interaction and leaves the planner interactive', async ({ page }, testInfo) => {
  await instrumentIntroTiming(page)
  await page.goto('/')
  const dialog = introDialog(page)
  await expect(dialog).toBeVisible()
  await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0, { timeout: 3_000 })
  await expect(dialog).toBeHidden()
  const timing = await introTiming(page)
  await testInfo.attach('auto-dismiss-timing', { contentType: 'application/json', body: JSON.stringify(timing) })
  expect(timing.openForMs).toBeLessThanOrEqual(1_800)
  await page.getByRole('tab', { name: 'Explore', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('reduced motion shows the photo statically with no entrance animation and still dismisses', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await instrumentIntroTiming(page)
  await page.goto('/')
  const dialog = introDialog(page)
  await expect(dialog).toBeVisible()
  const geometry = await introGeometry(page)
  await testInfo.attach('reduced-motion-geometry', { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
  expect(geometry.photo).toMatchObject({ animation: 'none', opacity: '1', transform: 'none' })
  expect(geometry.textAnimation).toBe('none')
  await capture(page, testInfo, '1440-en-intro-reduced-motion')
  await skipButton(page).click()
  await expect(dialog).toBeHidden({ timeout: 1_000 })
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeHidden({ timeout: 3_000 })
  const timing = await introTiming(page)
  await testInfo.attach('reduced-motion-timing', { contentType: 'application/json', body: JSON.stringify(timing) })
  expect(timing.openForMs).toBeLessThanOrEqual(1_800)
})

test.describe('missing photo', () => {
  test.use({ expectedResourceFailures: /intro-durga-face-2015\.webp|Failed to load resource/ })

  test('a 404 photo never traps the intro: the fallback shows, it still dismisses, and the planner stays reachable', async ({ page }, testInfo) => {
    await page.route(`**${PHOTO_PATH}`, (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' }))
    await page.goto('/')
    const dialog = introDialog(page)
    await expect(dialog).toBeVisible()
    const visibleAt = Date.now()
    await expect(page.locator('dialog.festival-intro')).toHaveAttribute('data-photo', 'failed')
    await expect(dialog.locator('.festival-intro__photo')).toHaveCount(0)
    await expect(dialog.locator('.festival-intro__backdrop')).toHaveCount(0)
    await expect(dialog.locator('img')).toHaveCount(0)
    await expect(dialog.locator('.festival-intro__credit')).toHaveCount(0)
    await expect(dialog.getByRole('link')).toHaveCount(0)
    await expect(dialog).toContainText('Durga Puja')
    for (const stale of [...OLD_CREDIT, 'Biswarup Ganguly', 'CC BY']) await expect(dialog).not.toContainText(stale)
    await expect(skipButton(page)).toBeVisible()
    await waitSince(page, visibleAt, 800)
    await capture(page, testInfo, '1440-en-intro-photo-404')
    await expect(dialog).toBeHidden({ timeout: 3_000 })
    await page.getByRole('tab', { name: 'Explore', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.reload()
    await expect(dialog).toBeVisible()
    await skipButton(page).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  })
})

for (const [width, height] of [[320, 568], [390, 844], [1440, 1000]] as const) {
  for (const language of ['en', 'bn'] as const) {
    test(`${language} intro at ${width}x${height} fits, replays only on reload, and leaves the saved plan, visits and GPS untouched`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height })
      await seedPlan(page, { language, visits: [{ pandalId: 'bagbazar', at: FIXED_TIME.getTime(), method: 'manual' }] })
      await instrumentIntroTiming(page)
      await page.goto('/')
      const dialog = introDialog(page, language)
      await expect(dialog).toBeVisible()
      const visibleAt = Date.now()
      const before = await savedPlan(page)
      expect(before.language).toBe(language)
      expect(before.visits).toHaveLength(1)
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      const title = dialog.locator('.festival-intro__title')
      await expect(title).toHaveText(t(language, 'introTitle'))
      await expect(title).toHaveAttribute('lang', language)
      const other = dialog.locator('.festival-intro__title-other')
      await expect(other).toHaveText(t(language, 'introTitleOther'))
      await expect(other).toHaveAttribute('lang', language === 'bn' ? 'en' : 'bn')
      await expectPortraitCredit(dialog, language)
      await expect(dialog.locator('.festival-intro__photo')).toHaveAttribute('alt', language === 'bn' ? FESTIVAL_PORTRAIT.altBn : FESTIVAL_PORTRAIT.alt)
      const skip = skipButton(page, language)
      await expect(skip).toHaveText(t(language, 'introSkip'))
      await expect(skip).toBeFocused()
      await page.evaluate(async () => { await document.fonts.ready })
      await waitSince(page, visibleAt, 300)
      await capture(page, testInfo, `${width}-${language}-intro-0.3s`)
      await waitSince(page, visibleAt, 1_100)
      // Geometry first (fast reads), screenshot after: the dialog auto-closes at 1.6 s even on a slow machine.
      const geometry = await introGeometry(page)
      const face = await expectWholeFaceVisible(page, testInfo, `${width}-${language}`)
      await capture(page, testInfo, `${width}-${language}-intro-settled`)
      await testInfo.attach(`${width}-${language}-intro-geometry`, { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
      expect(geometry.viewport).toEqual({ width, height })
      expect(geometry.documentWidth).toBeLessThanOrEqual(width)
      expect(geometry.dialog).toMatchObject({ x: 0, y: 0, width, height })
      expect(geometry.skip!.width).toBeGreaterThanOrEqual(44)
      expect(geometry.skip!.height).toBeGreaterThanOrEqual(44)
      expectWithinViewport(geometry.skip, geometry.viewport, 'skip')
      expectWithinViewport(geometry.text, geometry.viewport, 'text')
      expectWithinViewport(geometry.title, geometry.viewport, 'title')
      expect(geometry.title!.top).toBeGreaterThanOrEqual(geometry.skip!.bottom)
      expect(geometry.headerHitInsideIntro).toBe(true)
      expect(geometry.aboutFocusable).toBe(false)
      expect(geometry.photo).toMatchObject({ src: PHOTO_PATH, objectFit: 'cover', complete: true })
      // Phones keep the text at the bottom, fully below the chin; desktop keeps it left of the face.
      if (width < 760) expect(geometry.text!.top).toBeGreaterThan(face.faceBox.bottom)
      else expect(geometry.text!.right).toBeLessThan(face.faceBox.left)
      await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0, { timeout: 3_000 })
      await expect(dialog).toBeHidden()
      const timing = await introTiming(page)
      await testInfo.attach(`${width}-${language}-auto-dismiss-timing`, { contentType: 'application/json', body: JSON.stringify(timing) })
      expect(timing.openForMs).toBeLessThanOrEqual(1_800)
      await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
      await capture(page, testInfo, `${width}-${language}-after-dismiss`)
      expect(await savedPlan(page)).toEqual(before)
      expect(await storageState(page)).toEqual({ local: [STORAGE_KEY], session: [] })
      expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
      await page.getByRole('tab', { name: t(language, 'tabExplore'), exact: true }).click()
      await expect(page.getByRole('tab', { name: t(language, 'tabExplore'), exact: true })).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
      await page.reload()
      await expectIntroReplayedThenDismiss(page, language)
      expect(await savedPlan(page)).toEqual(before)
      expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
    })
  }
}
