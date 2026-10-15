import type { Coordinate, CrowdReport, Language, Pace, Pandal, TravelPreference, Visit } from '../types'
import { haversineMetres } from '../domain/geo'
import type { LegEstimate } from '../domain/travel'
import type { RoutePlan } from '../domain/route'
import { REPORT_TTL_MS } from '../domain/crowd'
import { formatNumber, formatRangeDigits, preferenceLabel, t } from '../i18n'

export const PLANNING_BOUNDS = Object.freeze({
  south: 22.40, north: 22.70, west: 88.20, east: 88.56,
})

export function isInPlanningArea(point: Coordinate): boolean {
  return point.lat >= PLANNING_BOUNDS.south && point.lat <= PLANNING_BOUNDS.north
    && point.lng >= PLANNING_BOUNDS.west && point.lng <= PLANNING_BOUNDS.east
}

// Folds common Bengali-to-Latin spelling variants (Sovabazar/Shobhabazar, Kumartuli/Kumortuli).
export function foldLatin(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/sh|chh/g, 's').replace(/bh/g, 'b').replace(/ph/g, 'p').replace(/th/g, 't')
    .replace(/dh/g, 'd').replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/ch/g, 'c').replace(/jh/g, 'j')
    .replace(/[vw]/g, 'b').replace(/[aou]/g, 'a').replace(/[eiy]/g, 'i')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/\s+/g, ' ').trim()
}

export function matchesPandal(pandal: Pandal, query: string, zoneLabelBn: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  const bengali = trimmed.normalize('NFC')
  if (/[\u0980-\u09FF]/.test(bengali)) {
    return [pandal.nameBn, pandal.highlightBn, pandal.descriptionBn, zoneLabelBn]
      .some((field) => field.normalize('NFC').includes(bengali))
  }
  const folded = foldLatin(trimmed)
  if (!folded) return true
  const haystack = foldLatin([pandal.name, pandal.address, pandal.highlight, pandal.zone, pandal.id].join(' '))
  return folded.split(' ').every((word) => haystack.includes(word))
}

export type SortMode = 'zone' | 'name' | 'nearest' | 'popular'

const zoneOrder = ['North', 'Central', 'South', 'Behala', 'Salt Lake', 'New Town']

export function sortPandals(
  pandals: readonly Pandal[], mode: SortMode, language: Language, origin: Coordinate | null,
): Pandal[] {
  const name = (pandal: Pandal) => (language === 'bn' ? pandal.nameBn : pandal.name)
  const byName = (a: Pandal, b: Pandal) => name(a).localeCompare(name(b), language === 'bn' ? 'bn' : 'en')
  const list = [...pandals]
  if (mode === 'name') return list.sort(byName)
  if (mode === 'popular') return list.sort((a, b) => b.popularity - a.popularity || byName(a, b))
  if (mode === 'nearest' && origin) {
    return list.sort((a, b) => haversineMetres(origin, a) - haversineMetres(origin, b) || byName(a, b))
  }
  return list.sort((a, b) => zoneOrder.indexOf(a.zone) - zoneOrder.indexOf(b.zone) || byName(a, b))
}

export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list]
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(target, 0, item)
  return copy
}

export function nextPendingStopId(stopIds: readonly string[], visits: readonly Visit[]): string | null {
  const visited = new Set(visits.map((visit) => visit.pandalId))
  return stopIds.find((id) => !visited.has(id)) ?? null
}

// Visited stops keep their relative position ahead of the optimizer's pending order.
export function applyOptimizedOrder(stopIds: readonly string[], plan: RoutePlan): string[] {
  const pending = new Set(plan.orderedIds)
  const kept = stopIds.filter((id) => !pending.has(id))
  return [...kept, ...plan.orderedIds.filter((id) => stopIds.includes(id))]
}

export interface PlanSettings {
  preference: TravelPreference
  pace: Pace
  availableMinutes: number
  originKey: string
  departureKey: string
}

export interface PlanSnapshot {
  plan: RoutePlan
  orderKey: string
  settingsKey: string
  visitedKey: string
  reportsKey: string
  createdAt: number
}

export function orderKey(stopIds: readonly string[]): string {
  return stopIds.join(',')
}

export function settingsKey(settings: PlanSettings): string {
  return [settings.preference, settings.pace, settings.availableMinutes, settings.originKey, settings.departureKey].join('|')
}

export function visitedKey(stopIds: readonly string[], visits: readonly Visit[]): string {
  const visited = new Set(visits.map((visit) => visit.pandalId))
  return stopIds.filter((id) => visited.has(id)).sort().join(',')
}

export function reportsKey(stopIds: readonly string[], reports: readonly CrowdReport[]): string {
  const selected = new Set(stopIds)
  return JSON.stringify(reports.filter((report) => selected.has(report.pandalId))
    .sort((first, second) => first.pandalId.localeCompare(second.pandalId)
      || first.level.localeCompare(second.level) || first.reportedAt - second.reportedAt)
    .map((report) => [report.pandalId, report.level, report.reportedAt]))
}

export type PlanFreshness = 'none' | 'fresh' | 'visits-changed' | 'changed'

export function planFreshness(
  snapshot: PlanSnapshot | null, stopIds: readonly string[], visits: readonly Visit[], settings: PlanSettings,
  reports: readonly CrowdReport[],
): PlanFreshness {
  if (!snapshot) return 'none'
  if (snapshot.orderKey !== orderKey(stopIds) || snapshot.settingsKey !== settingsKey(settings)
    || snapshot.reportsKey !== reportsKey(stopIds, reports)) return 'changed'
  if (snapshot.visitedKey !== visitedKey(stopIds, visits)) return 'visits-changed'
  return 'fresh'
}

export function explainLeg(
  language: Language, leg: LegEstimate, alternatives: readonly LegEstimate[], preference: TravelPreference,
): string {
  const walk = alternatives.find((option) => option.mode === 'walk')
  const metro = alternatives.find((option) => option.mode === 'metro')
  if (leg.mode === 'road') return t(language, 'whyRoad')
  if (leg.mode === 'metro') {
    const saved = walk ? walk.walkMetres - leg.walkMetres : 0
    if (saved >= 200 && walk) {
      return t(language, 'whyMetroSaves', {
        m: formatNumber(language, Math.round(saved / 100) * 100),
        walk: formatRangeDigits(language, walk.durationMinutes),
      })
    }
    return t(language, 'whyMetroFaster')
  }
  if (preference === 'walk' && metro) return t(language, 'whyPreference', { pref: preferenceLabel(language, preference) })
  return t(language, metro ? 'whyWalkShort' : 'whyWalkOnly')
}

export type DirectionsMode = 'walking' | 'transit' | 'driving'

export function directionsUrl(destination: Coordinate, origin: Coordinate | null, mode: DirectionsMode): string {
  const params = new URLSearchParams({ api: '1', travelmode: mode })
  params.set('destination', `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`)
  if (origin) params.set('origin', `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export const NAVIGATION_QUERY_LIMIT = 200

export function navigationQuery(value: string): string {
  return value.trim().slice(0, NAVIGATION_QUERY_LIMIT).trim()
}

function navigationTarget(value: Coordinate | string): string | null {
  if (typeof value === 'string') return navigationQuery(value) || null
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)
    || Math.abs(value.lat) > 90 || Math.abs(value.lng) > 180) return null
  return `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`
}

export function navigationUrl(
  destination: Coordinate | string, origin: Coordinate | string | null = null, mode: DirectionsMode = 'walking',
): string | null {
  const target = navigationTarget(destination)
  const start = origin === null ? null : navigationTarget(origin)
  if (!target || (origin !== null && !start)) return null
  const params = new URLSearchParams({ api: '1', destination: target, travelmode: mode })
  if (start) params.set('origin', start)
  if (origin === null && mode !== 'transit') params.set('dir_action', 'navigate')
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function navigationMode(leg: LegEstimate | undefined, freshness: PlanFreshness): DirectionsMode {
  if (freshness !== 'fresh' || !leg) return 'walking'
  return leg.mode === 'metro' ? 'transit' : leg.mode === 'road' ? 'driving' : 'walking'
}

const SHARE_HASH = /^#plan=[A-Za-z0-9_.,%+=&-]*$/

export function buildShareUrl(location: { origin: string, pathname: string }, hash: string): string | null {
  if (!hash || !SHARE_HASH.test(hash)) return null
  return `${location.origin}${location.pathname}${hash}`
}

export function reportTimeLeftMs(report: CrowdReport | undefined, now: number): number {
  if (!report) return 0
  return Math.max(0, report.reportedAt + REPORT_TTL_MS - now)
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1_000

export interface DepartureOption {
  value: string
  timestamp: number
  istHour: number
  tomorrow: boolean
}

export function departureOptions(now: number, hours: readonly number[] = [10, 12, 14, 16, 17, 18, 19, 20, 21, 22]): DepartureOption[] {
  const shifted = new Date(now + IST_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  return hours.map((hour) => {
    let timestamp = Date.UTC(year, month, day, hour) - IST_OFFSET_MS
    let tomorrow = false
    if (timestamp < now + 5 * 60_000) {
      timestamp += 24 * 60 * 60 * 1_000
      tomorrow = true
    }
    return { value: `h${hour}`, timestamp, istHour: hour, tomorrow }
  })
}

export function resolveDeparture(value: string, now: number): number {
  if (value === 'now') return now
  return departureOptions(now).find((option) => option.value === value)?.timestamp ?? now
}

export function clampStops(stopIds: readonly string[], knownIds: ReadonlySet<string>, max = 12): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of stopIds) {
    if (knownIds.has(id) && !seen.has(id) && result.length < max) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}
