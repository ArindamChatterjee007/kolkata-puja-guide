import { useCallback, useEffect, useRef, useState } from 'react'
import type { Coordinate } from '../types'
import { isInPlanningArea } from '../components/uiState'

export interface DevicePosition extends Coordinate {
  accuracyMetres: number
  at: number
}

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'error'
export type LocationErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure' | 'outside'

function toSample(position: GeolocationPosition): DevicePosition {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyMetres: position.coords.accuracy,
    at: Number.isFinite(position.timestamp) ? position.timestamp : Date.now(),
  }
}

function errorKind(error: GeolocationPositionError): LocationErrorKind {
  if (error.code === error.PERMISSION_DENIED) return 'denied'
  if (error.code === error.TIMEOUT) return 'timeout'
  return 'unavailable'
}

function availability(): LocationErrorKind | null {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported'
  if (window.isSecureContext === false) return 'insecure'
  return null
}

// Device position lives only in component memory: never persisted, logged or shared.
export function useGeolocation() {
  const [position, setPosition] = useState<DevicePosition | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<LocationErrorKind | null>(null)
  const [watching, setWatching] = useState(false)
  const watchId = useRef<number | null>(null)
  const wantWatch = useRef(false)

  const clearNativeWatch = useCallback(() => {
    if (watchId.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
  }, [])

  const handleSample = useCallback((sample: DevicePosition) => {
    if (!isInPlanningArea(sample)) {
      setPosition(null)
      setStatus('error')
      setError('outside')
      return
    }
    setPosition(sample)
    setStatus('ready')
    setError(null)
  }, [])

  const startNativeWatch = useCallback(() => {
    if (watchId.current !== null || availability()) return
    watchId.current = navigator.geolocation.watchPosition(
      (next) => handleSample(toSample(next)),
      (failure) => {
        setStatus('error')
        setError(errorKind(failure))
        if (failure.code === failure.PERMISSION_DENIED) {
          wantWatch.current = false
          setWatching(false)
          clearNativeWatch()
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    )
  }, [clearNativeWatch, handleSample])

  const locateOnce = useCallback((): Promise<DevicePosition | null> => {
    const unavailable = availability()
    if (unavailable) {
      setStatus('error')
      setError(unavailable)
      return Promise.resolve(null)
    }
    setStatus('locating')
    setError(null)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (next) => {
          const sample = toSample(next)
          handleSample(sample)
          resolve(isInPlanningArea(sample) ? sample : null)
        },
        (failure) => {
          setStatus('error')
          setError(errorKind(failure))
          resolve(null)
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      )
    })
  }, [handleSample])

  const startWatch = useCallback(() => {
    const unavailable = availability()
    if (unavailable) {
      setStatus('error')
      setError(unavailable)
      return
    }
    wantWatch.current = true
    setWatching(true)
    if (document.visibilityState === 'visible') startNativeWatch()
  }, [startNativeWatch])

  const stopWatch = useCallback(() => {
    wantWatch.current = false
    setWatching(false)
    clearNativeWatch()
  }, [clearNativeWatch])

  const forget = useCallback(() => {
    stopWatch()
    setPosition(null)
    setStatus('idle')
    setError(null)
  }, [stopWatch])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') clearNativeWatch()
      else if (wantWatch.current) startNativeWatch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearNativeWatch()
    }
  }, [clearNativeWatch, startNativeWatch])

  return { position, status, error, watching, locateOnce, startWatch, stopWatch, forget }
}
