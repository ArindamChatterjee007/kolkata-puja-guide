import { useEffect, useRef } from 'react'
import {
  ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, ExternalLink, Flag,
  Footprints, MapPin, Navigation, Pause, Pencil, RotateCcw, Undo2, X,
} from 'lucide-react'
import type { Language, Pace } from '../types'
import type { StreetManeuver, StreetProgress, StreetStep, StreetStrategy } from '../domain/streets'
import type { StreetNavigationState } from '../hooks/streetWorkerClient'
import { formatClock, formatDate, formatMinuteRange, formatNumber, t } from '../i18n'
import type { MessageKey } from '../i18n'
import { Segmented } from './Segmented'
import { streetManeuverKeys, streetWalkingTime } from './streetNavigation'

const arrows: Record<StreetManeuver, typeof ArrowUp> = {
  depart: Footprints, continue: ArrowUp, 'bear-left': ArrowUpLeft, 'bear-right': ArrowUpRight,
  'turn-left': CornerUpLeft, 'turn-right': CornerUpRight, 'u-turn': Undo2, arrive: Flag,
}

// Junction hops below this length are real OSM steps that only need a compact row.
const SHORT_STEP_METRES = 20

function isShortStep(step: StreetStep): boolean {
  return step.metres < SHORT_STEP_METRES && step.maneuver !== 'depart' && step.maneuver !== 'arrive'
}

function focusIsLoose(): boolean {
  return !document.activeElement || document.activeElement === document.body
}

interface DirectionsPanelProps {
  language: Language
  originName: string
  destinationName: string
  state: StreetNavigationState
  locating: boolean
  issue: MessageKey | null
  strategy: StreetStrategy
  pace: Pace
  stale: boolean
  crowdAt: number | null
  progress: StreetProgress | null
  following: boolean
  visible: boolean
  locationError: string | null
  selectedStep: number | null
  fallbackUrl: string | null
  onStrategy: (strategy: StreetStrategy) => void
  onFollow: () => void
  onPause: () => void
  onClose: () => void
  onEdit: () => void
  onPick: (kind: 'origin' | 'destination') => void
  onRecalculate: (fromHere: boolean) => void
  onStep: (index: number) => void
}

export function DirectionsPanel({
  language, originName, destinationName, state, locating, issue, strategy, pace, stale, crowdAt, progress,
  following, visible, locationError, selectedStep, fallbackUrl, onStrategy, onFollow, onPause, onClose,
  onEdit, onPick, onRecalculate, onStep,
}: DirectionsPanelProps) {
  const result = state.status === 'ready' && state.result.status === 'ok' ? state.result : null
  const route = result ? strategy === 'quieter' && result.alternativesDiffer ? result.quieter : result.shortest : null
  const distance = (metres: number) => t(language, 'metres', { m: formatNumber(language, Math.round(metres)) })
  const unavailable = state.status === 'ready' && state.result.status === 'unavailable' ? state.result.reason : null
  const unavailableKey = unavailable === 'disconnected' ? 'streetDisconnected'
    : unavailable === 'no-nearby-street' ? 'streetNoNearby' : 'streetOutside'
  const errorKey = state.status === 'error' ? state.code === 'network' ? 'streetNetworkError'
    : state.code === 'timeout' ? 'streetTimeout' : 'streetDataError' : null
  const currentIndex = Math.min(progress?.stepIndex ?? 0, (route?.steps.length ?? 1) - 1)
  const current = route?.steps[currentIndex]
  const next = route?.steps[currentIndex + 1]
  const atDestination = current?.maneuver === 'arrive'
  const CurrentArrow = current ? arrows[current.maneuver] : Navigation
  const nextMetres = current && route ? Math.max(0, route.cumulativeMetres[current.endGeometryIndex] - (progress?.alongMetres ?? 0)) : 0
  const idle = !following && !progress
  const progressKey = !visible && following ? 'autoPaused' : idle ? 'streetReady' : !following ? 'streetPaused'
    : !progress ? 'autoWaiting' : progress.status === 'off-route' ? 'streetOffRoute'
      : progress.status === 'uncertain' ? 'streetUncertain' : progress.status === 'arrived' ? 'streetNearDestination' : 'streetFollowing'

  const headingRef = useRef<HTMLHeadingElement>(null)
  const turnRef = useRef<HTMLDivElement>(null)
  const ready = route !== null
  const previousReady = useRef(ready)
  const previousFollowing = useRef(following)
  // Only the ready and start transitions move focus, and only when the triggering control has gone.
  useEffect(() => {
    const becameReady = ready && !previousReady.current
    const startedFollowing = following && !previousFollowing.current
    previousReady.current = ready
    previousFollowing.current = following
    if (!focusIsLoose()) return
    if (startedFollowing) turnRef.current?.focus()
    else if (becameReady) headingRef.current?.focus()
  }, [ready, following])

  return (
    <section className="directions tab-body" aria-label={t(language, 'streetDirections')}>
      <header className="directions__header">
        <div className="directions__places">
          <span>{originName}</span>
          <h2 ref={headingRef} tabIndex={-1}>{destinationName}</h2>
        </div>
        <button className="icon-btn" type="button" onClick={onEdit} title={t(language, 'streetEdit')} aria-label={t(language, 'streetEdit')}><Pencil size={18} aria-hidden="true" /></button>
        <button className="icon-btn" type="button" onClick={onClose} title={t(language, 'streetClose')} aria-label={t(language, 'streetClose')}><X size={20} aria-hidden="true" /></button>
      </header>
      {(locating || state.status === 'loading') && (
        <div className="directions__loading" role="status" aria-busy="true">
          <RotateCcw size={20} aria-hidden="true" />
          <span>{t(language, locating ? 'locating' : 'streetLoading')}</span>
          {state.status === 'loading' && <small>{t(language, 'streetLoadProgress', { n: formatNumber(language, state.loadedBytes / 1024 / 1024, 1) })}</small>}
        </div>
      )}
      {issue && <p className="banner banner--warn" role="alert">{t(language, issue)}</p>}
      {locationError && (following || issue === 'streetLocationFailed') && <p className="banner banner--warn" role="status">{locationError}</p>}
      {(unavailable || errorKey) && <p className="banner banner--warn" role="alert">{t(language, errorKey ?? unavailableKey)}</p>}
      {(!route && !locating && state.status !== 'loading') && (
        <button className="btn btn--primary" type="button" onClick={() => onRecalculate(false)}><RotateCcw size={18} aria-hidden="true" />{t(language, 'streetRetry')}</button>
      )}
      {route && result && (
        <>
          {idle && <button className="btn btn--primary btn--block" type="button" onClick={onFollow}>
            <Navigation size={18} aria-hidden="true" />{t(language, 'streetStartWalking')}
          </button>}
          <div ref={turnRef} tabIndex={-1} className={`directions__turn${following || progress ? ' directions__turn--controls' : ''}${progress?.status === 'off-route' || progress?.status === 'uncertain' ? ' is-uncertain' : ''}`} role="status" aria-live="polite">
            <span className="directions__follow-state">{t(language, progressKey)}</span>
            {(following || progress) && <button className="icon-btn directions__pause" type="button" onClick={following ? onPause : onFollow} title={t(language, following ? 'streetPause' : 'streetStartWalking')} aria-label={t(language, following ? 'streetPause' : 'streetStartWalking')}>
              {following ? <Pause size={18} aria-hidden="true" /> : <Navigation size={18} aria-hidden="true" />}
            </button>}
            <CurrentArrow size={26} aria-hidden="true" />
            {atDestination
              ? <div><strong>{destinationName}</strong><span>{t(language, 'streetArrivedRoad')}</span></div>
              : <div><strong>{current && t(language, streetManeuverKeys[current.maneuver])}</strong><span>{current?.name ?? t(language, 'streetUnnamed')}</span></div>}
            {atDestination
              ? <p className="directions__gap-note">{t(language, 'streetArrivedGap', { distance: distance(result.destinationSnap.offsetMetres) })}</p>
              : next && <p>{t(language, 'streetNextTurn', { action: t(language, streetManeuverKeys[next.maneuver]), distance: distance(nextMetres) })}{next.name ? ` · ${next.name}` : ''}</p>}
            {!idle && <small>{t(language, atDestination ? 'streetRemainingMapped' : 'streetRemaining', { distance: distance(progress?.remainingMetres ?? route.metres) })}</small>}
          </div>
          {progress?.status === 'off-route' && <button className="btn btn--primary" type="button" onClick={() => onRecalculate(true)}><RotateCcw size={18} aria-hidden="true" />{t(language, 'streetRecalculateHere')}</button>}
          {result.alternativesDiffer && (
            <Segmented<StreetStrategy> label={t(language, 'streetShowRoutes')} value={strategy} onChange={onStrategy} options={[
              { value: 'shortest', label: t(language, 'streetShortest') },
              { value: 'quieter', label: t(language, 'streetQuieter') },
            ]} />
          )}
          <div className="directions__summary" data-strategy={route.strategy}>
            <span className="directions__strategy">{t(language, route.strategy === 'shortest' ? 'streetShortest' : 'streetQuieter')} · {t(language, 'streetMappedRoads')}</span>
            <strong>{distance(route.metres)}</strong>
            <span>{formatMinuteRange(language, streetWalkingTime(route.metres, pace))}</span>
            {route.strategy === 'quieter' && <span className="directions__extra">{t(language, 'streetExtra', {
              distance: distance(Math.max(0, route.metres - result.shortest.metres)),
              time: formatMinuteRange(language, streetWalkingTime(Math.max(0, route.metres - result.shortest.metres), pace)),
            })}</span>}
            <small>{t(language, 'streetWalkEstimate')}</small>
          </div>
          {!result.alternativesDiffer && <p className="hint directions__no-alternative">{t(language, 'streetNoAlternative')}</p>}
          {stale && <div className="banner banner--warn" role="status"><span>{t(language, 'streetStale')}</span><button className="btn btn--small" type="button" onClick={() => onRecalculate(false)}><RotateCcw size={16} aria-hidden="true" />{t(language, 'streetRecalculate')}</button></div>}
          <ol className="directions__steps" aria-label={t(language, 'streetSteps')}>
            {route.steps.map((step, index) => {
              const Arrow = arrows[step.maneuver]
              const arrival = step.maneuver === 'arrive'
              return (
                <li key={index}>
                  <button type="button" className={`directions__step${selectedStep === index ? ' is-selected' : ''}${isShortStep(step) ? ' is-short' : ''}`} onClick={() => onStep(index)} aria-current={currentIndex === index ? 'step' : undefined} data-step-index={index}>
                    <Arrow size={22} aria-hidden="true" />
                    <span><strong>{t(language, streetManeuverKeys[step.maneuver])}</strong><span className="directions__road">{arrival ? t(language, 'streetArrivedGap', { distance: distance(result.destinationSnap.offsetMetres) }) : step.name ?? t(language, 'streetUnnamed')}</span>
                      {step.flags !== 0 && <small>{[step.flags & 1 ? t(language, 'streetBridge') : '', step.flags & 2 ? t(language, 'streetStairs') : '', step.flags & 4 ? t(language, 'streetTunnel') : ''].filter(Boolean).join(' · ')}</small>}
                    </span>
                    {!arrival && <span className="directions__distance">{distance(step.metres)}</span>}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="directions__gaps">
            <p>{t(language, 'streetStartGap', { distance: distance(result.originSnap.offsetMetres) })}</p>
            <p>{t(language, 'streetDestinationGap', { distance: distance(result.destinationSnap.offsetMetres) })}</p>
            <p className="hint">{t(language, 'streetGapNote')}</p>
          </div>
          <details className="directions__source">
            <summary>{t(language, 'streetSource')}</summary>
            <p>{t(language, route.strategy === 'quieter' ? 'streetGraphQuieter' : 'streetGraphOnly')}</p>
            <p><time dateTime={result.sourceTimestamp}>{t(language, 'streetSourceDate', { date: formatDate(language, result.sourceTimestamp.slice(0, 10)) })}</time></p>
            {crowdAt !== null && <p>{t(language, 'streetCrowdAsOf', { time: formatClock(language, crowdAt) })}</p>}
            <p>{t(language, 'streetCrowdModel')}</p>
            <p>{t(language, 'streetCrowdLimits')}</p>
            <p>{t(language, 'streetLimits')}</p>
            <p>{t(language, 'streetAccessLimits')}</p>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
            <a href={`${import.meta.env.BASE_URL}data/Kolkata-walking.LICENSE.md`} target="_blank" rel="noopener noreferrer">{t(language, 'streetLicense')}</a>
          </details>
        </>
      )}
      <div className="directions__pick">
        <button className="btn btn--small btn--quiet" type="button" onClick={() => onPick('origin')}><MapPin size={17} aria-hidden="true" />{t(language, 'streetPickStart')}</button>
        <button className="btn btn--small btn--quiet" type="button" onClick={() => onPick('destination')}><MapPin size={17} aria-hidden="true" />{t(language, 'streetPickDestination')}</button>
      </div>
      {fallbackUrl && <a className="btn btn--quiet directions__external" data-testid="external-navigation-launch" href={fallbackUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} aria-hidden="true" />{t(language, 'streetExternal')}</a>}
    </section>
  )
}