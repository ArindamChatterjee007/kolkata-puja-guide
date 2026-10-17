import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Compass, Footprints, List, Map as MapIcon, Route } from 'lucide-react'
import type { Coordinate, CrowdLevel, Language, NamedCoordinate, Zone } from './types'
import { CURATED_ROUTES, METRO_STATIONS, PANDALS, START_POINTS } from './data/pandals'
import type { CuratedRoute } from './data/pandals'
import { advanceCheckIn, CHECKIN_LIMITS, createCheckInState } from './domain/checkin'
import type { CheckInState, CheckInStatus } from './domain/checkin'
import { haversineMetres } from './domain/geo'
import { planRoute } from './domain/route'
import { streetRouteProgress } from './domain/streets'
import type { StreetEndpoint, StreetProgress, StreetStrategy } from './domain/streets'
import { decodeSharedPlan, encodeSharedPlan } from './domain/storage'
import type { SavedPlan } from './domain/storage'
import { formatNumber, pickName, t } from './i18n'
import type { MessageKey } from './i18n'
import { useGeolocation } from './hooks/useGeolocation'
import { useStreetNavigation } from './hooks/useStreetNavigation'
import type { LocationErrorKind } from './hooks/useGeolocation'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useIntervalNow, useNow } from './hooks/useNow'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { usePlanStore } from './hooks/usePlanStore'
import { useToasts } from './hooks/useToasts'
import { AppHeader } from './components/AppHeader'
import { ExploreTab } from './components/ExploreTab'
import { RouteTab } from './components/RouteTab'
import { DirectionsPanel } from './components/DirectionsPanel'
import { isStreetPoint, needsLocationWatch, streetCrowdSnapshot, streetCrowdStale, streetFixIssue } from './components/streetNavigation'
import type { StreetCrowdSnapshot } from './components/streetNavigation'
import { MapView } from './components/MapView'
import type { MapFocusRequest, RouteSegment } from './components/MapView'
import { PandalDialog } from './components/PandalDialog'
import { NavigationDialog } from './components/NavigationDialog'
import type { NavigationDraft } from './components/NavigationDialog'
import { ConfirmDialog, InfoDialog, ShareDialog } from './components/Dialogs'
import type { ConfirmRequest } from './components/Dialogs'
import { FestivalIntro } from './components/FestivalIntro'
import { Toasts } from './components/Toasts'
import {
  applyOptimizedOrder, buildShareUrl, departureOptions, nextPendingStopId, orderKey, planFreshness,
  reportsKey, resolveDeparture, settingsKey, visitedKey, navigationMode, navigationUrl,
} from './components/uiState'
import type { PlanSettings, PlanSnapshot, SortMode } from './components/uiState'
import './App.css'

const KNOWN_IDS = PANDALS.map((pandal) => pandal.id)
const START_IDS = START_POINTS.map((point) => point.id)
const PANDAL_BY_ID = new Map(PANDALS.map((pandal) => [pandal.id, pandal]))
const DEFAULT_START_ID = START_IDS.includes('start-blue-esplanade') ? 'start-blue-esplanade' : START_IDS[0]
const CURATED_DEFAULT = CURATED_ROUTES[0]
const AGED_PLAN_MS = 45 * 60_000

type Tab = 'explore' | 'route' | 'directions'
type MobileLayout = 'split' | 'map' | 'list'
type AutoStatusKind = CheckInStatus | 'suppressed' | 'inaccurate'

type WalkingPlace = StreetEndpoint & { name: string; nameBn?: string }
interface WalkingContext {
  origin: WalkingPlace
  destination: WalkingPlace
  crowd: StreetCrowdSnapshot
  departure: string
}
interface MapPickDraft {
  kind: 'origin' | 'destination'
  draft: NavigationDraft
  point: Coordinate | null
  source: 'dialog' | 'directions'
  layout: MobileLayout
}

const locationErrorKeys: Record<LocationErrorKind, MessageKey> = {
  denied: 'locDenied', unavailable: 'locUnavailable', timeout: 'locTimeout',
  unsupported: 'locUnsupported', insecure: 'locInsecure', outside: 'locOutside',
}

export default function App() {
  const [initialHash] = useState(() => window.location.hash)
  const store = usePlanStore({
    knownIds: KNOWN_IDS,
    startIds: START_IDS,
    defaultStartId: DEFAULT_START_ID,
    curatedRoute: { stopIds: CURATED_DEFAULT.stopIds, startId: CURATED_DEFAULT.startId },
    skipDefaultRoute: initialHash.startsWith('#plan='),
  })
  const { plan, dispatch } = store
  const language = plan.language
  const online = useOnlineStatus()
  const wide = useMediaQuery('(min-width: 760px)')
  const now = useNow(60_000)
  const guidanceNow = useIntervalNow(5_000)
  const geo = useGeolocation()
  const street = useStreetNavigation()
  const toasts = useToasts()

  const [tab, setTab] = useState<Tab>(() => (plan.stopIds.length > 0 ? 'route' : 'explore'))
  const [mobileLayout, setMobileLayout] = useState<MobileLayout>('split')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [navigation, setNavigation] = useState<NavigationDraft | null>(null)
  const [walkingDraft, setWalkingDraft] = useState<NavigationDraft | null>(null)
  const [walkingContext, setWalkingContext] = useState<WalkingContext | null>(null)
  const [walkingIssue, setWalkingIssue] = useState<MessageKey | null>(null)
  const [walkingLocating, setWalkingLocating] = useState(false)
  const [streetStrategy, setStreetStrategy] = useState<StreetStrategy>('shortest')
  const [following, setFollowing] = useState(false)
  const [foreground, setForeground] = useState(() => document.visibilityState === 'visible')
  const [walkingProgress, setWalkingProgress] = useState<StreetProgress | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [mapPick, setMapPick] = useState<MapPickDraft | null>(null)
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState<Zone | 'all'>('all')
  const [sort, setSort] = useState<SortMode>('zone')
  const [originMode, setOriginMode] = useState<'landmark' | 'device'>('landmark')
  const [departure, setDeparture] = useState('now')
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null)
  const [planError, setPlanError] = useState(false)
  const [journeyActive, setJourneyActive] = useState(false)
  const [autoCheckIn, setAutoCheckIn] = useState(false)
  const [autoStatusKind, setAutoStatusKind] = useState<AutoStatusKind | null>(null)
  const [sharedPending, setSharedPending] = useState<Partial<SavedPlan> | null>(null)
  const [sharedInvalid, setSharedInvalid] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [focus, setFocus] = useState<MapFocusRequest | null>(null)
  // One opening per real App mount: replays only on a full page load, never on re-render.
  const [introOpen, setIntroOpen] = useState(true)
  const focusNonce = useRef(0)
  const checkInState = useRef<CheckInState>(createCheckInState())
  const suppressedAutoId = useRef<string | null>(null)
  const sharedHandled = useRef(false)
  const walkingIntent = useRef(0)
  const acceptedMetres = useRef(0)
  const lastFollowedAt = useRef<number | null>(null)
  const latestWalkingSettings = useRef({ reports: plan.reports, departure })
  latestWalkingSettings.current = { reports: plan.reports, departure }

  const stops = plan.stopIds.map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
  const visitedIds = new Set(plan.visits.map((visit) => visit.pandalId))
  const landmark = START_POINTS.find((point) => point.id === plan.startId) ?? START_POINTS[0]
  const usingDevice = originMode === 'device' && geo.position !== null
  const origin: NamedCoordinate = usingDevice && geo.position
    ? { name: t(language, 'yourLocation'), lat: geo.position.lat, lng: geo.position.lng }
    : { name: pickName(language, landmark), lat: landmark.lat, lng: landmark.lng }
  const settings: PlanSettings = {
    preference: plan.preference,
    pace: plan.pace,
    availableMinutes: plan.availableMinutes,
    originKey: usingDevice ? 'device' : landmark.id,
    departureKey: departure,
  }
  const freshness = planFreshness(snapshot, plan.stopIds, plan.visits, settings, plan.reports)
  const aged = snapshot !== null && now - snapshot.createdAt > AGED_PLAN_MS
  const nextStopId = nextPendingStopId(plan.stopIds, plan.visits)
  const detailPandal = detailId ? PANDAL_BY_ID.get(detailId) ?? null : null
  const departureChoices = departureOptions(now)
  const navigationStopId = navigation?.destination.kind === 'pandal' ? navigation.destination.id : null
  const navigationIndex = navigationStopId ? plan.stopIds.indexOf(navigationStopId) : -1
  const navigationPrevious = navigationIndex > 0 ? PANDAL_BY_ID.get(plan.stopIds[navigationIndex - 1]) : undefined
  const navigationLeg = freshness === 'fresh' && !aged && navigationStopId
    ? snapshot?.plan.stops.find((stop) => stop.pandalId === navigationStopId)?.leg : undefined
  const streetResult = walkingContext && street.state.status === 'ready' && street.state.result.status === 'ok' ? street.state.result : null
  const selectedStreetRoute = streetResult ? streetStrategy === 'quieter' && streetResult.alternativesDiffer ? streetResult.quieter : streetResult.shortest : null
  const currentCrowd = streetCrowdSnapshot(PANDALS, plan.reports, now)
  const walkingStale = walkingContext !== null && (streetCrowdStale(walkingContext.crowd, currentCrowd.key, now) || walkingContext.departure !== departure)
  const walkingDestination = walkingDraft ? resolveWalkingDestination(walkingDraft) : null
  const walkingOrigin = walkingDraft ? resolvePublicWalkingOrigin(walkingDraft) : null
  const walkingFallback = walkingDraft ? navigationUrl(
    walkingDestination ?? (walkingDraft.destination.kind === 'query' ? walkingDraft.destination.query : ''),
    walkingDraft.originId === 'current' ? null : walkingOrigin,
    'walking',
  ) : null

  const segments: RouteSegment[] = (() => {
    if (snapshot && freshness !== 'changed') {
      return snapshot.plan.stops.map((stop) => ({ mode: stop.leg.mode, points: stop.leg.geometry }))
    }
    const pending = stops.filter((stop) => !visitedIds.has(stop.id))
    return pending.length > 0 ? [{ mode: 'direct', points: [origin, ...pending] }] : []
  })()

  useEffect(() => {
    document.documentElement.lang = language
    document.title = `${t(language, 'appName')} · ${t(language, 'city')}`
  }, [language])

  function focusPoint(point: Coordinate) {
    focusNonce.current += 1
    setFocus({ nonce: focusNonce.current, kind: 'point', point })
  }

  function focusBounds(points: Coordinate[], maxZoom = 15) {
    if (points.length === 0) return
    focusNonce.current += 1
    setFocus({ nonce: focusNonce.current, kind: 'bounds', points, maxZoom })
  }

  const receiveSharedLink = useEffectEvent((hash: string) => {
    if (!hash.startsWith('#plan=')) return
    const decoded = decodeSharedPlan(hash, KNOWN_IDS, START_IDS)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setSharedInvalid(decoded === null)
    setSharedPending(null)
    if (!decoded) return
    if (plan.stopIds.length === 0) {
      dispatch({ type: 'applyShared', shared: decoded })
      setSnapshot(null)
      setOriginMode('landmark')
      setTab('route')
      const shared = (decoded.stopIds ?? []).map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
      const start = START_POINTS.find((point) => point.id === decoded.startId) ?? landmark
      focusBounds([start, ...shared])
    } else {
      setSharedPending(decoded)
    }
  })

  useEffect(() => {
    if (!sharedHandled.current) {
      sharedHandled.current = true
      if (initialHash.startsWith('#plan=')) {
        receiveSharedLink(initialHash)
      } else if (stops.length > 0) {
        focusBounds([origin, ...stops])
      }
    }
    const onHashChange = () => receiveSharedLink(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const resetDwell = () => {
      checkInState.current = createCheckInState()
      setAutoStatusKind(null)
      setForeground(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', resetDwell)
    return () => document.removeEventListener('visibilitychange', resetDwell)
  }, [])

  useEffect(() => {
    if (needsLocationWatch(journeyActive, autoCheckIn, following)) geo.startWatch()
    else geo.stopWatch()
  }, [journeyActive, autoCheckIn, following, geo.startWatch, geo.stopWatch])

  useEffect(() => {
    if (street.state.status === 'loading' && walkingContext && walkingStale) {
      const crowd = streetCrowdSnapshot(PANDALS, plan.reports, Date.now())
      setWalkingContext({ ...walkingContext, crowd, departure })
      street.request({ origin: walkingContext.origin, destination: walkingContext.destination, hotspots: crowd.hotspots })
    }
  }, [currentCrowd.key, departure, walkingStale, walkingContext, street.state.status, street.request, plan.reports])

  useEffect(() => {
    if (street.state.status === 'error' || (street.state.status === 'ready' && street.state.result.status === 'unavailable')) setFollowing(false)
    if (streetResult && selectedStreetRoute) focusBounds(selectedStreetRoute.geometry, 17)
  }, [street.state, selectedStreetRoute])

  useEffect(() => {
    if (!following || !foreground || !selectedStreetRoute) return
    const sample = geo.position
    if (!sample || geo.status === 'error') {
      setWalkingProgress((previous) => previous ? { ...previous, status: 'uncertain' } : null)
      return
    }
    const fixIssue = streetFixIssue(sample, Date.now())
    const accuracy = fixIssue === 'stale' || fixIssue === 'inaccurate' ? 61 : sample.accuracyMetres
    const progress = streetRouteProgress(selectedStreetRoute, sample, acceptedMetres.current, accuracy)
    if (progress.status === 'on-route' || progress.status === 'arrived') acceptedMetres.current = progress.alongMetres
    setWalkingProgress(progress)
    if (!fixIssue && tab === 'directions' && lastFollowedAt.current !== sample.at) {
      lastFollowedAt.current = sample.at
      focusPoint(sample)
    }
  }, [following, foreground, geo.position, geo.status, guidanceNow, selectedStreetRoute, tab])

  // Evaluates only when a new device sample arrives; other values are read fresh at that moment.
  useEffect(() => {
    const sample = geo.position
    if (!journeyActive || !autoCheckIn || !sample) {
      checkInState.current = createCheckInState()
      return
    }
    const activeId = nextPendingStopId(plan.stopIds, plan.visits)
    if (suppressedAutoId.current) {
      const held = PANDAL_BY_ID.get(suppressedAutoId.current)
      if (!held || haversineMetres(sample, held) > CHECKIN_LIMITS.radiusMetres * 1.5) {
        suppressedAutoId.current = null
      } else if (suppressedAutoId.current === activeId) {
        setAutoStatusKind('suppressed')
        return
      }
    }
    const result = advanceCheckIn(checkInState.current, {
      orderedStops: stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng })),
      activeStopId: activeId,
      sample: { lat: sample.lat, lng: sample.lng, accuracyMetres: sample.accuracyMetres, at: sample.at },
      now: Date.now(),
      foreground: document.visibilityState === 'visible',
      optedIn: true,
      visits: plan.visits,
    })
    checkInState.current = result.state
    if (result.status === 'invalid-sample' && sample.accuracyMetres > CHECKIN_LIMITS.maxAccuracyMetres) {
      setAutoStatusKind('inaccurate')
    } else {
      setAutoStatusKind(result.status)
    }
    if (result.checkedInId) {
      const checkedId = result.checkedInId
      dispatch({ type: 'visits', visits: result.visits })
      const checked = PANDAL_BY_ID.get(checkedId)
      toasts.push(
        t(language, 'autoToast', { name: checked ? pickName(language, checked) : checkedId }),
        {
          label: t(language, 'undo'),
          onClick: () => {
            suppressedAutoId.current = checkedId
            checkInState.current = createCheckInState()
            dispatch({ type: 'unvisit', id: checkedId })
          },
        },
        12_000,
      )
    }
  }, [geo.position]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleStop(id: string) {
    if (plan.stopIds.includes(id)) {
      dispatch({ type: 'remove', id })
      if (selectedId === id) setSelectedId(null)
    } else if (plan.stopIds.length < 12) {
      dispatch({ type: 'add', id })
    }
  }

  function toggleVisit(id: string) {
    if (visitedIds.has(id)) {
      suppressedAutoId.current = id
      checkInState.current = createCheckInState()
    }
    dispatch({ type: 'toggleVisit', id, now: Date.now() })
  }

  function showOnMap(id: string) {
    const pandal = PANDAL_BY_ID.get(id)
    if (!pandal) return
    setSelectedId(id)
    focusPoint(pandal)
    if (!wide && mobileLayout === 'list') setMobileLayout('split')
  }

  function openNavigation(id: string | null) {
    const pandal = id ? PANDAL_BY_ID.get(id) : undefined
    setDetailId(null)
    setNavigation({
      destination: pandal ? { kind: 'pandal', id: pandal.id } : { kind: 'query', query: '' },
      originId: 'current',
      mode: null,
    })
  }

  function resolveWalkingDestination(draft: NavigationDraft): WalkingPlace | null {
    const destination = draft.destination
    if (destination.kind === 'query') return null
    if (destination.kind === 'point') return { ...destination.point, name: t('en', 'streetPoint'), nameBn: t('bn', 'streetPoint') }
    return (destination.kind === 'pandal' ? PANDAL_BY_ID.get(destination.id) : START_POINTS.find((point) => point.id === destination.id)) ?? null
  }

  function resolvePublicWalkingOrigin(draft: NavigationDraft): WalkingPlace | null {
    if (draft.originId === 'point' && draft.originPoint) return { ...draft.originPoint, name: t('en', 'streetPoint'), nameBn: t('bn', 'streetPoint') }
    if (draft.originId === 'planned') return landmark
    const [kind, id] = draft.originId.split(':')
    return (kind === 'pandal' ? PANDAL_BY_ID.get(id) : kind === 'landmark' ? START_POINTS.find((point) => point.id === id) : null) ?? null
  }

  function clearWalkingProgress() {
    acceptedMetres.current = 0
    lastFollowedAt.current = null
    setWalkingProgress(null)
    setSelectedStep(null)
  }

  function changeNavigation(draft: NavigationDraft) {
    setNavigation(draft)
  }

  async function calculateWalking(draft: NavigationDraft, keepStrategy = false) {
    const intent = ++walkingIntent.current
    street.invalidate()
    setWalkingDraft({ ...draft, mode: 'walking' })
    setWalkingContext(null)
    setWalkingIssue(null)
    setWalkingLocating(false)
    setFollowing(keepStrategy && following)
    clearWalkingProgress()
    if (!keepStrategy) setStreetStrategy('shortest')
    setNavigation(null)
    setTab('directions')
    if (!wide) setMobileLayout('split')
    const destination = resolveWalkingDestination(draft)
    if (!destination) {
      setWalkingIssue('streetUnknown')
      setFollowing(false)
      return
    }
    let start = resolvePublicWalkingOrigin(draft)
    if (draft.originId === 'current') {
      setWalkingLocating(true)
      const sample = geo.position && streetFixIssue(geo.position, Date.now()) === null ? geo.position : await geo.locateOnce()
      if (intent !== walkingIntent.current) return
      setWalkingLocating(false)
      if (!sample) {
        setWalkingIssue('streetLocationFailed')
        setFollowing(false)
        return
      }
      const issue = streetFixIssue(sample, Date.now())
      if (issue) {
        setWalkingIssue(issue === 'inaccurate' ? 'streetPoorFix' : issue === 'stale' ? 'streetStaleFix' : 'streetOutside')
        setFollowing(false)
        return
      }
      start = { lat: sample.lat, lng: sample.lng, name: t('en', 'yourLocation'), nameBn: t('bn', 'yourLocation') }
    }
    if (!start) {
      setWalkingIssue('streetLocationFailed')
      setFollowing(false)
      return
    }
    const latest = latestWalkingSettings.current
    const crowd = streetCrowdSnapshot(PANDALS, latest.reports, Date.now())
    setWalkingContext({ origin: start, destination, crowd, departure: latest.departure })
    street.request({ origin: { lat: start.lat, lng: start.lng, id: start.id }, destination: { lat: destination.lat, lng: destination.lng, id: destination.id }, hotspots: crowd.hotspots })
  }

  function closeDirections() {
    walkingIntent.current += 1
    street.invalidate()
    setWalkingDraft(null)
    setWalkingContext(null)
    setWalkingIssue(null)
    setWalkingLocating(false)
    setFollowing(false)
    setMapPick(null)
    clearWalkingProgress()
    setTab(plan.stopIds.length ? 'route' : 'explore')
  }

  function beginMapPick(kind: 'origin' | 'destination', draft: NavigationDraft, source: MapPickDraft['source']) {
    setNavigation(null)
    setMapPick({ kind, draft, point: null, source, layout: mobileLayout })
    if (!wide) setMobileLayout('map')
  }

  function cancelMapPick() {
    if (!mapPick) return
    if (mapPick.source === 'dialog') setNavigation(mapPick.draft)
    setMobileLayout(mapPick.layout)
    setMapPick(null)
  }

  function confirmMapPick() {
    if (!mapPick?.point || !isStreetPoint(mapPick.point)) return
    const draft: NavigationDraft = mapPick.kind === 'origin'
      ? { ...mapPick.draft, originId: 'point', originPoint: mapPick.point }
      : { ...mapPick.draft, destination: { kind: 'point', point: mapPick.point } }
    setMobileLayout(mapPick.layout)
    setMapPick(null)
    if (mapPick.source === 'dialog') changeNavigation(draft)
    else void calculateWalking(draft, true)
  }

  function optimize() {
    if (stops.length === 0) return
    const departureTimestamp = resolveDeparture(departure, Date.now())
    try {
      const result = planRoute({
        pandals: stops,
        origin,
        metroStations: METRO_STATIONS,
        preference: plan.preference,
        departureTimestamp,
        availableMinutes: plan.availableMinutes,
        pace: plan.pace,
        avoidedVisited: [...visitedIds],
        crowdReports: plan.reports,
      })
      const reordered = applyOptimizedOrder(plan.stopIds, result)
      dispatch({ type: 'stops', stopIds: reordered })
      setSnapshot({
        plan: result,
        orderKey: orderKey(reordered),
        settingsKey: settingsKey(settings),
        visitedKey: visitedKey(reordered, plan.visits),
        reportsKey: reportsKey(reordered, plan.reports),
        createdAt: Date.now(),
      })
      setPlanError(false)
      setTab('route')
      focusBounds([origin, ...stops])
    } catch {
      setPlanError(true)
    }
  }

  function trimToBudget() {
    const suggested = snapshot?.plan.suggestedIds
    if (!suggested) return
    const keep = new Set([...plan.stopIds.filter((id) => visitedIds.has(id)), ...suggested])
    const kept = plan.stopIds.filter((id) => keep.has(id))
    dispatch({ type: 'stops', stopIds: kept })
    toasts.push(t(language, 'toastTrimmed', { n: formatNumber(language, kept.length) }))
  }

  function applyCurated(route: CuratedRoute) {
    const apply = () => {
      dispatch({ type: 'stops', stopIds: route.stopIds, startId: route.startId })
      setOriginMode('landmark')
      setSnapshot(null)
      setTab('route')
      const start = START_POINTS.find((point) => point.id === route.startId)
      const routeStops = route.stopIds.map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
      focusBounds(start ? [start, ...routeStops] : routeStops)
      toasts.push(t(language, 'toastCurated', { name: pickName(language, route) }))
    }
    if (plan.stopIds.length === 0) {
      apply()
      return
    }
    setConfirm({
      title: t(language, 'replaceTitle'),
      body: t(language, 'replaceBody', { n: formatNumber(language, plan.stopIds.length), name: pickName(language, route) }),
      confirmLabel: t(language, 'replace'),
      onConfirm: apply,
    })
  }

  async function locateDevice() {
    const sample = await geo.locateOnce()
    if (sample) {
      setOriginMode('device')
      focusPoint(sample)
    } else {
      setOriginMode('landmark')
    }
  }

  function forgetLocation() {
    closeDirections()
    geo.forget()
    setOriginMode('landmark')
    setAutoCheckIn(false)
    suppressedAutoId.current = null
    checkInState.current = createCheckInState()
  }

  function startJourney() {
    setJourneyActive(true)
    checkInState.current = createCheckInState()
    setAutoStatusKind(null)
    setTab('route')
  }

  function stopJourney() {
    setJourneyActive(false)
    checkInState.current = createCheckInState()
    setAutoStatusKind(null)
  }

  function setAuto(enabled: boolean) {
    setAutoCheckIn(enabled)
    suppressedAutoId.current = null
    checkInState.current = createCheckInState()
    setAutoStatusKind(null)
  }

  function report(id: string, level: CrowdLevel) {
    dispatch({ type: 'report', report: { pandalId: id, level, reportedAt: Date.now() } })
  }

  async function share() {
    const hash = plan.stopIds.length > 0 ? encodeSharedPlan(plan) : ''
    const url = buildShareUrl(window.location, hash)
    if (!url) {
      toasts.push(t(language, 'shareEmpty'))
      return
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t(language, 'appName'), url })
        toasts.push(t(language, 'linkShared'))
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setShareUrl(null)
      toasts.push(t(language, 'linkCopied'))
    } catch {
      return
    }
  }

  function requestClearDevice() {
    setConfirm({
      title: t(language, 'clearDeviceTitle'),
      body: t(language, 'clearDeviceBody'),
      confirmLabel: t(language, 'clearConfirm'),
      danger: true,
      onConfirm: () => {
        closeDirections()
        dispatch({ type: 'clearAll' })
        geo.forget()
        setOriginMode('landmark')
        setSnapshot(null)
        setJourneyActive(false)
        setAutoCheckIn(false)
        setAutoStatusKind(null)
        suppressedAutoId.current = null
        checkInState.current = createCheckInState()
        setSelectedId(null)
        setInfoOpen(false)
        setNavigation(null)
        toasts.push(t(language, 'cleared'))
      },
    })
  }

  function acceptShared() {
    if (!sharedPending) return
    dispatch({ type: 'applyShared', shared: sharedPending })
    setSnapshot(null)
    setOriginMode('landmark')
    setSharedPending(null)
    setTab('route')
    const start = START_POINTS.find((point) => point.id === sharedPending.startId) ?? landmark
    const shared = (sharedPending.stopIds ?? []).map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
    focusBounds([start, ...shared])
  }

  function autoStatusText(): string | null {
    if (!journeyActive || !autoCheckIn) return null
    if (geo.status === 'error' && geo.error) return t(language, locationErrorKeys[geo.error])
    const next = nextStopId ? PANDAL_BY_ID.get(nextStopId) : undefined
    const name = next ? pickName(language, next) : ''
    switch (autoStatusKind) {
      case 'dwelling': return t(language, 'autoDwelling', { name })
      case 'outside-radius': return t(language, 'autoFar')
      case 'paused': return t(language, 'autoPaused')
      case 'outside-area': return t(language, 'autoOutside')
      case 'suppressed': return t(language, 'autoSuppressed', { name })
      case 'inaccurate': return t(language, 'autoInaccurate', { m: formatNumber(language, Math.round(geo.position?.accuracyMetres ?? 0)) })
      case 'not-active': return next ? t(language, 'autoWaiting') : t(language, 'allVisited')
      case 'checked-in': return null
      default: return t(language, 'autoWaiting')
    }
  }

  const detailVisit = detailId ? plan.visits.find((visit) => visit.pandalId === detailId) : undefined
  const detailReport = detailId ? plan.reports.find((item) => item.pandalId === detailId) : undefined

  const tabs: { id: Tab, label: string, icon: typeof Compass }[] = [
    { id: 'explore', label: t(language, 'tabExplore'), icon: Compass },
    { id: 'route', label: t(language, 'tabRoute'), icon: Route },
    ...(walkingDraft ? [{ id: 'directions' as const, label: t(language, 'streetDirections'), icon: Footprints }] : []),
  ]

  const layout = wide ? 'wide' : mobileLayout

  return (
    <div className="app" data-layout={layout} data-view={tab}>
      <FestivalIntro language={language} open={introOpen} onClose={() => setIntroOpen(false)} />
      <a className="skip-link" href="#planner">{t(language, 'skipToPlanner')}</a>
      <a className="skip-link" href="#map">{t(language, 'skipToMap')}</a>
      <AppHeader
        language={language}
        online={online}
        onLanguage={(next: Language) => dispatch({ type: 'language', language: next })}
        onShare={() => void share()}
        onInfo={() => setInfoOpen(true)}
      />
      <div className="workspace">
        <aside className="panel" id="planner" aria-label={t(language, 'tabRoute')}>
          {!wide && (
            <div className="sheet-handle">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setMobileLayout(mobileLayout === 'split' ? 'map' : 'split')}
                aria-label={mobileLayout === 'split' ? t(language, 'collapsePanel') : t(language, 'splitPanel')}
                title={mobileLayout === 'split' ? t(language, 'collapsePanel') : t(language, 'splitPanel')}
                aria-expanded={mobileLayout !== 'map'}
              >
                {mobileLayout === 'split' ? <ChevronDown size={22} aria-hidden="true" /> : <ChevronUp size={22} aria-hidden="true" />}
              </button>
              <div className="view-toggle" role="group" aria-label={t(language, 'viewMap')}>
                <button type="button" className={`view-toggle__btn${mobileLayout === 'map' ? ' is-active' : ''}`} aria-pressed={mobileLayout === 'map'} onClick={() => setMobileLayout(mobileLayout === 'map' ? 'split' : 'map')} title={t(language, 'viewMap')}>
                  <MapIcon size={18} aria-hidden="true" /> {t(language, 'viewMap')}
                </button>
                <button type="button" className={`view-toggle__btn${mobileLayout === 'list' ? ' is-active' : ''}`} aria-pressed={mobileLayout === 'list'} onClick={() => setMobileLayout(mobileLayout === 'list' ? 'split' : 'list')} title={t(language, 'viewList')}>
                  <List size={18} aria-hidden="true" /> {t(language, 'viewList')}
                </button>
              </div>
            </div>
          )}
          <div className="panel__content">
            <div className="tabs" role="tablist" aria-label={t(language, 'tabRoute')}>
              {tabs.map((item) => {
                const Icon = item.icon
                const selected = tab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls={`panel-${item.id}`}
                    tabIndex={selected ? 0 : -1}
                    className={`tabs__tab${selected ? ' is-active' : ''}`}
                    onClick={() => setTab(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                        event.preventDefault()
                        const index = tabs.findIndex((candidate) => candidate.id === item.id)
                        const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
                        setTab(next)
                        document.getElementById(`tab-${next}`)?.focus()
                      }
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.id === 'route' && plan.stopIds.length > 0 && <span className="tabs__count">{formatNumber(language, plan.stopIds.length)}</span>}
                  </button>
                )
              })}
            </div>
            <div className="panel__body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {store.storageStatus === 'blocked' && <p className="banner banner--warn" role="status">{t(language, 'storageBlocked')}</p>}
              {store.storageStatus === 'load-error' && <p className="banner banner--warn" role="status">{t(language, 'storageLoadError')}</p>}
              {store.saveError && <p className="banner banner--warn" role="alert">{t(language, 'storageSaveError')}</p>}
              {!online && <p className="banner" role="status">{t(language, 'offlineHint')}</p>}
              {sharedInvalid && (
                <p className="banner banner--warn" role="alert">
                  {t(language, 'sharedInvalid')}
                  <button type="button" className="btn btn--small btn--quiet" onClick={() => setSharedInvalid(false)}>{t(language, 'dismiss')}</button>
                </p>
              )}
              {sharedPending && (
                <div className="banner banner--info" role="status">
                  <span>
                    {t(language, 'sharedOpened', {
                      n: formatNumber(language, sharedPending.stopIds?.length ?? 0),
                      start: pickName(language, START_POINTS.find((point) => point.id === sharedPending.startId) ?? landmark),
                    })}
                  </span>
                  <span className="banner__actions">
                    <button type="button" className="btn btn--small btn--primary" onClick={acceptShared}>{t(language, 'useShared')}</button>
                    <button type="button" className="btn btn--small btn--quiet" onClick={() => setSharedPending(null)}>{t(language, 'keepMine')}</button>
                  </span>
                </div>
              )}
              {tab === 'explore' ? (
                <ExploreTab
                  language={language}
                  pandals={PANDALS}
                  stopIds={plan.stopIds}
                  reports={plan.reports}
                  now={now}
                  origin={origin}
                  selectedId={selectedId}
                  query={query}
                  zone={zone}
                  sort={sort}
                  curatedRoutes={CURATED_ROUTES}
                  startPoints={START_POINTS}
                  onQuery={setQuery}
                  onZone={setZone}
                  onSort={setSort}
                  onUseRoute={applyCurated}
                  onToggleStop={toggleStop}
                  onOpenDetails={setDetailId}
                  onShowOnMap={showOnMap}
                />
              ) : tab === 'directions' && walkingDraft ? (
                <DirectionsPanel
                  language={language}
                  originName={walkingContext ? pickName(language, walkingContext.origin) : walkingOrigin ? pickName(language, walkingOrigin) : t(language, 'navigationCurrent')}
                  destinationName={walkingDestination ? pickName(language, walkingDestination) : walkingDraft.destination.kind === 'query' ? walkingDraft.destination.query : t(language, 'navigationTo')}
                  state={street.state}
                  locating={walkingLocating}
                  issue={walkingIssue}
                  strategy={streetStrategy}
                  pace={plan.pace}
                  stale={walkingStale}
                  crowdAt={walkingContext?.crowd.createdAt ?? null}
                  progress={walkingProgress}
                  following={following}
                  visible={foreground}
                  locationError={geo.status === 'error' && geo.error ? t(language, geo.error === 'outside' ? 'streetOutside' : locationErrorKeys[geo.error]) : null}
                  selectedStep={selectedStep}
                  fallbackUrl={walkingFallback}
                  onStrategy={(strategy) => { setStreetStrategy(strategy); clearWalkingProgress() }}
                  onFollow={() => { setFollowing(true); lastFollowedAt.current = null }}
                  onPause={() => setFollowing(false)}
                  onClose={closeDirections}
                  onEdit={() => setNavigation(walkingDraft)}
                  onPick={(kind) => beginMapPick(kind, walkingDraft, 'directions')}
                  onRecalculate={(fromHere) => void calculateWalking(fromHere ? { ...walkingDraft, originId: 'current', originPoint: undefined } : walkingDraft, true)}
                  onStep={(index) => {
                    const step = selectedStreetRoute?.steps[index]
                    if (step) { setSelectedStep(index); focusPoint(step.at) }
                  }}
                />
              ) : (
                <RouteTab
                  language={language}
                  plan={plan}
                  stops={stops}
                  visits={plan.visits}
                  startPoints={START_POINTS}
                  originMode={originMode}
                  devicePosition={geo.position}
                  locationStatus={geo.status}
                  locationError={geo.error}
                  departure={departure}
                  departureChoices={departureChoices}
                  snapshot={snapshot}
                  freshness={freshness}
                  aged={aged}
                  planError={planError}
                  journeyActive={journeyActive}
                  autoCheckIn={autoCheckIn}
                  autoStatus={autoStatusText()}
                  nextStopId={nextStopId}
                  selectedId={selectedId}
                  onStartChange={(startId) => {
                    dispatch({ type: 'start', startId })
                    setOriginMode('landmark')
                  }}
                  onUseLocation={() => void locateDevice()}
                  onForgetLocation={forgetLocation}
                  onPreference={(preference) => dispatch({ type: 'preference', preference })}
                  onPace={(pace) => dispatch({ type: 'pace', pace })}
                  onBudget={(availableMinutes) => dispatch({ type: 'budget', availableMinutes })}
                  onDeparture={setDeparture}
                  onMove={(id, delta) => dispatch({ type: 'move', id, delta })}
                  onRemove={(id) => toggleStop(id)}
                  onClear={() => {
                    dispatch({ type: 'stops', stopIds: [] })
                    setSnapshot(null)
                  }}
                  onOptimize={optimize}
                  onTrim={trimToBudget}
                  onOpenDetails={setDetailId}
                  onNavigate={openNavigation}
                  onShowOnMap={showOnMap}
                  onToggleVisit={toggleVisit}
                  onStartJourney={startJourney}
                  onStopJourney={stopJourney}
                  onAutoToggle={setAuto}
                />
              )}
            </div>
          </div>
        </aside>
        <main className="map-area" id="map">
          <MapView
            language={language}
            pandals={PANDALS}
            stopIds={plan.stopIds}
            visitedIds={visitedIds}
            selectedId={selectedId}
            nextStopId={journeyActive ? nextStopId : null}
            origin={usingDevice || tab === 'directions' ? null : origin}
            devicePosition={geo.position}
            segments={tab === 'directions' ? [] : segments}
            directions={tab === 'directions' && streetResult && selectedStreetRoute && walkingContext ? {
              route: selectedStreetRoute,
              alternative: streetResult.alternativesDiffer ? streetStrategy === 'shortest' ? streetResult.quieter : streetResult.shortest : null,
              origin: walkingContext.origin,
              destination: walkingContext.destination,
              originSnap: streetResult.originSnap.coordinate,
              destinationSnap: streetResult.destinationSnap.coordinate,
              selectedStep,
              hotspots: walkingContext.crowd.hotspots.filter((hotspot) => hotspot.id !== walkingContext.origin.id && hotspot.id !== walkingContext.destination.id
                && selectedStreetRoute.geometry.some((point) => haversineMetres(point, hotspot) <= (hotspot.radiusMetres ?? 180) + 100)),
            } : null}
            picking={mapPick?.kind ?? null}
            pickedPoint={mapPick?.point ?? null}
            onPickPoint={(point) => setMapPick((previous) => previous ? { ...previous, point } : null)}
            onCancelPick={cancelMapPick}
            onConfirmPick={confirmMapPick}
            metroStations={METRO_STATIONS}
            focus={focus}
            online={online}
            locating={geo.status === 'locating'}
            onSelect={setSelectedId}
            onOpenDetails={setDetailId}
            onNavigate={openNavigation}
            onToggleStop={toggleStop}
            onLocate={() => void locateDevice()}
            onFitRoute={() => focusBounds(tab === 'directions' && selectedStreetRoute ? selectedStreetRoute.geometry : [origin, ...stops], tab === 'directions' ? 17 : 15)}
          />
        </main>
      </div>

      <PandalDialog
        language={language}
        pandal={detailPandal}
        now={now}
        stopIds={plan.stopIds}
        visit={detailVisit}
        report={detailReport}
        metroStations={METRO_STATIONS}
        onClose={() => setDetailId(null)}
        onNavigate={openNavigation}
        onToggleStop={toggleStop}
        onToggleVisit={toggleVisit}
        onReport={report}
        onClearReport={(id) => dispatch({ type: 'clearReport', id })}
        onShowOnMap={showOnMap}
      />
      <NavigationDialog
        language={language}
        draft={navigation}
        pandals={PANDALS}
        startPoints={START_POINTS}
        plannedStart={usingDevice ? null : landmark}
        previousStop={navigationPrevious}
        recommendedMode={navigationLeg ? navigationMode(navigationLeg, 'fresh') : undefined}
        online={online}
        onChange={changeNavigation}
        onWalking={(draft) => void calculateWalking(draft)}
        onPick={(kind, draft) => beginMapPick(kind, draft, 'dialog')}
        onClose={() => setNavigation(null)}
      />
      <InfoDialog language={language} open={infoOpen} onClose={() => setInfoOpen(false)} onRequestClear={requestClearDevice} />
      <ConfirmDialog language={language} request={confirm} onClose={() => setConfirm(null)} />
      <ShareDialog language={language} url={shareUrl} onClose={() => setShareUrl(null)} onCopied={() => toasts.push(t(language, 'linkCopied'))} />
      <Toasts language={language} toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  )
}
