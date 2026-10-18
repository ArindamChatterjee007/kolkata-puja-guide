// Public backend coordinates for Trip albums. Only the project URL and the public anon key ever reach the
// browser; both are public by design (row access is enforced server-side). Astra supplies them either as
// build-time env (VITE_PHOTO_SUPABASE_URL / VITE_PHOTO_SUPABASE_ANON_KEY) or as an optional module
// `src/photos/backend-config.ts` exporting `photoBackendConfig`. When neither exists the page renders the
// "storage not connected" state and never issues a request.

export interface PhotoBackendConfig {
  url: string
  anonKey: string
  /** Optional override; defaults to `${url}/functions/v1/trip-photos`. */
  functionsUrl?: string
}

export interface ResolvedBackend {
  /** `https://<ref>.supabase.co` without a trailing slash. */
  origin: string
  /** Edge-function base, e.g. `https://<ref>.supabase.co/functions/v1/trip-photos`. */
  apiBase: string
  /** GoTrue base, e.g. `https://<ref>.supabase.co/auth/v1`. */
  authBase: string
  anonKey: string
}

export type BackendState = { status: 'unconfigured' } | { status: 'ready'; backend: ResolvedBackend }

type OptionalConfigModule = { photoBackendConfig?: unknown; default?: unknown }

const optionalModules = import.meta.glob<OptionalConfigModule>('./backend-config.ts', { eager: true })

function asConfig(candidate: unknown): PhotoBackendConfig | null {
  if (!candidate || typeof candidate !== 'object') return null
  const record = candidate as Record<string, unknown>
  const url = typeof record.url === 'string' ? record.url.trim() : ''
  const anonKey = typeof record.anonKey === 'string' ? record.anonKey.trim() : ''
  if (!url || !anonKey) return null
  const functionsUrl = typeof record.functionsUrl === 'string' && record.functionsUrl.trim() ? record.functionsUrl.trim() : undefined
  return { url, anonKey, functionsUrl }
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function httpsOrigin(raw: string): URL | null {
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return null
    return parsed
  } catch {
    return null
  }
}

export function resolveBackendConfig(config: PhotoBackendConfig | null): BackendState {
  if (!config) return { status: 'unconfigured' }
  const base = httpsOrigin(config.url)
  if (!base) return { status: 'unconfigured' }
  const origin = stripSlash(base.href)
  const functions = config.functionsUrl ? httpsOrigin(config.functionsUrl) : null
  if (config.functionsUrl && !functions) return { status: 'unconfigured' }
  // The anon key is a JWT-shaped public string; anything else is a misconfiguration, not a secret to try.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(config.anonKey) && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.anonKey)) {
    return { status: 'unconfigured' }
  }
  return {
    status: 'ready',
    backend: {
      origin,
      apiBase: functions ? stripSlash(functions.href) : `${origin}/functions/v1/trip-photos`,
      authBase: `${origin}/auth/v1`,
      anonKey: config.anonKey,
    },
  }
}

function fromEnvironment(): PhotoBackendConfig | null {
  const env = import.meta.env as Record<string, unknown>
  return asConfig({
    url: env.VITE_PHOTO_SUPABASE_URL,
    anonKey: env.VITE_PHOTO_SUPABASE_ANON_KEY,
    functionsUrl: env.VITE_PHOTO_FUNCTIONS_URL,
  })
}

function fromOptionalModule(): PhotoBackendConfig | null {
  for (const module of Object.values(optionalModules)) {
    const config = asConfig(module.photoBackendConfig) ?? asConfig(module.default)
    if (config) return config
  }
  return null
}

let cached: BackendState | null = null

export function backendState(): BackendState {
  cached ??= resolveBackendConfig(fromEnvironment() ?? fromOptionalModule())
  return cached
}
