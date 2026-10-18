import type { Language } from '../types'
import { photoLocale } from './i18n'

export const MAX_FILE_BYTES = 40_000_000
export const MAX_FILE_MB = 40
export const MAX_NAME_LENGTH = 40
export const MAX_TITLE_LENGTH = 80

// Browsers report '' for HEIC on many devices, so the extension decides the declared type; the server sniffs.
const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
}

export const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif'
/** Formats the browser itself can decode for previews and the lightbox; HEIC/HEIF stay download-only. */
export const BROWSER_RENDERABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

// Controls and invisible formatting characters are removed, but ZWJ/ZWNJ (U+200C/U+200D) stay because
// Bengali conjunct spelling depends on them.
const STRIP_PATTERN = /[\p{Cc}\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/gu

export function cleanLabel(raw: string, max: number): string {
  const cleaned = raw.normalize('NFC').replace(STRIP_PATTERN, '').replace(/\s+/g, ' ').trim()
  const points = [...cleaned]
  return points.length > max ? points.slice(0, max).join('').trim() : cleaned
}

export function labelLength(value: string): number {
  return [...value].length
}

export function validDisplayName(raw: string): string | null {
  const cleaned = raw.normalize('NFC').replace(STRIP_PATTERN, '').replace(/\s+/g, ' ').trim()
  const length = labelLength(cleaned)
  return length >= 1 && length <= MAX_NAME_LENGTH ? cleaned : null
}

export function validTitle(raw: string): string | null {
  const cleaned = raw.normalize('NFC').replace(STRIP_PATTERN, '').replace(/\s+/g, ' ').trim()
  const length = labelLength(cleaned)
  return length >= 1 && length <= MAX_TITLE_LENGTH ? cleaned : null
}

export function extensionOf(filename: string): string {
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(filename)
  return match ? match[1].toLowerCase() : ''
}

export function contentTypeFor(file: File): string | null {
  const declared = file.type.toLowerCase()
  if (ACCEPTED_TYPES.has(declared)) return declared
  const byExtension = EXTENSION_TYPES[extensionOf(file.name)]
  if (byExtension && (declared === '' || declared === 'application/octet-stream')) return byExtension
  return null
}

export type FileRejection = 'unsupported' | 'too-large' | 'empty'

export function rejectFile(file: File): FileRejection | null {
  if (!contentTypeFor(file)) return 'unsupported'
  if (file.size <= 0) return 'empty'
  if (file.size > MAX_FILE_BYTES) return 'too-large'
  return null
}

/** Filename shown in the UI: Unicode-normalised, control-free, never empty. */
export function displayFilename(raw: string): string {
  const cleaned = raw.normalize('NFC').replace(STRIP_PATTERN, '').replace(/[\\/]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || 'photo'
}

/** Filename handed to the browser download attribute; path separators and reserved characters removed. */
export function downloadFilename(raw: string, contentType: string): string {
  let name = displayFilename(raw).replace(/[<>:"|?*]/g, '').replace(/^\.+/, '').trim()
  if (!name || name === 'photo') name = 'photo'
  if (!extensionOf(name)) {
    const extension = Object.entries(EXTENSION_TYPES).find(([, type]) => type === contentType)?.[0]
    if (extension) name = `${name}.${extension}`
  }
  return name.slice(0, 180)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  const first = [...parts[0]][0] ?? ''
  const second = parts.length > 1 ? [...parts[parts.length - 1]][0] ?? '' : ''
  return (first + second).toUpperCase()
}

export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 4)
}

/** Trims to at most `maxBytes` of UTF-8 without splitting a code point (server filename cap is 255 bytes). */
export function limitUtf8(value: string, maxBytes: number): string {
  const encoder = new TextEncoder()
  if (encoder.encode(value).length <= maxBytes) return value
  const extension = extensionOf(value)
  const suffix = extension ? `.${extension}` : ''
  const stem = extension ? value.slice(0, -suffix.length) : value
  let out = ''
  for (const point of stem) {
    if (encoder.encode(out + point + suffix).length > maxBytes) break
    out += point
  }
  return (out || 'photo') + suffix
}

/** Members who chose the same name get a readable id suffix so folders stay distinguishable. */
export function folderLabels(members: readonly { id: string; displayName: string }[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const member of members) {
    const key = member.displayName.toLocaleLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const labels = new Map<string, string>()
  for (const member of members) {
    const duplicate = (counts.get(member.displayName.toLocaleLowerCase()) ?? 0) > 1
    labels.set(member.id, duplicate ? `${member.displayName} · ${shortId(member.id)}` : member.displayName)
  }
  return labels
}

export function formatNumber(language: Language, value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(photoLocale(language), { maximumFractionDigits }).format(value)
}

export function formatBytes(language: Language, bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${formatNumber(language, bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${formatNumber(language, value, value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`
}

export function formatDateTime(language: Language, iso: string | null): string {
  if (!iso) return '—'
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return '—'
  return new Intl.DateTimeFormat(photoLocale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

export function percent(loaded: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.floor((loaded / total) * 100)))
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function secureContextAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined' && typeof crypto.subtle.digest === 'function'
}
