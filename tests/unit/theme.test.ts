import { describe, expect, it } from 'vitest'
import {
  applyThemeAttributes, clearThemePreference, createThemeStore, DARK_SCHEME_QUERY, parseThemePreference,
  readThemePreference, resolveTheme, THEME_PREFERENCES, THEME_STORAGE_KEY, writeThemePreference,
} from '../../src/hooks/useTheme'
import type { MediaQueryLike, StorageLike, ThemeRootLike } from '../../src/hooks/useTheme'
import { STORAGE_KEY as PLAN_KEY } from '../../src/domain/storage'

function fakeStorage(initial: Record<string, string> = {}, options: { throwOnRead?: boolean, throwOnWrite?: boolean } = {}) {
  const data = new Map(Object.entries(initial))
  const storage: StorageLike & { data: Map<string, string> } = {
    data,
    getItem(key) {
      if (options.throwOnRead) throw new DOMException('Synthetic private-mode denial', 'SecurityError')
      return data.get(key) ?? null
    },
    setItem(key, value) {
      if (options.throwOnWrite) throw new DOMException('Synthetic quota denial', 'QuotaExceededError')
      data.set(key, value)
    },
    removeItem(key) {
      if (options.throwOnWrite) throw new DOMException('Synthetic quota denial', 'QuotaExceededError')
      data.delete(key)
    },
  }
  return storage
}

function fakeMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const queries: string[] = []
  const media: MediaQueryLike & { listeners: Set<() => void>, queries: string[], emit: (dark: boolean) => void } = {
    matches,
    listeners,
    queries,
    addEventListener(_type, listener) {
      listeners.add(listener)
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener)
    },
    emit(dark) {
      media.matches = dark
      for (const listener of [...listeners]) listener()
    },
  }
  const matchMedia = (query: string) => {
    queries.push(query)
    return media
  }
  return { media, matchMedia }
}

function fakeRoot() {
  const attributes = new Map<string, string>()
  const root: ThemeRootLike & { attributes: Map<string, string> } = {
    attributes,
    style: { colorScheme: '' },
    setAttribute(name, value) {
      attributes.set(name, value)
    },
  }
  return root
}

describe('theme preference parsing and resolution', () => {
  it('accepts only the three preference values', () => {
    for (const preference of THEME_PREFERENCES) expect(parseThemePreference(preference)).toBe(preference)
    for (const junk of ['Dark', 'auto', '', ' dark', 1, null, undefined, {}, ['dark'], true]) {
      expect(parseThemePreference(junk)).toBeNull()
    }
  })

  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)('resolves %s with systemDark=%s to %s', (preference, systemDark, resolved) => {
    expect(resolveTheme(preference, systemDark)).toBe(resolved)
  })
})

describe('theme preference storage', () => {
  it('falls back to system when storage is missing, empty, corrupt or unreadable', () => {
    expect(readThemePreference(null)).toBe('system')
    expect(readThemePreference(fakeStorage())).toBe('system')
    expect(readThemePreference(fakeStorage({ [THEME_STORAGE_KEY]: '{"theme":"dark"}' }))).toBe('system')
    expect(readThemePreference(fakeStorage({ [THEME_STORAGE_KEY]: 'DARK' }))).toBe('system')
    expect(readThemePreference(fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }, { throwOnRead: true }))).toBe('system')
    expect(readThemePreference(fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark')
  })

  it('persists only the plain enum under its own key and removes it for system', () => {
    const storage = fakeStorage({ [PLAN_KEY]: '{"version":1}' })
    expect(writeThemePreference(storage, 'dark')).toBe(true)
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark')
    expect(writeThemePreference(storage, 'system')).toBe(true)
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false)
    expect(storage.data.get(PLAN_KEY)).toBe('{"version":1}')
    expect(writeThemePreference(null, 'dark')).toBe(false)
  })

  it('reports blocked writes without throwing', () => {
    const storage = fakeStorage({}, { throwOnWrite: true })
    expect(writeThemePreference(storage, 'light')).toBe(false)
    expect(clearThemePreference(storage)).toBe(false)
    expect(storage.data.size).toBe(0)
  })

  it('clearThemePreference removes only the theme key', () => {
    const storage = fakeStorage({ [PLAN_KEY]: 'plan', [THEME_STORAGE_KEY]: 'light' })
    expect(clearThemePreference(storage)).toBe(true)
    expect([...storage.data.keys()]).toEqual([PLAN_KEY])
  })
})

describe('theme store', () => {
  it('applies root attributes at creation from the stored preference', () => {
    const root = fakeRoot()
    const { matchMedia } = fakeMedia(false)
    const store = createThemeStore({ storage: fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }), matchMedia, root })
    expect(store.getSnapshot()).toEqual({ preference: 'dark', resolved: 'dark', systemDark: false })
    expect(root.attributes.get('data-theme')).toBe('dark')
    expect(root.attributes.get('data-theme-preference')).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('follows the OS scheme only while system is selected and someone is subscribed', () => {
    const root = fakeRoot()
    const { media, matchMedia } = fakeMedia(true)
    const store = createThemeStore({ storage: fakeStorage(), matchMedia, root })
    expect(media.queries).toEqual([DARK_SCHEME_QUERY])
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'dark', systemDark: true })
    expect(media.listeners.size).toBe(0)

    let notified = 0
    const unsubscribe = store.subscribe(() => { notified += 1 })
    expect(media.listeners.size).toBe(1)

    media.emit(false)
    expect(notified).toBe(1)
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'light', systemDark: false })
    expect(root.attributes.get('data-theme')).toBe('light')

    store.setPreference('dark')
    expect(notified).toBe(2)
    expect(media.listeners.size).toBe(0)
    media.emit(true)
    expect(notified).toBe(2)
    expect(store.getSnapshot()).toEqual({ preference: 'dark', resolved: 'dark', systemDark: false })

    store.setPreference('system')
    expect(media.listeners.size).toBe(1)
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'dark', systemDark: true })

    unsubscribe()
    expect(media.listeners.size).toBe(0)
  })

  it('keeps a stable snapshot identity until something changes', () => {
    const { matchMedia } = fakeMedia(false)
    const store = createThemeStore({ storage: fakeStorage(), matchMedia, root: fakeRoot() })
    const first = store.getSnapshot()
    expect(store.getSnapshot()).toBe(first)
    let notified = 0
    const unsubscribe = store.subscribe(() => { notified += 1 })
    expect(store.getSnapshot()).toBe(first)
    store.setPreference('system')
    expect(notified).toBe(0)
    expect(store.getSnapshot()).toBe(first)
    store.setPreference('light')
    expect(notified).toBe(1)
    expect(store.getSnapshot()).not.toBe(first)
    const second = store.getSnapshot()
    store.setPreference('light')
    expect(store.getSnapshot()).toBe(second)
    unsubscribe()
  })

  it('persists the choice beside existing plan data without touching it', () => {
    const storage = fakeStorage({ [PLAN_KEY]: '{"version":1,"stopIds":["bagbazar"]}' })
    const { matchMedia } = fakeMedia(false)
    const store = createThemeStore({ storage, matchMedia, root: fakeRoot() })
    store.setPreference('dark')
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark')
    expect(storage.data.get(PLAN_KEY)).toBe('{"version":1,"stopIds":["bagbazar"]}')
    store.setPreference('system')
    expect([...storage.data.keys()]).toEqual([PLAN_KEY])
    const reloaded = createThemeStore({ storage: fakeStorage({ ...Object.fromEntries(storage.data), [THEME_STORAGE_KEY]: 'dark' }), matchMedia, root: fakeRoot() })
    expect(reloaded.getSnapshot().resolved).toBe('dark')
  })

  it('still switches in memory when storage rejects writes or is unavailable', () => {
    const root = fakeRoot()
    const { matchMedia } = fakeMedia(false)
    const blocked = createThemeStore({ storage: fakeStorage({}, { throwOnWrite: true }), matchMedia, root })
    blocked.setPreference('dark')
    expect(blocked.getSnapshot().resolved).toBe('dark')
    expect(root.attributes.get('data-theme')).toBe('dark')

    const noStorage = createThemeStore({ storage: null, matchMedia: null, root: null })
    expect(noStorage.getSnapshot()).toEqual({ preference: 'system', resolved: 'light', systemDark: false })
    noStorage.setPreference('dark')
    expect(noStorage.getSnapshot().resolved).toBe('dark')
  })

  it('treats a throwing matchMedia as light-by-default', () => {
    const store = createThemeStore({
      storage: fakeStorage(),
      matchMedia: () => { throw new TypeError('matchMedia unsupported') },
      root: fakeRoot(),
    })
    expect(store.getSnapshot()).toEqual({ preference: 'system', resolved: 'light', systemDark: false })
  })

  it('applyThemeAttributes tolerates a missing root', () => {
    expect(() => applyThemeAttributes(null, { preference: 'light', resolved: 'light', systemDark: false })).not.toThrow()
  })
})
