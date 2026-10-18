import { describe, expect, it } from 'vitest'
import { bearingDegrees, HEADING_MIN_MOVE_METRES, nextVehicleHeading, validHeading, VEHICLE_ANIMATION_MAX_MS,
  VEHICLE_ANIMATION_MIN_MS, vehicleAnimationMs } from '../../src/components/vehicle'
import type { DevicePosition } from '../../src/hooks/useGeolocation'

const at = Date.parse('2026-10-18T04:30:00Z')
const home: DevicePosition = { lat: 23.5021, lng: 87.1512, accuracyMetres: 12, at, heading: null, speed: null }

describe('vehicle heading and motion helpers', () => {
  it('accepts only finite compass headings between 0 and 360', () => {
    expect(validHeading(90)).toBe(90)
    expect(validHeading(360)).toBe(0)
    for (const invalid of [NaN, -1, 361, Infinity, '90', null, undefined]) expect(validHeading(invalid)).toBeNull()
  })

  it('computes initial bearings for the four cardinal moves and rejects degenerate input', () => {
    expect(bearingDegrees(home, { lat: home.lat + 0.01, lng: home.lng })).toBeCloseTo(0, 3)
    expect(bearingDegrees(home, { lat: home.lat, lng: home.lng + 0.01 })).toBeCloseTo(90, 0)
    expect(bearingDegrees(home, { lat: home.lat - 0.01, lng: home.lng })).toBeCloseTo(180, 3)
    expect(bearingDegrees(home, { lat: home.lat, lng: home.lng - 0.01 })).toBeCloseTo(270, 0)
    expect(bearingDegrees(home, home)).toBeNull()
    expect(bearingDegrees(home, { lat: NaN, lng: 87 })).toBeNull()
  })

  it('never invents a heading for a stationary or jittering device', () => {
    expect(nextVehicleHeading(null, home)).toBeNull()
    expect(nextVehicleHeading(home, { ...home, at: at + 5_000 })).toBeNull()
    const jitter = { ...home, lat: home.lat + 0.00005, at: at + 5_000 }
    expect(nextVehicleHeading(home, jitter)).toBeNull()
    expect(nextVehicleHeading(home, { ...home, lat: home.lat + 0.01, at: at - 1 })).toBeNull()
    const noisy = { ...home, accuracyMetres: 150, lat: home.lat + 0.0005, at: at + 5_000 }
    expect(nextVehicleHeading({ ...home, accuracyMetres: 150 }, noisy)).toBeNull()
  })

  it('derives a bearing from genuine movement and prefers a valid reported heading while moving', () => {
    const east = { ...home, lng: home.lng + 0.004, at: at + 10_000 }
    expect(nextVehicleHeading(home, east)).toBeCloseTo(90, 0)
    expect(HEADING_MIN_MOVE_METRES).toBe(25)
    expect(nextVehicleHeading(home, { ...east, heading: 45, speed: 8 })).toBe(45)
    expect(nextVehicleHeading(home, { ...east, heading: 45, speed: 0 })).toBeCloseTo(90, 0)
    expect(nextVehicleHeading(home, { ...home, at: at + 10_000, heading: 200, speed: null })).toBe(200)
    expect(nextVehicleHeading(home, { ...home, at: at + 10_000, heading: 400, speed: 5 })).toBeNull()
  })

  it('animates between 120 ms and 900 ms by distance and jumps under reduced motion', () => {
    expect(vehicleAnimationMs(0, false)).toBe(0)
    expect(vehicleAnimationMs(5, false)).toBe(VEHICLE_ANIMATION_MIN_MS)
    expect(vehicleAnimationMs(100, false)).toBe(400)
    expect(vehicleAnimationMs(5_000, false)).toBe(VEHICLE_ANIMATION_MAX_MS)
    expect(vehicleAnimationMs(100, true)).toBe(0)
    expect(vehicleAnimationMs(NaN, false)).toBe(0)
  })
})
