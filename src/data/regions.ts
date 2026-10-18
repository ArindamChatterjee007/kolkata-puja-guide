import type { City, Coordinate, JourneyStop, Landmark, Pandal } from '../types'
import { PANDALS, START_POINTS } from './pandals'
import { PLACE_INSIGHTS } from './placeInsights'
import { REGIONAL_PLACES, REGIONAL_SELECTION } from './regionalPlaces'
import type { UnlocatedPujaLead } from './regionalPlaces'
import { CITY_CHECKIN_BOUNDS } from '../domain/checkin'
import { isCoordinate } from '../domain/geo'

export type Area = City | 'all'
export const GUIDE_BOUNDS = Object.freeze({ south: 22.4, north: 23.9, west: 86.8, east: 88.55 })
export const REGIONS = [
  { id: 'kolkata', name: 'Kolkata', nameBn: 'কলকাতা', bounds: { south: 22.4, north: 22.7, west: 88.2, east: 88.55 } },
  { id: 'asansol', name: 'Asansol', nameBn: 'আসানসোল', bounds: { south: 23.58, north: 23.83, west: 86.81, east: 87.11 } },
  { id: 'durgapur', name: 'Durgapur', nameBn: 'দুর্গাপুর', bounds: { south: 23.43, north: 23.67, west: 87.2, east: 87.46 } },
] as const

export const ALL_PLACES: JourneyStop[] = [
  ...PANDALS.map((pandal) => ({ ...pandal, city: 'kolkata' as const, kind: 'pandal' as const })),
  ...REGIONAL_PLACES,
]
export const BROWSABLE_PLACES = ALL_PLACES.filter((place) => place.city === 'kolkata' || place.kind !== 'pandal'
  || REGIONAL_SELECTION[place.id]?.eligibleMain === true)
export const CURATED_PLACES = BROWSABLE_PLACES
export const PLACE_BY_ID = new Map(ALL_PLACES.map((place) => [place.id, place]))
export const ALL_START_POINTS: Landmark[] = [...START_POINTS,
  ...REGIONAL_PLACES.filter((place) => place.city !== 'kolkata').map((place) => ({
    id: `start-${place.id}`, name: place.name, nameBn: place.nameBn, lat: place.lat, lng: place.lng,
  })),
]

export function isInGuideCoverage(point: Coordinate): boolean {
  return isCoordinate(point) && point.lat >= GUIDE_BOUNDS.south && point.lat <= GUIDE_BOUNDS.north
    && point.lng >= GUIDE_BOUNDS.west && point.lng <= GUIDE_BOUNDS.east
}

export function cityForCoordinate(point: Coordinate): City | null {
  if (!isCoordinate(point)) return null
  return REGIONS.find((region) => {
    const bounds = CITY_CHECKIN_BOUNDS[region.id]
    return point.lat >= bounds.minLat && point.lat <= bounds.maxLat && point.lng >= bounds.minLng && point.lng <= bounds.maxLng
  })?.id ?? null
}

export function areaCorners(area: Area): Coordinate[] {
  const bounds = area === 'all' ? GUIDE_BOUNDS : REGIONS.find((region) => region.id === area)!.bounds
  return [{ lat: bounds.south, lng: bounds.west }, { lat: bounds.north, lng: bounds.east }]
}

export function hasCrowdModel(place: JourneyStop): place is Pandal {
  return place.kind !== 'restaurant' && place.kind !== 'sight' && [1, 2, 3].includes(place.popularity ?? 0)
    && ['North', 'Central', 'South', 'Salt Lake', 'New Town', 'Behala'].includes(place.zone ?? '')
}

export function isEditorPick(place: JourneyStop): boolean {
  const insight = PLACE_INSIGHTS[place.id]
  return insight?.recommendationLabel === 'Editor pick' && Boolean(insight.featuredReason)
}

export function createManualPlace(lead: UnlocatedPujaLead, point: Coordinate, now: number): JourneyStop {
  if (!isInGuideCoverage(point) || !Number.isSafeInteger(now) || now < 0) throw new RangeError('Choose a point inside the mapped area')
  return { id: `manual-${lead.id}-${now}`, city: lead.city, kind: 'pandal', name: lead.name, nameBn: lead.nameBn,
    lat: point.lat, lng: point.lng, address: lead.address ?? lead.name,
    description: lead.locationNote, descriptionBn: lead.locationNote,
    highlight: 'User-pinned location; unverified, this session only', highlightBn: 'নিজের বাছা অবস্থান; যাচাই হয়নি, শুধু এই সেশনে',
    visitMinutes: 30, sourceUrl: lead.sourceUrl, sourceLabel: 'Reported puja; location chosen by you',
    verifiedOn: lead.checkedAt.slice(0, 10), coordinateAccuracy: 'approximate' }
}