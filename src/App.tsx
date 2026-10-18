import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { CarFront, ChevronDown, ChevronUp, Compass, Footprints, List, Map as MapIcon, Route } from 'lucide-react'
import type { Coordinate, CrowdLevel, JourneyStop, Language, NamedCoordinate, StopKind, Transport, Zone } from './types'
import { CURATED_ROUTES, METRO_STATIONS } from './data/pandals'
import type { CuratedRoute } from './data/pandals'
import { ALL_PLACES, BROWSABLE_PLACES, ALL_START_POINTS as START_POINTS, areaCorners, cityForCoordinate, createManualPlace, GUIDE_BOUNDS, hasCrowdModel, isInGuideCoverage } from './data/regions'
import type { Area } from './data/regions'
import type { UnlocatedPujaLead } from './data/regionalPlaces'
import { REGIONAL_THEME_SEEDS } from './data/regionalPlaces'
import { advanceNearbyCheckIn, createNearbyCheckInState } from './domain/checkin'
import type { NearbyCheckInResult, NearbyCheckInState } from './domain/checkin'
import { haversineMetres } from './domain/geo'
import { orderNearestFirst, planRoute } from './domain/route'
import { streetRouteProgress } from './domain/streets'
import type { StreetEndpoint, StreetProgress, StreetStrategy } from './domain/streets'
import { decodeTripLink, encodeTripLink, snapshotTripSettings } from './domain/tripStorage'
import type { TripSettings } from './domain/tripStorage'
import { estimateRemainingTrip } from './domain/trip'
import { createDrivingMatrixEstimator, DrivingLegUnavailable } from './domain/drivingAdapter'
import type { DrivingMatrices } from './domain/drivingAdapter'
import type { SavedPlan } from './domain/storage'
import { formatNumber, pickName, t } from './i18n'
import type { MessageKey } from './i18n'
import { useGeolocation } from './hooks/useGeolocation'
import { useStreetNavigation } from './hooks/useStreetNavigation'
import { useDrivingNavigation } from './hooks/useDrivingNavigation'
import { useTripSession } from './hooks/useTripSession'
import { useTheme } from './hooks/useTheme'
import type { DevicePosition, LocationErrorKind } from './hooks/useGeolocation'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useIntervalNow, useNow } from './hooks/useNow'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { usePlanStore } from './hooks/usePlanStore'
import { useToasts } from './hooks/useToasts'
import { AppHeader } from './components/AppHeader'
import { ExploreTab } from './components/ExploreTab'
import { RouteTab } from './components/RouteTab'
import type { NearbyPandalsProps } from './components/NearbyPandals'
import { DirectionsPanel } from './components/DirectionsPanel'
import { DriveDirections } from './components/DriveDirections'
import { AreaTabs, TripBar, TripPanel } from './components/TripPanel'
import { isStreetPoint, needsLocationWatch, streetCrowdSnapshot, streetCrowdStale, streetFixIssue } from './components/streetNavigation'
import type { StreetCrowdSnapshot } from './components/streetNavigation'
import { MapView } from './components/MapView'
import type { MapFocusRequest, RouteSegment, VehicleState } from './components/MapView'
import { nextVehicleHeading } from './components/vehicle'
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
  deviceOriginKey, nearbyPandals, planningFixIssue, PLANNING_FIX_LIMITS,
} from './components/uiState'
import type { PlanSettings, PlanSnapshot, SortMode } from './components/uiState'
import './App.css'

const KNOWN_IDS = ALL_PLACES.map((pandal) => pandal.id)
const START_IDS = START_POINTS.map((point) => point.id)
const DEFAULT_START_ID = START_IDS.includes('start-blue-esplanade') ? 'start-blue-esplanade' : START_IDS[0]
const CURATED_DEFAULT = CURATED_ROUTES[0]
const AGED_PLAN_MS = 45 * 60_000
// Regional day trips (Asansol/Durgapur) default to a 12-hour window for genuinely new visitors only.
const DAY_TRIP_MINUTES = 720
const DEFAULT_BUDGET_MINUTES = 240

type Tab = 'explore' | 'route' | 'directions' | 'drive'
type MobileLayout = 'split' | 'map' | 'list'
type AutoStatusKind = NearbyCheckInResult['status'] | 'inaccurate'

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

interface TripPickDraft {
  kind: 'home' | 'place'
  lead?: UnlocatedPujaLead
  point: Coordinate | null
  layout: MobileLayout
}

interface CarContext {
  origin: NamedCoordinate
  destination: NamedCoordinate
  privateDestination: boolean
}

function preserveProgress(previous: StreetProgress | null, next: StreetProgress): StreetProgress {
  return previous && previous.status === next.status && previous.alongMetres === next.alongMetres
    && previous.remainingMetres === next.remainingMetres && previous.stepIndex === next.stepIndex
    && previous.distanceFromRouteMetres === next.distanceFromRouteMetres
    && previous.coordinate.lat === next.coordinate.lat && previous.coordinate.lng === next.coordinate.lng ? previous : next
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
  const session = useTripSession(START_POINTS)
  const language = plan.language
  const online = useOnlineStatus()
  const theme = useTheme()
  const wide = useMediaQuery('(min-width: 760px)')
  const now = useNow(60_000)
  const estimateNow = useIntervalNow(60_000)
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
  const [tripPick, setTripPick] = useState<TripPickDraft | null>(null)
  const [manualPlaces, setManualPlaces] = useState<JourneyStop[]>([])
  const [placeKind, setPlaceKind] = useState<StopKind | 'all'>('pandal')
  const [mustVisit, setMustVisit] = useState(false)
  const [carDraft, setCarDraft] = useState<NavigationDraft | null>(null)
  const [carContext, setCarContext] = useState<CarContext | null>(null)
  const [carFollowing, setCarFollowing] = useState(false)
  const [carProgress, setCarProgress] = useState<StreetProgress | null>(null)
  const [carStep, setCarStep] = useState<number | null>(null)
  const [carLocating, setCarLocating] = useState(false)
  const [carIssue, setCarIssue] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [tripPlanIssue, setTripPlanIssue] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState<Zone | 'all'>('all')
  const [sort, setSort] = useState<SortMode>('zone')
  const [originMode, setOriginMode] = useState<'landmark' | 'device'>('landmark')
  const [acceptedPosition, setAcceptedPosition] = useState<DevicePosition | null>(null)
  const [vehicleHeading, setVehicleHeading] = useState<number | null>(null)
  const previousFix = useRef<DevicePosition | null>(null)
  const [planningRejection, setPlanningRejection] = useState<ReturnType<typeof planningFixIssue>>(null)
  const [locationReveal, setLocationReveal] = useState(0)
  const [departure, setDeparture] = useState('now')
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null)
  const [planError, setPlanError] = useState(false)
  const journeyActive = session.trip?.status === 'running' && !session.needsResume
  const autoCheckIn = session.settings.autoArrival
  const [autoStatusKind, setAutoStatusKind] = useState<AutoStatusKind | null>(null)
  const [autoCandidate, setAutoCandidate] = useState<string | null>(null)
  const [sharedPending, setSharedPending] = useState<Partial<SavedPlan> | null>(null)
  const [sharedTripPending, setSharedTripPending] = useState<TripSettings | null>(null)
  const [sharedInvalid, setSharedInvalid] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [focus, setFocus] = useState<MapFocusRequest | null>(null)
  // One opening per real App mount: replays only on a full page load, never on re-render.
  const [introOpen, setIntroOpen] = useState(true)
  const focusNonce = useRef(0)
  const checkInState = useRef<NearbyCheckInState>(createNearbyCheckInState())
  const homeCheckIn = useRef<NearbyCheckInState>(createNearbyCheckInState())
  const suppressedAutoIds = useRef<string[]>([])
  const departureSamples = useRef({ id: '', count: 0, at: 0 })
  const carAcceptedMetres = useRef(0)
  const carIntent = useRef(0)
  const estimateIntent = useRef(0)
  const sharedHandled = useRef(false)
  const walkingIntent = useRef(0)
  const originIntent = useRef(0)
  const hasLocated = useRef(false)
  const panelBody = useRef<HTMLDivElement>(null)
  const acceptedMetres = useRef(0)
  const lastFollowedAt = useRef<number | null>(null)
  const latestWalkingSettings = useRef({ reports: plan.reports, departure })
  latestWalkingSettings.current = { reports: plan.reports, departure }
  const driving = useDrivingNavigation(session.settings.transport === 'personal' || carDraft !== null)
  const catalogue = [...ALL_PLACES, ...manualPlaces]
  const browsableCatalogue = [...BROWSABLE_PLACES, ...manualPlaces]
  const browsableIds = new Set(browsableCatalogue.map((place) => place.id))
  const PANDAL_BY_ID = new Map(catalogue.map((place) => [place.id, place]))
  const checkInCatalogue = ALL_PLACES.filter((place) => (browsableIds.has(place.id) && place.kind === 'pandal') || plan.stopIds.includes(place.id))
  const areaPlaces = browsableCatalogue.filter((place) => session.settings.area === 'all' || place.city === session.settings.area)
  const nearbyCatalogue = BROWSABLE_PLACES.filter((place) => place.kind === 'pandal')

  const stops = plan.stopIds.map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
  const visitedIds = new Set(plan.visits.map((visit) => visit.pandalId))
  const landmark = START_POINTS.find((point) => point.id === plan.startId) ?? START_POINTS[0]
  const publicHomeId = session.home?.kind === 'landmark' ? session.home.id : null
  const planningIssue = geo.position ? planningFixIssue(geo.position, guidanceNow) : null
  const usingDevice = originMode === 'device' && acceptedPosition !== null
  const lastKnown = acceptedPosition !== null && (usingDevice || journeyActive) && (guidanceNow - acceptedPosition.at > PLANNING_FIX_LIMITS.maxAgeMs
    || geo.status === 'error' || planningRejection !== null)
  const latestPlanner = useRef({ plan, position: acceptedPosition, originMode, departure, tab, lastKnown })
  latestPlanner.current = { plan, position: acceptedPosition, originMode, departure, tab, lastKnown }
  const locationFailure = geo.status === 'error' && geo.error ? t(language, locationErrorKeys[geo.error])
    : planningRejection === 'inaccurate' && geo.position ? t(language, 'locPoorFix', {
      m: formatNumber(language, Math.round(geo.position!.accuracyMetres)), limit: formatNumber(language, PLANNING_FIX_LIMITS.maxAccuracyMetres),
    }) : planningRejection === 'stale' ? t(language, 'locStale') : planningRejection ? t(language, 'locUnavailable') : null
  const locationNotice = locationFailure ? `${locationFailure} ${t(language, usingDevice ? 'locRetained' : session.home?.kind === 'coordinate' ? 'homeRetained' : session.home ? 'locManual' : 'homeRequired')}` : null
  // Planning origin: the live device fix while nearby mode is on, otherwise the chosen home; never the legacy plan start.
  const planOrigin: NamedCoordinate | null = usingDevice
    ? { name: t(language, lastKnown ? 'lastKnownLocation' : 'yourLocation'), lat: acceptedPosition.lat, lng: acceptedPosition.lng }
    : session.home?.location ?? null
  const origin: NamedCoordinate = planOrigin ?? { name: pickName(language, landmark), lat: landmark.lat, lng: landmark.lng }
  const tripKey = JSON.stringify([session.settings.transport, session.settings.orderMode, session.settings.breaks,
    session.home?.location ?? null])
  const settings: PlanSettings = {
    preference: plan.preference,
    pace: plan.pace,
    availableMinutes: plan.availableMinutes,
    originKey: usingDevice ? deviceOriginKey(acceptedPosition) : publicHomeId ?? (session.home ? 'home' : 'none'),
    deviceOrigin: acceptedPosition && (usingDevice || journeyActive) ? acceptedPosition : undefined,
    departureKey: departure,
    tripKey,
  }
  const freshness = planFreshness(snapshot, plan.stopIds, plan.visits, settings, plan.reports)
  const aged = snapshot !== null && now - snapshot.createdAt > AGED_PLAN_MS
  const lockedStop = session.trip?.lockedNextStopId
  const nextStopId = lockedStop && plan.stopIds.includes(lockedStop) && !visitedIds.has(lockedStop)
    ? lockedStop : nextPendingStopId(plan.stopIds, plan.visits)
  const detailPandal = detailId ? PANDAL_BY_ID.get(detailId) ?? null : null
  const departureChoices = departureOptions(now)
  const navigationStopId = navigation?.destination.kind === 'pandal' ? navigation.destination.id : null
  const navigationIndex = navigationStopId ? plan.stopIds.indexOf(navigationStopId) : -1
  const navigationPrevious = navigationIndex > 0 ? PANDAL_BY_ID.get(plan.stopIds[navigationIndex - 1]) : undefined
  const navigationLeg = freshness === 'fresh' && !aged && navigationStopId
    ? snapshot?.plan.stops.find((stop) => stop.pandalId === navigationStopId)?.leg : undefined
  const streetResult = walkingContext && street.state.status === 'ready' && street.state.result.status === 'ok' ? street.state.result : null
  const selectedStreetRoute = streetResult ? streetStrategy === 'quieter' && streetResult.alternativesDiffer ? streetResult.quieter : streetResult.shortest : null
  const currentCrowd = streetCrowdSnapshot(ALL_PLACES.filter(hasCrowdModel), plan.reports, now)
  const walkingStale = walkingContext !== null && (streetCrowdStale(walkingContext.crowd, currentCrowd.key, now) || walkingContext.departure !== departure)
  const walkingDestination = walkingDraft ? resolveWalkingDestination(walkingDraft) : null
  const walkingOrigin = walkingDraft ? resolvePublicWalkingOrigin(walkingDraft) : null
  const walkingFallback = walkingDraft ? navigationUrl(
    walkingDestination ?? (walkingDraft.destination.kind === 'query' ? walkingDraft.destination.query : ''),
    walkingDraft.originId === 'current' || walkingDraft.originId === 'point' ? null : walkingOrigin,
    'walking',
  ) : null

  const segments: RouteSegment[] = (() => {
    if (!session.home) return []
    if (snapshot && (freshness === 'fresh' || freshness === 'visits-changed')) {
      return [...snapshot.plan.stops.map((stop) => ({ mode: stop.leg.mode, points: stop.leg.geometry })),
        ...(snapshot.plan.homeLeg ? [{ mode: snapshot.plan.homeLeg.mode, points: snapshot.plan.homeLeg.geometry }] : [])]
    }
    const pending = stops.filter((stop) => !visitedIds.has(stop.id))
    return pending.length > 0 ? [{ mode: 'direct', points: [origin, ...pending, session.home.location] }] : []
  })()
  const estimateSignature = [orderKey(plan.stopIds), tripKey, plan.preference, plan.pace, plan.availableMinutes, departure, visitedKey(KNOWN_IDS, plan.visits), reportsKey(plan.stopIds, plan.reports)].join('|')
  const latestEstimateSignature = useRef(estimateSignature)
  latestEstimateSignature.current = estimateSignature
  const carResult = driving.result?.status === 'ok' ? driving.result : null
  const routeForTrip = snapshot && snapshot.plan.transport === session.settings.transport && freshness !== 'changed' ? snapshot.plan : null
  const highlightSeeds = session.settings.area === 'kolkata' ? CURATED_DEFAULT.stopIds
    : session.settings.area === 'all' ? REGIONAL_THEME_SEEDS.crossCity : REGIONAL_THEME_SEEDS[session.settings.area]
  const highlightPool = areaPlaces.filter((place) => place.kind === 'pandal' && !visitedIds.has(place.id))
    .sort((first, second) => haversineMetres(origin, first) - haversineMetres(origin, second) || first.id.localeCompare(second.id))
  const highlightIds = [...new Set([...highlightSeeds, ...highlightPool.map((place) => place.id)])]
    .filter((id) => highlightPool.some((place) => place.id === id)).slice(0, 4)
  const canStart = Boolean(session.home && (stops.length > 0 || highlightIds.length > 0 || session.trip) && !optimizing
    && driving.state.status !== 'loading' && driving.state.status !== 'error' && !planError && !routeForTrip?.overBudget)
  const tripPaused = session.trip?.status === 'paused'
  const freshFix = geo.position && !planningIssue && geo.status !== 'error' ? geo.position : null
  const positionInUse = usingDevice || journeyActive || carFollowing || tripPaused
  const lastKnownFix = !freshFix && positionInUse ? acceptedPosition : null
  const markerFix = freshFix ?? lastKnownFix
  const vehicle: VehicleState | null = session.settings.transport === 'personal' && markerFix
    && (journeyActive || carFollowing || tripPaused || freshFix !== null)
    ? { position: markerFix, heading: vehicleHeading, live: freshFix !== null } : null

  useEffect(() => {
    document.documentElement.lang = language
    document.title = `${t(language, 'appName')} · ${t(language, 'city')}`
  }, [language])

  useEffect(() => {
    if (locationReveal > 0) panelBody.current?.scrollTo({ top: 0 })
  }, [locationReveal])

  const receivePlannerPosition = useEffectEvent((position: DevicePosition | null) => {
    const issue = position ? planningFixIssue(position, Date.now()) : null
    setPlanningRejection(issue)
    if (position && issue === null) {
      const heading = nextVehicleHeading(previousFix.current, position)
      previousFix.current = position
      if (heading !== null) setVehicleHeading(heading)
    }
    if (position && issue === null && (originMode === 'device' || journeyActive || carFollowing) && geo.status === 'ready') {
      setAcceptedPosition((previous) => !previous || position.at >= previous.at ? position : previous)
    }
  })

  useEffect(() => {
    receivePlannerPosition(geo.position)
  }, [geo.position])

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
    const link = decodeTripLink(hash, KNOWN_IDS, START_POINTS, Date.now())
    const decoded = link?.plan
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setSharedInvalid(!decoded)
    setSharedPending(null)
    if (!decoded) return
    if (plan.stopIds.length === 0) {
      originIntent.current += 1
      dispatch({ type: 'applyShared', shared: decoded })
      session.applyShared(link!.settings)
      setSnapshot(null)
      setOriginMode('landmark')
      setAcceptedPosition(null)
      setTab('route')
      const shared = (decoded.stopIds ?? []).map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
      const start = START_POINTS.find((point) => point.id === decoded.startId) ?? landmark
      focusBounds([start, ...shared])
    } else {
      setSharedPending(decoded)
      setSharedTripPending(link!.settings)
    }
  })

  useEffect(() => {
    if (!sharedHandled.current) {
      sharedHandled.current = true
      if (initialHash.startsWith('#plan=')) {
        receiveSharedLink(initialHash)
      } else if (stops.length > 0) {
        focusBounds(planOrigin ? [planOrigin, ...stops] : stops)
      } else if (session.settings.area !== 'kolkata') {
        focusBounds(areaCorners(session.settings.area), session.settings.area === 'all' ? 9 : 13)
      }
    }
    const onHashChange = () => receiveSharedLink(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const resetDwell = () => {
      checkInState.current = createNearbyCheckInState()
      homeCheckIn.current = createNearbyCheckInState()
      departureSamples.current = { id: '', count: 0, at: 0 }
      setAutoStatusKind(null)
      setForeground(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', resetDwell)
    return () => document.removeEventListener('visibilitychange', resetDwell)
  }, [])

  useEffect(() => {
    if (needsLocationWatch(journeyActive, autoCheckIn && session.armed, following || carFollowing)) geo.startWatch()
    else geo.stopWatch()
  }, [journeyActive, autoCheckIn, session.armed, following, carFollowing, geo.startWatch, geo.stopWatch])

  useEffect(() => {
    if (street.state.status === 'loading' && walkingContext && walkingStale) {
      const crowd = streetCrowdSnapshot(ALL_PLACES.filter(hasCrowdModel), plan.reports, Date.now())
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
      setWalkingProgress((previous) => previous && previous.status !== 'uncertain' ? { ...previous, status: 'uncertain' } : previous)
      return
    }
    const fixIssue = streetFixIssue(sample, Date.now())
    const accuracy = fixIssue === 'stale' || fixIssue === 'inaccurate' ? 61 : sample.accuracyMetres
    const progress = streetRouteProgress(selectedStreetRoute, sample, acceptedMetres.current, accuracy)
    if (progress.status === 'on-route' || progress.status === 'arrived') acceptedMetres.current = progress.alongMetres
    setWalkingProgress((previous) => preserveProgress(previous, progress))
    if (!fixIssue && tab === 'directions' && lastFollowedAt.current !== sample.at) {
      lastFollowedAt.current = sample.at
      focusPoint(sample)
    }
  }, [following, foreground, geo.position, geo.status, guidanceNow, selectedStreetRoute, tab])

  const receiveCheckIn = useEffectEvent((sample: DevicePosition | null) => {
    if (!journeyActive || !autoCheckIn || !session.armed || !sample || !foreground || geo.status !== 'ready') {
      checkInState.current = createNearbyCheckInState()
      return
    }
    const clock = Date.now()
    const activity = session.trip?.activities.find((entry) => entry.departedAt === null)
    const arrived = activity ? PANDAL_BY_ID.get(activity.stopId) : undefined
    if (arrived && planningFixIssue(sample, clock) === null && sample.accuracyMetres <= 60) {
      if (haversineMetres(sample, arrived) > 150 + sample.accuracyMetres) {
        const previous = departureSamples.current
        departureSamples.current = { id: arrived.id, at: sample.at,
          count: previous.id === arrived.id && sample.at > previous.at && sample.at - previous.at < 20_000 ? previous.count + 1 : 1 }
        if (departureSamples.current.count >= 2) session.continueTrip(nextStopId ?? undefined)
      } else departureSamples.current = { id: '', count: 0, at: 0 }
    }
    if (!nextStopId && !activity && !session.trip?.activeBreak && session.home && sample.accuracyMetres <= 30
      && session.trip?.startedAt && clock - session.trip.startedAt >= 60_000) {
      const homeResult = advanceNearbyCheckIn(homeCheckIn.current, { catalogue: [{ ...session.home.location, id: 'trip-home' }],
        sample, now: clock, foreground, optedIn: true, visits: [], allowedBounds: {
          minLat: GUIDE_BOUNDS.south, maxLat: GUIDE_BOUNDS.north, minLng: GUIDE_BOUNDS.west, maxLng: GUIDE_BOUNDS.east } })
      homeCheckIn.current = homeResult.state
      if (homeResult.checkedInId) { session.finish(); return }
    }
    if (session.trip?.activeBreak) return
    const city = cityForCoordinate(sample)
    const result = advanceNearbyCheckIn(checkInState.current, {
      catalogue: checkInCatalogue, city: city ?? undefined, sample, now: clock, foreground,
      optedIn: true, visits: plan.visits, suppressedIds: suppressedAutoIds.current,
    })
    checkInState.current = result.state
    suppressedAutoIds.current = result.suppressedIds
    setAutoCandidate(result.state.targetId ?? result.candidateIds[0] ?? null)
    setAutoStatusKind(result.status === 'invalid-sample' && sample.accuracyMetres > 60 ? 'inaccurate' : result.status)
    if (result.checkedInId) {
      const checkedId = result.checkedInId
      const checked = PANDAL_BY_ID.get(checkedId)
      if (!checked || !session.arrival(checked, 'auto', arrivalQueue(checkedId))) return
      dispatch({ type: 'visits', visits: result.visits })
      toasts.push(`${t(language, 'autoToast', { name: pickName(language, checked) })}${plan.stopIds.includes(checkedId) ? '' : ` ${t(language, 'unplannedVisit')}`}`, {
        label: t(language, 'undo'), onClick: () => {
          suppressedAutoIds.current = [...new Set([...suppressedAutoIds.current, checkedId])]
          checkInState.current = createNearbyCheckInState()
          session.undo(checkedId)
          dispatch({ type: 'unvisit', id: checkedId })
        },
      }, 12_000)
    }
  })

  useEffect(() => { receiveCheckIn(geo.position) }, [geo.position])

  useEffect(() => {
    if (!carFollowing || !foreground || !carResult) return
    const sample = geo.position
    if (!sample || geo.status !== 'ready') {
      setCarProgress((previous) => previous && previous.status !== 'uncertain' ? { ...previous, status: 'uncertain' } : previous)
      return
    }
    const issue = planningFixIssue(sample, Date.now())
    const progress = streetRouteProgress(carResult.route, sample, carAcceptedMetres.current, issue ? 201 : sample.accuracyMetres)
    if (progress.status === 'on-route' || progress.status === 'arrived') carAcceptedMetres.current = progress.alongMetres
    setCarProgress((previous) => preserveProgress(previous, progress))
    if (!issue && tab === 'drive') focusPoint(sample)
  }, [carFollowing, foreground, carResult, geo.position, geo.status, guidanceNow, tab])

  const refreshRunningEstimate = useEffectEvent(() => {
    if (!session.home || !session.trip || !['running', 'paused'].includes(session.trip.status) || session.needsResume
      || optimizing || driving.state.status === 'loading') return
    void estimateSelection(plan, remainingOrigin(), settings, false)
  })
  useEffect(() => { refreshRunningEstimate() }, [estimateNow, session.trip?.updatedAt, estimateSignature])

  function remainingOrigin(): NamedCoordinate {
    if (acceptedPosition && (!snapshot?.deviceOrigin || haversineMetres(acceptedPosition, snapshot.deviceOrigin) > 20)) {
      return { name: t(language, lastKnown ? 'lastKnownLocation' : 'yourLocation'), lat: acceptedPosition.lat, lng: acceptedPosition.lng }
    }
    if (acceptedPosition && snapshot?.deviceOrigin) return { ...snapshot.deviceOrigin, name: t(language, lastKnown ? 'lastKnownLocation' : 'yourLocation') }
    const activity = session.trip?.activities.at(-1)
    const place = activity ? PANDAL_BY_ID.get(activity.stopId) : undefined
    return place ? { lat: place.lat, lng: place.lng, name: pickName(language, place) } : origin
  }

  function changeArea(area: Area) {
    const regional = area === 'asansol' || area === 'durgapur'
    session.updateSettings({ area, ...(!session.trip && regional
      && (store.isNewVisitor || plan.stopIds.length === 0) ? { transport: 'personal' as const } : {}) })
    if (!session.trip && regional && store.isNewVisitor && plan.availableMinutes === DEFAULT_BUDGET_MINUTES) {
      dispatch({ type: 'budget', availableMinutes: DAY_TRIP_MINUTES })
    }
    setZone('all')
    setQuery('')
    focusBounds(areaCorners(area), area === 'all' ? 9 : 13)
  }

  function selectHome(id: string) {
    const point = START_POINTS.find((entry) => entry.id === id)
    if (session.chooseHome(point ? { kind: 'landmark', id: point.id, location: { name: pickName(language, point), lat: point.lat, lng: point.lng } } : null)) {
      originIntent.current += 1
      if (point) dispatch({ type: 'start', startId: point.id })
      setOriginMode('landmark')
      setAcceptedPosition(null)
      setSnapshot(null)
      if (point) focusPoint(point)
    }
  }

  function pickTripPoint(kind: TripPickDraft['kind'], lead?: UnlocatedPujaLead) {
    setTripPick({ kind, lead, point: null, layout: mobileLayout })
    setNavigation(null)
    if (lead) focusBounds(areaCorners(lead.city), 13)
    if (!wide) setMobileLayout('map')
  }

  function finishTripPick(confirmPoint: boolean) {
    if (!tripPick) return
    const point = tripPick.point
    if (confirmPoint && point && isInGuideCoverage(point)) {
      if (tripPick.kind === 'home') {
        // A newer explicit choice wins over any GPS fix still in flight.
        originIntent.current += 1
        if (session.chooseHome({ kind: 'coordinate', location: { ...point, name: t(language, 'privateStart') } })) {
          setOriginMode('landmark')
          setSnapshot(null)
          setTripPlanIssue(null)
        }
      } else if (tripPick.lead && stops.length < 12) {
        const place = createManualPlace(tripPick.lead, point, Date.now())
        setManualPlaces((previous) => [...previous, place])
        dispatch({ type: 'addManual', id: place.id })
        setSelectedId(place.id)
        setTab('route')
      }
    }
    setMobileLayout(tripPick.layout)
    setTripPick(null)
  }

  function toggleStop(id: string) {
    if (session.trip && ['running', 'paused'].includes(session.trip.status) && session.trip.lockedNextStopId === id && plan.stopIds.includes(id)) {
      toasts.push(t(language, 'lockedDestination'))
      return
    }
    estimateIntent.current += 1
    setOptimizing(false)
    if (plan.stopIds.includes(id)) {
      dispatch({ type: 'remove', id })
      if (selectedId === id) setSelectedId(null)
    } else if (plan.stopIds.length < 12) {
      dispatch({ type: 'add', id })
    }
  }

  function toggleVisit(id: string) {
    if (visitedIds.has(id)) {
      suppressedAutoIds.current = [...new Set([...suppressedAutoIds.current, id])]
      checkInState.current = createNearbyCheckInState()
      session.undo(id)
    } else if (session.trip && ['running', 'paused'].includes(session.trip.status)) {
      const place = PANDAL_BY_ID.get(id)
      if (!place || !session.arrival(place, 'manual', arrivalQueue(id))) return
    }
    dispatch({ type: 'toggleVisit', id, now: Date.now() })
  }

  function arrivalQueue(id: string): number {
    const queue = snapshot?.plan.stops.find((stop) => stop.pandalId === id)?.queue.queueMinutes
    return queue ? (queue.min + queue.max) / 2 : 0
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
      mode: session.settings.transport === 'personal' ? 'driving' : session.settings.transport === 'walk' ? 'walking' : null,
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
    const crowd = streetCrowdSnapshot(ALL_PLACES.filter(hasCrowdModel), latest.reports, Date.now())
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
    if (!mapPick?.point || !(mapPick.draft.mode === 'driving' ? isInGuideCoverage(mapPick.point) : isStreetPoint(mapPick.point))) return
    const draft: NavigationDraft = mapPick.kind === 'origin'
      ? { ...mapPick.draft, originId: 'point', originPoint: mapPick.point }
      : { ...mapPick.draft, destination: { kind: 'point', point: mapPick.point } }
    setMobileLayout(mapPick.layout)
    setMapPick(null)
    if (mapPick.source === 'dialog') changeNavigation(draft)
    else void calculateWalking(draft, true)
  }

  async function calculateDriving(draft: NavigationDraft) {
    const intent = ++carIntent.current
    session.updateSettings({ transport: 'personal' })
    setCarDraft({ ...draft, mode: 'driving' })
    setCarContext(null)
    setCarIssue(null)
    setCarProgress(null)
    setCarStep(null)
    setCarFollowing(false)
    carAcceptedMetres.current = 0
    setNavigation(null)
    setTab('drive')
    if (!wide) setMobileLayout('split')
    const destination = resolveWalkingDestination(draft)
    if (!destination) { setCarIssue(t(language, 'streetUnknown')); return }
    let start = draft.originId === 'home' ? session.home?.location ?? null : resolvePublicWalkingOrigin(draft)
    if (draft.originId === 'current') {
      setCarLocating(true)
      const sample = geo.position && planningFixIssue(geo.position, Date.now()) === null ? geo.position : await geo.locateOnce()
      if (intent !== carIntent.current) return
      setCarLocating(false)
      if (!sample || planningFixIssue(sample, Date.now()) !== null) { setCarIssue(t(language, 'driveNoFix')); return }
      start = { name: t(language, 'yourLocation'), lat: sample.lat, lng: sample.lng }
    }
    if (!start) { setCarIssue(t(language, 'chooseHome')); return }
    const privateDestination = draft.destination.kind === 'point' && session.home?.kind === 'coordinate'
      && haversineMetres(destination, session.home.location) < 1
    setCarContext({ origin: start, destination, privateDestination })
    const result = await driving.navigate(start, destination, Date.now())
    if (intent !== carIntent.current) return
    if (result?.status === 'ok') focusBounds(result.route.geometry, 17)
  }

  function changeTransport(transport: Transport) {
    estimateIntent.current += 1
    session.updateSettings({ transport })
    setOptimizing(false)
    setSnapshot(null)
    setTripPlanIssue(null)
    if (transport !== 'personal') {
      carIntent.current += 1
      setCarDraft(null)
      setCarContext(null)
      setCarFollowing(false)
      driving.release()
      if (tab === 'drive') setTab('route')
    }
  }

  function navigateHome() {
    if (!session.home) return
    const draft: NavigationDraft = { destination: { kind: 'point', point: session.home.location }, originId: 'point',
      originPoint: remainingOrigin(), mode: session.settings.transport === 'personal' ? 'driving' : 'walking' }
    if (session.settings.transport === 'personal') void calculateDriving(draft)
    else if (session.settings.transport === 'walk') void calculateWalking(draft)
    else if (session.home.kind === 'landmark') setNavigation({ ...draft, originId: 'current', mode: 'transit' })
    else setTripPlanIssue(t(language, 'homeNotShared'))
  }

  async function estimateSelection(currentPlan: SavedPlan, currentOrigin: NamedCoordinate, currentSettings: PlanSettings, reveal = true) {
    if (!session.home) { setTripPlanIssue(t(language, session.needsHome ? 'reselectHome' : 'homeRequired')); return }
    const intent = ++estimateIntent.current
    const signature = latestEstimateSignature.current
    const currentStops = currentPlan.stopIds.map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
    const transport = session.settings.transport
    let matrices: DrivingMatrices | null = null
    setOptimizing(true)
    setTripPlanIssue(null)
    try {
    if (transport === 'personal') {
      matrices = await driving.prepare([currentOrigin, session.home.location, ...currentStops])
      if (!matrices) { if (intent === estimateIntent.current) setSnapshot(null); return }
    }
    if (intent !== estimateIntent.current || signature !== latestEstimateSignature.current) return
    const clock = Date.now()
    const options = {
      pandals: currentStops,
      origin: currentOrigin,
      metroStations: METRO_STATIONS,
      preference: currentPlan.preference,
      departureTimestamp: resolveDeparture(currentSettings.departureKey, clock),
      availableMinutes: currentPlan.availableMinutes,
      pace: currentPlan.pace,
      avoidedVisited: currentPlan.visits.map((visit) => visit.pandalId),
      crowdReports: currentPlan.reports,
      transport, orderMode: session.settings.orderMode, returnToOrigin: true,
      returnOrigin: session.home.location, breaks: session.settings.breaks,
      legEstimator: matrices ? createDrivingMatrixEstimator(matrices) : undefined,
    }
    const result = session.trip && ['running', 'paused'].includes(session.trip.status)
      ? estimateRemainingTrip(session.trip, { ...options, totalAvailableMinutes: currentPlan.availableMinutes }, clock)
      : planRoute(options)
    const reordered = applyOptimizedOrder(currentPlan.stopIds, result)
    dispatch({ type: 'stops', stopIds: reordered })
    setSnapshot({
      plan: result,
      orderKey: orderKey(reordered),
      settingsKey: settingsKey(currentSettings),
      deviceOrigin: currentSettings.deviceOrigin ? { lat: currentSettings.deviceOrigin.lat, lng: currentSettings.deviceOrigin.lng } : undefined,
      visitedKey: visitedKey(reordered, currentPlan.visits),
      reportsKey: reportsKey(reordered, currentPlan.reports),
      createdAt: Date.now(),
    })
    setPlanError(false)
    if (reveal) { setTab('route'); focusBounds([currentOrigin, ...result.orderedIds.map((id) => PANDAL_BY_ID.get(id)!), session.home.location]) }
    return result
    } catch (error) {
      if (intent !== estimateIntent.current) return
      setSnapshot(null)
      setPlanError(true)
      const point = error instanceof DrivingLegUnavailable && matrices ? matrices.points[error.toIndex] ?? matrices.points[error.fromIndex] : null
      const place = point ? currentStops.find((stop) => haversineMetres(stop, point) < 1) : undefined
      setTripPlanIssue(`${place ? `${pickName(language, place)}: ` : ''}${t(language, transport === 'personal' ? 'carRouteUnavailable' : 'planFailed')}`)
    } finally {
      if (intent === estimateIntent.current) setOptimizing(false)
    }
  }

  function optimize() {
    if (stops.length === 0) return
    try {
      void estimateSelection(plan, session.trip && ['running', 'paused'].includes(session.trip.status) ? remainingOrigin() : origin, settings)
    } catch {
      setPlanError(true)
    }
  }

  async function planHighlights() {
    if (!session.home || plan.stopIds.length > 0 || highlightIds.length === 0) return
    return estimateSelection({ ...plan, stopIds: highlightIds }, origin, settings)
  }

  function trimToBudget() {
    const suggested = snapshot?.plan.suggestedIds
    if (!suggested) return
    const keep = new Set([...plan.stopIds.filter((id) => visitedIds.has(id)), ...suggested])
    const kept = plan.stopIds.filter((id) => keep.has(id))
    dispatch({ type: 'stops', stopIds: kept })
    if (snapshot?.plan.suggestion) session.updateSettings({ breaks: session.settings.breaks.filter((pause) => snapshot.plan.suggestion!.breakIds.includes(pause.id)) })
    toasts.push(t(language, 'toastTrimmed', { n: formatNumber(language, kept.length) }))
  }

  function applyCurated(route: CuratedRoute) {
    const apply = () => {
      originIntent.current += 1
      dispatch({ type: 'stops', stopIds: route.stopIds, startId: route.startId })
      setOriginMode('landmark')
      setAcceptedPosition(null)
      setSnapshot(null)
      setTab('route')
      // The curated start stays a manual alternative; the user's chosen home (or its absence) is untouched.
      const start = START_POINTS.find((point) => point.id === route.startId)
      const routeStops = route.stopIds.map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
      focusBounds(session.home ? [session.home.location, ...routeStops] : start ? [start, ...routeStops] : routeStops)
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

  async function locateDevice(revealNearby = true) {
    const intent = ++originIntent.current
    const sample = await geo.locateOnce()
    if (intent !== originIntent.current) return
    if (sample && planningFixIssue(sample, Date.now()) === null) {
      const currentPlan = latestPlanner.current.plan
      const completed = new Set(currentPlan.visits.map((visit) => visit.pandalId))
      const pending = currentPlan.stopIds.filter((id) => !completed.has(id))
        .map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
      if (session.settings.orderMode === 'nearest' && !journeyActive) dispatch({ type: 'stops', stopIds: [
        ...currentPlan.stopIds.filter((id) => completed.has(id)),
        ...orderNearestFirst(pending, sample).map((pandal) => pandal.id),
      ] })
      setAcceptedPosition(sample)
      setOriginMode('device')
      if (!hasLocated.current) {
        hasLocated.current = true
        setSort('nearest')
        setZone('all')
        setQuery('')
      }
      if (revealNearby && latestPlanner.current.tab !== 'directions') {
        if (!wide) setMobileLayout('list')
        setLocationReveal(intent)
      }
      focusPoint(sample)
    }
  }

  // One click, one GPS request: the accepted fix becomes the fixed home and the current position; later movement only
  // updates the current position. A failed or rejected fix keeps the previous home and surfaces the location notice.
  async function setHomeFromDevice() {
    if (session.home && session.trip && ['running', 'paused'].includes(session.trip.status)) return
    const intent = ++originIntent.current
    const sample = await geo.locateOnce()
    if (intent !== originIntent.current || !sample || planningFixIssue(sample, Date.now()) !== null) return
    if (!session.chooseHome({ kind: 'coordinate', location: { name: t(language, 'myHome'), lat: sample.lat, lng: sample.lng } })) return
    estimateIntent.current += 1
    setOptimizing(false)
    setAcceptedPosition(sample)
    setOriginMode('landmark')
    setSnapshot(null)
    setTripPlanIssue(null)
    focusPoint(sample)
  }

  function forgetLocation() {
    originIntent.current += 1
    setConfirm(null)
    closeDirections()
    geo.forget()
    setOriginMode('landmark')
    setAcceptedPosition(null)
    setVehicleHeading(null)
    previousFix.current = null
    session.setAutoArrival(false)
    if (session.home?.kind === 'coordinate' && (!session.trip || session.trip.status === 'completed')) session.chooseHome(null)
    suppressedAutoIds.current = []
    checkInState.current = createNearbyCheckInState()
  }

  function nearbyProposal() {
    const latest = latestPlanner.current
    const sample = latest.position
    if (latest.originMode !== 'device' || !sample) return null
    const nearby = nearbyPandals(nearbyCatalogue, latest.plan.visits, sample)
    const candidateIds = nearby.candidates.map(({ pandal }) => pandal.id)
    if (candidateIds.length === 0) return null
    const completed = new Set(latest.plan.visits.map((visit) => visit.pandalId))
    const pendingIds = latest.plan.stopIds.filter((id) => !completed.has(id))
    const samePending = pendingIds.length === candidateIds.length && pendingIds.every((id) => candidateIds.includes(id))
    const nearestIds = orderNearestFirst(nearby.candidates.map(({ pandal }) => pandal), sample).map((pandal) => pandal.id)
    const sameOrder = samePending && pendingIds.every((id, index) => id === nearestIds[index])
    return { latest, sample, nearby, candidateIds, samePending, sameOrder }
  }

  function applyNearbyRoute() {
    const proposal = nearbyProposal()
    if (!proposal) return
    const { latest, sample, candidateIds, samePending } = proposal
    try {
      if (!samePending) closeDirections()
      originIntent.current += 1
      void estimateSelection({ ...latest.plan, stopIds: samePending ? latest.plan.stopIds : candidateIds },
        { name: t(latest.plan.language, latest.lastKnown ? 'lastKnownLocation' : 'yourLocation'), lat: sample.lat, lng: sample.lng }, {
          preference: latest.plan.preference, pace: latest.plan.pace, availableMinutes: latest.plan.availableMinutes,
          originKey: deviceOriginKey(sample), deviceOrigin: sample, departureKey: latest.departure, tripKey,
        })
      setSelectedId(null)
      setLocationReveal(originIntent.current)
    } catch {
      setPlanError(true)
    }
  }

  function requestNearbyRoute() {
    const proposal = nearbyProposal()
    if (!proposal || proposal.sameOrder) return
    if (proposal.latest.plan.stopIds.length === 0 || proposal.samePending) {
      applyNearbyRoute()
      return
    }
    setConfirm({
      title: t(language, 'replaceTitle'),
      body: t(language, 'replaceBody', {
        n: formatNumber(language, proposal.latest.plan.stopIds.length),
        name: t(language, proposal.nearby.withinRadius ? 'nearbyHeading' : 'closestHeading'),
      }),
      confirmLabel: t(language, 'replace'),
      onConfirm: applyNearbyRoute,
    })
  }

  async function startJourney() {
    if (!session.home || optimizing) return
    const continuing = session.trip && ['running', 'paused'].includes(session.trip.status)
    if (session.settings.arrivalSound) void session.prepareSound()
    const ready = continuing ? null : plan.stopIds.length === 0 ? await planHighlights()
      : freshness === 'fresh' ? snapshot?.plan : await estimateSelection(plan, origin, settings)
    if (!continuing && !ready) return
    if (ready?.overBudget) {
      setTripPlanIssue(t(language, 'overBudget', { h: formatNumber(language, plan.availableMinutes / 60, 1) }))
      setTab('route')
      if (!wide) setMobileLayout('list')
      return
    }
    if (!session.begin((ready?.orderedIds[0] ?? nextStopId) ?? undefined)) return
    checkInState.current = createNearbyCheckInState()
    setAutoStatusKind(null)
    setTab('route')
    if (ready) focusBounds([ready.origin, ...ready.orderedIds.map((id) => PANDAL_BY_ID.get(id)!), session.home.location])
    if (!wide) setMobileLayout('map')
  }

  function stopJourney() {
    session.finish()
    checkInState.current = createNearbyCheckInState()
    setAutoStatusKind(null)
  }

  function setAuto(enabled: boolean) {
    session.setAutoArrival(enabled)
    checkInState.current = createNearbyCheckInState()
    setAutoStatusKind(null)
  }

  function report(id: string, level: CrowdLevel) {
    dispatch({ type: 'report', report: { pandalId: id, level, reportedAt: Date.now() } })
  }

  async function share() {
    const hash = plan.stopIds.length > 0 ? encodeTripLink(plan, snapshotTripSettings(session.settings, session.home, null), KNOWN_IDS) : ''
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
        originIntent.current += 1
        closeDirections()
        dispatch({ type: 'clearAll' })
        session.clear()
        theme.setPreference('system')
        driving.release()
        setCarDraft(null)
        setCarContext(null)
        setCarFollowing(false)
        setManualPlaces([])
        geo.forget()
        setOriginMode('landmark')
        setAcceptedPosition(null)
        setVehicleHeading(null)
        previousFix.current = null
        setSnapshot(null)
        setAutoStatusKind(null)
        suppressedAutoIds.current = []
        checkInState.current = createNearbyCheckInState()
        setSelectedId(null)
        setInfoOpen(false)
        setNavigation(null)
        toasts.push(t(language, 'cleared'))
      },
    })
  }

  function acceptShared() {
    if (!sharedPending) return
    originIntent.current += 1
    dispatch({ type: 'applyShared', shared: sharedPending })
    if (sharedTripPending) session.applyShared(sharedTripPending)
    setSnapshot(null)
    setOriginMode('landmark')
    setAcceptedPosition(null)
    setSharedPending(null)
    setSharedTripPending(null)
    setTab('route')
    const start = START_POINTS.find((point) => point.id === sharedPending.startId) ?? landmark
    const shared = (sharedPending.stopIds ?? []).map((id) => PANDAL_BY_ID.get(id)).filter((pandal) => pandal !== undefined)
    focusBounds([start, ...shared])
  }

  function autoStatusText(): string | null {
    if (!journeyActive || !autoCheckIn) return null
    if (geo.status === 'error' && geo.error) return t(language, locationErrorKeys[geo.error])
    const next = autoCandidate ? PANDAL_BY_ID.get(autoCandidate) : undefined
    const name = next ? pickName(language, next) : ''
    switch (autoStatusKind) {
      case 'dwelling': return t(language, 'autoDwelling', { name })
      case 'outside-radius': return t(language, 'autoFar')
      case 'paused': return t(language, 'autoPaused')
      case 'outside-area': return t(language, 'autoOutside')
      case 'suppressed': return t(language, 'autoSuppressed', { name })
      case 'inaccurate': return t(language, 'autoInaccurate', { m: formatNumber(language, Math.round(geo.position?.accuracyMetres ?? 0)) })
      case 'ambiguous': return language === 'bn' ? 'একাধিক স্থান কাছে আছে। নিজে পৌঁছানো নিশ্চিত করুন।' : 'Several places are close together. Confirm the visit manually.'
      case 'moving': return language === 'bn' ? 'চলন্ত অবস্থায় চেক-ইন বন্ধ।' : 'Moving: auto-arrival is waiting for a stationary fix.'
      case 'not-active': return next ? t(language, 'autoWaiting') : t(language, 'allVisited')
      case 'checked-in': return null
      default: return t(language, 'autoWaiting')
    }
  }

  const detailVisit = detailId ? plan.visits.find((visit) => visit.pandalId === detailId) : undefined
  const detailReport = detailId ? plan.reports.find((item) => item.pandalId === detailId) : undefined
  const nearby: NearbyPandalsProps | null = usingDevice ? {
    language, nearby: nearbyPandals(nearbyCatalogue, plan.visits, acceptedPosition), accuracyMetres: acceptedPosition.accuracyMetres,
    lastKnown, updatedAt: acceptedPosition.at, inUse: nearbyProposal()?.sameOrder ?? false,
    locating: geo.status === 'locating', onRefresh: () => void locateDevice(),
    onUseRoute: requestNearbyRoute, onOpenDetails: setDetailId,
  } : null

  const tabs: { id: Tab, label: string, icon: typeof Compass }[] = [
    { id: 'explore', label: t(language, 'tabExplore'), icon: Compass },
    { id: 'route', label: t(language, 'tabRoute'), icon: Route },
    ...(walkingDraft ? [{ id: 'directions' as const, label: t(language, 'streetDirections'), icon: Footprints }] : []),
    ...(carDraft ? [{ id: 'drive' as const, label: t(language, 'driveDirections'), icon: CarFront }] : []),
  ]

  const layout = wide ? 'wide' : mobileLayout
  const tripControls = <TripPanel language={language} session={session} starts={START_POINTS} alternativeStartId={plan.startId} places={catalogue} stops={stops}
    visits={plan.visits} route={routeForTrip} nextStopId={nextStopId} now={now} locating={geo.status === 'locating'} usingDevice={usingDevice}
    hasFix={acceptedPosition !== null || geo.position !== null}
    locationNotice={locationNotice} autoStatus={autoStatusText()} canStart={canStart} driving={driving.state} matrices={driving.cachedMatrices()}
    onCancelDriving={() => { estimateIntent.current += 1; setOptimizing(false); driving.release() }}
    onStart={startJourney} onSelectHome={selectHome} onUseLocation={() => void setHomeFromDevice()} onForgetLocation={forgetLocation}
    onPlanHighlights={stops.length === 0 && highlightIds.length > 0 ? () => void planHighlights() : undefined} planningHighlights={optimizing}
    onPickHome={() => pickTripPoint('home')} onAutoToggle={setAuto} onMode={changeTransport} onRecalculate={() => {
      void estimateSelection(plan, remainingOrigin(), settings)
    }} onAddFood={toggleStop} onOpenDetails={setDetailId} onToggleVisit={toggleVisit} onNavigateHome={navigateHome} />

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
      <TripBar language={language} session={session} route={routeForTrip} canStart={canStart} onStart={startJourney}
        onSettings={() => {
          setTab('route')
          if (!wide) setMobileLayout('list')
          requestAnimationFrame(() => {
            const panel = panelBody.current
            const section = panel?.querySelector<HTMLElement>('[data-testid="trip-home"]')
            if (!panel || !section) return
            panel.scrollTo({ top: panel.scrollTop + section.getBoundingClientRect().top - panel.getBoundingClientRect().top })
            section.querySelector<HTMLElement>('#trip-home-heading')?.focus({ preventScroll: true })
          })
        }} />
      {(wide || (tab !== 'directions' && tab !== 'drive')) && <AreaTabs language={language} area={session.settings.area} onChange={changeArea} />}
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
            <div className="panel__body" ref={panelBody} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {store.storageStatus === 'blocked' && <p className="banner banner--warn" role="status">{t(language, 'storageBlocked')}</p>}
              {store.storageStatus === 'load-error' && <p className="banner banner--warn" role="status">{t(language, 'storageLoadError')}</p>}
              {store.saveError && <p className="banner banner--warn" role="alert">{t(language, 'storageSaveError')}</p>}
              {tripPlanIssue && <p className="banner banner--warn" role="alert">{tripPlanIssue}</p>}
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
                  pandals={areaPlaces}
                  area={session.settings.area}
                  kind={placeKind}
                  mustVisit={mustVisit}
                  onKind={setPlaceKind}
                  onMustVisit={setMustVisit}
                  onPinLead={(lead) => pickTripPoint('place', lead)}
                  stopIds={plan.stopIds}
                  reports={plan.reports}
                  now={now}
                  origin={planOrigin}
                  selectedId={selectedId}
                  query={query}
                  zone={zone}
                  sort={sort}
                  nearby={nearby}
                  locationNotice={locationNotice}
                  locating={geo.status === 'locating'}
                  onUseLocation={() => void locateDevice()}
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
              ) : tab === 'drive' && carDraft ? (
                <DriveDirections language={language} originName={carContext?.origin.name ?? t(language, 'yourLocation')}
                  destinationName={carContext?.destination.name ?? (resolveWalkingDestination(carDraft)?.name ?? t(language, 'navigationTo'))}
                  result={driving.result} state={driving.state} locating={carLocating} issue={carIssue} progress={carProgress}
                  following={carFollowing} visible={foreground} selectedStep={carStep}
                  fallbackUrl={carContext && !carContext.privateDestination ? navigationUrl(carContext.destination, null, 'driving') : null}
                  onFollow={() => setCarFollowing(true)} onPause={() => setCarFollowing(false)}
                  onClose={() => { carIntent.current += 1; setCarDraft(null); setCarContext(null); setCarFollowing(false); setTab('route') }}
                  onRecalculate={(fromHere) => void calculateDriving(fromHere ? { ...carDraft, originId: 'current', originPoint: undefined } : carDraft)}
                  onStep={(index) => { setCarStep(index); const step = carResult?.route.steps[index]; if (step) focusPoint(step.at) }} />
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
                  tripControls={tripControls}
                  optimizing={optimizing}
                  canOptimize={session.home !== null}
                  lockedStopId={session.trip && ['running', 'paused'].includes(session.trip.status) ? session.trip.lockedNextStopId : null}
                  displayOrigin={journeyActive && snapshot ? snapshot.plan.origin.name : planOrigin?.name ?? t(language, 'chooseHome')}
                  publicOrigin={session.home?.kind === 'landmark' && !usingDevice && !journeyActive ? session.home.location : null}
                  plan={plan}
                  stops={stops}
                  visits={plan.visits}
                  startPoints={START_POINTS}
                  originMode={usingDevice ? 'device' : 'landmark'}
                  devicePosition={acceptedPosition ?? geo.position}
                  locationStatus={geo.status}
                  locationNotice={locationNotice}
                  nearby={nearby}
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
                  onStartChange={selectHome}
                  onUseLocation={() => void locateDevice()}
                  onForgetLocation={forgetLocation}
                  onPreference={(preference) => dispatch({ type: 'preference', preference })}
                  onPace={(pace) => dispatch({ type: 'pace', pace })}
                  onBudget={(availableMinutes) => dispatch({ type: 'budget', availableMinutes })}
                  onDeparture={setDeparture}
                  onMove={(id, delta) => dispatch({ type: 'move', id, delta })}
                  onRemove={(id) => toggleStop(id)}
                  onClear={() => {
                    originIntent.current += 1
                    dispatch({ type: 'stops', stopIds: [] })
                    setOriginMode('landmark')
                    setAcceptedPosition(null)
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
            pandals={catalogue.filter((place) => (browsableIds.has(place.id) && (session.settings.area === 'all' || place.city === session.settings.area)) || plan.stopIds.includes(place.id))}
            stopIds={plan.stopIds}
            visitedIds={visitedIds}
            selectedId={selectedId}
            nextStopId={journeyActive ? nextStopId : null}
            origin={null}
            home={session.home?.location ?? null}
            homeLabel={t(language, session.home?.kind === 'coordinate' ? 'homeOnly' : 'startOnly')}
            carDirections={tab === 'drive' && carResult ? { result: carResult, selectedStep: carStep } : null}
            devicePosition={freshFix}
            lastKnownPosition={lastKnownFix}
            vehicle={vehicle}
            segments={tab === 'directions' || tab === 'drive' ? [] : segments}
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
            picking={tripPick ? tripPick.kind === 'home' ? 'origin' : 'destination' : mapPick?.kind ?? null}
            pickCoverage={tripPick || mapPick?.draft.mode === 'driving' ? 'guide' : 'walking'}
            pickedPoint={tripPick?.point ?? mapPick?.point ?? null}
            onPickPoint={(point) => tripPick ? setTripPick((previous) => previous ? { ...previous, point } : null) : setMapPick((previous) => previous ? { ...previous, point } : null)}
            onCancelPick={() => tripPick ? finishTripPick(false) : cancelMapPick()}
            onConfirmPick={() => tripPick ? finishTripPick(true) : confirmMapPick()}
            metroStations={METRO_STATIONS}
            focus={focus}
            online={online}
            locating={geo.status === 'locating'}
            onSelect={setSelectedId}
            onOpenDetails={setDetailId}
            onNavigate={openNavigation}
            onToggleStop={toggleStop}
            onLocate={() => void locateDevice(false)}
            onFitRoute={() => focusBounds(tab === 'drive' && carResult ? carResult.route.geometry : tab === 'directions' && selectedStreetRoute ? selectedStreetRoute.geometry : session.home ? [session.home.location, ...stops] : stops, tab === 'directions' || tab === 'drive' ? 17 : 15)}
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
        pandals={catalogue.filter((place) => browsableIds.has(place.id) || plan.stopIds.includes(place.id))}
        startPoints={START_POINTS}
        plannedStart={publicHomeId ? START_POINTS.find((point) => point.id === publicHomeId) ?? null : session.home ? null : landmark}
        previousStop={navigationPrevious}
        recommendedMode={navigationLeg ? navigationMode(navigationLeg, 'fresh') : undefined}
        online={online}
        onChange={changeNavigation}
        onWalking={(draft) => void calculateWalking(draft)}
        onDriving={(draft) => void calculateDriving(draft)}
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
