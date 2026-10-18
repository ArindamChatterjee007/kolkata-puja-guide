import { useEffect, useRef, useState } from 'react'
import type { JourneyStop, Landmark, Visit } from '../types'
import { arriveAtStop, completeTrip, createTrip, endTripBreak, leaveStop, pauseTrip, resumeTrip,
  skipTripBreak, startTrip, startTripBreak, unvisitTripStop } from '../domain/trip'
import type { TripHome, TripState } from '../domain/trip'
import { defaultTripSettings, parseTripSettings, resolveStoredHome, restoreStoredTrip, saveTripSettings,
  snapshotTripSettings, TRIP_STORAGE_KEY } from '../domain/tripStorage'
import type { TripSettings } from '../domain/tripStorage'

export class ArrivalSound {
  private readonly createContext: () => AudioContext
  private context: AudioContext | null = null
  private played = new Set<string>()
  private ready = false

  constructor(createContext: () => AudioContext = () => new AudioContext()) { this.createContext = createContext }

  async unlock(): Promise<boolean> {
    try {
      this.context ??= this.createContext()
      await this.context.resume()
      this.ready = this.context.state === 'running'
    } catch {
      this.ready = false
    }
    return this.ready
  }

  play(key: string, enabled: boolean): boolean {
    if (this.played.has(key)) return false
    this.played.add(key)
    if (!enabled || !this.ready || this.context?.state !== 'running') return false
    try {
      const context = this.context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const time = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(740, time)
      oscillator.frequency.linearRampToValueAtTime(990, time + 0.12)
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.045, time + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(time)
      oscillator.stop(time + 0.24)
      return true
    } catch {
      this.ready = false
      return false
    }
  }

  dispose() {
    void this.context?.close().catch(() => {})
    this.context = null
    this.ready = false
  }
}

interface Session {
  settings: TripSettings
  home: TripHome | null
  trip: TripState | null
  armed: boolean
  needsResume: boolean
}

// A legacy plan start is only a manual alternative: home stays unset until the user chooses it (or a saved TripHome exists).
function initialSession(landmarks: readonly Landmark[]): Session {
  let settings = defaultTripSettings()
  try {
    settings = parseTripSettings(window.localStorage.getItem(TRIP_STORAGE_KEY), landmarks, Date.now()) ?? settings
  } catch { /* Storage is optional. */ }
  const home = resolveStoredHome(settings.home, landmarks)
  const trip = restoreStoredTrip(settings, home, Date.now())
  return { settings, home, trip, armed: false,
    needsResume: settings.checkpoint?.status === 'running' || settings.checkpoint?.status === 'paused' }
}

export function useTripSession(landmarks: readonly Landmark[]) {
  const [session, setSession] = useState(() => initialSession(landmarks))
  const latest = useRef(session)
  latest.current = session
  const sound = useRef<ArrivalSound | null>(null)
  const [soundUnavailable, setSoundUnavailable] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const skipSave = useRef(false)

  function commit(next: Session) {
    latest.current = next
    setSession(next)
  }

  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return }
    try {
      setStorageError(saveTripSettings(window.localStorage,
        snapshotTripSettings(session.settings, session.home, session.trip), landmarks, Date.now()))
    } catch {
      setStorageError('Trip settings could not be saved on this device.')
    }
  }, [session.settings, session.home, session.trip, landmarks])

  useEffect(() => () => { sound.current?.dispose(); sound.current = null }, [])

  function updateSettings(change: Partial<Omit<TripSettings, 'version' | 'home' | 'checkpoint'>>) {
    const current = latest.current
    const settings = { ...current.settings, ...change }
    const trip = change.transport && current.trip
      ? { ...current.trip, transport: change.transport, updatedAt: Math.max(Date.now(), current.trip.updatedAt) } : current.trip
    commit({ ...current, settings, trip, armed: current.armed && settings.autoArrival })
  }

  async function unlockSound() {
    sound.current ??= new ArrivalSound()
    const unlocked = await sound.current.unlock()
    setSoundUnavailable(!unlocked)
    return unlocked
  }

  function chooseHome(home: TripHome | null) {
    const current = latest.current
    if (current.home && current.trip && ['running', 'paused'].includes(current.trip.status)) return false
    const settings = current.trip?.status === 'completed' ? { ...current.settings, checkpoint: null } : current.settings
    const trip = restoreStoredTrip(settings, home, Date.now())
    commit({ ...current, settings, home, trip, armed: false })
    return true
  }

  function begin(nextStopId?: string) {
    const current = latest.current
    if (!current.home) return false
    const now = Date.now()
    const existing = current.trip
    const trip = existing?.status === 'paused' ? resumeTrip(existing, now)
      : existing?.status === 'running' ? existing
        : startTrip(createTrip({ home: current.home, transport: current.settings.transport }, now), now, nextStopId)
    commit({ ...current, trip, armed: current.settings.autoArrival, needsResume: false })
    if (current.settings.arrivalSound) void unlockSound()
    return true
  }

  function transition(action: (trip: TripState, now: number) => TripState) {
    const current = latest.current
    if (!current.trip) return false
    try {
      const trip = action(current.trip, Math.max(Date.now(), current.trip.updatedAt))
      commit({ ...current, trip, armed: current.armed && trip.status === 'running' })
      return true
    } catch {
      return false
    }
  }

  function arrival(stop: JourneyStop, method: Visit['method'], queueMinutes = 0) {
    const current = latest.current
    if (current.trip?.status !== 'running' || current.needsResume
      || current.trip.activities.some((activity) => activity.stopId === stop.id)) return false
    const success = transition((trip, now) => arriveAtStop(trip, { stopId: stop.id, kind: stop.kind,
      visitMinutes: stop.visitMinutes, queueMinutes, method }, now))
    if (success) {
      const activity = latest.current.trip!.activities.at(-1)!
      if (current.settings.arrivalSound && !sound.current?.play(`${activity.stopId}:${activity.arrivedAt}`, true)) {
        setSoundUnavailable(true)
      }
    }
    return success
  }

  function setAutoArrival(enabled: boolean) {
    const current = latest.current
    commit({ ...current, settings: { ...current.settings, autoArrival: enabled },
      armed: enabled && current.trip?.status === 'running' && !current.needsResume })
  }

  function clear() {
    skipSave.current = true
    sound.current?.dispose()
    sound.current = null
    try { window.localStorage.removeItem(TRIP_STORAGE_KEY) } catch { /* Storage is optional. */ }
    commit({ settings: defaultTripSettings(), home: null, trip: null, armed: false, needsResume: false })
  }

  return {
    ...session, storageError, soundUnavailable,
    needsHome: !session.home && session.settings.checkpoint !== null,
    chooseHome, updateSettings, begin, arrival, clear, setAutoArrival, prepareSound: unlockSound,
    applyShared: (settings: TripSettings) => commit({ settings, home: resolveStoredHome(settings.home, landmarks), trip: null, armed: false, needsResume: false }),
    pause: () => transition((trip, now) => pauseTrip(trip, now)),
    finish: () => transition((trip, now) => completeTrip(trip, now)),
    continueTrip: (nextStopId?: string) => transition((trip, now) => leaveStop(trip, now, nextStopId)),
    undo: (id: string) => transition((trip, now) => unvisitTripStop(trip, id, now)),
    takeBreak: (minutes: number, id?: string) => transition((trip, now) => startTripBreak(leaveStop(trip, now),
      { id: id ?? `break-${now}`, minutes }, now)),
    endBreak: (nextStopId?: string) => transition((trip, now) => leaveStop(endTripBreak(trip, now), now, nextStopId)),
    skipBreak: (id: string) => transition((trip, now) => skipTripBreak(trip, id, now)),
    setSound: (enabled: boolean) => { updateSettings({ arrivalSound: enabled }); if (enabled) void unlockSound() },
    testSound: async () => { if (await unlockSound()) sound.current?.play(`test-${Date.now()}`, true) },
  }
}

export type TripSession = ReturnType<typeof useTripSession>