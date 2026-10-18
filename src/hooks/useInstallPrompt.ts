import { useSyncExternalStore } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: readonly string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
  prompt: () => Promise<unknown>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'
export type InstallStatus = 'installed' | 'ready' | 'installing' | 'accepted' | 'dismissed' | 'manual'

export interface InstallPlatformInfo {
  platform: InstallPlatform
  /** Safari itself; other iOS browsers can usually add to the Home Screen too (iOS 16.4+) but not always. */
  iosSafari: boolean
  /** Heuristic only: social/messaging in-app browsers and Android WebViews cannot install. */
  inAppBrowser: boolean
}

export interface InstallPromptState extends InstallPlatformInfo {
  status: InstallStatus
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

type Phase = 'idle' | 'installing' | 'accepted' | 'dismissed' | 'installed'

const APP_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui'] as const
const SERVER_SNAPSHOT: InstallPromptState = { status: 'manual', platform: 'desktop', iosSafari: false, inAppBrowser: false }

export function detectInstallPlatform(userAgent: string, maxTouchPoints: number): InstallPlatformInfo {
  // iPadOS reports a desktop Macintosh user agent but keeps a multi-touch screen.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  const android = !ios && /Android/.test(userAgent)
  const safariShell = /Safari\//.test(userAgent)
  const inAppBrowser =
    /\b(FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|Twitter|BytedanceWebview|musical_ly)\b|\bLine\//i.test(userAgent)
    || (android && /\bwv\b/.test(userAgent))
    || (ios && !safariShell)
  const iosSafari = ios && safariShell && !inAppBrowser && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser/.test(userAgent)
  return { platform: ios ? 'ios' : android ? 'android' : 'desktop', iosSafari, inAppBrowser }
}

let deferred: BeforeInstallPromptEvent | null = null
let phase: Phase = 'idle'
let platformInfo: InstallPlatformInfo | null = null
let snapshot: InstallPromptState | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function runningAsApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || APP_DISPLAY_MODES.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
}

function currentStatus(): InstallStatus {
  if (phase === 'installed' || runningAsApp()) return 'installed'
  if (phase === 'installing') return 'installing'
  if (phase === 'accepted') return 'accepted'
  if (deferred) return 'ready'
  return phase === 'dismissed' ? 'dismissed' : 'manual'
}

function getSnapshot(): InstallPromptState {
  platformInfo ??= detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints)
  const status = currentStatus()
  if (!snapshot || snapshot.status !== status) snapshot = { status, ...platformInfo }
  return snapshot
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  const media = window.matchMedia('(display-mode: standalone)')
  media.addEventListener('change', callback)
  return () => {
    listeners.delete(callback)
    media.removeEventListener('change', callback)
  }
}

// Captured at module load so a browser that decides installability before React commits is not missed.
// preventDefault keeps Chrome's own mini-infobar away; the prompt is only shown after the user taps Install.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    phase = 'idle'
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    phase = 'installed'
    emit()
  })
}

/** One-shot: the captured event is consumed whatever the outcome; a new beforeinstallprompt re-arms it. */
export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferred
  if (!event || phase === 'installing') return 'unavailable'
  deferred = null
  phase = 'installing'
  emit()
  let outcome: 'accepted' | 'dismissed' = 'dismissed'
  try {
    await event.prompt()
    outcome = (await event.userChoice).outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    // A blocked or already-used prompt behaves like a dismissal; the browser-menu route stays available.
  }
  // appinstalled may have fired meanwhile; never downgrade an actual install to "accepted".
  if (phase === 'installing') phase = outcome
  emit()
  return outcome
}

export function useInstallPrompt(): InstallPromptState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)
}
