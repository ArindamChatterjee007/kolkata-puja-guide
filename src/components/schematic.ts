import type { Coordinate } from '../types'
import { PLANNING_BOUNDS } from './uiState'

// Approximate Hooghly centreline through the planning area, north to south; schematic only.
const centreline: Coordinate[] = [
  { lat: 22.700, lng: 88.3690 }, { lat: 22.680, lng: 88.3660 }, { lat: 22.660, lng: 88.3585 },
  { lat: 22.640, lng: 88.3560 }, { lat: 22.620, lng: 88.3580 }, { lat: 22.605, lng: 88.3570 },
  { lat: 22.595, lng: 88.3520 }, { lat: 22.585, lng: 88.3470 }, { lat: 22.575, lng: 88.3440 },
  { lat: 22.567, lng: 88.3410 }, { lat: 22.556, lng: 88.3330 }, { lat: 22.545, lng: 88.3240 },
  { lat: 22.535, lng: 88.3050 }, { lat: 22.525, lng: 88.2850 }, { lat: 22.510, lng: 88.2680 },
  { lat: 22.490, lng: 88.2500 }, { lat: 22.470, lng: 88.2300 }, { lat: 22.450, lng: 88.2160 },
  { lat: 22.430, lng: 88.2070 }, { lat: 22.400, lng: 88.2020 },
]

const HALF_WIDTH_LNG = 0.0036

export const HOOGHLY_POLYGON: [number, number][] = [
  ...centreline.map((point) => [point.lat, Math.max(PLANNING_BOUNDS.west, point.lng - HALF_WIDTH_LNG)] as [number, number]),
  ...[...centreline].reverse().map((point) => [point.lat, point.lng + HALF_WIDTH_LNG] as [number, number]),
]

export const HOOGHLY_LABEL: [number, number] = [22.576, 88.344]

export const PLANNING_RECTANGLE: [[number, number], [number, number]] = [
  [PLANNING_BOUNDS.south, PLANNING_BOUNDS.west],
  [PLANNING_BOUNDS.north, PLANNING_BOUNDS.east],
]
