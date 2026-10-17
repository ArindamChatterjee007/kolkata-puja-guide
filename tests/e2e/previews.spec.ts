import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { PANDALS } from '../../src/data/pandals'
import { AREA_MAP_CREDIT, PANDAL_MEDIA } from '../../src/data/pandalMedia'
import type { PandalPreview } from '../../src/data/pandalMedia'
import { t } from '../../src/i18n'
import type { Language } from '../../src/types'
import { expect, FIXED_TIME, geoCalls, savedPlan, seedPlan, STORAGE_KEY, test } from './planner.fixture'

const AREA_CAPTION = { en: 'Area overview, not pandal appearance', bn: 'এলাকার মানচিত্র, মণ্ডপের ছবি নয়' } as const
const PHOTO_IDS = PANDALS.filter((pandal) => PANDAL_MEDIA[pandal.id].kind === 'photo').map((pandal) => pandal.id)
const AREA_ONLY_IDS = PANDALS.filter((pandal) => PANDAL_MEDIA[pandal.id].kind === 'area').map((pandal) => pandal.id)
const BAGBAZAR = PANDAL_MEDIA.bagbazar
const SREEBHUMI = PANDAL_MEDIA.sreebhumi

// 44px minimum with half-pixel tolerance: fractional dialog centring can report 43.99997 for a 44px box.
const MIN_TARGET = 43.5

function name(id: string, language: Language = 'en') {
  const pandal = PANDALS.find((item) => item.id === id)!
  return language === 'bn' ? pandal.nameBn : pandal.name
}

function yearText(language: Language, year: number | null) {
  if (year === null) return t(language, 'previewYearUnknown')
  return language === 'bn' ? year.toLocaleString('bn-IN', { useGrouping: false }) : String(year)
}

function photoBadge(language: Language, media: PandalPreview) {
  return t(language, 'previewBadgePhoto', { year: yearText(language, media.year) })
}

async function openExplore(page: Page, language: Language = 'en') {
  await page.getByRole('tab', { name: t(language, 'tabExplore'), exact: true }).click()
  await expect(page.locator('.pandal-list')).toBeVisible()
}

async function openDetail(page: Page, id: string, language: Language = 'en') {
  await page.locator(`.pandal-row[data-pandal="${id}"]`).getByRole('button', { name: name(id, language), exact: true }).click()
  const detail = page.getByRole('dialog', { name: name(id, language), exact: true })
  await expect(detail).toBeVisible()
  return detail
}

async function capture(page: Page, testInfo: TestInfo, label: string) {
  await page.evaluate(async () => { await document.fonts.ready })
  const path = testInfo.outputPath(`${label}.png`)
  await page.screenshot({ path })
  await testInfo.attach(label, { path, contentType: 'image/png' })
}

async function decoded(img: Locator) {
  await img.scrollIntoViewIfNeeded()
  await expect.poll(() => img.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 10_000 }).toBe(true)
  return img.evaluate((element: HTMLImageElement) => ({ naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight }))
}

async function expectImage(img: Locator, media: Pick<PandalPreview, 'width' | 'height'> & { image: string }, alt: string) {
  await expect(img).toHaveAttribute('src', `/${media.image}`)
  await expect(img).toHaveAttribute('width', String(media.width))
  await expect(img).toHaveAttribute('height', String(media.height))
  await expect(img).toHaveAttribute('alt', alt)
  await expect(img).toHaveAttribute('loading', 'lazy')
  await expect(img).toHaveAttribute('decoding', 'async')
  expect(await decoded(img)).toEqual({ naturalWidth: media.width, naturalHeight: media.height })
}

async function expectPhotoCredit(preview: Locator, media: PandalPreview, language: Language) {
  const credit = preview.locator('.preview__credit')
  await expect(credit).toContainText(media.author)
  await expect(credit.getByRole('link', { name: t(language, 'mediaSourceCommons'), exact: true })).toHaveAttribute('href', media.sourceUrl)
  await expect(credit.getByRole('link', { name: media.license, exact: true })).toHaveAttribute('href', media.licenseUrl)
  await expect(credit).not.toContainText('OpenStreetMap')
}

async function expectAreaCredit(preview: Locator, media: PandalPreview) {
  const credit = preview.locator('.preview__credit')
  await expect(credit.getByRole('link', { name: AREA_MAP_CREDIT.author, exact: true })).toHaveAttribute('href', AREA_MAP_CREDIT.sourceUrl)
  await expect(credit.getByRole('link', { name: AREA_MAP_CREDIT.license, exact: true })).toHaveAttribute('href', AREA_MAP_CREDIT.licenseUrl)
  await expect(credit).not.toContainText('Wikimedia')
  if (media.kind === 'photo') await expect(preview).not.toContainText(media.author)
}

// The whole frame must be visible (contain): drawn size equals the natural aspect scaled into the frame.
async function containedGeometry(preview: Locator) {
  return preview.evaluate((element) => {
    const frame = element.querySelector('.preview__frame')!.getBoundingClientRect()
    const img = element.querySelector<HTMLImageElement>('.preview__img')!
    const box = img.getBoundingClientRect()
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight)
    return {
      objectFit: getComputedStyle(img).objectFit,
      frame: { width: frame.width, height: frame.height },
      drawn: { width: img.naturalWidth * scale, height: img.naturalHeight * scale },
      backdropBlurred: /blur/.test(getComputedStyle(element.querySelector('.preview__backdrop')!).filter),
      imageBlurred: /blur/.test(getComputedStyle(img).filter),
    }
  })
}

async function noOverflow(page: Page, scope: Locator | Page, label: string) {
  const overflows = await (scope === page ? page.locator('body') : scope as Locator).evaluate((root) => {
    const selectors = '.preview__badge, .preview__caption, .preview__note, .preview__credit, .btn, .link-title, .segmented__item, .pp-popup__text strong'
    return [...root.querySelectorAll<HTMLElement>(selectors)].filter((element) => {
      return element.checkVisibility() && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1
    }).map((element) => ({ className: element.className, text: element.textContent?.trim().slice(0, 80), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }))
  })
  expect.soft(overflows, `${label}: clipped words`).toEqual([])
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: document wider than viewport`).toBe(true)
}

// The 180 ms stagger/rise entrances blend text with the background while running; axe must sample settled colours.
async function settled(scope: Locator) {
  await scope.evaluate((element) => {
    const finite = element.getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => undefined))
    return Promise.race([Promise.all(finite), new Promise((resolve) => setTimeout(resolve, 1_500))])
  })
}

async function audit(page: Page, testInfo: TestInfo, label: string) {
  await settled(page.locator('body'))
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id, impact: violation.impact, help: violation.help,
    nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  }))
  await testInfo.attach(`${label}-axe`, { contentType: 'application/json', body: JSON.stringify({ violations, incomplete: results.incomplete.map((item) => item.id) }, null, 2) })
  expect.soft(violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'), `${label}: serious/critical axe violations`).toEqual([])
}

async function controlsReachable(scope: Locator) {
  const controls = await scope.locator('button, [role="radio"], a.leaflet-popup-close-button').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return {
      label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
      width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      reachable: hit === element || element.contains(hit),
      closeButton: element.classList.contains('leaflet-popup-close-button'),
    }
  }))
  expect(controls.length).toBeGreaterThan(0)
  for (const control of controls) {
    expect(control.reachable, `${control.label} is not covered`).toBe(true)
    if (!control.closeButton) {
      expect(control.width, `${control.label} width`).toBeGreaterThanOrEqual(MIN_TARGET)
      expect(control.height, `${control.label} height`).toBeGreaterThanOrEqual(MIN_TARGET)
    }
  }
  return controls
}

async function openPopup(page: Page, language: Language = 'en') {
  await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
  await page.getByTitle(t(language, 'stopMarker', { n: language === 'bn' ? '১' : '1', name: name('bagbazar', language) }), { exact: true }).click()
  const popup = page.locator('.leaflet-popup')
  await expect(popup).toBeVisible()
  return popup
}

async function expectPopupInsideMap(page: Page) {
  // Leaflet auto-pans (animated) so the popup fits; poll until the pan has settled inside the map.
  const geometry = () => page.evaluate(() => {
    const map = document.querySelector('.pp-map')!.getBoundingClientRect().toJSON() as DOMRect
    const box = document.querySelector('.leaflet-popup')!.getBoundingClientRect().toJSON() as DOMRect
    const content = document.querySelector('.leaflet-popup-content')!.getBoundingClientRect().toJSON() as DOMRect
    return { map, box, content }
  })
  await expect.poll(async () => {
    const { map, box } = await geometry()
    return box.left >= map.left && box.top >= map.top && box.right <= map.right + 0.5 && box.bottom <= map.bottom + 0.5
  }, { message: 'popup settles inside the map region' }).toBe(true)
  await expect(page.locator('.leaflet-zoom-anim, .leaflet-pan-anim')).toHaveCount(0)
  const { map, box, content } = await geometry()
  expect(content.width).toBeLessThanOrEqual(250)
  expect(content.width).toBeLessThanOrEqual(map.width - 32)
  return { map, box }
}

test('every catalogue entry shows its own local primary preview with a badge and bilingual alt text', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await openExplore(page)
  expect(PHOTO_IDS).toHaveLength(8)
  expect(AREA_ONLY_IDS).toHaveLength(25)
  await expect(page.locator('.pandal-row .preview--thumb')).toHaveCount(PANDALS.length)
  for (const pandal of PANDALS) {
    const media = PANDAL_MEDIA[pandal.id]
    const row = page.locator(`.pandal-row[data-pandal="${pandal.id}"]`)
    const thumb = row.locator('.pandal-row__thumb')
    await expect(thumb).toHaveAttribute('aria-label', t('en', 'detailsFor', { name: pandal.name }))
    await expect(thumb).toHaveAttribute('tabindex', '-1')
    const preview = row.locator('.preview--thumb')
    await expect(preview).toHaveAttribute('data-kind', media.kind)
    await expectImage(preview.locator('.preview__img'), media, media.alt)
    const badge = preview.locator('.preview__badge')
    await expect(badge.locator('.preview__badge-short')).toHaveText(media.kind === 'photo' ? yearText('en', media.year) : t('en', 'previewMap'))
    await expect(badge.locator('.preview__badge-full')).toBeHidden()
    await expect(badge).toHaveAttribute('title', media.caption)
    expect(media.caption).toMatch(media.kind === 'photo' ? /^Historical .*; not the 2026 appearance$/ : /^Area overview, not pandal appearance$/)
    // The keyboard/screen-reader route to details is still the single title button.
    await expect(row.getByRole('button', { name: pandal.name, exact: true })).toHaveCount(1)
  }
  const frames = await page.locator('.preview--thumb .preview__frame').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return [Math.round(rect.width), Math.round(rect.height)]
  }))
  expect(new Set(frames.map((frame) => frame.join('x')))).toEqual(new Set(['84x84']))
  await page.locator('.pandal-row[data-pandal="bagbazar"]').scrollIntoViewIfNeeded()
  await capture(page, testInfo, '1440-en-explore-thumbs')
  await page.locator('header button[role="radio"][lang="bn"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  for (const id of ['bagbazar', 'sreebhumi', AREA_ONLY_IDS[0]]) {
    const media = PANDAL_MEDIA[id]
    const preview = page.locator(`.pandal-row[data-pandal="${id}"] .preview--thumb`)
    await expect(preview.locator('.preview__img')).toHaveAttribute('alt', media.altBn)
    await expect(preview.locator('.preview__badge')).toHaveAttribute('title', media.captionBn)
    await expect(preview.locator('.preview__badge-short')).toHaveText(media.kind === 'photo' ? yearText('bn', media.year) : t('bn', 'previewMap'))
  }
  await capture(page, testInfo, '1440-bn-explore-thumbs')
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

for (const [id, media] of [['bagbazar', BAGBAZAR], ['sreebhumi', SREEBHUMI]] as const) {
  test(`${id} detail shows the whole ${media.width > media.height ? 'landscape' : 'portrait'} photo with its credit and switches to the area map with map credit`, async ({ page }, testInfo) => {
    await page.goto('/')
    await openExplore(page)
    const detail = await openDetail(page, id)
    const preview = detail.locator('.preview--detail')
    await expect(preview).toHaveAttribute('data-kind', 'photo')
    await expectImage(preview.locator('.preview__img'), media, media.alt)
    await expect(preview.locator('.preview__badge-full')).toHaveText(photoBadge('en', media))
    await expect(preview.locator('.preview__badge-full')).toBeVisible()
    await expect(preview.locator('.preview__note')).toHaveText(media.caption)
    expect(media.caption).toContain('not the 2026 appearance')
    await expectPhotoCredit(preview, media, 'en')
    const geometry = await containedGeometry(preview)
    await testInfo.attach(`${id}-photo-geometry`, { contentType: 'application/json', body: JSON.stringify(geometry, null, 2) })
    expect(geometry.objectFit).toBe('contain')
    expect(geometry.imageBlurred).toBe(false)
    expect(geometry.backdropBlurred).toBe(true)
    expect(geometry.frame.height).toBeLessThanOrEqual(280.5)
    expect(geometry.drawn.width).toBeLessThanOrEqual(geometry.frame.width + 0.5)
    expect(geometry.drawn.height).toBeLessThanOrEqual(geometry.frame.height + 0.5)
    expect(geometry.drawn.width / geometry.drawn.height).toBeCloseTo(media.width / media.height, 1)
    const actions = detail.locator('.detail__actions')
    await expect(actions).toBeInViewport({ ratio: 1 })
    await expect(actions.getByRole('button', { name: t('en', 'navigateTo', { name: name(id) }), exact: true })).toBeVisible()
    const toggle = preview.getByRole('radiogroup', { name: t('en', 'previewViewLabel'), exact: true })
    await expect(toggle.getByRole('radio', { name: t('en', 'previewPhoto'), exact: true })).toHaveAttribute('aria-checked', 'true')
    for (const radio of await toggle.getByRole('radio').all()) {
      const box = (await radio.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET)
      expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET)
    }
    await capture(page, testInfo, `1440-en-detail-${id}-photo`)

    await toggle.getByRole('radio', { name: t('en', 'previewArea'), exact: true }).click()
    await expect(preview).toHaveAttribute('data-kind', 'area')
    await expectImage(preview.locator('.preview__img'), { image: media.areaImage, width: media.areaWidth, height: media.areaHeight }, media.approximateAreaLabel)
    await expect(preview.locator('.preview__badge-full')).toHaveText(t('en', 'previewBadgeArea'))
    await expect(preview.locator('.preview__note')).toHaveText(AREA_CAPTION.en)
    await expectAreaCredit(preview, media)
    await expect(preview.locator('.preview__img')).toHaveAttribute('src', new RegExp(`/${id}-area\\.webp$`))
    await capture(page, testInfo, `1440-en-detail-${id}-area`)
    await toggle.getByRole('radio', { name: t('en', 'previewPhoto'), exact: true }).click()
    await expect(preview).toHaveAttribute('data-kind', 'photo')
    await expect(preview.locator('.preview__img')).toHaveAttribute('src', `/${media.image}`)
    await expectPhotoCredit(preview, media, 'en')
    await detail.press('Escape')
    await expect(detail).toBeHidden()
    expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  })
}

test('area-only entries show one original map with no photo toggle and the OpenStreetMap credit in both languages', async ({ page }, testInfo) => {
  const id = AREA_ONLY_IDS.includes('santosh-mitra-square') ? 'santosh-mitra-square' : AREA_ONLY_IDS[0]
  const media = PANDAL_MEDIA[id]
  await page.goto('/')
  await openExplore(page)
  for (const language of ['en', 'bn'] as const) {
    if (language === 'bn') {
      await page.locator('header button[role="radio"][lang="bn"]').click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
    }
    const detail = await openDetail(page, id, language)
    const preview = detail.locator('.preview--detail')
    await expect(preview).toHaveAttribute('data-kind', 'area')
    await expectImage(preview.locator('.preview__img'), { image: media.image, width: media.width, height: media.height }, language === 'bn' ? media.altBn : media.alt)
    expect(media.image).toBe(media.areaImage)
    await expect(preview.getByRole('radio')).toHaveCount(0)
    await expect(preview.locator('.preview__badge-full')).toHaveText(t(language, 'previewBadgeArea'))
    await expect(preview.locator('.preview__note')).toHaveText(AREA_CAPTION[language])
    await expect(preview.locator('.preview__note')).toHaveText(language === 'bn' ? media.captionBn : media.caption)
    await expectAreaCredit(preview, media)
    await expect(detail.locator('.detail__actions')).toBeInViewport({ ratio: 1 })
    await capture(page, testInfo, `1440-${language}-detail-${id}-area-only`)
    await detail.press('Escape')
    await expect(detail).toBeHidden()
  }
})

test.describe('missing images', () => {
  test.use({ expectedResourceFailures: /bagbazar-2025\.webp|kumartuli-park-2023\.webp|kumartuli-park-area\.webp|Failed to load resource/ })

  test('a missing photo falls back to that pandal\'s own area map with map credit; when both fail the preview says so without a broken image', async ({ page }, testInfo) => {
    await seedPlan(page)
    for (const file of ['bagbazar-2025', 'kumartuli-park-2023', 'kumartuli-park-area']) {
      await page.route(`**/images/pandals/${file}.webp`, (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' }))
    }
    await page.goto('/')
    await openExplore(page)
    const bagbazarThumb = page.locator('.pandal-row[data-pandal="bagbazar"] .preview--thumb')
    await bagbazarThumb.scrollIntoViewIfNeeded()
    await expect(bagbazarThumb).toHaveAttribute('data-kind', 'area')
    await expectImage(bagbazarThumb.locator('.preview__img'), { image: BAGBAZAR.areaImage, width: BAGBAZAR.areaWidth, height: BAGBAZAR.areaHeight }, BAGBAZAR.approximateAreaLabel)
    await expect(bagbazarThumb.locator('.preview__badge-short')).toHaveText(t('en', 'previewMap'))
    await expect(bagbazarThumb.locator('.preview__badge')).toHaveAttribute('title', AREA_CAPTION.en)
    const kumartuliThumb = page.locator('.pandal-row[data-pandal="kumartuli-park"] .preview--thumb')
    await kumartuliThumb.scrollIntoViewIfNeeded()
    await expect(kumartuliThumb).toHaveAttribute('data-kind', 'none')
    await expect(kumartuliThumb.locator('img')).toHaveCount(0)
    await expect(kumartuliThumb.locator('.preview__empty')).toBeVisible()
    await expect(kumartuliThumb.locator('.preview__empty')).toContainText(t('en', 'previewUnavailable'))
    // No preview ever borrows another venue's picture: every rendered source names its own pandal.
    const sources = await page.locator('.preview--thumb').evaluateAll((elements) => elements.map((element) => ({
      id: element.getAttribute('data-pandal'), src: element.querySelector('img')?.getAttribute('src') ?? null,
    })))
    for (const entry of sources) {
      if (entry.src !== null) expect(entry.src, `${entry.id} uses its own file`).toContain(`/pandals/${entry.id}-`)
    }
    await capture(page, testInfo, '1440-en-explore-fallbacks')

    let detail = await openDetail(page, 'bagbazar')
    let preview = detail.locator('.preview--detail')
    await expect(preview).toHaveAttribute('data-kind', 'area')
    await expect(preview.getByRole('radio')).toHaveCount(0)
    await expect(preview.locator('.preview__img')).toHaveAttribute('src', `/${BAGBAZAR.areaImage}`)
    await expect(preview.locator('.preview__img')).toHaveAttribute('alt', BAGBAZAR.approximateAreaLabel)
    await expect(preview.locator('.preview__badge-full')).toHaveText(t('en', 'previewBadgeArea'))
    await expect(preview.locator('.preview__note')).toHaveText(AREA_CAPTION.en)
    await expectAreaCredit(preview, BAGBAZAR)
    await expect(detail).not.toContainText('2025')
    await capture(page, testInfo, '1440-en-detail-bagbazar-photo-404')
    await detail.press('Escape')
    await expect(detail).toBeHidden()

    detail = await openDetail(page, 'kumartuli-park')
    preview = detail.locator('.preview--detail')
    await expect(preview).toHaveAttribute('data-kind', 'none')
    await expect(preview.locator('img')).toHaveCount(0)
    await expect(preview.getByRole('link')).toHaveCount(0)
    await expect(preview.getByRole('radio')).toHaveCount(0)
    await expect(preview.locator('.preview__empty')).toHaveText(t('en', 'previewUnavailable'))
    await expect(preview.locator('.preview__badge')).toHaveCount(0)
    await expect(detail.locator('.detail__actions')).toBeInViewport({ ratio: 1 })
    await capture(page, testInfo, '1440-en-detail-kumartuli-both-404')
    await detail.press('Escape')

    // Map popup for the same stop shows the unavailable state rather than a broken image or a borrowed photo.
    await expect(page.locator('.pp-map')).toHaveAttribute('data-streets', 'ready')
    await page.getByTitle('Stop 2: Kumartuli Park', { exact: true }).click()
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    const popupPreview = popup.locator('.preview--popup')
    await expect(popupPreview).toHaveAttribute('data-kind', 'none')
    await expect(popupPreview.locator('img')).toHaveCount(0)
    await expect(popupPreview).toContainText(t('en', 'previewUnavailable'))
    await expect(popup.locator('.preview__caption')).toHaveCount(0)
    await controlsReachable(popup)
    await capture(page, testInfo, '1440-en-popup-kumartuli-both-404')
    expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  })
})

test('map popups open from the real marker with a bounded media header, credit links and reachable actions, and lead to the same details', async ({ page }, testInfo) => {
  await seedPlan(page)
  await page.goto('/')
  const popup = await openPopup(page)
  const { map, box } = await expectPopupInsideMap(page)
  await testInfo.attach('1440-popup-geometry', { contentType: 'application/json', body: JSON.stringify({ map, box }) })
  const preview = popup.locator('.preview--popup')
  await expect(preview).toHaveAttribute('data-kind', 'photo')
  await expectImage(preview.locator('.preview__img'), BAGBAZAR, BAGBAZAR.alt)
  const frame = (await preview.locator('.preview__frame').boundingBox())!
  expect(frame.height).toBeGreaterThanOrEqual(100)
  expect(frame.height).toBeLessThanOrEqual(128)
  await expect(preview.locator('.preview__badge-full')).toBeVisible()
  await expect(preview.locator('.preview__badge-full')).toHaveText(photoBadge('en', BAGBAZAR))
  await expectPhotoCredit(preview, BAGBAZAR, 'en')
  await expect(popup.locator('.pp-popup__text strong')).toHaveText('Bagbazar Sarbojanin')
  const controls = await controlsReachable(popup)
  expect(controls.map((control) => control.label)).toEqual(expect.arrayContaining(['Navigate to Bagbazar Sarbojanin', 'Details', 'Remove']))
  await noOverflow(page, popup, '1440-popup')
  await capture(page, testInfo, '1440-en-popup-bagbazar')
  await popup.getByRole('button', { name: 'Details', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await expect(detail).toBeVisible()
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  await expect(detail.locator('.preview--detail')).toHaveAttribute('data-kind', 'photo')
  await expect(detail.locator('.preview--detail .preview__img')).toHaveAttribute('src', `/${BAGBAZAR.image}`)
  await detail.press('Escape')
  await expect(detail).toBeHidden()
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

test('thumbnail click opens the same details without touching the route, and the chosen view is not persisted', async ({ page }) => {
  await seedPlan(page)
  await page.goto('/')
  const before = await savedPlan(page)
  await openExplore(page)
  const thumb = page.locator('.pandal-row[data-pandal="bagbazar"] .pandal-row__thumb')
  await thumb.scrollIntoViewIfNeeded()
  await thumb.click()
  const detail = page.getByRole('dialog', { name: 'Bagbazar Sarbojanin', exact: true })
  await expect(detail).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await expect(detail.getByRole('button', { name: 'Remove', exact: true })).toBeVisible()
  expect(await savedPlan(page)).toEqual(before)
  const preview = detail.locator('.preview--detail')
  await preview.getByRole('radio', { name: 'Area', exact: true }).click()
  await expect(preview).toHaveAttribute('data-kind', 'area')
  await detail.press('Escape')
  await expect(detail).toBeHidden()
  expect(await savedPlan(page)).toEqual(before)
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage) }))).toEqual({ local: [STORAGE_KEY], session: [] })
  // Reopening (same mount, different pandal, then back) starts at the photo again.
  await (await openDetail(page, 'sreebhumi')).press('Escape')
  const reopened = await openDetail(page, 'bagbazar')
  await expect(reopened.locator('.preview--detail')).toHaveAttribute('data-kind', 'photo')
  await expect(reopened.getByRole('radio', { name: 'Photo', exact: true })).toHaveAttribute('aria-checked', 'true')
  await reopened.press('Escape')
  expect(await savedPlan(page)).toEqual(before)
  expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
})

for (const [width, height] of [[320, 568], [390, 844], [1440, 1000]] as const) {
  for (const language of ['en', 'bn'] as const) {
    test(`${language} previews at ${width}x${height}: list, detail and popup fit, pass axe and keep 44px controls`, async ({ page }, testInfo) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height })
      await seedPlan(page, { language })
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      await openExplore(page, language)
      const label = `${width}-${language}`
      await page.locator('.pandal-row[data-pandal="bagbazar"]').scrollIntoViewIfNeeded()
      await expect.poll(() => page.locator('.pandal-row[data-pandal="bagbazar"] .preview__img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
      await noOverflow(page, page, `${label}-explore`)
      await audit(page, testInfo, `${label}-explore`)
      await capture(page, testInfo, `${label}-explore`)
      const rowControls = page.locator('.pandal-row[data-pandal="bagbazar"]').locator('button:not(.pandal-row__thumb)')
      for (const control of await rowControls.all()) {
        const box = (await control.boundingBox())!
        expect(box.height, 'row control height').toBeGreaterThanOrEqual(MIN_TARGET)
        expect(box.width, 'row control width').toBeGreaterThanOrEqual(MIN_TARGET)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }

      const detail = await openDetail(page, 'bagbazar', language)
      const preview = detail.locator('.preview--detail')
      await expect(preview).toHaveAttribute('data-kind', 'photo')
      await expect(preview.locator('.preview__img')).toHaveAttribute('alt', language === 'bn' ? BAGBAZAR.altBn : BAGBAZAR.alt)
      await expect(preview.locator('.preview__badge-full')).toHaveText(photoBadge(language, BAGBAZAR))
      await expect(preview.locator('.preview__note')).toHaveText(language === 'bn' ? BAGBAZAR.captionBn : BAGBAZAR.caption)
      await expectPhotoCredit(preview, BAGBAZAR, language)
      const frame = (await preview.locator('.preview__frame').boundingBox())!
      expect(frame.height).toBeLessThanOrEqual((width < 760 ? 220 : 280) + 0.5)
      expect(frame.x).toBeGreaterThanOrEqual(0)
      expect(frame.x + frame.width).toBeLessThanOrEqual(width)
      // Actions come right after the preview and highlight: whole block on taller screens, at least the
      // full primary row (Navigate) without scrolling on a 568px phone.
      const actions = detail.locator('.detail__actions')
      if (height >= 700) await expect(actions).toBeInViewport({ ratio: 1 })
      else {
        await expect(actions.getByRole('button', { name: t(language, 'navigateTo', { name: name('bagbazar', language) }), exact: true })).toBeInViewport({ ratio: 1 })
        await expect(actions).toBeInViewport({ ratio: 0.6 })
      }
      const radios = preview.getByRole('radio')
      await expect(radios).toHaveCount(2)
      for (const radio of await radios.all()) {
        const box = (await radio.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET)
        expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET)
      }
      await noOverflow(page, detail, `${label}-detail`)
      await audit(page, testInfo, `${label}-detail`)
      await capture(page, testInfo, `${label}-detail-photo`)
      await radios.filter({ hasText: t(language, 'previewArea') }).click()
      await expect(preview).toHaveAttribute('data-kind', 'area')
      await expect(preview.locator('.preview__note')).toHaveText(AREA_CAPTION[language])
      await expectAreaCredit(preview, BAGBAZAR)
      await noOverflow(page, detail, `${label}-detail-area`)
      await capture(page, testInfo, `${label}-detail-area`)
      await detail.press('Escape')
      await expect(detail).toBeHidden()

      const popup = await openPopup(page, language)
      await expectPopupInsideMap(page)
      const popupPreview = popup.locator('.preview--popup')
      await expect(popupPreview).toHaveAttribute('data-kind', 'photo')
      await expect(popupPreview.locator('.preview__img')).toHaveAttribute('alt', language === 'bn' ? BAGBAZAR.altBn : BAGBAZAR.alt)
      const popupFrame = (await popupPreview.locator('.preview__frame').boundingBox())!
      const compact = await page.locator('.pp-map').evaluate((element) => element.getBoundingClientRect().height < 320)
      if (compact) {
        expect(popupFrame.height).toBeLessThanOrEqual(64)
        await expect(popupPreview.locator('.preview__badge-short')).toBeVisible()
        await expect(popupPreview.locator('.preview__badge-full')).toHaveText(photoBadge(language, BAGBAZAR))
      } else {
        expect(popupFrame.height).toBeGreaterThanOrEqual(100)
        expect(popupFrame.height).toBeLessThanOrEqual(128)
        await expect(popupPreview.locator('.preview__badge-full')).toBeVisible()
      }
      await expectPhotoCredit(popupPreview, BAGBAZAR, language)
      await controlsReachable(popup)
      await noOverflow(page, popup, `${label}-popup`)
      await audit(page, testInfo, `${label}-popup`)
      await capture(page, testInfo, `${label}-popup`)
      await popup.locator('.leaflet-popup-close-button').click()
      await expect(popup).toBeHidden()
      expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
    })
  }
}

test.describe('intro replays after previews', () => {
  test.use({ autoSkipFestivalIntro: false })

  test('previews change nothing in storage and a refresh still opens the festival intro once', async ({ page }) => {
    await page.clock.install({ time: FIXED_TIME })
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1_000))
    await seedPlan(page, { visits: [{ pandalId: 'bagbazar', at: Date.parse('2026-10-15T05:00:00.000Z'), method: 'manual' }] })
    await page.goto('/')
    const intro = page.getByRole('dialog', { name: t('en', 'introTitle'), exact: true })
    await expect(intro).toBeVisible()
    await intro.getByRole('button', { name: t('en', 'introSkipLabel'), exact: true }).click()
    await expect(intro).toBeHidden()
    const before = await savedPlan(page)
    await openExplore(page)
    const detail = await openDetail(page, 'sreebhumi')
    await detail.locator('.preview--detail').getByRole('radio', { name: 'Area', exact: true }).click()
    await expect(detail.locator('.preview--detail')).toHaveAttribute('data-kind', 'area')
    await detail.press('Escape')
    await expect(detail).toBeHidden()
    await expect(page.locator('dialog.festival-intro[open]')).toHaveCount(0)
    expect(await savedPlan(page)).toEqual(before)
    await page.reload()
    await expect(intro).toBeVisible()
    await expect(intro.locator('.festival-intro__photo')).toHaveAttribute('src', /intro-durga-face-2015\.webp$/)
    await intro.getByRole('button', { name: t('en', 'introSkipLabel'), exact: true }).click()
    await expect(intro).toBeHidden()
    expect(await savedPlan(page)).toEqual(before)
    await openExplore(page)
    const reopened = await openDetail(page, 'sreebhumi')
    await expect(reopened.locator('.preview--detail')).toHaveAttribute('data-kind', 'photo')
    expect(await geoCalls(page)).toEqual({ once: 0, started: 0, active: 0 })
  })
})
