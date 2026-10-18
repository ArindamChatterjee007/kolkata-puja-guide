export interface Coordinate {
  lat: number
  lng: number
}

export type Zone = 'North' | 'Central' | 'South' | 'Salt Lake' | 'New Town' | 'Behala'
export type City = 'kolkata' | 'asansol' | 'durgapur'
export type StopKind = 'pandal' | 'restaurant' | 'sight'
export type Transport = 'personal' | 'public' | 'walk'

export interface Pandal extends Coordinate {
  id: string
  city?: City
  kind?: 'pandal'
  name: string
  nameBn: string
  zone: Zone
  address: string
  description: string
  descriptionBn: string
  highlight: string
  highlightBn: string
  popularity: 1 | 2 | 3
  visitMinutes: number
  nearestMetro?: string
  sourceUrl: string
  sourceLabel: string
  verifiedOn: string
  coordinateAccuracy: 'approximate'
  featured?: boolean
}

export interface JourneyStop extends Omit<Pandal, 'zone' | 'popularity' | 'kind'> {
  zone?: string
  kind?: StopKind
  popularity?: 1 | 2 | 3
  queueMinutes?: MinuteRange
}

export interface MetroStation extends Coordinate {
  id: string
  name: string
  nameBn: string
  line: 'blue' | 'green'
  order: number
}

export type TravelPreference = 'balanced' | 'walk' | 'less-walking'
export type Pace = 'relaxed' | 'steady'
export type Language = 'en' | 'bn'
export type CrowdLevel = 'light' | 'moderate' | 'heavy'

export interface CrowdReport {
  pandalId: string
  level: CrowdLevel
  reportedAt: number
}

export interface Visit {
  pandalId: string
  at: number
  method: 'manual' | 'auto'
}

export interface MinuteRange {
  min: number
  max: number
}

export interface NamedCoordinate extends Coordinate {
  name: string
}

export interface Landmark extends NamedCoordinate {
  id: string
  nameBn?: string
}