import { useEffect, useReducer, useRef, useState } from 'react'
import type { CrowdReport, Language, Pace, TravelPreference, Visit } from '../types'
import { toggleManualVisit } from '../domain/checkin'
import { REPORT_TTL_MS } from '../domain/crowd'
import { defaultSavedPlan, loadSavedPlan, savePlan, STORAGE_KEY } from '../domain/storage'
import type { SavedPlan } from '../domain/storage'
import { clampStops, moveItem } from '../components/uiState'

export type StorageStatus = 'ok' | 'blocked' | 'load-error'

export type PlanAction =
  | { type: 'language', language: Language }
  | { type: 'start', startId: string }
  | { type: 'add', id: string }
  | { type: 'remove', id: string }
  | { type: 'move', id: string, delta: number }
  | { type: 'stops', stopIds: string[], startId?: string }
  | { type: 'preference', preference: TravelPreference }
  | { type: 'pace', pace: Pace }
  | { type: 'budget', availableMinutes: number }
  | { type: 'toggleVisit', id: string, now: number }
  | { type: 'unvisit', id: string }
  | { type: 'visits', visits: Visit[] }
  | { type: 'report', report: CrowdReport }
  | { type: 'clearReport', id: string }
  | { type: 'expireReports', now: number }
  | { type: 'applyShared', shared: Partial<SavedPlan> }
  | { type: 'clearAll' }

interface StoreOptions {
  knownIds: string[]
  startIds: string[]
  defaultStartId: string
  curatedRoute: { stopIds: string[], startId: string }
  skipDefaultRoute: boolean
}

function readStorage(): Storage | null {
  try {
    const storage = window.localStorage
    storage.getItem(STORAGE_KEY)
    return storage
  } catch {
    return null
  }
}

function pruneReports(reports: readonly CrowdReport[], now: number): CrowdReport[] {
  return [...reports]
    .filter((report) => now - report.reportedAt < REPORT_TTL_MS && report.reportedAt <= now)
    .sort((a, b) => b.reportedAt - a.reportedAt)
    .slice(0, 12)
}

function createReducer(options: StoreOptions) {
  const known = new Set(options.knownIds)
  const starts = new Set(options.startIds)
  return function reduce(state: SavedPlan, action: PlanAction): SavedPlan {
    switch (action.type) {
      case 'language':
        return { ...state, language: action.language }
      case 'start':
        return starts.has(action.startId) ? { ...state, startId: action.startId } : state
      case 'add':
        if (!known.has(action.id) || state.stopIds.includes(action.id) || state.stopIds.length >= 12) return state
        return { ...state, stopIds: [...state.stopIds, action.id] }
      case 'remove':
        return { ...state, stopIds: state.stopIds.filter((id) => id !== action.id) }
      case 'move': {
        const index = state.stopIds.indexOf(action.id)
        if (index < 0) return state
        return { ...state, stopIds: moveItem(state.stopIds, index, action.delta) }
      }
      case 'stops':
        return {
          ...state,
          stopIds: clampStops(action.stopIds, known),
          startId: action.startId && starts.has(action.startId) ? action.startId : state.startId,
        }
      case 'preference':
        return { ...state, preference: action.preference }
      case 'pace':
        return { ...state, pace: action.pace }
      case 'budget':
        return { ...state, availableMinutes: action.availableMinutes }
      case 'toggleVisit':
        if (!known.has(action.id)) return state
        return { ...state, visits: toggleManualVisit(state.visits, action.id, options.knownIds, action.now) }
      case 'unvisit':
        return { ...state, visits: state.visits.filter((visit) => visit.pandalId !== action.id) }
      case 'visits':
        return { ...state, visits: action.visits.filter((visit) => known.has(visit.pandalId)) }
      case 'report':
        if (!known.has(action.report.pandalId)) return state
        return {
          ...state,
          reports: pruneReports([
            action.report,
            ...state.reports.filter((report) => report.pandalId !== action.report.pandalId),
          ], action.report.reportedAt),
        }
      case 'clearReport':
        return { ...state, reports: state.reports.filter((report) => report.pandalId !== action.id) }
      case 'expireReports': {
        const reports = pruneReports(state.reports, action.now)
        return reports.length === state.reports.length ? state : { ...state, reports }
      }
      case 'applyShared':
        return {
          ...state,
          stopIds: clampStops(action.shared.stopIds ?? [], known),
          startId: action.shared.startId && starts.has(action.shared.startId) ? action.shared.startId : state.startId,
          preference: action.shared.preference ?? state.preference,
          pace: action.shared.pace ?? state.pace,
          availableMinutes: action.shared.availableMinutes ?? state.availableMinutes,
        }
      case 'clearAll':
        return { ...defaultSavedPlan(options.knownIds, options.defaultStartId), language: state.language }
      default:
        return state
    }
  }
}

interface InitialState {
  plan: SavedPlan
  storage: Storage | null
  status: StorageStatus
  isNewVisitor: boolean
}

function initialise(options: StoreOptions): InitialState {
  const storage = readStorage()
  const base = defaultSavedPlan(options.knownIds, options.defaultStartId)
  // Only a genuinely new visitor receives the curated route; a cleared plan is never re-seeded.
  const seeded = options.skipDefaultRoute ? base
    : { ...base, stopIds: [...options.curatedRoute.stopIds], startId: options.curatedRoute.startId }
  if (!storage) return { plan: seeded, storage: null, status: 'blocked', isNewVisitor: true }
  const loaded = loadSavedPlan(storage, options.knownIds, options.startIds)
  if (loaded.state) return { plan: loaded.state, storage, status: 'ok', isNewVisitor: false }
  if (loaded.error) return { plan: base, storage, status: 'load-error', isNewVisitor: false }
  return { plan: seeded, storage, status: 'ok', isNewVisitor: true }
}

export function usePlanStore(options: StoreOptions) {
  const optionsRef = useRef(options)
  const [initial] = useState(() => initialise(optionsRef.current))
  const [reducer] = useState(() => createReducer(optionsRef.current))
  const [plan, dispatch] = useReducer(reducer, initial.plan)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (plan.reports.length === 0) return
    const expire = () => dispatch({ type: 'expireReports', now: Date.now() })
    const nextExpiry = Math.min(...plan.reports.map((report) => report.reportedAt + REPORT_TTL_MS))
    const timer = window.setTimeout(expire, Math.max(1, nextExpiry - Date.now()))
    const onVisible = () => {
      if (document.visibilityState === 'visible') expire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [plan.reports])

  useEffect(() => {
    if (!initial.storage) return
    const result = savePlan(initial.storage, plan)
    setSaveError(result.ok ? null : result.error)
  }, [plan, initial.storage])

  return {
    plan,
    dispatch,
    storageStatus: initial.status,
    saveError,
    isNewVisitor: initial.isNewVisitor,
  }
}
