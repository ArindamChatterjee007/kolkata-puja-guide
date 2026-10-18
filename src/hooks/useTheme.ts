import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeSnapshot {
  preference: ThemePreference
  resolved: ResolvedTheme
  systemDark: boolean
}

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']
// Separate from the plan key: clearing a route must never reset the display preference and vice versa.
export const THEME_STORAGE_KEY = 'kolkata-puja-guide:theme:v1'
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface MediaQueryLike {
  matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

export interface ThemeRootLike {
  setAttribute(name: string, value: string): void
  style: { colorScheme: string }
}

export interface ThemeEnvironment {
  storage: StorageLike | null
  matchMedia: ((query: string) => MediaQueryLike) | null
  root: ThemeRootLike | null
}

export interface ThemeStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): ThemeSnapshot
  setPreference(preference: ThemePreference): void
}

export function parseThemePreference(raw: unknown): ThemePreference | null {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

export function readThemePreference(storage: StorageLike | null): ThemePreference {
  if (!storage) return 'system'
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY)) ?? 'system'
  } catch {
    return 'system'
  }
}

export function writeThemePreference(storage: StorageLike | null, preference: ThemePreference): boolean {
  if (!storage) return false
  try {
    if (preference === 'system') storage.removeItem(THEME_STORAGE_KEY)
    else storage.setItem(THEME_STORAGE_KEY, preference)
    return true
  } catch {
    return false
  }
}

export function clearThemePreference(storage: StorageLike | null): boolean {
  return writeThemePreference(storage, 'system')
}

export function applyThemeAttributes(root: ThemeRootLike | null, snapshot: ThemeSnapshot): void {
  if (!root) return
  root.setAttribute('data-theme', snapshot.resolved)
  root.setAttribute('data-theme-preference', snapshot.preference)
  root.style.colorScheme = snapshot.resolved
}

function safeMatchMedia(environment: ThemeEnvironment): MediaQueryLike | null {
  if (!environment.matchMedia) return null
  try {
    return environment.matchMedia(DARK_SCHEME_QUERY)
  } catch {
    return null
  }
}

export function createThemeStore(environment: ThemeEnvironment): ThemeStore {
  const media = safeMatchMedia(environment)
  const listeners = new Set<() => void>()
  let preference = readThemePreference(environment.storage)
  let systemDark = media?.matches ?? false
  let snapshot: ThemeSnapshot = { preference, resolved: resolveTheme(preference, systemDark), systemDark }
  let mediaSubscribed = false

  const publish = () => {
    const resolved = resolveTheme(preference, systemDark)
    if (snapshot.preference === preference && snapshot.resolved === resolved && snapshot.systemDark === systemDark) return
    snapshot = { preference, resolved, systemDark }
    applyThemeAttributes(environment.root, snapshot)
    for (const listener of listeners) listener()
  }

  const onMediaChange = () => {
    if (!media) return
    systemDark = media.matches
    publish()
  }

  // The OS scheme only matters while following it; explicit choices never wake on media changes.
  const syncMediaSubscription = () => {
    if (!media) return
    const wanted = preference === 'system' && listeners.size > 0
    if (wanted && !mediaSubscribed) {
      media.addEventListener('change', onMediaChange)
      mediaSubscribed = true
      systemDark = media.matches
    } else if (!wanted && mediaSubscribed) {
      media.removeEventListener('change', onMediaChange)
      mediaSubscribed = false
    }
  }

  applyThemeAttributes(environment.root, snapshot)

  return {
    subscribe(listener) {
      listeners.add(listener)
      syncMediaSubscription()
      publish()
      return () => {
        listeners.delete(listener)
        syncMediaSubscription()
      }
    },
    getSnapshot() {
      return snapshot
    },
    setPreference(next) {
      if (next === preference) return
      preference = next
      writeThemePreference(environment.storage, next)
      syncMediaSubscription()
      publish()
    },
  }
}

function browserEnvironment(): ThemeEnvironment {
  if (typeof window === 'undefined') return { storage: null, matchMedia: null, root: null }
  let storage: StorageLike | null = null
  try {
    storage = window.localStorage
  } catch {
    storage = null
  }
  return {
    storage,
    matchMedia: typeof window.matchMedia === 'function' ? (query) => window.matchMedia(query) : null,
    root: document.documentElement,
  }
}

const SERVER_SNAPSHOT: ThemeSnapshot = { preference: 'system', resolved: 'light', systemDark: false }

let sharedStore: ThemeStore | null = null

export function themeStore(): ThemeStore {
  sharedStore ??= createThemeStore(browserEnvironment())
  return sharedStore
}

export function useTheme(): ThemeSnapshot & { setPreference: (preference: ThemePreference) => void } {
  const store = themeStore()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT)
  return { ...snapshot, setPreference: store.setPreference }
}
