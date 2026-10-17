import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { PANDALS } from '../../src/data/pandals'
import { AREA_MAP_CREDIT, FESTIVAL_PORTRAIT, PANDAL_MEDIA } from '../../src/data/pandalMedia'
import { decodeStreetGeometry } from '../../src/domain/streets'

const { AREA_MAP_STYLE, areaOutputPath, prepareStreetLines, createAreaScene } =
  await import(new URL('../../scripts/build-pandal-previews.mjs', import.meta.url).href)

interface AssetEvidence {
  image: string
  width: number
  height: number
  bytes: number
  sha256: string
}

interface PhotoEvidence extends AssetEvidence {
  year: number
  author: string
  sourceUrl: string
  license: string
  licenseUrl: string
  capturedAt: string
  metadataCheckedAt: string
  identityEvidence: string
  changes: string
  thumbnail: { url: string; bytes: number; sha256: string; width: number; height: number }
}

interface AreaEvidence extends AssetEvidence {
  centre: { lat: number; lng: number }
  coordinateAccuracy: string
  metresPerPixel: number
  sourceEdges: number
  geometryPoints: number
}

const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url))
const photoEvidence = JSON.parse(readFileSync(resolve(publicRoot, 'images/pandals/photo-provenance.json'), 'utf8')) as {
  assets: Record<string, PhotoEvidence>
}
const areaEvidence = JSON.parse(readFileSync(resolve(publicRoot, 'images/pandals/area-provenance.json'), 'utf8')) as {
  source: { imageData: string; bytes: number; sha256: string; snapshotAt: string }
  assets: Record<string, AreaEvidence>
}
const allAssets = [...Object.values(photoEvidence.assets), ...Object.values(areaEvidence.assets)]

describe('pandal media contract', () => {
  it('covers exactly the 33 catalogue IDs without sharing area fallbacks', () => {
    expect(PANDALS).toHaveLength(33)
    expect(Object.keys(PANDAL_MEDIA).sort()).toEqual(PANDALS.map((pandal) => pandal.id).sort())
    expect(new Set(Object.values(PANDAL_MEDIA).map((media) => media.fallbackImage)).size).toBe(33)
    expect(Object.values(PANDAL_MEDIA).filter((media) => media.kind === 'photo')).toHaveLength(8)
    expect(Object.values(PANDAL_MEDIA).filter((media) => media.kind === 'area')).toHaveLength(25)
  })

  it('keeps local relative paths, bilingual labels and explicit area semantics', () => {
    for (const pandal of PANDALS) {
      const media = PANDAL_MEDIA[pandal.id]
      expect(media.id).toBe(pandal.id)
      expect(media.fallbackImage).toBe(`images/pandals/${pandal.id}-area.webp`)
      expect(media.areaImage).toBe(media.fallbackImage)
      expect(media.image).toMatch(/^images\/pandals\/[a-z0-9-]+\.webp$/)
      for (const text of [media.alt, media.altBn, media.caption, media.captionBn,
        media.author, media.approximateAreaLabel, media.approximateAreaLabelBn]) {
        expect(text.length).toBeGreaterThan(0)
      }
      expect(media.width).toBeGreaterThan(0)
      expect(media.height).toBeGreaterThan(0)
      expect(media.areaWidth).toBe(720)
      expect(media.areaHeight).toBe(480)
      if (media.kind === 'area') {
        expect(media.image).toBe(media.fallbackImage)
        expect(media.caption).toBe('Area overview, not pandal appearance')
        expect(media.year).toBeNull()
        expect(media.licenseUrl).toBe('https://opendatacommons.org/licenses/odbl/1-0/')
        expect(media.author).toBe(AREA_MAP_CREDIT.author)
      } else {
        expect(media.image).not.toBe(media.fallbackImage)
        expect(media.caption).toContain('not the 2026 appearance')
        expect(media.caption).toContain(String(media.year))
      }
    }
  })

  it('keeps an unidentified festival photograph out of named pandal previews', () => {
    expect(FESTIVAL_PORTRAIT.image).toMatch(/^images\/[a-z0-9/-]+\.webp$/)
    expect(FESTIVAL_PORTRAIT.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    expect(FESTIVAL_PORTRAIT.licenseUrl).toBe('https://creativecommons.org/licenses/by/3.0/')
    expect(Object.values(PANDAL_MEDIA).some((media) => media.image === FESTIVAL_PORTRAIT.image)).toBe(false)
    expect(FESTIVAL_PORTRAIT.caption).toContain('pandal not identified')
  })
})

describe('original area-map geometry', () => {
  const centre = { lat: 22.57, lng: 88.36 }
  const fixture = {
    nodes: [[1, 22.57, 88.359], [2, 22.57, 88.361]],
    edges: [[0, 1, 0, 1, 0, 0, [500, 1000]]],
  }

  it('retains the real intermediate bend instead of drawing an endpoint chord', () => {
    const streets = prepareStreetLines(fixture, decodeStreetGeometry)
    expect(streets[0].points).toEqual([
      { lat: 22.57, lng: 88.359 },
      { lat: 22.5705, lng: 88.36 },
      { lat: 22.57, lng: 88.361 },
    ])
    const scene = createAreaScene(streets, centre)
    expect(scene.lines[0].points).toHaveLength(3)
    expect(scene.lines[0].points[1][0]).toBe(360)
    expect(scene.lines[0].points[1][1]).toBeLessThan(240)
    expect(scene.lines[0].points[0][0]).toBeLessThan(360)
    expect(scene.lines[0].points[2][0]).toBeGreaterThan(360)
    expect(Math.hypot(scene.width, scene.height) * scene.metresPerPixel / 2).toBeCloseTo(600)
  })

  it('includes crossing polylines with endpoints outside the view and excludes distant geometry', () => {
    const crossing = { nodes: [[1, 22.57, 88.35], [2, 22.57, 88.37]], edges: [[0, 1, 0, 0, 0, 0, []]] }
    const streets = prepareStreetLines(crossing, decodeStreetGeometry)
    expect(createAreaScene(streets, centre).lines).toHaveLength(1)
    expect(() => createAreaScene(streets, { lat: 22.6, lng: 88.4 })).toThrow('Missing')
  })

  it('refuses unbounded projections and unknown or escaping output paths', () => {
    const streets = prepareStreetLines(fixture, decodeStreetGeometry)
    expect(() => createAreaScene(streets, centre, { ...AREA_MAP_STYLE, radiusMetres: 700 })).toThrow(RangeError)
    expect(() => createAreaScene(streets, { lat: NaN, lng: 88.36 })).toThrow(RangeError)
    expect(areaOutputPath('bagbazar', ['bagbazar'])).toMatch(/\/public\/images\/pandals\/bagbazar-area\.webp$/)
    for (const id of ['../escape', '/tmp/escape', 'unknown', 'bagbazar/photo']) {
      expect(() => areaOutputPath(id, ['bagbazar'])).toThrow(RangeError)
    }
  })
})

describe('local media evidence', () => {
  it('documents every photograph license separately and preserves the legacy intro image', () => {
    const notice = readFileSync(resolve(publicRoot, 'images/MEDIA_LICENSES.md'), 'utf8')
    for (const source of Object.values(photoEvidence.assets)) {
      expect(notice).toContain(source.image.slice('images/'.length))
      expect(notice).toContain(source.author)
      expect(notice).toContain(source.sourceUrl)
      expect(notice).toContain(source.licenseUrl)
    }
    expect(notice).toContain(AREA_MAP_CREDIT.sourceUrl)
    expect(notice).toContain(AREA_MAP_CREDIT.licenseUrl)
    const legacy = readFileSync(resolve(publicRoot, 'images/puja-kolkata.webp'))
    expect(legacy.length).toBe(114_146)
    expect(createHash('sha256').update(legacy).digest('hex')).toBe('4e69ec7e29a5240c77095b2f7da7a59233f97f7f493e4fa7fa74f5469cef2b9c')
    expect(readFileSync(resolve(publicRoot, 'images/puja-kolkata.LICENSE.md'), 'utf8')).toContain('HridoyKundu')
  })

  it('exposes the documented media and fallback-credit contracts without a client network loader', async () => {
    const exports = await import('../../src/data/pandalMedia')
    expect(Object.keys(exports).sort()).toEqual(['AREA_MAP_CREDIT', 'FESTIVAL_PORTRAIT', 'PANDAL_MEDIA'])
    const documentation = readFileSync(new URL('../../docs/MEDIA.md', import.meta.url), 'utf8')
    for (const name of Object.keys(exports)) expect(documentation).toContain(name)
    expect(documentation).toContain('import.meta.env.BASE_URL')
    expect(documentation).toContain('Area overview, not pandal appearance')
  })

  it('has 42 distinct WebPs with exact hashes, sizes and confined local paths', () => {
    expect(allAssets).toHaveLength(42)
    expect(new Set(allAssets.map((asset) => asset.image)).size).toBe(42)
    expect(new Set(allAssets.map((asset) => asset.sha256)).size).toBe(42)
    expect(allAssets.reduce((total, asset) => total + asset.bytes, 0)).toBeLessThan(6_000_000)
    for (const asset of allAssets) {
      expect(asset.image).toMatch(/^images\/(?:pandals\/)?[a-z0-9-]+\.webp$/)
      const path = realpathSync(resolve(publicRoot, asset.image))
      expect(path.startsWith(`${realpathSync(publicRoot)}${sep}`)).toBe(true)
      const bytes = readFileSync(path)
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
      expect(bytes.readUInt32LE(4) + 8).toBe(bytes.length)
      expect(bytes.length).toBe(asset.bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/)
      const limit = asset.image.endsWith('-area.webp') ? 60_000
        : asset.image === FESTIVAL_PORTRAIT.image ? 200_000 : 160_000
      expect(bytes.length).toBeLessThanOrEqual(limit)
    }
  })

  it('keeps displayed photo metadata identical to the reviewed source evidence', () => {
    const displayed = [FESTIVAL_PORTRAIT, ...Object.values(PANDAL_MEDIA).filter((media) => media.kind === 'photo')]
    expect(displayed.map((media) => media.id).sort()).toEqual(Object.keys(photoEvidence.assets).sort())
    for (const media of displayed) {
      const source = photoEvidence.assets[media.id]
      for (const field of ['image', 'width', 'height', 'year', 'author', 'sourceUrl', 'license', 'licenseUrl'] as const) {
        expect(media[field]).toBe(source[field])
      }
      const fileUrl = new URL(source.sourceUrl)
      expect(fileUrl.protocol).toBe('https:')
      expect(fileUrl.hostname).toBe('commons.wikimedia.org')
      expect(fileUrl.pathname).toMatch(/^\/wiki\/File:/)
      expect(source.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/[234]\.0|publicdomain\/zero\/1\.0)\/$/)
      expect(source.identityEvidence.length).toBeGreaterThan(40)
      expect(source.capturedAt).toContain(String(source.year))
      expect(source.year).toBeLessThan(2026)
      expect(source.metadataCheckedAt).toMatch(/^2026-10-17T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(source.changes).toContain('No crop')
      expect(source.thumbnail.bytes).toBeLessThanOrEqual(1_500_000)
      expect(source.thumbnail.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(['thumb.wikimedia.org', 'upload.wikimedia.org']).toContain(new URL(source.thumbnail.url).hostname)
      expect(source.width / source.height).toBeCloseTo(source.thumbnail.width / source.thumbnail.height, 2)
    }
  })

  it('matches all 33 maps to the exact graph snapshot, pins and decoded local geometry', () => {
    expect(Object.keys(areaEvidence.assets).sort()).toEqual(PANDALS.map((pandal) => pandal.id).sort())
    const bytes = readFileSync(resolve(publicRoot, areaEvidence.source.imageData))
    expect(bytes.length).toBe(areaEvidence.source.bytes)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(areaEvidence.source.sha256)
    const graph = JSON.parse(bytes.toString('utf8'))
    expect(graph.version).toBe(2)
    expect(graph.geometryEncoding).toBe('intermediate-delta-lat-lng-e6')
    expect(graph.source.timestamp).toBe(areaEvidence.source.snapshotAt)
    const streets = prepareStreetLines(graph, decodeStreetGeometry)
    for (const pandal of PANDALS) {
      const evidence = areaEvidence.assets[pandal.id]
      const scene = createAreaScene(streets, pandal)
      expect(evidence.image).toBe(PANDAL_MEDIA[pandal.id].areaImage)
      expect(evidence.centre).toEqual({ lat: pandal.lat, lng: pandal.lng })
      expect(evidence.coordinateAccuracy).toBe('approximate')
      expect(evidence.sourceEdges).toBe(scene.lines.length)
      expect(evidence.geometryPoints).toBe(scene.geometryPoints)
      expect(evidence.metresPerPixel).toBeCloseTo(scene.metresPerPixel)
    }
  })

  it('decodes every actual image with native Chrome, correct dimensions and nonblank pixels offline', async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true })
    try {
      const page = await browser.newPage()
      let externalRequests = 0
      await page.route('**/*', (route) => { externalRequests += 1; return route.abort() })
      await page.context().setOffline(true)
      for (const asset of allAssets) {
        const encoded = readFileSync(resolve(publicRoot, asset.image)).toString('base64')
        const decoded = await page.evaluate(async (base64) => {
          const image = new Image()
          image.src = `data:image/webp;base64,${base64}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = 64
          canvas.height = 64
          const context = canvas.getContext('2d')!
          context.drawImage(image, 0, 0, 64, 64)
          const pixels = context.getImageData(0, 0, 64, 64).data
          const colors = new Set<string>()
          for (let offset = 0; offset < pixels.length; offset += 4) {
            colors.add(`${pixels[offset] >> 3},${pixels[offset + 1] >> 3},${pixels[offset + 2] >> 3}`)
          }
          return { width: image.naturalWidth, height: image.naturalHeight, colors: colors.size }
        }, encoded)
        expect(decoded.width, asset.image).toBe(asset.width)
        expect(decoded.height, asset.image).toBe(asset.height)
        expect(decoded.colors, asset.image).toBeGreaterThanOrEqual(16)
      }
      expect(externalRequests).toBe(0)
    } finally {
      await browser.close()
    }
  }, 30_000)
})