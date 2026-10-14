import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const output = fileURLToPath(new URL('../test-results/', import.meta.url))
const prefix = '/kolkata-puja-guide/'
const snapshot = JSON.parse(readFileSync(resolve(root, 'office/board.json'), 'utf8'))
const mediaTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2',
}
let workerRevision = 0
const server = createServer((request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname
    if (!path.startsWith(prefix)) {
      response.writeHead(404).end()
      return
    }
    const file = resolve(root, decodeURIComponent(path.slice(prefix.length)) || 'index.html')
    if (!file.startsWith(`${resolve(root)}${sep}`)) {
      response.writeHead(403).end()
      return
    }
    let bytes = readFileSync(file)
    if (file === resolve(root, 'sw.js') && workerRevision) bytes = Buffer.concat([bytes, Buffer.from(`\nvoid ${workerRevision};\n`)])
    response.writeHead(200, { 'Content-Type': mediaTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes)
  } catch {
    response.writeHead(404).end()
  }
})

await new Promise((ready) => server.listen(0, '127.0.0.1', ready))
const address = server.address()
assert(address && typeof address === 'object')
const origin = `http://127.0.0.1:${address.port}`
const base = `${origin}${prefix}`
const results = []
let browser

async function check(label, action) {
  await action()
  results.push(label)
  console.log(`PASS: ${label}`)
}

try {
  mkdirSync(output, { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' })
  const page = await context.newPage()
  const requests = []
  const errors = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.install()
  const boardRequests = () => requests.filter((url) => url === `${base}office/board.json`).length

  await check('Project-prefix office loads with the actual snapshot and derived counts', async () => {
    const response = await page.goto(`${base}office.html`)
    assert.equal(response.status(), 200)
    await expect(page.locator('.task-item')).toHaveCount(snapshot.tasks.length)
    await expect(page.locator('.role-entry')).toHaveCount(snapshot.roles.length)
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.stat-value')].reduce((total, node) => total + Number(node.textContent), 0)), snapshot.tasks.length)
    await expect(page.locator('#snapshot-time')).toContainText('Snapshot')
    await expect(page.locator('#checked-time')).toContainText('Checked')
    await expect(page.locator('#publication-state')).toHaveText(snapshot.publication === 'deployed' ? 'Deployed' : 'Publication pending')
    await expect(page.locator('#quality-state')).toContainText(snapshot.tasks.find((task) => task.id === 'integrated-quality').summary)
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0)
    assert(requests.every((url) => new URL(url).origin === origin), 'Office requested a third-party resource')
  })

  await check('Search, combined status/role filters, List/Board and empty state work', async () => {
    await page.getByLabel('Search tasks').fill('CATALOGUE')
    await page.getByLabel('Filter by role').selectOption('data')
    await page.getByLabel('Filter by status').selectOption('verified')
    await expect(page.locator('.task-item')).toHaveCount(1)
    await expect(page.locator('[data-task-id="source-catalogue"]')).toBeVisible()
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(page.locator('.task-list')).toBeVisible()
    await expect(page.locator('#list-view')).toHaveAttribute('aria-pressed', 'true')
    await page.getByLabel('Search tasks').fill('no-such-project-task')
    await expect(page.locator('#tasks')).toHaveText('No matching tasks.')
    await page.getByLabel('Search tasks').fill('')
    await page.getByLabel('Filter by role').selectOption('all')
    await page.getByLabel('Filter by status').selectOption('all')
    await page.getByRole('button', { name: 'Board', exact: true }).click()
    await expect(page.locator('.task-item')).toHaveCount(snapshot.tasks.length)
  })

  await check('Refresh failure retains the last valid snapshot and checked time', async () => {
    const checked = await page.locator('#checked-time').textContent()
    await page.route(`${base}office/board.json`, (route) => route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' }))
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#refresh-error')).toContainText('The last valid snapshot is retained.')
    await expect(page.locator('.task-item')).toHaveCount(snapshot.tasks.length)
    assert.equal(await page.locator('#checked-time').textContent(), checked)
    await page.unroute(`${base}office/board.json`)
  })

  await check('Untrusted text stays text; release evidence renders and unsafe evidence is rejected', async () => {
    const modified = structuredClone(snapshot)
    modified.tasks[0].title = '<img src=x onerror=alert(1)>'
    await page.route(`${base}office/board.json`, (route) => route.fulfill({ json: modified }))
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator(`[data-task-id="${snapshot.tasks[0].id}"] h3`)).toHaveText(modified.tasks[0].title)
    assert.equal(await page.locator('img[src="x"]').count(), 0)
    await page.unroute(`${base}office/board.json`)
    modified.tasks[0].evidence = [{ label: 'Unsafe', path: 'javascript:alert(1)' }]
    await page.route(`${base}office/board.json`, (route) => route.fulfill({ json: modified }))
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#refresh-error')).toContainText('Refresh failed.')
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0)
    await page.unroute(`${base}office/board.json`)
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator(`[data-task-id="${snapshot.tasks[0].id}"] h3`)).toHaveText(snapshot.tasks[0].title)
    const deployed = structuredClone(snapshot)
    deployed.publication = 'deployed'
    deployed.release = {
      url: 'https://arindamchatterjee007.github.io/kolkata-puja-guide/',
      repository: 'https://github.com/ArindamChatterjee007/kolkata-puja-guide',
      commit: 'a'.repeat(40),
      runUrl: 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/123',
      deployedAt: snapshot.snapshotAt,
    }
    await page.route(`${base}office/board.json`, (route) => route.fulfill({ json: deployed }))
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#publication-state')).toHaveText('Deployed')
    await expect(page.locator('#publication-evidence').getByRole('link', { name: 'Pages', exact: true })).toHaveAttribute('href', deployed.release.url)
    await expect(page.locator('#publication-evidence').getByRole('link', { name: 'Repository', exact: true })).toHaveAttribute('href', deployed.release.repository)
    await expect(page.locator('#publication-evidence').getByRole('link', { name: 'Commit aaaaaaa', exact: true })).toHaveAttribute('href', `${deployed.release.repository}/commit/${deployed.release.commit}`)
    await expect(page.locator('#publication-evidence').getByRole('link', { name: 'Deployment run', exact: true })).toHaveAttribute('href', deployed.release.runUrl)
    await expect(page.locator('.task-evidence a').first()).toHaveAttribute('title', /deployment recorded/)
    deployed.release.url = 'https://arindamchatterjee007.github.io.evil.example/kolkata-puja-guide/'
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#refresh-error')).toContainText('The last valid snapshot is retained.')
    await expect(page.locator('#publication-state')).toHaveText('Deployed')
    assert.equal(await page.locator('a[href*="evil.example"]').count(), 0)
    await page.unroute(`${base}office/board.json`)
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#publication-state')).toHaveText(snapshot.publication === 'deployed' ? 'Deployed' : 'Publication pending')
  })

  await check('Visible polling waits 30 seconds; simulated hiding aborts and stops polling', async () => {
    await expect(page.locator('#refresh-board')).toBeEnabled()
    const before = boardRequests()
    await page.clock.runFor(29_000)
    assert.equal(boardRequests(), before)
    await page.clock.runFor(1_100)
    await expect.poll(boardRequests).toBe(before + 1)
    await expect(page.locator('#refresh-board')).toBeEnabled()
    let releaseRequest
    const held = new Promise((release) => { releaseRequest = release })
    await page.route(`${base}office/board.json`, async (route) => {
      await held
      await route.continue().catch(() => undefined)
    })
    await page.getByRole('button', { name: 'Refresh snapshot' }).click()
    await expect(page.locator('#refresh-board')).toBeDisabled()
    const aborted = page.waitForEvent('requestfailed', (request) => request.url() === `${base}office/board.json`)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await aborted
    const whileHidden = boardRequests()
    await page.clock.runFor(90_000)
    assert.equal(boardRequests(), whileHidden)
    releaseRequest()
    await page.unroute(`${base}office/board.json`)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect.poll(boardRequests).toBe(whileHidden + 1)
    await expect(page.locator('#refresh-board')).toBeEnabled()
  })

  await check('Office screenshots, keyboard entry and automated WCAG checks pass at 1440, 390 and 320 pixels', async () => {
    await page.keyboard.press('ControlOrMeta+Home')
    await page.locator('.skip-link').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#task-register')).toBeFocused()
    for (const [width, height, filename] of [[1440, 1000, 'office-desktop.png'], [390, 844, 'office-mobile.png'], [320, 760, 'office-narrow.png']]) {
      await page.setViewportSize({ width, height })
      await page.evaluate(async () => { await document.fonts.ready })
      const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }))
      assert.equal(dimensions.width, width)
      assert(dimensions.content <= width, `Page overflow at ${width}px: ${dimensions.content}`)
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      assert.deepEqual(accessibility.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })), [])
      await page.screenshot({ path: resolve(output, filename), fullPage: true })
    }
    assert.deepEqual(errors, [])
  })

  await check('PNG icons have the specified dimensions, opaque pixels and maskable safe area', async () => {
    for (const [filename, dimension] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
      const bytes = readFileSync(resolve(root, 'icons', filename))
      assert.equal(bytes.toString('ascii', 12, 16), 'IHDR')
      assert.equal(bytes.readUInt32BE(16), dimension)
      assert.equal(bytes.readUInt32BE(20), dimension)
    }
    const pixels = await page.evaluate(async () => {
      const response = await fetch('./icons/icon-maskable-512.png')
      const image = await createImageBitmap(await response.blob())
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const { data } = context.getImageData(0, 0, image.width, image.height)
      let foreground = 0
      let opaque = true
      let safe = true
      for (let offset = 0; offset < data.length; offset += 4) {
        opaque &&= data[offset + 3] === 255
        if (data[offset] < 250 || data[offset + 1] < 250 || data[offset + 2] < 250) {
          foreground += 1
          const column = (offset / 4) % image.width + 0.5
          const row = Math.floor(offset / 4 / image.width) + 0.5
          safe &&= Math.hypot(column - image.width / 2, row - image.height / 2) <= image.width * 0.4
        }
      }
      return { opaque, safe, foreground }
    })
    assert(pixels.opaque && pixels.safe && pixels.foreground > 10_000)
  })
  await context.close()

  const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const offlinePage = await offlineContext.newPage()
  await check('Generated manifest, worker scope and complete bundled-asset precache stay under the project prefix', async () => {
    await offlinePage.goto(`${base}office.html`)
    await expect(offlinePage.locator('.task-item')).toHaveCount(snapshot.tasks.length)
    const scope = await offlinePage.evaluate(async () => (await navigator.serviceWorker.ready).scope)
    assert.equal(scope, base)
    await offlinePage.reload()
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null)
    const manifest = await offlinePage.evaluate(async () => (await fetch('./manifest.webmanifest')).json())
    assert.equal(manifest.name, 'PujaPath')
    assert.equal(manifest.scope, './')
    assert.equal(manifest.start_url, './')
    const cached = await offlinePage.evaluate(async () => {
      const paths = []
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys()) paths.push(request.url)
      }
      return paths
    })
    assert(cached.every((url) => new URL(url).origin === origin && new URL(url).pathname.startsWith(prefix)))
    const paths = new Set(cached.map((url) => new URL(url).pathname.slice(prefix.length)))
    for (const file of ['index.html', 'office.html', 'office/board.json', 'images/puja-kolkata.webp', 'images/puja-kolkata.LICENSE.md', 'manifest.webmanifest', ...readdirSync(resolve(root, 'assets')).map((file) => `assets/${file}`), ...readdirSync(resolve(root, 'icons')).map((file) => `icons/${file}`)]) {
      assert(paths.has(file), `Asset missing from precache: ${file}`)
    }
    assert(!cached.some((url) => /tile\.openstreetmap|tiles\//.test(url)))
  })

  await check('A new worker waits without takeover or page reload', async () => {
    let navigations = 0
    offlinePage.on('framenavigated', (frame) => { if (frame === offlinePage.mainFrame()) navigations += 1 })
    await offlinePage.getByLabel('Search tasks').fill('catalogue')
    workerRevision = 1
    await offlinePage.evaluate(async () => { await (await navigator.serviceWorker.ready).update() })
    await offlinePage.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting), undefined, { timeout: 20_000 })
    assert.equal(navigations, 0)
    await expect(offlinePage.getByLabel('Search tasks')).toHaveValue('catalogue')
  })

  await check('Offline office navigation serves the office, while the planner retains its separate cached shell', async () => {
    await offlineContext.setOffline(true)
    let response = await offlinePage.goto(`${base}office.html`)
    assert(response.fromServiceWorker())
    await expect(offlinePage.locator('#office-root')).toBeVisible()
    await expect(offlinePage.locator('#source-state')).toHaveText('Offline cached snapshot')
    await expect(offlinePage.locator('.task-item')).toHaveCount(snapshot.tasks.length)
    const retained = await offlinePage.evaluate(async () => (await (await fetch('./office/board.json')).json()).snapshotAt)
    assert.equal(retained, snapshot.snapshotAt)
    response = await offlinePage.goto(`${base}index.html`)
    assert(response.fromServiceWorker())
    await expect(offlinePage.locator('#root')).toBeAttached()
    assert.equal(await offlinePage.locator('#office-root').count(), 0)
    response = await offlinePage.goto(`${base}office.html`)
    assert(response.fromServiceWorker())
    await expect(offlinePage.locator('#office-root')).toBeVisible()
    await expect(offlinePage.locator('.task-item')).toHaveCount(snapshot.tasks.length)
  })

  const report = { checkedAt: new Date().toISOString(), node: process.version, browser: browser.version(), projectPrefix: prefix, snapshotAt: snapshot.snapshotAt, checks: results, plannerAcceptance: 'not evaluated by office checks', publication: snapshot.publication }
  writeFileSync(resolve(output, 'office-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  await new Promise((closed) => server.close(closed))
}