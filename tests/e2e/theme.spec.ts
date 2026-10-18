import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { THEME_STORAGE_KEY } from '../../src/hooks/useTheme'
import { t } from '../../src/i18n'
import type { Language } from '../../src/types'
import { expect, FIXED_TIME, savedPlan, seedPlan, STORAGE_KEY, test } from './planner.fixture'

type Scheme = 'light' | 'dark'

function root(page: Page) {
  return page.locator('html')
}

function themeGroup(page: Page, language: Language = 'en') {
  return page.getByRole('radiogroup', { name: t(language, 'theme'), exact: true })
}

function themeRadio(page: Page, option: 'light' | 'dark' | 'system', language: Language = 'en') {
  const key = option === 'light' ? 'themeLightLabel' : option === 'dark' ? 'themeDarkLabel' : 'themeSystemLabel'
  return themeGroup(page, language).getByRole('radio', { name: t(language, key), exact: true })
}

function menuTrigger(page: Page, language: Language = 'en') {
  return page.locator('header').getByRole('button', { name: t(language, 'menuMore'), exact: true })
}

function menu(page: Page, language: Language = 'en') {
  return page.getByRole('menu', { name: t(language, 'menuMore'), exact: true })
}

function menuTheme(page: Page, option: 'light' | 'dark' | 'system', language: Language = 'en') {
  const key = option === 'light' ? 'themeLightLabel' : option === 'dark' ? 'themeDarkLabel' : 'themeSystemLabel'
  return menu(page, language).getByRole('menuitemradio', { name: t(language, key), exact: true })
}

function workBoardLink(page: Page, language: Language = 'en') {
  return menu(page, language).getByRole('menuitem', { name: t(language, 'workBoard'), exact: true })
}

async function themeStorage(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)
}

async function expectResolved(page: Page, resolved: Scheme, preference: 'light' | 'dark' | 'system') {
  await expect(root(page)).toHaveAttribute('data-theme', resolved)
  await expect(root(page)).toHaveAttribute('data-theme-preference', preference)
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(resolved)
}

async function capture(page: Page, testInfo: TestInfo, label: string) {
  const path = testInfo.outputPath(`${label}.png`)
  await page.screenshot({ path, animations: 'disabled' })
  await testInfo.attach(label, { path, contentType: 'image/png' })
}

async function palette(page: Page) {
  return page.evaluate(() => {
    const style = (selector: string, property: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      return element ? getComputedStyle(element).getPropertyValue(property) : null
    }
    return {
      header: style('.header', 'background-color'),
      panel: style('.panel', 'background-color'),
      ink: style('.brand__name', 'color'),
      button: style('.btn', 'background-color'),
      tileFilter: style('.pp-map__canvas .leaflet-tile-pane', 'filter'),
      attribution: style('.leaflet-control-attribution', 'background-color'),
      zoomIn: style('.leaflet-control-zoom-in', 'background-color'),
    }
  })
}

async function mapState(page: Page) {
  return page.evaluate(() => {
    const container = document.querySelector<HTMLElement>('.leaflet-container')!
    const pane = document.querySelector<HTMLElement>('.leaflet-map-pane')!
    const tiles = [...document.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile')]
    return {
      probe: container.dataset.probe ?? null,
      size: { width: container.clientWidth, height: container.clientHeight },
      paneTransform: pane.style.transform,
      tileSources: tiles.map((tile) => new URL(tile.src).pathname).sort(),
      routePaths: document.querySelectorAll('.leaflet-overlay-pane path').length,
      device: document.querySelector('.leaflet-interactive[fill="#2a62c9"]')?.getAttribute('d') ?? null,
      streets: document.querySelector<HTMLElement>('.pp-map')?.dataset.streets ?? null,
    }
  })
}

async function headerGeometry(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready })
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.header')!
    const bounds = header.getBoundingClientRect()
    const heading = header.querySelector<HTMLElement>('h1')!
    const targets = [...header.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.checkVisibility()).map((button) => {
      const box = button.getBoundingClientRect()
      return {
        label: button.getAttribute('aria-label') ?? button.textContent?.trim(),
        left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height,
        overflow: button.scrollWidth > button.clientWidth,
      }
    })
    const overlaps = targets.flatMap((target, index) => targets.slice(index + 1)
      .filter((other) => target.left < other.right && target.right > other.left && target.top < other.bottom && target.bottom > other.top)
      .map((other) => [target.label, other.label]))
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      header: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
      brand: { visible: heading.checkVisibility(), overflow: heading.scrollWidth > heading.clientWidth, right: heading.getBoundingClientRect().right },
      targets, overlaps,
    }
  })
}

function expectHeaderFits(geometry: Awaited<ReturnType<typeof headerGeometry>>, label: string) {
  expect(geometry.documentWidth, `${label}: document width`).toBeLessThanOrEqual(geometry.viewport)
  expect(geometry.brand.visible, `${label}: brand visible`).toBe(true)
  expect(geometry.brand.overflow, `${label}: brand overflow`).toBe(false)
  expect(geometry.overlaps, `${label}: overlaps`).toEqual([])
  expect(geometry.brand.right).toBeLessThanOrEqual(geometry.targets[0].left)
  for (const target of geometry.targets) {
    expect(target.width, `${label}: ${target.label} width`).toBeGreaterThanOrEqual(43.5)
    expect(target.height, `${label}: ${target.label} height`).toBeGreaterThanOrEqual(43.5)
    expect(target.overflow, `${label}: ${target.label} overflow`).toBe(false)
    expect(target.left).toBeGreaterThanOrEqual(geometry.header.left)
    expect(target.right).toBeLessThanOrEqual(geometry.header.right)
    expect(target.top).toBeGreaterThanOrEqual(geometry.header.top)
    expect(target.bottom).toBeLessThanOrEqual(geometry.header.bottom)
  }
}

async function audit(page: Page, testInfo: TestInfo, label: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  await testInfo.attach(`${label}-axe`, {
    contentType: 'application/json',
    body: JSON.stringify({ violations: result.violations, incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })) }, null, 2),
  })
  expect(result.violations, `${label}: axe violations`).toEqual([])
}

test('Auto follows the OS scheme live without writing to storage', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expectResolved(page, 'dark', 'system')
  await expect(themeRadio(page, 'system')).toHaveAttribute('aria-checked', 'true')
  await expect(themeGroup(page).getByRole('radio')).toHaveCount(3)
  // Desktop keeps Appearance inline, so the overflow menu holds only the work board link (no duplicate control).
  await expect(menuTrigger(page)).toHaveAttribute('aria-expanded', 'false')
  await menuTrigger(page).click()
  await expect(menu(page)).toBeVisible()
  await expect(menu(page).getByRole('menuitemradio')).toHaveCount(0)
  await expect(menu(page).locator('[role^="menuitem"]')).toHaveCount(1)
  await expect(workBoardLink(page)).toBeFocused()
  await expect(workBoardLink(page)).toHaveAttribute('href', /\/office\.html$/)
  await expect(workBoardLink(page)).toHaveAttribute('target', '_blank')
  await expect(workBoardLink(page)).toHaveAttribute('rel', /noopener/)
  await page.locator('.panel').click({ position: { x: 10, y: 10 } })
  await expect(menu(page)).toHaveCount(0)
  await expect(menuTrigger(page)).toHaveAttribute('aria-expanded', 'false')
  expect(await themeStorage(page)).toBeNull()
  const night = await palette(page)
  await testInfo.attach('night-palette', { contentType: 'application/json', body: JSON.stringify(night, null, 2) })
  expect(night.tileFilter).not.toBe('none')
  expect(night.header).toBe('rgb(26, 22, 23)')
  expect(night.zoomIn).toBe('rgb(39, 33, 34)')

  await page.emulateMedia({ colorScheme: 'light' })
  await expectResolved(page, 'light', 'system')
  await expect.poll(async () => (await palette(page)).header, 'panels cross-fade back to day').toBe('rgb(255, 255, 255)')
  const day = await palette(page)
  expect(day.tileFilter).toBe('none')
  expect(await themeStorage(page)).toBeNull()
})

test('an explicit choice persists across reload, beats the OS scheme, and leaves the plan untouched', async ({ page }, testInfo) => {
  await seedPlan(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expect(page.locator('.pp-pin:not(.pp-pin--start):not(.pp-pin--home)')).toHaveCount(2)
  await page.getByRole('radiogroup', { name: 'Stop order', exact: true }).getByRole('radio', { name: 'Nearest first', exact: true }).click()

  await page.getByRole('button', { name: t('en', 'locateMe'), exact: true }).click()
  await page.evaluate(() => { window.__plannerQA.emit({ lat: 22.5955, lng: 88.3715, accuracy: 20 }) })
  await expect(page.locator('.leaflet-interactive[fill="#2a62c9"]')).toHaveCount(1)
  // Accepted GPS reorders the seeded stops nearest-first; the theme must leave that result alone.
  await expect.poll(async () => (await savedPlan(page)).stopIds).toEqual(['kumartuli-park', 'bagbazar'])
  const planBefore = await savedPlan(page)
  await page.evaluate(() => { document.querySelector<HTMLElement>('.leaflet-container')!.dataset.probe = 'kept' })
  // Leaflet animates the pan to the accepted fix; snapshot only once the pane has stopped moving.
  await expect.poll(async () => {
    const first = (await mapState(page)).paneTransform
    await page.waitForTimeout(250)
    return first === (await mapState(page)).paneTransform
  }, 'map pan settled').toBe(true)
  const before = await mapState(page)
  expect(before.tileSources.length).toBeGreaterThan(0)

  await themeRadio(page, 'dark').click()
  await expectResolved(page, 'dark', 'dark')
  expect(await themeStorage(page)).toBe('dark')
  expect(await savedPlan(page)).toEqual(planBefore)
  expect(await page.evaluate((key) => Object.keys(localStorage).filter((name) => name !== key).sort(), STORAGE_KEY)).toEqual([THEME_STORAGE_KEY, 'kolkata-puja-guide:trip:v1'])

  const after = await mapState(page)
  expect(after, 'theme switch must not remount or move the map').toEqual({ ...before, probe: 'kept' })
  await capture(page, testInfo, '1440-night-route')

  await page.reload()
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expectResolved(page, 'dark', 'dark')
  await expect(themeRadio(page, 'dark')).toHaveAttribute('aria-checked', 'true')
  expect(await savedPlan(page)).toEqual(planBefore)

  await themeRadio(page, 'system').click()
  await expectResolved(page, 'light', 'system')
  expect(await themeStorage(page)).toBeNull()
  expect(await savedPlan(page)).toEqual(planBefore)
})

test('corrupt or blocked storage falls back to Auto and never throws', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{"theme":"dark"}')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key) throw new DOMException('Synthetic quota denial', 'QuotaExceededError')
      return original.call(this, name, value)
    }
  }, THEME_STORAGE_KEY)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expectResolved(page, 'light', 'system')
  await themeRadio(page, 'dark').click()
  await expectResolved(page, 'dark', 'dark')
  expect(await themeStorage(page)).toBe('{"theme":"dark"}')
})

test('desktop day and night pass axe and keep every header target at 44px in both scripts', async ({ page }, testInfo) => {
  await seedPlan(page)
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  for (const language of ['en', 'bn'] as const) {
    await page.locator(`header button[role="radio"][lang="${language}"]`).click()
    await expect(root(page)).toHaveAttribute('lang', language)
    for (const scheme of ['light', 'dark'] as const) {
      await themeRadio(page, scheme, language).click()
      await expectResolved(page, scheme, scheme)
      const geometry = await headerGeometry(page)
      await testInfo.attach(`1440-${language}-${scheme}-header`, { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
      expectHeaderFits(geometry, `1440 ${language} ${scheme}`)
      expect(geometry.targets.map((target) => target.label)).toContain(t(language, scheme === 'light' ? 'themeLightLabel' : 'themeDarkLabel'))
      await capture(page, testInfo, `1440-${language}-${scheme}`)
      await audit(page, testInfo, `1440-${language}-${scheme}`)
    }
  }
  await themeRadio(page, 'system', 'bn').click()
  await expectResolved(page, 'light', 'system')
})

test('night keeps dialogs, popups and the legend on the dark palette', async ({ page }, testInfo) => {
  await seedPlan(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await expectResolved(page, 'dark', 'system')
  await page.locator('.pp-pin').first().click()
  const popup = page.locator('.leaflet-popup')
  await expect(popup).toBeVisible()
  const popupColors = await popup.evaluate((element) => ({
    wrapper: getComputedStyle(element.querySelector('.leaflet-popup-content-wrapper')!).backgroundColor,
    text: getComputedStyle(element.querySelector('.pp-popup__text strong')!).color,
  }))
  expect(popupColors.wrapper).toBe('rgb(39, 33, 34)')
  expect(popupColors.text).toBe('rgb(243, 237, 229)')
  await capture(page, testInfo, '1440-night-popup')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: t('en', 'about'), exact: true }).click()
  const dialog = page.getByRole('dialog').filter({ has: page.locator('.modal__frame') })
  await expect(dialog).toBeVisible()
  expect(await dialog.locator('.modal__frame').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(39, 33, 34)')
  await capture(page, testInfo, '1440-night-about')
  await audit(page, testInfo, '1440-night-about')
})

test.describe('phones', () => {
  test('390px keeps Appearance in the overflow menu with Day, Night and Auto as checkable rows', async ({ page }, testInfo) => {
    await seedPlan(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    await expect(themeGroup(page)).toBeHidden()
    const planBefore = await savedPlan(page)
    const trigger = menuTrigger(page)
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(menu(page)).toHaveCount(0)

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(menu(page)).toBeVisible()
    await expect(menuTheme(page, 'light')).toBeFocused()
    await expect(menu(page).getByRole('menuitemradio')).toHaveCount(3)
    await expect(menuTheme(page, 'system')).toHaveAttribute('aria-checked', 'true')
    await expect(menu(page).getByRole('menuitem', { name: t('en', 'about'), exact: true })).toHaveCount(0)
    await expect(workBoardLink(page)).toHaveAttribute('href', /\/office\.html$/)
    const menuBox = (await menu(page).boundingBox())!
    expect(menuBox.x).toBeGreaterThanOrEqual(0)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390)
    for (const item of await menu(page).locator('[role^="menuitem"]').all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    }

    // Choosing a theme keeps the menu open so the change is visible next to the checked row.
    await menuTheme(page, 'dark').click()
    await expectResolved(page, 'dark', 'dark')
    expect(await themeStorage(page)).toBe('dark')
    await expect(menu(page)).toBeVisible()
    await expect(menuTheme(page, 'dark')).toHaveAttribute('aria-checked', 'true')
    await expect(menuTheme(page, 'system')).toHaveAttribute('aria-checked', 'false')
    expect(await savedPlan(page)).toEqual(planBefore)
    await capture(page, testInfo, '390-en-night-menu')
    await audit(page, testInfo, '390-en-night-menu')

    await page.keyboard.press('ArrowDown')
    await expect(menuTheme(page, 'system')).toBeFocused()
    await page.keyboard.press('End')
    await expect(workBoardLink(page)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menuTheme(page, 'light')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(workBoardLink(page)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(menuTheme(page, 'light')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    for (const language of ['en', 'bn'] as const) {
      await page.locator(`header button[role="radio"][lang="${language}"]`).click()
      await expect(root(page)).toHaveAttribute('lang', language)
      const geometry = await headerGeometry(page)
      await testInfo.attach(`390-${language}-night-header`, { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
      expectHeaderFits(geometry, `390 ${language} night`)
      expect(geometry.targets).toHaveLength(5)
      expect(geometry.targets.map((target) => target.label)).toEqual([
        'EN', 'বাংলা', t(language, 'share'), t(language, 'about'), t(language, 'menuMore'),
      ])
      await capture(page, testInfo, `390-${language}-night`)
    }
    await audit(page, testInfo, '390-bn-night')

    await menuTrigger(page, 'bn').focus()
    await page.keyboard.press('ArrowUp')
    await expect(workBoardLink(page, 'bn')).toBeFocused()
    await menuTheme(page, 'system', 'bn').click()
    await expectResolved(page, 'light', 'system')
    expect(await themeStorage(page)).toBeNull()
    await page.keyboard.press('Escape')
    await expect(menu(page, 'bn')).toHaveCount(0)
    // Only the language choice may have changed in the saved plan; the theme never touches stops or settings.
    expect(await savedPlan(page)).toEqual({ ...planBefore, language: 'bn' })
  })

  test('320px moves About into the menu beside Appearance and the work board; 360px restores the inline button', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/')
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    for (const language of ['en', 'bn'] as const) {
      await page.locator(`header button[role="radio"][lang="${language}"]`).click()
      await expect(root(page)).toHaveAttribute('lang', language)
      const geometry = await headerGeometry(page)
      await testInfo.attach(`320-${language}-header`, { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
      expectHeaderFits(geometry, `320 ${language}`)
      expect(geometry.targets.map((target) => target.label)).toEqual(['EN', 'বাংলা', t(language, 'share'), t(language, 'menuMore')])

      await menuTrigger(page, language).click()
      await expect(menu(page, language)).toBeVisible()
      const box = (await menu(page, language).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
      await expect(menu(page, language).locator('[role^="menuitem"]')).toHaveCount(5)
      await expect(menuTheme(page, 'light', language)).toBeFocused()
      await menuTheme(page, 'dark', language).click()
      await expectResolved(page, 'dark', 'dark')
      await capture(page, testInfo, `320-${language}-night-menu`)
      await audit(page, testInfo, `320-${language}-night-menu`)

      const about = menu(page, language).getByRole('menuitem', { name: t(language, 'about'), exact: true })
      await expect(about).toBeVisible()
      await about.click()
      const dialog = page.getByRole('dialog', { name: t(language, 'aboutTitle'), exact: true })
      await expect(dialog).toBeVisible()
      await expect(menu(page, language)).toHaveCount(0)
      await dialog.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(menuTrigger(page, language)).toBeFocused()

      await menuTrigger(page, language).click()
      await menuTheme(page, 'system', language).click()
      await expectResolved(page, 'light', 'system')
      await page.keyboard.press('Escape')
    }
    expect(await themeStorage(page)).toBeNull()

    // The planner fixture forbids office requests, so the work board is verified as a separate-tab link only.
    await menuTrigger(page, 'bn').click()
    await expect(workBoardLink(page, 'bn')).toHaveAttribute('href', /\/office\.html$/)
    await expect(workBoardLink(page, 'bn')).toHaveAttribute('target', '_blank')
    await expect(workBoardLink(page, 'bn')).toHaveAttribute('rel', /noopener/)
    await expect(workBoardLink(page, 'bn')).toHaveAccessibleName(t('bn', 'workBoard'))
    await expect(workBoardLink(page, 'bn')).toHaveAccessibleDescription(t('bn', 'opensNewTab'))
    await page.keyboard.press('Escape')
    await expect(menu(page, 'bn')).toHaveCount(0)
    await expect(root(page)).toHaveAttribute('lang', 'bn')

    await page.setViewportSize({ width: 360, height: 740 })
    // The media query change is asynchronous; wait for About to return inline before measuring.
    await expect(page.locator('header').getByRole('button', { name: t('bn', 'about'), exact: true })).toBeVisible()
    const widened = await headerGeometry(page)
    expectHeaderFits(widened, '360 bn')
    expect(widened.targets.map((target) => target.label)).toEqual(['EN', 'বাংলা', t('bn', 'share'), t('bn', 'about'), t('bn', 'menuMore')])
    await page.locator('header button[role="radio"][lang="en"]').click()
    expectHeaderFits(await headerGeometry(page), '360 en')
    await menuTrigger(page).click()
    await expect(menu(page).getByRole('menuitem', { name: t('en', 'about'), exact: true })).toHaveCount(0)
    await expect(menu(page).locator('[role^="menuitem"]')).toHaveCount(4)
  })

  test.describe('intro', () => {
    test.use({ autoSkipFestivalIntro: false })

    for (const scheme of ['light', 'dark'] as const) {
      test(`${scheme} intro shows the decoded portrait with the veil settled`, async ({ page }, testInfo) => {
        await page.clock.install({ time: FIXED_TIME })
        await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1_000))
        await page.setViewportSize({ width: 390, height: 844 })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/')
        const dialog = page.locator('dialog.festival-intro[open]')
        await expect(dialog).toHaveAttribute('data-photo', 'ready')
        await expect(dialog.locator('.festival-intro__tagline')).toHaveText(t('en', 'introTagline'))
        const photo = await dialog.locator('.festival-intro__photo').evaluate(async (element) => {
          await Promise.all(element.getAnimations().map((animation) => animation.finished.then(() => undefined, () => undefined)))
          const style = getComputedStyle(element)
          return { animation: style.animationName, playState: style.animationPlayState, clipPath: style.clipPath, opacity: style.opacity, complete: (element as HTMLImageElement).complete }
        })
        expect(photo).toMatchObject({ animation: 'festival-photo', playState: 'running', complete: true, opacity: '1' })
        expect(['none', 'inset(0px)', 'inset(0%)', 'inset(0px 0px 0px 0px)']).toContain(photo.clipPath)
        await expect(root(page)).toHaveAttribute('data-theme', scheme)
        await capture(page, testInfo, `390-intro-${scheme}`)
        await dialog.getByRole('button', { name: t('en', 'introSkipLabel'), exact: true }).click()
        await page.clock.runFor(200)
        await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
        await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
      })
    }
  })

  test.describe('real tiles', () => {
    test.use({ realStreetTiles: true })

    test('night dims the official OpenStreetMap tiles instead of swapping or inverting them', async ({ page }, testInfo) => {
      test.setTimeout(90_000)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/')
      // Real tiles cross the network; allow the same bound the street specs use instead of the 5 s default.
      await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready', { timeout: 45_000 })
      await expectResolved(page, 'dark', 'system')
      const tiles = await page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile-loaded')].map((tile) => new URL(tile.src).origin))
      expect(tiles.length).toBeGreaterThan(0)
      expect(new Set(tiles)).toEqual(new Set(['https://tile.openstreetmap.org']))
      await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
      expect((await palette(page)).tileFilter).toContain('brightness')
      await capture(page, testInfo, '390-night-real-tiles')
    })
  })
})
