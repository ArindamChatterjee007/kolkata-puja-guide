import { useState } from 'react'
import { CarFront, Check, Coffee, Footprints, Home, LocateFixed, MapPin, Navigation, Pause, Play, Plus,
  RefreshCw, Sparkles, Square, TrainFront, Trash2, Undo2, Volume2, X } from 'lucide-react'
import type { JourneyStop, Landmark, Language, NamedCoordinate, Transport, Visit } from '../types'
import type { RoutePlan } from '../domain/route'
import { getTripProgress } from '../domain/trip'
import type { TripHome } from '../domain/trip'
import type { TripSession } from '../hooks/useTripSession'
import { useIntervalNow } from '../hooks/useNow'
import type { DrivingLoadState } from '../hooks/useDrivingNavigation'
import type { DrivingMatrices } from '../domain/drivingAdapter'
import { createDrivingMatrixEstimator } from '../domain/drivingAdapter'
import { haversineMetres } from '../domain/geo'
import { PLACE_INSIGHTS } from '../data/placeInsights'
import { REGIONS } from '../data/regions'
import type { Area } from '../data/regions'
import { formatClock, formatDuration, formatDurationRange, formatNumber, formatTripClock, pickName, t } from '../i18n'
import { Segmented } from './Segmented'

export function AreaTabs({ language, area, onChange }: { language: Language; area: Area; onChange: (area: Area) => void }) {
  return <div className="area-tabs" role="group" aria-label={t(language, 'areas')}>
    {REGIONS.map((region) => <button type="button" key={region.id} aria-pressed={area === region.id}
      className={area === region.id ? 'is-active' : ''} onClick={() => onChange(region.id)}>{pickName(language, region)}</button>)}
    <button type="button" aria-pressed={area === 'all'} className={area === 'all' ? 'is-active' : ''} onClick={() => onChange('all')}>{t(language, 'allAreas')}</button>
  </div>
}

interface TripBarProps {
  language: Language
  session: TripSession
  route: RoutePlan<JourneyStop> | null
  canStart: boolean
  onStart: () => void
  onSettings: () => void
}

// Public landmarks are trip starts, never "home"; only a private coordinate is labelled as the user's home.
export function homeKindLabel(language: Language, home: TripHome | null): string {
  return t(language, home ? home.kind === 'coordinate' ? 'homeOnly' : 'startOnly' : 'home')
}

export function TripBar({ language, session, route, canStart, onStart, onSettings }: TripBarProps) {
  const now = useIntervalNow(session.trip?.status === 'running' && !session.needsResume ? 1_000 : 60_000)
  const progress = session.trip ? getTripProgress(session.trip, Math.max(now, session.trip.updatedAt), route ?? undefined) : null
  const active = progress?.status === 'running' || progress?.status === 'paused'
  const elapsed = Math.floor((progress?.elapsedActiveMinutes ?? 0) * 60)
  const elapsedText = `${formatNumber(language, Math.floor(elapsed / 60))}:${(elapsed % 60).toLocaleString(language === 'bn' ? 'bn-IN' : 'en-IN', { minimumIntegerDigits: 2 })}`
  const finish = progress?.finishWindow ?? route?.estimatedFinish
  const remaining = progress?.remainingEstimate ?? route?.totals.durationMinutes
  const resume = session.needsResume || progress?.status === 'paused'
  const ModeIcon = session.settings.transport === 'personal' ? CarFront : session.settings.transport === 'walk' ? Footprints : TrainFront
  return <section className="trip-bar" aria-label={t(language, 'tripSummary')} data-testid="trip-bar" data-status={progress?.status ?? 'idle'} data-home={session.home?.kind ?? 'none'}>
    <button type="button" className={`trip-bar__home${session.home ? '' : ' is-empty'}`} onClick={onSettings} title={t(language, 'chooseHome')}>
      <Home size={18} aria-hidden="true" /><span><small>{homeKindLabel(language, session.home)}</small><strong>{session.home?.location.name ?? t(language, 'chooseHome')}</strong></span>
      <ModeIcon size={18} aria-hidden="true" />
    </button>
    <div className="trip-bar__times">
      <span><small>{t(language, active ? 'tripElapsed' : progress?.status === 'completed' ? 'tripDone' : 'tripPlanned')}</small>
        <strong data-testid="trip-elapsed">{progress && progress.status !== 'idle' ? elapsedText : remaining ? formatDurationRange(language, remaining) : '--'}</strong></span>
      {active && <span><small>{t(language, 'tripRemaining')}</small><strong>{remaining ? formatDurationRange(language, remaining) : '--'}</strong></span>}
      <span><small>{t(language, 'tripBackHome')}</small><strong data-testid="trip-finish">{finish
        ? `${formatTripClock(language, finish.earliest, now)} - ${formatTripClock(language, finish.latest, now)}` : '--'}</strong></span>
    </div>
    <div className="trip-bar__actions">
      {!active || resume ? <button type="button" className="icon-btn is-on" disabled={!canStart} onClick={onStart}
        aria-label={t(language, resume ? 'tripResume' : 'startJourney')} title={t(language, resume ? 'tripResume' : 'startJourney')}><Play size={20} aria-hidden="true" /></button>
        : <button type="button" className="icon-btn" onClick={session.pause} aria-label={t(language, 'tripPause')} title={t(language, 'tripPause')}><Pause size={20} aria-hidden="true" /></button>}
      {active && !resume && <button type="button" className="icon-btn" disabled={Boolean(session.trip?.activeBreak)} onClick={() => session.takeBreak(15)} aria-label={t(language, 'tripBreak')} title={t(language, 'tripBreak')}><Coffee size={20} aria-hidden="true" /></button>}
      {active && <button type="button" className="icon-btn" onClick={session.finish} aria-label={t(language, 'tripEnd')} title={t(language, 'tripEnd')}><Square size={18} aria-hidden="true" /></button>}
    </div>
  </section>
}

export function foodDetour(place: JourneyStop, from: NamedCoordinate, to: NamedCoordinate, timestamp: number,
  matrices: DrivingMatrices | null): { metres: number; minutes: { min: number; max: number } | null } {
  const metres = Math.max(0, haversineMetres(from, place) + haversineMetres(place, to) - haversineMetres(from, to))
  if (matrices) {
    try {
      const estimate = createDrivingMatrixEstimator(matrices)
      const input = { preference: 'balanced' as const, pace: 'steady' as const, transport: 'personal' as const, departureTimestamp: timestamp }
      const direct = estimate({ ...input, from, to }).recommended
      const outbound = estimate({ ...input, from, to: place }).recommended
      const onward = estimate({ ...input, from: place, to, departureTimestamp: timestamp + outbound.scoreMinutes * 60_000 }).recommended
      return { metres: Math.max(0, outbound.distanceMetres + onward.distanceMetres - direct.distanceMetres), minutes: {
        min: Math.max(0, outbound.durationMinutes.min + onward.durationMinutes.min - direct.durationMinutes.max),
        max: Math.max(0, outbound.durationMinutes.max + onward.durationMinutes.max - direct.durationMinutes.min),
      } }
    } catch { return { metres, minutes: null } }
  }
  return { metres, minutes: null }
}

interface TripPanelProps {
  language: Language
  session: TripSession
  starts: readonly Landmark[]
  alternativeStartId: string
  places: readonly JourneyStop[]
  stops: readonly JourneyStop[]
  visits: readonly Visit[]
  route: RoutePlan<JourneyStop> | null
  nextStopId: string | null
  now: number
  locating: boolean
  usingDevice: boolean
  hasFix: boolean
  locationNotice: string | null
  autoStatus: string | null
  canStart: boolean
  driving: DrivingLoadState
  matrices: DrivingMatrices | null
  onCancelDriving: () => void
  onStart: () => void
  onSelectHome: (id: string) => void
  onPlanHighlights?: () => void
  planningHighlights?: boolean
  onUseLocation: () => void
  onForgetLocation: () => void
  onPickHome: () => void
  onAutoToggle: (enabled: boolean) => void
  onMode: (mode: Transport) => void
  onRecalculate: () => void
  onAddFood: (id: string) => void
  onOpenDetails: (id: string) => void
  onToggleVisit: (id: string) => void
  onNavigateHome: () => void
}

export function TripPanel(props: TripPanelProps) {
  const { language, session, starts, places, stops, visits, route, nextStopId, now, locating, usingDevice, hasFix,
    locationNotice, autoStatus, canStart, driving, matrices, onStart, onSelectHome, onUseLocation, onForgetLocation,
    onPickHome, onAutoToggle, onMode, onRecalculate, onAddFood, onOpenDetails, onToggleVisit, onNavigateHome, onCancelDriving } = props
  const [minutes, setMinutes] = useState(15)
  const [afterMinutes, setAfterMinutes] = useState(60)
  const [anchor, setAnchor] = useState('elapsed')
  const trip = session.trip
  const active = trip?.status === 'running' || trip?.status === 'paused'
  const progress = trip ? getTripProgress(trip, Math.max(now, trip.updatedAt), route ?? undefined) : null
  const currentActivity = trip?.activities.find((activity) => activity.departedAt === null)
  const activePlace = currentActivity ? places.find((place) => place.id === currentActivity.stopId) : null
  const next = places.find((place) => place.id === nextStopId)
  const visitedCount = stops.filter((stop) => visits.some((visit) => visit.pandalId === stop.id)).length
  const from = route?.origin ?? session.home?.location
  const to = next ?? session.home?.location
  const foods = from && to ? places.filter((place) => place.kind === 'restaurant' && !stops.some((stop) => stop.id === place.id))
    .map((place) => ({ place, detour: foodDetour(place, from, to, now, matrices) }))
    .sort((first, second) => first.detour.metres - second.detour.metres).slice(0, 3) : []
  const homeId = session.home?.kind === 'landmark' ? session.home.id : ''
  const homeLocked = Boolean(active && session.home)
  const savedStart = !session.home ? starts.find((start) => start.id === props.alternativeStartId) : undefined
  const areaRegion = REGIONS.find((region) => region.id === session.settings.area)
  const areaName = areaRegion ? pickName(language, areaRegion) : t(language, 'allAreas')
  const canConfirmHome = Boolean(active && !nextStopId && !trip?.activeBreak && !currentActivity && !session.needsResume)
  const returnNextDay = route && new Date(route.estimatedFinish.latest + 19_800_000).toISOString().slice(0, 10)
    !== new Date(route.departureTimestamp + 19_800_000).toISOString().slice(0, 10)

  function addBreak() {
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120 || !Number.isFinite(afterMinutes) || session.settings.breaks.length >= 24) return
    session.updateSettings({ breaks: [...session.settings.breaks, { id: `scheduled-${Date.now()}`, minutes,
      ...(anchor === 'elapsed' ? { afterMinutes: Math.max(0, Math.min(1_440, afterMinutes)) } : { afterStopId: anchor }) }] })
  }

  return <div className="trip-settings" data-testid="trip-settings">
    {session.needsHome && <p role="status" className="banner banner--warn">{t(language, 'reselectHome')}</p>}
    {session.storageError && <p role="status" className="hint hint--warn">{session.storageError}</p>}
    <section className="block trip-home" aria-label={t(language, 'startFrom')} data-testid="trip-home" data-home={session.home?.kind ?? 'none'}>
      <h2 className="section-title" id="trip-home-heading">{homeKindLabel(language, session.home)}</h2>
      {session.home
        ? <div className={`trip-home__current trip-home__current--${session.home.kind === 'coordinate' ? 'home' : 'start'}`}>
          {session.home.kind === 'coordinate' ? <Home size={20} aria-hidden="true" /> : <MapPin size={20} aria-hidden="true" />}
          <span><strong>{session.home.location.name}</strong>
            <small>{t(language, homeLocked ? 'homeLocked' : session.home.kind === 'landmark' ? 'homeLandmarkNote'
              : session.settings.rememberHome ? 'homeRemembered' : 'homeInMemory')}</small></span>
        </div>
        : <p className="trip-home__lead"><span className="trip-home__area">{t(language, 'areas')}: {areaName}</span>{t(language, 'homeLead')}</p>}
      <div className="trip-home-actions">
        <button type="button" className="btn btn--primary" onClick={onUseLocation} disabled={locating || homeLocked} aria-busy={locating}>
          <LocateFixed size={18} aria-hidden="true" />{t(language, locating ? 'locating' : 'useLocationAsHome')}</button>
        <button type="button" className="btn btn--quiet" onClick={onPickHome} disabled={homeLocked}><MapPin size={18} aria-hidden="true" />{t(language, 'pickHome')}</button>
      </div>
      <details className="trip-home__other" data-testid="trip-home-other">
        <summary>{t(language, 'chooseOtherStart')}</summary>
        {savedStart && <button type="button" className="btn btn--quiet btn--block" onClick={() => onSelectHome(savedStart.id)}>
          <MapPin size={18} aria-hidden="true" />{t(language, 'useSavedStart', { name: pickName(language, savedStart) })}</button>}
        <label className="select select--stacked"><span className="sr-only">{t(language, 'startLandmark')}</span>
          <select value={homeId} disabled={homeLocked} onChange={(event) => onSelectHome(event.target.value)}>
            <option value="">{t(language, 'publicStartPlaceholder')}</option>
            {starts.map((start) => <option key={start.id} value={start.id}>{pickName(language, start)}</option>)}
          </select>
        </label>
        <p className="hint">{t(language, 'publicStartNote')}</p>
      </details>
      <label className="trip-check"><input type="checkbox" checked={session.settings.rememberHome} onChange={(event) => session.updateSettings({ rememberHome: event.target.checked })} />{t(language, 'rememberHome')}</label>
      {session.home?.kind !== 'coordinate' && <p className="hint">{t(language, 'homeNotShared')}</p>}
      {(hasFix || usingDevice || locating) && <button type="button" className="btn btn--small btn--quiet" onClick={onForgetLocation}>{t(language, 'forgetLocation')}</button>}
      {locationNotice && <p className="hint hint--warn" role="alert">{locationNotice}</p>}
    </section>
    <section className="block trip-options" aria-label={t(language, 'transport')}>
      <Segmented<Transport> label={t(language, 'transport')} value={session.settings.transport} onChange={onMode} compact options={[
        { value: 'personal', label: <><CarFront size={17} aria-hidden="true" />{t(language, 'ownCar')}</> },
        { value: 'public', label: <><TrainFront size={17} aria-hidden="true" />{t(language, 'publicTrip')}</> },
        { value: 'walk', label: <><Footprints size={17} aria-hidden="true" />{t(language, 'walkTrip')}</> },
      ]} />
      <Segmented label={t(language, 'orderMode')} value={session.settings.orderMode} onChange={(orderMode) => session.updateSettings({ orderMode })} compact options={[
        { value: 'fastest', label: t(language, 'fastestRoundTrip') }, { value: 'nearest', label: t(language, 'nearestOrder') },
      ]} />
      <p className="hint">{t(language, 'fastestHint')}</p>
      {session.settings.transport === 'public' && stops.some((stop) => stop.city !== 'kolkata') && <p className="hint hint--warn">{t(language, 'noRegionalMetro')}</p>}
      {driving.status === 'loading' && <div className="hint" role="status" data-testid="car-progress">
        {driving.progress?.phase === 'matrix' ? t(language, 'matrixProgress', { hour: driving.progress.hour, done: driving.progress.completedRows, total: driving.progress.totalRows })
          : `${t(language, 'loadDriving')}${driving.progress?.phase === 'static' ? `: ${formatNumber(language, Math.round(driving.progress.loadedBytes / 1024))} KB` : ''}`}
        <button type="button" className="icon-btn" onClick={onCancelDriving} title={t(language, 'cancel')} aria-label={t(language, 'cancel')}><X size={18} aria-hidden="true" /></button>
      </div>}
      {driving.status === 'error' && <p className="hint hint--warn" role="alert">{driving.message}</p>}
      <label className="trip-check"><input type="checkbox" role="switch" checked={session.settings.autoArrival} onChange={(event) => onAutoToggle(event.target.checked)} />{t(language, 'autoToggle')}</label>
      <p className="hint">{t(language, 'autoNotice')}</p>
      <div className="trip-sound"><label className="trip-check"><input type="checkbox" checked={session.settings.arrivalSound} onChange={(event) => session.setSound(event.target.checked)} />{t(language, 'arrivalSound')}</label>
        <button type="button" className="icon-btn" onClick={() => void session.testSound()} title={t(language, 'soundTest')} aria-label={t(language, 'soundTest')}><Volume2 size={18} aria-hidden="true" /></button></div>
      {session.soundUnavailable && <p className="hint" role="status">{t(language, 'soundUnavailable')}</p>}
      {autoStatus && <p className="hint" role="status">{autoStatus}</p>}
      {stops.length > 0 && <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={visitedCount}
        aria-label={t(language, 'progress', { done: formatNumber(language, visitedCount), total: formatNumber(language, stops.length) })}>
        <span style={{ width: `${visitedCount / stops.length * 100}%` }} />
      </div>}
      {active && next && <div className="next-stop"><span className="setting__label">{t(language, 'nextStop')}</span>
        <div className="next-stop__row"><button type="button" className="link-title" onClick={() => onOpenDetails(next.id)}>{pickName(language, next)}</button>
          <button type="button" className="btn btn--emerald btn--small" disabled={trip?.status !== 'running' || session.needsResume} onClick={() => onToggleVisit(next.id)}><Check size={16} aria-hidden="true" />{t(language, 'markVisited')}</button></div>
      </div>}
      {(!active || trip?.status === 'paused' || session.needsResume) && <button type="button" className="btn btn--emerald btn--block" disabled={!canStart} onClick={onStart}>
        <Play size={18} aria-hidden="true" />{t(language, active ? 'tripResume' : 'startJourney')}</button>}
      {!active && props.onPlanHighlights && <button type="button" className="btn btn--quiet btn--block" disabled={!session.home || props.planningHighlights} onClick={props.onPlanHighlights}>
        <Sparkles size={18} aria-hidden="true" />{t(language, 'planThemedHighlights')}</button>}
      {!session.home && !session.needsHome && stops.length > 0 && <p className="hint hint--warn" data-testid="home-required">{t(language, 'homeRequired')}</p>}
      {trip?.status === 'paused' && <p className="hint">{t(language, 'tripPausedNote')}</p>}
      {progress && active && <p className="hint">{t(language, 'tripWall')}: {formatDuration(language, progress.elapsedWallMinutes)}</p>}
      {currentActivity && <div className="trip-dwell"><strong>{activePlace ? pickName(language, activePlace) : currentActivity.stopId}</strong>
        <p>{t(language, 'tripRemaining')}: {formatDuration(language, progress?.dwellRemainingMinutes ?? 0)}</p>
        <button type="button" className="btn btn--quiet" disabled={trip?.status !== 'running' || session.needsResume} onClick={() => session.continueTrip(nextStopId ?? undefined)}><Play size={16} aria-hidden="true" />{t(language, 'tripContinue')}</button></div>}
      {trip?.activeBreak && <div className="trip-dwell"><strong>{t(language, 'tripBreak')}: {formatDuration(language, progress?.breakRemainingMinutes ?? 0)}</strong>
        <button type="button" className="btn btn--quiet" disabled={trip.status !== 'running' || session.needsResume} onClick={() => session.endBreak(nextStopId ?? undefined)}><Play size={16} aria-hidden="true" />{t(language, 'tripEndBreak')}</button></div>}
      {active && <button type="button" className="btn btn--quiet" onClick={onRecalculate}><RefreshCw size={16} aria-hidden="true" />{t(language, 'replanFromHere')}</button>}
    </section>
    <details className="block trip-breaks"><summary>{t(language, 'breaksHeading')}</summary>
      <div className="trip-break-editor">
        <label>{t(language, 'breakMinutes')}<input type="number" min={5} max={120} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
        <label>{t(language, 'breakAfter')}<select value={anchor} onChange={(event) => setAnchor(event.target.value)}>
          <option value="elapsed">{t(language, 'breakAfterMinutes')}</option>
          {stops.map((stop) => <option key={stop.id} value={stop.id}>{t(language, 'breakAfterStop')}: {pickName(language, stop)}</option>)}
        </select></label>
        {anchor === 'elapsed' && <label>{t(language, 'breakAfterMinutes')}<input type="number" min={0} max={1440} step={15} value={afterMinutes} onChange={(event) => setAfterMinutes(Number(event.target.value))} /></label>}
        <button type="button" className="btn btn--quiet" onClick={addBreak}><Plus size={18} aria-hidden="true" />{t(language, 'addBreak')}</button>
        {trip?.status === 'running' && !trip.activeBreak && <button type="button" className="btn btn--quiet" onClick={() => session.takeBreak(minutes)} disabled={minutes < 5 || minutes > 120}><Coffee size={18} aria-hidden="true" />{t(language, 'tripBreak')}</button>}
      </div>
      <ul className="trip-break-list">{session.settings.breaks.map((pause) => <li key={pause.id}>
        <span>{pause.afterStopId ? pickName(language, places.find((place) => place.id === pause.afterStopId) ?? { name: pause.afterStopId }) : `${t(language, 'breakAfterMinutes')}: ${pause.afterMinutes ?? 0}`}</span>
        <input aria-label={t(language, 'breakMinutes')} type="number" min={5} max={120} step={5} value={pause.minutes} onChange={(event) => {
          const value = Number(event.target.value)
          if (value >= 5 && value <= 120) session.updateSettings({ breaks: session.settings.breaks.map((entry) => entry.id === pause.id ? { ...entry, minutes: value } : entry) })
        }} />
        {trip?.status === 'running' && !trip.completedBreakIds.includes(pause.id) && !trip.skippedBreakIds.includes(pause.id) && <button className="btn btn--small" type="button" onClick={() => session.takeBreak(pause.minutes, pause.id)} disabled={Boolean(trip.activeBreak)}><Coffee size={16} aria-hidden="true" />{t(language, 'tripBreak')}</button>}
        <button className="icon-btn" type="button" title={t(language, 'removeBreak')} aria-label={t(language, 'removeBreak')} onClick={() => {
          if (trip?.status === 'running' || trip?.status === 'paused') session.skipBreak(pause.id)
          session.updateSettings({ breaks: session.settings.breaks.filter((entry) => entry.id !== pause.id) })
        }}><Trash2 size={16} aria-hidden="true" /></button>
      </li>)}</ul>
      <ul className="food-suggestions">{foods.map(({ place, detour }) => <li key={place.id}>
        <button type="button" className="link-title" onClick={() => onOpenDetails(place.id)}>{pickName(language, place)}</button>
        <p>{PLACE_INSIGHTS[place.id]?.food?.cuisine?.join(', ') ?? t(language, 'hoursUnknown')}</p>
        <small>{detour.minutes ? t(language, 'detourRoad', { minutes: formatDurationRange(language, detour.minutes) }) : t(language, 'detourApprox', { km: formatNumber(language, detour.metres / 1000, 1) })}</small>
        <a href={place.sourceUrl} target="_blank" rel="noopener noreferrer">{t(language, 'source')}</a>
        <button type="button" className="btn btn--quiet" disabled={stops.length >= 12} onClick={() => onAddFood(place.id)}><Plus size={16} aria-hidden="true" />{t(language, 'add')}</button>
      </li>)}</ul>
      <p className="hint">{t(language, 'foodNote')} {t(language, 'hoursUnknown')}</p>
    </details>
    {route?.homeLeg && <section className="block trip-return" aria-label={t(language, 'returnHome')} data-testid="return-home">
      <h3 className="section-title"><Home size={18} aria-hidden="true" />{t(language, 'returnHome')}</h3>
      <p>{session.home?.location.name}</p><p>{formatDurationRange(language, route.homeLeg.durationMinutes)} · {formatTripClock(language, route.estimatedFinish.latest, now)}</p>
      <p className="hint">{t(language, 'tripUpdated', { time: formatClock(language, route.departureTimestamp) })}</p>
      {returnNextDay && <p className="hint hint--warn" role="status">{t(language, 'tripNextDay')}</p>}
      <button type="button" className="btn btn--quiet" onClick={onNavigateHome}><Navigation size={18} aria-hidden="true" />{t(language, 'returnHome')}</button>
      {canConfirmHome && <button type="button" className="btn btn--emerald" onClick={session.finish}><Check size={18} aria-hidden="true" />{t(language, 'arrivedHome')}</button>}
    </section>}
    {visits.length > 0 && <details className="block trip-history"><summary>{t(language, 'tripHistory')} ({formatNumber(language, visits.length)})</summary>
      <ol>{[...visits].sort((first, second) => second.at - first.at).map((visit) => {
        const place = places.find((entry) => entry.id === visit.pandalId)
        if (!place) return null
        return <li key={visit.pandalId}><span><strong>{pickName(language, place)}</strong><small>{formatTripClock(language, visit.at, now)} · {visit.method === 'auto' ? t(language, 'visitedAuto') : t(language, 'markVisited')}</small>
          {!stops.some((stop) => stop.id === visit.pandalId) && <small>{t(language, 'unplannedVisit')}</small>}</span>
          <button type="button" className="icon-btn" title={t(language, 'undo')} aria-label={`${t(language, 'undo')}: ${pickName(language, place)}`} onClick={() => onToggleVisit(place.id)}><Undo2 size={18} aria-hidden="true" /></button></li>
      })}</ol>
    </details>}
  </div>
}