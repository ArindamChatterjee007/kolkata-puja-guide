import { PhotoApi } from './api'
import type { AlbumMembership } from './api'
import { PhotoAuth } from './auth'
import type { ResolvedBackend } from './config'
import { PreviewCache } from './previews'

export interface PhotoServices {
  backend: ResolvedBackend
  auth: PhotoAuth
  api: PhotoApi
  previews: PreviewCache
  /** Album id -> own membership, filled from list/create/join responses for this page session only. */
  memberships: Map<string, AlbumMembership>
}

export function createServices(backend: ResolvedBackend): PhotoServices {
  const auth = new PhotoAuth(backend)
  const api = new PhotoApi(backend, auth)
  return { backend, auth, api, previews: new PreviewCache(api), memberships: new Map() }
}
