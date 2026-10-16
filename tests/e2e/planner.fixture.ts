import { expect, test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { SavedPlan } from '../../src/domain/storage'

export const ORIGIN = 'http://127.0.0.1:5179'
export const STORAGE_KEY = 'kolkata-puja-guide:plan:v1'
export const FIXED_TIME = new Date('2026-10-15T05:00:00.000Z')

type Sample = { lat: number, lng: number, accuracy: number, at?: number }
type BrowserControls = {
  once: number
  started: number
  cleared: number
  denied: boolean
  visible: DocumentVisibilityState
  online: boolean
  nativeShare: boolean
  clipboardDenied: boolean
  shares: string[]
  copies: string[]
  watches: Map<number, PositionCallback>
  pending: PositionCallback[]
  emit: (sample: Sample) => void
}

declare global {
  interface Window {
    __plannerQA: BrowserControls
  }
}

export const test = base.extend<{ browserDiagnostics: void; realStreetTiles: boolean }>({
  realStreetTiles: [false, { option: true }],
  browserDiagnostics: [async ({ context, page, realStreetTiles }, use, testInfo) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const networkErrors: string[] = []
    const cancelledRequests: string[] = []
    const forbiddenRequests: string[] = []
    let stubbedTiles = 0
    const publicPath = (raw: string) => {
      const url = new URL(raw)
      return `${url.origin}${url.pathname}`
    }
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('response', (response) => {
      if (response.status() >= 400) networkErrors.push(`${response.status()} ${publicPath(response.url())}`)
    })
    page.on('requestfailed', (request) => {
      const message = `${request.failure()?.errorText} ${publicPath(request.url())}`
      if (request.failure()?.errorText === 'net::ERR_ABORTED') cancelledRequests.push(message)
      else networkErrors.push(message)
    })
    page.on('dialog', async (dialog) => {
      pageErrors.push(`Unexpected native ${dialog.type()} dialog`)
      await dialog.dismiss()
    })
    await context.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === ORIGIN && !/(?:^|\/)office(?:[/.]|$)/i.test(url.pathname)) {
        await route.continue()
      } else if (url.origin === 'https://tile.openstreetmap.org' && request.resourceType() === 'image') {
        if (realStreetTiles) {
          await route.continue()
          return
        }
        stubbedTiles += 1
        await route.fulfill({
          contentType: 'image/png',
          body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6S9sAAAAASUVORK5CYII=', 'base64'),
        })
      } else {
        forbiddenRequests.push(publicPath(request.url()))
        await route.abort('blockedbyclient')
      }
    })
    await context.addInitScript(() => {
      const state: BrowserControls = {
        once: 0, started: 0, cleared: 0, denied: false, visible: 'visible', online: true,
        nativeShare: false, clipboardDenied: false, shares: [], copies: [],
        watches: new Map(), pending: [],
        emit(sample) {
          const position = {
            coords: {
              latitude: sample.lat, longitude: sample.lng, accuracy: sample.accuracy,
              altitude: null, altitudeAccuracy: null, heading: null, speed: null,
            },
            timestamp: sample.at ?? Date.now(),
          } as GeolocationPosition
          const callbacks = [...state.pending.splice(0), ...state.watches.values()]
          for (const callback of callbacks) callback(position)
        },
      }
      window.__plannerQA = state
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition(success: PositionCallback, failure?: PositionErrorCallback) {
            state.once += 1
            if (state.denied) {
              queueMicrotask(() => failure?.({
                code: 1, message: 'Synthetic permission denial',
                PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
              } as GeolocationPositionError))
            } else state.pending.push(success)
          },
          watchPosition(success: PositionCallback) {
            const watchId = ++state.started
            state.watches.set(watchId, success)
            return watchId
          },
          clearWatch(watchId: number) {
            state.cleared += 1
            state.watches.delete(watchId)
          },
        },
      })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state.visible })
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => state.visible === 'hidden' })
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => state.online })
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        get: () => state.nativeShare ? async (data: ShareData) => { state.shares.push(data.url ?? '') } : undefined,
      })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          async writeText(value: string) {
            if (state.clipboardDenied) throw new DOMException('Synthetic clipboard denial', 'NotAllowedError')
            state.copies.push(value)
          },
        },
      })
    })
    await use()
    await testInfo.attach('browser-diagnostics', {
      contentType: 'application/json',
      body: JSON.stringify({
        pageErrors, consoleErrors, networkErrors, cancelledRequests, forbiddenRequests, stubbedTiles,
        isolation: realStreetTiles
          ? 'Fresh context; synthetic navigator APIs; only same-origin assets and official OpenStreetMap images permitted externally.'
          : 'Fresh context; synthetic navigator APIs; OSM tile fixtures; no external requests sent.',
      }, null, 2),
    })
    expect.soft({ pageErrors, consoleErrors, networkErrors, forbiddenRequests }, 'Unexpected browser errors').toEqual({
      pageErrors: [], consoleErrors: [], networkErrors: [], forbiddenRequests: [],
    })
  }, { auto: true }],
})

export { expect }

export async function seedPlan(page: Page, overrides: Partial<SavedPlan> = {}) {
  const plan: SavedPlan = {
    version: 1, stopIds: ['bagbazar', 'kumartuli-park'], startId: 'start-blue-shyambazar',
    language: 'en', preference: 'balanced', pace: 'steady', availableMinutes: 240,
    visits: [], reports: [], ...overrides,
  }
  await page.addInitScript(({ key, value, origin }) => {
    if (location.origin === origin && localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }, { key: STORAGE_KEY, value: plan, origin: ORIGIN })
}

export async function savedPlan(page: Page): Promise<SavedPlan> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)
}

export async function geoCalls(page: Page) {
  return page.evaluate(() => ({
    once: window.__plannerQA.once,
    started: window.__plannerQA.started,
    active: window.__plannerQA.watches.size,
  }))
}

export async function emitGps(page: Page, sample: Sample) {
  await page.evaluate((value) => window.__plannerQA.emit(value), sample)
}

export async function setVisibility(page: Page, visible: DocumentVisibilityState) {
  await page.evaluate((value) => {
    window.__plannerQA.visible = value
    document.dispatchEvent(new Event('visibilitychange'))
  }, visible)
}

export async function setOnline(page: Page, online: boolean) {
  await page.evaluate((value) => {
    window.__plannerQA.online = value
    window.dispatchEvent(new Event(value ? 'online' : 'offline'))
  }, online)
}

export function sharedHash(overrides: Record<string, string> = {}) {
  return '#plan=' + new URLSearchParams({
    v: '1', stops: 'bagbazar,college-square', start: 'start-blue-esplanade',
    preference: 'walk', pace: 'relaxed', hours: '6', ...overrides,
  }).toString()
}