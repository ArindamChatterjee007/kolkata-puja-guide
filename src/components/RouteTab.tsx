import {
  ArrowDown, ArrowUp, CarFront, Check, ExternalLink, Footprints, LocateFixed, MapPin, Play, Sparkles, Square,
  TrainFront, Trash2, TriangleAlert, Undo2,
} from 'lucide-react'
import type { Coordinate, Landmark, Language, Pace, Pandal, TravelPreference, Visit } from '../types'
import type { SavedPlan } from '../domain/storage'
import type { PlannedStop } from '../domain/route'
import type { LegEstimate } from '../domain/travel'
import type { DevicePosition, LocationErrorKind, LocationStatus } from '../hooks/useGeolocation'
import {
  crowdLabel, formatClock, formatDuration, formatDurationRange, formatMinuteRange, formatNumber, modeLabel, otherName,
  pickName, t,
} from '../i18n'
import type { MessageKey } from '../i18n'
import { Segmented } from './Segmented'
import { directionsUrl, explainLeg } from './uiState'
import type { DepartureOption, PlanFreshness, PlanSnapshot } from './uiState'

interface RouteTabProps {
  language: Language
  plan: SavedPlan
  stops: readonly Pandal[]
  visits: readonly Visit[]
  startPoints: readonly Landmark[]
  originMode: 'landmark' | 'device'
  devicePosition: DevicePosition | null
  locationStatus: LocationStatus
  locationError: LocationErrorKind | null
  departure: string
  departureChoices: readonly DepartureOption[]
  snapshot: PlanSnapshot | null
  freshness: PlanFreshness
  aged: boolean
  planError: boolean
  journeyActive: boolean
  autoCheckIn: boolean
  autoStatus: string | null
  nextStopId: string | null
  selectedId: string | null
  onStartChange: (startId: string) => void
  onUseLocation: () => void
  onForgetLocation: () => void
  onPreference: (preference: TravelPreference) => void
  onPace: (pace: Pace) => void
  onBudget: (minutes: number) => void
  onDeparture: (value: string) => void
  onMove: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onOptimize: () => void
  onTrim: () => void
  onOpenDetails: (id: string) => void
  onShowOnMap: (id: string) => void
  onToggleVisit: (id: string) => void
  onStartJourney: () => void
  onStopJourney: () => void
  onAutoToggle: (enabled: boolean) => void
}

const locationErrorKeys: Record<LocationErrorKind, MessageKey> = {
  denied: 'locDenied', unavailable: 'locUnavailable', timeout: 'locTimeout',
  unsupported: 'locUnsupported', insecure: 'locInsecure', outside: 'locOutside',
}

function ModeIcon({ mode }: { mode: LegEstimate['mode'] }) {
  if (mode === 'metro') return <TrainFront size={18} aria-hidden="true" />
  if (mode === 'road') return <CarFront size={18} aria-hidden="true" />
  return <Footprints size={18} aria-hidden="true" />
}

function LegOption({ language, option }: { language: Language, option: LegEstimate }) {
  return (
    <>
      <ModeIcon mode={option.mode} />
      <span>
        <strong>{modeLabel(language, option.mode)}</strong> {formatMinuteRange(language, option.durationMinutes)}
        {option.mode !== 'walk' && option.walkMetres > 0 && ` · ${t(language, 'walkingPart', { m: formatNumber(language, option.walkMetres) })}`}
        {option.mode === 'metro' && option.stationNames && option.stationNames.length > 0 && (
          <> · {t(language, 'via', { stations: `${option.stationNames[0]} → ${option.stationNames[option.stationNames.length - 1]}` })}</>
        )}
        {option.mode === 'metro' && option.transfers ? ` · ${t(language, 'transfers', { n: formatNumber(language, option.transfers) })}` : ''}
        {option.mode === 'road' && ` · ${t(language, 'modeRoadHint')}`}
      </span>
    </>
  )
}

export function RouteTab(props: RouteTabProps) {
  const {
    language, plan, stops, visits, startPoints, originMode, devicePosition, locationStatus, locationError,
    departure, departureChoices, snapshot, freshness, aged, planError, journeyActive, autoCheckIn, autoStatus,
    nextStopId, selectedId, onStartChange, onUseLocation, onForgetLocation, onPreference, onPace, onBudget,
    onDeparture, onMove, onRemove, onClear, onOptimize, onTrim, onOpenDetails, onShowOnMap, onToggleVisit,
    onStartJourney, onStopJourney, onAutoToggle,
  } = props
  const visitById = new Map(visits.map((visit) => [visit.pandalId, visit]))
  const route = snapshot?.plan ?? null
  const showEstimates = route !== null && freshness !== 'changed'
  const plannedById = new Map<string, PlannedStop>(route ? route.stops.map((stop) => [stop.pandalId, stop]) : [])
  const plannedIndex = new Map<string, number>(route ? route.stops.map((stop, index) => [stop.pandalId, index]) : [])
  const stopById = new Map(stops.map((stop) => [stop.id, stop]))
  const visitedCount = stops.filter((stop) => visitById.has(stop.id)).length
  const nextStop = nextStopId ? stopById.get(nextStopId) ?? null : null
  const landmark = startPoints.find((point) => point.id === plan.startId) ?? startPoints[0]
  const usingDevice = originMode === 'device' && devicePosition !== null
  const originName = usingDevice ? t(language, 'yourLocation') : pickName(language, landmark)
  const originPoint: Coordinate | null = usingDevice ? null : landmark

  const budgetOptions = [120, 240, 360, 480].map((minutes) => ({
    value: String(minutes), label: t(language, 'hours', { n: formatNumber(language, minutes / 60) }),
  }))
  const nextBudget = route?.overBudget ? [120, 240, 360, 480].find((minutes) => minutes > route.availableMinutes) ?? null : null

  function legDirectionsOrigin(index: number): Coordinate | null {
    if (!route) return originPoint
    if (index === 0) return originPoint
    const previous = stopById.get(route.stops[index - 1].pandalId)
    return previous ?? null
  }

  const settingsSection = (
    <section className="block settings" aria-label={t(language, 'travel')}>
        <div className="setting">
          <span className="setting__label">{t(language, 'travel')}</span>
          <Segmented<TravelPreference>
            label={t(language, 'travel')}
            value={plan.preference}
            onChange={onPreference}
            options={[
              { value: 'balanced', label: t(language, 'prefBalanced'), hint: t(language, 'prefBalancedHint') },
              { value: 'walk', label: t(language, 'prefWalk') },
              { value: 'less-walking', label: t(language, 'prefLess') },
            ]}
          />
        </div>
        <div className="setting">
          <span className="setting__label">{t(language, 'timeBudget')}</span>
          <Segmented<string>
            label={t(language, 'timeBudget')}
            value={budgetOptions.some((option) => option.value === String(plan.availableMinutes)) ? String(plan.availableMinutes) : 'custom'}
            onChange={(value) => onBudget(Number(value))}
            options={budgetOptions}
            compact
          />
        </div>
        <div className="setting setting--split">
          <div>
            <span className="setting__label">{t(language, 'pace')}</span>
            <Segmented<Pace>
              label={t(language, 'pace')}
              value={plan.pace}
              onChange={onPace}
              options={[
                { value: 'steady', label: t(language, 'paceSteady') },
                { value: 'relaxed', label: t(language, 'paceRelaxed') },
              ]}
              compact
            />
          </div>
          <label className="select select--stacked">
            <span className="setting__label">{t(language, 'leaveAt')}</span>
            <select value={departure} onChange={(event) => onDeparture(event.target.value)}>
              <option value="now">{t(language, 'now')}</option>
              {departureChoices.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(language, option.tomorrow ? 'tomorrowAt' : 'todayAt', { time: formatClock(language, option.timestamp) })}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
  )

  return (
    <div className="tab-body">
      {journeyActive && (
        <div className="journey-strip" role="status">
          <span className="journey-strip__dot" aria-hidden="true" />
          <strong>{t(language, 'journeyActive')}</strong>
          <span>{t(language, 'progress', { done: formatNumber(language, visitedCount), total: formatNumber(language, stops.length) })}</span>
          {nextStop && <span>· {t(language, 'nextStop')}: {pickName(language, nextStop)}</span>}
        </div>
      )}

      <section className="block" aria-labelledby="start-heading">
        <h2 id="start-heading" className="section-title">{t(language, 'startFrom')}</h2>
        <div className="start-row">
          <label className="select">
            <span className="sr-only">{t(language, 'startLandmark')}</span>
            <select value={plan.startId} onChange={(event) => onStartChange(event.target.value)} title={t(language, 'startLandmark')}>
              {startPoints.map((point) => (
                <option key={point.id} value={point.id}>{pickName(language, point)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`btn ${usingDevice ? 'btn--emerald' : 'btn--quiet'}`}
            onClick={onUseLocation}
            aria-pressed={usingDevice}
            aria-busy={locationStatus === 'locating'}
            disabled={locationStatus === 'locating'}
            title={t(language, 'useMyLocation')}
          >
            <LocateFixed size={18} aria-hidden="true" />
            {locationStatus === 'locating' ? t(language, 'locating') : t(language, 'useMyLocation')}
          </button>
        </div>
        {usingDevice && devicePosition && (
          <p className="hint hint--row">
            <span>{t(language, 'yourLocationAccuracy', { m: formatNumber(language, Math.round(devicePosition.accuracyMetres)) })} · {t(language, 'locationInMemory')}</span>
            <button type="button" className="btn btn--small btn--quiet" onClick={onForgetLocation}>{t(language, 'forgetLocation')}</button>
          </p>
        )}
        {locationError && locationStatus === 'error' && (
          <p className="hint hint--warn" role="alert">
            <TriangleAlert size={16} aria-hidden="true" /> {t(language, locationErrorKeys[locationError])}
          </p>
        )}
      </section>

      <section className="block" aria-labelledby="stops-heading">
        <div className="block__head">
          <h2 id="stops-heading" className="section-title">
            {t(language, 'stopsHeading')} <span className="count">{t(language, 'stopsOf', { n: formatNumber(language, stops.length) })}</span>
          </h2>
          {stops.length > 0 && (
            <button type="button" className="btn btn--small btn--quiet" onClick={onClear}>{t(language, 'clearStops')}</button>
          )}
        </div>

        <div className="optimize">
          <button type="button" className="btn btn--primary btn--block" onClick={onOptimize} disabled={stops.length === 0}>
            <Sparkles size={18} aria-hidden="true" />
            {snapshot ? t(language, 'reoptimize') : t(language, 'optimize')}
          </button>
          {planError && <p className="hint hint--warn" role="alert">{t(language, 'planFailed')}</p>}
          {snapshot && freshness === 'changed' && <p className="hint hint--warn">{t(language, 'planChanged')}</p>}
          {snapshot && freshness !== 'changed' && (freshness === 'visits-changed' || aged) && (
            <p className="hint">{t(language, 'planVisitsChanged')}</p>
          )}
        </div>

        {route && showEstimates && (
          <div className="estimate" aria-live="polite">
            <div className="estimate__head">
              <h3 className="estimate__title">{t(language, 'estimateHeading')}</h3>
              <p className="estimate__meta">{t(language, 'estimateMeta', { time: formatClock(language, route.departureTimestamp), origin: originName })}</p>
            </div>
            <p className="estimate__total">
              <strong>{t(language, 'totalDuration', { range: formatDurationRange(language, route.totals.durationMinutes) })}</strong>
              {route.stops.length > 0 && (
                <> · {t(language, 'finishBy', {
                  a: formatClock(language, route.stops[route.stops.length - 1].departureWindow.earliest),
                  b: formatClock(language, route.stops[route.stops.length - 1].departureWindow.latest),
                })}</>
              )}
            </p>
            <p className="estimate__breakdown">
              {t(language, 'breakdown', {
                travel: formatDuration(language, route.totals.travelMinutes.min) + ' – ' + formatDuration(language, route.totals.travelMinutes.max),
                queue: formatDuration(language, route.totals.queueMinutes.min) + ' – ' + formatDuration(language, route.totals.queueMinutes.max),
                visit: formatNumber(language, route.totals.visitMinutes),
                km: formatNumber(language, route.totals.walkKm, 1),
              })}
            </p>
            {route.overBudget && (
              <div className="hint hint--warn estimate__budget" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <div>
                  <p>{t(language, 'overBudget', { h: formatNumber(language, route.availableMinutes / 60, 1) })}</p>
                  {route.suggestedIds && route.suggestedIds.length > 0 ? (
                    <>
                      <p>{t(language, 'fitsBudget', { names: route.suggestedIds.map((id) => stopById.get(id)).filter(Boolean).map((stop) => pickName(language, stop!)).join(', ') })}</p>
                      <button type="button" className="btn btn--small btn--quiet" onClick={onTrim}>{t(language, 'trimToBudget')}</button>
                    </>
                  ) : (
                    <>
                      <p>{t(language, 'fitsNone')}</p>
                      {nextBudget !== null && (
                        <button type="button" className="btn btn--small btn--quiet" onClick={() => onBudget(nextBudget)}>
                          {t(language, 'extendBudget', { n: formatNumber(language, nextBudget / 60) })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            <p className="hint">{t(language, 'estimateNote')}</p>
          </div>
        )}
        {stops.length === 0 ? (
          <p className="empty">{t(language, 'emptyStops')}</p>
        ) : (
          <ol className="stop-list">
            {stops.map((stop, index) => {
              const name = pickName(language, stop)
              const visit = visitById.get(stop.id)
              const planned = showEstimates ? plannedById.get(stop.id) : undefined
              const legIndex = plannedIndex.get(stop.id)
              const isNext = nextStopId === stop.id
              return (
                <li key={stop.id} className={`stop${visit ? ' is-visited' : ''}${isNext && journeyActive ? ' is-next' : ''}${selectedId === stop.id ? ' is-selected' : ''}`}>
                  {planned && showEstimates && legIndex !== undefined && (
                    <div className="leg">
                      <div className="leg__main">
                        <ModeIcon mode={planned.leg.mode} />
                        <span>
                          <strong>{modeLabel(language, planned.leg.mode)}</strong> {formatMinuteRange(language, planned.leg.durationMinutes)}
                          {planned.leg.mode === 'metro' && planned.leg.stationNames && (
                            <> · {t(language, 'via', { stations: `${planned.leg.stationNames[0]} → ${planned.leg.stationNames[planned.leg.stationNames.length - 1]}` })}</>
                          )}
                        </span>
                        <span className="badge badge--emerald">{t(language, 'recommended')}</span>
                      </div>
                      <p className="leg__why">{explainLeg(language, planned.leg, planned.alternatives, plan.preference)}</p>
                      <details className="leg__alternatives">
                        <summary>{t(language, 'otherOptions')}</summary>
                        <ul>
                          {planned.alternatives.filter((option) => option !== planned.leg).map((option) => (
                            <li key={option.mode}><LegOption language={language} option={option} /></li>
                          ))}
                        </ul>
                        <a
                          className="link-external"
                          href={directionsUrl(stop, legDirectionsOrigin(legIndex), planned.leg.mode === 'walk' ? 'walking' : planned.leg.mode === 'metro' ? 'transit' : 'driving')}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={14} aria-hidden="true" /> {t(language, 'directions')}
                        </a>
                      </details>
                    </div>
                  )}
                  <div className="stop__row">
                    <span className={`stop__badge${visit ? ' stop__badge--visited' : ''}`} aria-hidden="true">
                      {visit ? <Check size={16} /> : formatNumber(language, index + 1)}
                    </span>
                    <div className="stop__main">
                      <button type="button" className="link-title" onClick={() => onOpenDetails(stop.id)} title={t(language, 'detailsFor', { name })}>
                        {name}
                      </button>
                      <span className="alt-name">{otherName(language, stop)}</span>
                      {visit ? (
                        <p className="stop__meta stop__meta--visited">
                          {t(language, 'visitedAt', { time: formatClock(language, visit.at) })}
                          {visit.method === 'auto' && ` · ${t(language, 'visitedAuto')}`}
                        </p>
                      ) : planned ? (
                        <p className="stop__meta">
                          {t(language, 'arriveWindow', { a: formatClock(language, planned.arrivalWindow.earliest), b: formatClock(language, planned.arrivalWindow.latest) })}
                          {' · '}
                          <span className={`crowd crowd--${planned.crowd.level}`}>{crowdLabel(language, planned.crowd.level)}</span>
                          {' · '}
                          {t(language, 'queueRange', { range: formatMinuteRange(language, planned.crowd.queueMinutes) })}
                          {' · '}
                          {t(language, 'visitRange', { n: formatNumber(language, planned.visitMinutes) })}
                        </p>
                      ) : (
                        <p className="stop__meta">{t(language, 'visitAllowance', { n: formatNumber(language, stop.visitMinutes) })}</p>
                      )}
                    </div>
                    <div className="stop__actions">
                      <button
                        type="button"
                        className={`icon-btn${visit ? ' is-on' : ''}`}
                        onClick={() => onToggleVisit(stop.id)}
                        aria-pressed={Boolean(visit)}
                        aria-label={visit ? t(language, 'unmarkVisitedFor', { name }) : t(language, 'markVisitedFor', { name })}
                        title={visit ? t(language, 'unmarkVisited') : t(language, 'markVisited')}
                      >
                        {visit ? <Undo2 size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
                      </button>
                      <button type="button" className="icon-btn" onClick={() => onShowOnMap(stop.id)} aria-label={`${t(language, 'showOnMap')}: ${name}`} title={t(language, 'showOnMap')}>
                        <MapPin size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => onMove(stop.id, -1)} disabled={index === 0} aria-label={t(language, 'moveUp', { name })} title={t(language, 'moveUp', { name })}>
                        <ArrowUp size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => onMove(stop.id, 1)} disabled={index === stops.length - 1} aria-label={t(language, 'moveDown', { name })} title={t(language, 'moveDown', { name })}>
                        <ArrowDown size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => onRemove(stop.id)} aria-label={t(language, 'removeFromRoute', { name })} title={t(language, 'remove')}>
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {settingsSection}

      <section className="block journey" aria-labelledby="journey-heading">
        <div className="block__head">
          <h2 id="journey-heading" className="section-title">{t(language, 'journey')}</h2>
          {stops.length > 0 && (
            <span className="count">{t(language, 'progress', { done: formatNumber(language, visitedCount), total: formatNumber(language, stops.length) })}</span>
          )}
        </div>
        {stops.length > 0 && (
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={visitedCount} aria-label={t(language, 'progress', { done: formatNumber(language, visitedCount), total: formatNumber(language, stops.length) })}>
            <span style={{ width: `${(visitedCount / stops.length) * 100}%` }} />
          </div>
        )}
        {journeyActive ? (
          <>
            {nextStop ? (
              <div className="next-stop">
                <span className="setting__label">{t(language, 'nextStop')}</span>
                <div className="next-stop__row">
                  <button type="button" className="link-title" onClick={() => onOpenDetails(nextStop.id)}>{pickName(language, nextStop)}</button>
                  <button type="button" className="btn btn--emerald btn--small" onClick={() => onToggleVisit(nextStop.id)}>
                    <Check size={16} aria-hidden="true" /> {t(language, 'markVisited')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="hint hint--ok">{t(language, 'allVisited')}</p>
            )}
            <label className="switch">
              <input type="checkbox" role="switch" checked={autoCheckIn} onChange={(event) => onAutoToggle(event.target.checked)} />
              <span className="switch__track" aria-hidden="true" />
              <span className="switch__text">
                <strong>{t(language, 'autoToggle')}</strong>
                <small>{t(language, 'autoHint')}</small>
              </span>
            </label>
            {autoCheckIn && autoStatus && <p className="hint" role="status">{autoStatus}</p>}
            <p className="hint">{t(language, 'gpsNote')}</p>
            <button type="button" className="btn btn--quiet btn--block" onClick={onStopJourney}>
              <Square size={16} aria-hidden="true" /> {t(language, 'stopJourney')}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--emerald btn--block" onClick={onStartJourney} disabled={stops.length === 0}>
            <Play size={16} aria-hidden="true" /> {t(language, 'startJourney')}
          </button>
        )}
      </section>
    </div>
  )
}
