import { useSyncExternalStore } from 'react'
import { isUuid } from './api'

// Hash routes keep the page a single static file under `./`. Album and member ids are UUIDs (never names),
// so nothing in the URL can be used as a path. Invite tokens only ever appear in `#/join/<token>` and are
// read from the fragment: they are not sent as query strings, logged or persisted.

export type PhotoRoute =
  | { kind: 'albums' }
  | { kind: 'album'; albumId: string }
  | { kind: 'folder'; albumId: string; memberId: string }
  | { kind: 'join'; token: string | null }
  | { kind: 'unknown' }

export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

export const ALBUMS_HASH = '#/albums'

export function parseRoute(hash: string): PhotoRoute {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const path = raw.startsWith('/') ? raw.slice(1) : raw
  if (path === '' || path === 'albums' || path === 'albums/') return { kind: 'albums' }
  const parts = path.split('/').filter((part) => part !== '')
  if (parts[0] === 'a' && parts.length === 2 && isUuid(parts[1])) return { kind: 'album', albumId: parts[1].toLowerCase() }
  if (parts[0] === 'a' && parts.length === 4 && parts[2] === 'f' && isUuid(parts[1]) && isUuid(parts[3])) {
    return { kind: 'folder', albumId: parts[1].toLowerCase(), memberId: parts[3].toLowerCase() }
  }
  if (parts[0] === 'join') {
    const token = parts.length === 2 ? decodeURIComponentSafe(parts[1]) : ''
    return { kind: 'join', token: INVITE_TOKEN_PATTERN.test(token) ? token : null }
  }
  return { kind: 'unknown' }
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function routeHash(route: Exclude<PhotoRoute, { kind: 'join' } | { kind: 'unknown' }>): string {
  if (route.kind === 'albums') return ALBUMS_HASH
  if (route.kind === 'album') return `#/a/${route.albumId}`
  return `#/a/${route.albumId}/f/${route.memberId}`
}

export function navigate(route: Parameters<typeof routeHash>[0], options: { replace?: boolean } = {}): void {
  const hash = routeHash(route)
  if (options.replace) {
    // Replacing drops the current entry (for example a consumed invite fragment) from session history.
    window.location.replace(hash)
  } else {
    window.location.hash = hash
  }
}

let lastHash: string | null = null
let lastRoute: PhotoRoute = { kind: 'albums' }

function currentRoute(): PhotoRoute {
  const hash = window.location.hash
  if (hash !== lastHash) {
    lastHash = hash
    lastRoute = parseRoute(hash)
  }
  return lastRoute
}

const SERVER_ROUTE: PhotoRoute = { kind: 'albums' }

export function useRoute(): PhotoRoute {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('hashchange', callback)
      return () => window.removeEventListener('hashchange', callback)
    },
    currentRoute,
    () => SERVER_ROUTE,
  )
}
