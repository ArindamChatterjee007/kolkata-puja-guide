import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(projectRoot, 'public/images/pandals')
const metresPerLatitudeDegree = 6_371_008.8 * Math.PI / 180

export const AREA_MAP_STYLE = Object.freeze({
  width: 720,
  height: 480,
  radiusMetres: 600,
  scaleMetres: 100,
})

export function areaOutputPath(id, catalogueIds) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !catalogueIds.includes(id)) {
    throw new RangeError('Output must belong to a known pandal ID')
  }
  return join(outputDirectory, `${id}-area.webp`)
}

export function prepareStreetLines(data, decodeGeometry) {
  return data.edges.map((edge, edgeIndex) => {
    const points = decodeGeometry(data, edgeIndex)
    const bounds = { south: Infinity, west: Infinity, north: -Infinity, east: -Infinity }
    for (const point of points) {
      bounds.south = Math.min(bounds.south, point.lat)
      bounds.north = Math.max(bounds.north, point.lat)
      bounds.west = Math.min(bounds.west, point.lng)
      bounds.east = Math.max(bounds.east, point.lng)
    }
    return { edgeIndex, points, bounds, flags: edge[4], named: edge[3] !== 0 }
  })
}

export function createAreaScene(streets, centre, style = AREA_MAP_STYLE) {
  const { width, height, radiusMetres, scaleMetres } = style
  if (width !== 720 || height !== 480 || radiusMetres < 450 || radiusMetres > 650
    || !Number.isFinite(radiusMetres) || scaleMetres !== 100
    || !Number.isFinite(centre.lat) || Math.abs(centre.lat) >= 85
    || !Number.isFinite(centre.lng) || Math.abs(centre.lng) > 180) {
    throw new RangeError('Invalid bounded area-map projection')
  }
  const metresPerPixel = 2 * radiusMetres / Math.hypot(width, height)
  const longitudeScale = metresPerLatitudeDegree * Math.cos(centre.lat * Math.PI / 180)
  const halfLatitude = height * metresPerPixel / 2 / metresPerLatitudeDegree
  const halfLongitude = width * metresPerPixel / 2 / longitudeScale
  const bounds = {
    south: centre.lat - halfLatitude,
    north: centre.lat + halfLatitude,
    west: centre.lng - halfLongitude,
    east: centre.lng + halfLongitude,
  }
  const lines = streets.filter((street) => street.bounds.north >= bounds.south
    && street.bounds.south <= bounds.north && street.bounds.east >= bounds.west
    && street.bounds.west <= bounds.east).map((street) => ({
    edgeIndex: street.edgeIndex,
    flags: street.flags,
    named: street.named,
    points: street.points.map((point) => [
      width / 2 + (point.lng - centre.lng) * longitudeScale / metresPerPixel,
      height / 2 - (point.lat - centre.lat) * metresPerLatitudeDegree / metresPerPixel,
    ]),
  }))
  const geometryPoints = lines.reduce((total, line) => total + line.points.length, 0)
  if (!lines.length || lines.length > 6_000 || geometryPoints > 60_000) {
    throw new RangeError('Missing or excessive local street geometry')
  }
  return { ...style, metresPerPixel, bounds, lines, geometryPoints }
}

async function loadInputs() {
  const graphPath = join(projectRoot, 'public/data/kolkata-walking.json')
  if ((await stat(graphPath)).size > 8 * 1024 * 1024) throw new RangeError('Street graph exceeds 8 MiB')
  const graphBytes = await readFile(graphPath)
  const server = await createServer({
    root: projectRoot,
    configFile: false,
    envFile: false,
    logLevel: 'error',
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const { PANDALS } = await server.ssrLoadModule('/src/data/pandals.ts')
    const { validateStreetData, decodeStreetGeometry } = await server.ssrLoadModule('/src/domain/streets.ts')
    const data = validateStreetData(JSON.parse(graphBytes.toString('utf8')))
    if (PANDALS.length !== 33 || new Set(PANDALS.map((pandal) => pandal.id)).size !== 33) {
      throw new RangeError('Expected the 33-entry pandal catalogue')
    }
    return {
      pandals: PANDALS,
      streets: prepareStreetLines(data, decodeStreetGeometry),
      source: {
        imageData: 'data/kolkata-walking.json',
        bytes: graphBytes.length,
        sha256: createHash('sha256').update(graphBytes).digest('hex'),
        snapshotAt: data.source.timestamp,
        fetchedAt: data.source.fetchedAt,
        attribution: data.source.attribution,
        sourceUrl: data.source.attributionUrl,
        license: data.source.license,
        licenseUrl: data.source.licenseUrl,
      },
    }
  } finally {
    await server.close()
  }
}

export async function buildPandalPreviews({ replace = false } = {}) {
  const { pandals, streets, source } = await loadInputs()
  const catalogueIds = pandals.map((pandal) => pandal.id)
  await mkdir(outputDirectory, { recursive: true })
  if (await realpath(outputDirectory) !== outputDirectory) throw new Error('Symlinked output directory refused')
  const reportPath = join(outputDirectory, 'area-provenance.json')
  const destinations = [...catalogueIds.map((id) => areaOutputPath(id, catalogueIds)), reportPath]
  for (const destination of destinations) {
    const existing = await lstat(destination).catch((error) => {
      if (error.code !== 'ENOENT') throw error
      return null
    })
    if (existing && (!replace || !existing.isFile() || existing.isSymbolicLink())) {
      throw new Error(`Refusing to replace existing output: ${destination}`)
    }
  }
  const font = await readFile(join(projectRoot, 'node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff2'))
  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/build-pandal-previews.mjs',
    source,
    projection: 'Local equirectangular; north up; radius is the centre-to-corner distance',
    style: AREA_MAP_STYLE,
    notice: 'Area overview, not pandal appearance. Approximate pin, not a verified entrance. No live access or route claim.',
    assets: {},
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 1 })
    await page.route('**/*', (route) => route.abort())
    await page.evaluate(async (fontData) => {
      const face = new FontFace('OutfitMedia', `url(data:font/woff2;base64,${fontData})`)
      document.fonts.add(await face.load())
    }, font.toString('base64'))
    for (const pandal of pandals) {
      const scene = createAreaScene(streets, pandal)
      const rendered = await page.evaluate((area) => {
        const canvas = document.createElement('canvas')
        canvas.width = area.width
        canvas.height = area.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas 2D unavailable')
        context.fillStyle = '#f2f5f1'
        context.fillRect(0, 0, area.width, area.height)
        context.lineCap = 'round'
        context.lineJoin = 'round'
        for (const outline of [true, false]) {
          for (const line of area.lines) {
            const roadWidth = line.flags & 8 ? 7 : line.named ? 5 : 3
            context.lineWidth = roadWidth + (outline ? 2 : 0)
            context.strokeStyle = outline ? '#b5c8b9' : '#ffffff'
            context.globalAlpha = line.flags & 4 ? 0.55 : 1
            context.setLineDash(line.flags & 4 ? [8, 5] : line.flags & 2 ? [2, 3] : [])
            context.beginPath()
            line.points.forEach((point, index) => {
              if (index === 0) context.moveTo(point[0], point[1])
              else context.lineTo(point[0], point[1])
            })
            context.stroke()
          }
        }
        context.globalAlpha = 1
        context.setLineDash([3, 5])
        context.strokeStyle = '#b82c42'
        context.lineWidth = 2
        context.beginPath()
        context.arc(area.width / 2, area.height / 2, 23, 0, Math.PI * 2)
        context.stroke()
        context.setLineDash([])
        context.fillStyle = '#ffffff'
        context.beginPath()
        context.arc(area.width / 2, area.height / 2, 12, 0, Math.PI * 2)
        context.fill()
        context.stroke()
        context.fillStyle = '#b82c42'
        context.beginPath()
        context.arc(area.width / 2, area.height / 2, 5, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#ffffff'
        context.fillRect(16, 14, 176, 30)
        context.fillRect(area.width - 49, 14, 33, 61)
        context.fillRect(0, area.height - 44, area.width, 44)
        context.fillStyle = '#275740'
        context.font = '16px OutfitMedia'
        context.fillText('AREA OVERVIEW', 28, 35)
        context.textAlign = 'center'
        context.fillText('N', area.width - 32, 33)
        context.strokeStyle = '#275740'
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(area.width - 32, 65)
        context.lineTo(area.width - 32, 43)
        context.moveTo(area.width - 37, 49)
        context.lineTo(area.width - 32, 43)
        context.lineTo(area.width - 27, 49)
        context.stroke()
        const scaleWidth = area.scaleMetres / area.metresPerPixel
        context.fillText('100 m', 22 + scaleWidth / 2, area.height - 24)
        context.beginPath()
        context.moveTo(22, area.height - 17)
        context.lineTo(22, area.height - 12)
        context.lineTo(22 + scaleWidth, area.height - 12)
        context.lineTo(22 + scaleWidth, area.height - 17)
        context.stroke()
        context.textAlign = 'right'
        context.fillText('OpenStreetMap contributors', area.width - 20, area.height - 17)
        return canvas.toDataURL('image/webp', 0.9).split(',')[1]
      }, scene)
      const bytes = Buffer.from(rendered, 'base64')
      if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP'
        || bytes.length > 60_000) throw new Error(`Invalid or oversized map: ${pandal.id}`)
      await writeFile(areaOutputPath(pandal.id, catalogueIds), bytes, { flag: replace ? 'w' : 'wx' })
      report.assets[pandal.id] = {
        image: `images/pandals/${pandal.id}-area.webp`,
        width: scene.width,
        height: scene.height,
        centre: { lat: pandal.lat, lng: pandal.lng },
        coordinateAccuracy: pandal.coordinateAccuracy,
        coordinateSourceUrl: pandal.sourceUrl,
        bounds: scene.bounds,
        metresPerPixel: scene.metresPerPixel,
        sourceEdges: scene.lines.length,
        geometryPoints: scene.geometryPoints,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      }
      console.log(`${pandal.id}: ${scene.lines.length} real polylines, ${bytes.length} bytes`)
    }
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: replace ? 'w' : 'wx' })
  } finally {
    await browser.close()
  }
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argumentsList = process.argv.slice(2)
  if (argumentsList.some((argument) => argument !== '--replace')) throw new Error('Only --replace is supported; output is fixed')
  await buildPandalPreviews({ replace: argumentsList.includes('--replace') })
}