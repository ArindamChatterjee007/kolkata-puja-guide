import { createClient, isAuthApiError } from '@supabase/supabase-js'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { ResolvedBackend } from './config'

// Anonymous device session for Trip albums through the official SDK. The client is created once per page
// with a photos-specific storage key so it never touches planner state; URL fragments are never parsed for
// sessions (invite tokens live there). Tokens stay inside the SDK's storage and are never logged.

export const PHOTO_AUTH_STORAGE_KEY = 'kolkata-puja-guide:photos:auth:v1'
// Non-secret marker that a session once existed here, so a lost session can be explained to the visitor.
export const PHOTO_SESSION_MARKER_KEY = 'kolkata-puja-guide:photos:session-marker:v1'

export type AuthErrorKind = 'network' | 'anonymous-disabled' | 'session-lost' | 'rate-limited' | 'captcha' | 'server' | 'bad-response'

export class AuthError extends Error {
  readonly kind: AuthErrorKind
  readonly status: number

  constructor(kind: AuthErrorKind, status = 0) {
    super(`auth:${kind}`)
    this.name = 'AuthError'
    this.kind = kind
    this.status = status
  }
}

export interface AuthSnapshot {
  signedIn: boolean
  userId: string | null
  /** True when a session existed on this device before but is missing now. */
  lostEarlierSession: boolean
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Synchronous first look at the SDK's persisted session so the first render already knows the state. */
function storedUserId(): string | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(PHOTO_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { user?: { id?: unknown } | null; refresh_token?: unknown }
    return parsed && typeof parsed.refresh_token === 'string' && parsed.user && typeof parsed.user.id === 'string' ? parsed.user.id : null
  } catch {
    return null
  }
}

function hadSessionBefore(): boolean {
  try {
    return storage()?.getItem(PHOTO_SESSION_MARKER_KEY) === '1'
  } catch {
    return false
  }
}

function markSession(): void {
  try {
    storage()?.setItem(PHOTO_SESSION_MARKER_KEY, '1')
  } catch {
    // Private windows: the marker simply is not kept.
  }
}

function mapAuthError(error: unknown): AuthError {
  if (isAuthApiError(error)) {
    const code = error.code ?? ''
    if (code === 'anonymous_provider_disabled' || code === 'signup_disabled') return new AuthError('anonymous-disabled', error.status)
    if (code === 'captcha_failed') return new AuthError('captcha', error.status)
    if (error.status === 429 || code === 'over_request_rate_limit') return new AuthError('rate-limited', error.status)
    if (error.status === 400 || error.status === 401 || error.status === 403) return new AuthError('session-lost', error.status)
    return new AuthError('server', error.status)
  }
  return new AuthError('network')
}

export class PhotoAuth {
  private readonly client: SupabaseClient
  private readonly lostEarlier: boolean
  private readonly listeners = new Set<() => void>()
  private snapshot: AuthSnapshot
  private validated = false

  constructor(backend: ResolvedBackend) {
    this.client = createClient(backend.origin, backend.anonKey, {
      auth: {
        storageKey: PHOTO_AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }) },
    })
    const userId = storedUserId()
    this.lostEarlier = userId === null && hadSessionBefore()
    this.snapshot = { signedIn: userId !== null, userId, lostEarlierSession: this.lostEarlier }
    this.client.auth.onAuthStateChange((_event, session) => {
      // Only state is updated here; calling auth methods inside this callback is unsupported by the SDK.
      this.apply(session)
    })
  }

  private apply(session: Session | null): void {
    const userId = session?.user?.id ?? null
    if (userId) markSession()
    const next: AuthSnapshot = { signedIn: userId !== null, userId, lostEarlierSession: this.lostEarlier && userId === null }
    if (next.signedIn === this.snapshot.signedIn && next.userId === this.snapshot.userId && next.lostEarlierSession === this.snapshot.lostEarlierSession) return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): AuthSnapshot => this.snapshot

  get signedIn(): boolean {
    return this.snapshot.signedIn
  }

  get userId(): string | null {
    return this.snapshot.userId
  }

  /** Explicit anonymous sign-in: only called when the visitor creates or joins an album. */
  async signInAnonymously(): Promise<void> {
    if (this.snapshot.signedIn) return
    const { data, error } = await this.client.auth.signInAnonymously()
    if (error) throw mapAuthError(error)
    if (!data.session) throw new AuthError('bad-response')
    this.validated = true
    this.apply(data.session)
  }

  /** Returns a valid bearer token; the SDK refreshes it when expired. The first use revalidates with the server. */
  async accessToken(): Promise<string> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw mapAuthError(error)
    const session = data.session
    if (!session) {
      this.apply(null)
      throw new AuthError('session-lost')
    }
    if (!this.validated) {
      const check = await this.client.auth.getUser(session.access_token)
      if (check.error) {
        const mapped = mapAuthError(check.error)
        if (mapped.kind === 'session-lost') {
          await this.dropLocalSession()
          throw mapped
        }
        // Transient failures leave the stored session alone; the gateway re-validates every request anyway.
      } else {
        this.validated = true
      }
    }
    return session.access_token
  }

  private async dropLocalSession(): Promise<void> {
    this.validated = false
    try {
      await this.client.auth.signOut({ scope: 'local' })
    } catch {
      // Storage already gone; the snapshot below is authoritative for the UI.
    }
    this.apply(null)
  }

  /** The gateway rejected the token: drop it locally so the UI offers to rejoin instead of retrying blindly. */
  invalidate(): void {
    void this.dropLocalSession()
  }
}
