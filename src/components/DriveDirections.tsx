import { ArrowUp, ArrowUpLeft, ArrowUpRight, CarFront, CornerUpLeft, CornerUpRight, ExternalLink, Flag,
  Navigation, Pause, RotateCw, RotateCcw, Undo2, X } from 'lucide-react'
import type { Language } from '../types'
import type { DrivingManeuver, DrivingRouteResult } from '../domain/driving'
import type { StreetProgress } from '../domain/streets'
import type { DrivingLoadState } from '../hooks/useDrivingNavigation'
import { formatDate, formatMinuteRange, formatNumber, t } from '../i18n'
import { streetManeuverKeys } from './streetNavigation'

const arrows: Record<DrivingManeuver, typeof ArrowUp> = {
  depart: CarFront, continue: ArrowUp, 'bear-left': ArrowUpLeft, 'bear-right': ArrowUpRight,
  'turn-left': CornerUpLeft, 'turn-right': CornerUpRight, 'u-turn': Undo2, arrive: Flag,
  'enter-roundabout': RotateCw, 'exit-roundabout': CornerUpLeft,
}

function maneuverLabel(language: Language, maneuver: DrivingManeuver): string {
  if (maneuver === 'enter-roundabout') return language === 'bn' ? 'গোলচত্বরে ঢুকুন' : 'Enter roundabout'
  if (maneuver === 'exit-roundabout') return language === 'bn' ? 'গোলচত্বর ছাড়ুন' : 'Leave roundabout'
  return t(language, streetManeuverKeys[maneuver])
}

interface Props {
  language: Language
  originName: string
  destinationName: string
  result: DrivingRouteResult | null
  state: DrivingLoadState
  locating: boolean
  issue: string | null
  progress: StreetProgress | null
  following: boolean
  visible: boolean
  selectedStep: number | null
  fallbackUrl: string | null
  onFollow: () => void
  onPause: () => void
  onClose: () => void
  onRecalculate: (fromHere: boolean) => void
  onStep: (index: number) => void
}

export function DriveDirections({ language, originName, destinationName, result, state, locating, issue, progress,
  following, visible, selectedStep, fallbackUrl, onFollow, onPause, onClose, onRecalculate, onStep }: Props) {
  const route = result?.status === 'ok' ? result.route : null
  const index = Math.max(0, Math.min(progress?.stepIndex ?? 0, (route?.steps.length ?? 1) - 1))
  const current = route?.steps[index]
  const Arrow = current ? arrows[current.maneuver] : Navigation
  const distance = (metres: number) => `${formatNumber(language, Math.round(metres))} m`
  return <section className="directions tab-body" aria-label={t(language, 'driveDirections')} data-testid="drive-directions">
    <header className="directions__header"><div className="directions__places"><span>{originName}</span><h2>{destinationName}</h2></div>
      <button className="icon-btn" type="button" onClick={onClose} aria-label={t(language, 'close')} title={t(language, 'close')}><X size={20} aria-hidden="true" /></button></header>
    {(locating || state.status === 'loading') && <p role="status" className="directions__loading">{t(language, locating ? 'locating' : 'loadDriving')}
      {state.status === 'loading' && state.progress?.phase === 'static' && `: ${formatNumber(language, Math.round(state.progress.loadedBytes / 1024))} KB`}</p>}
    {issue && <p role="status" className="hint hint--warn">{issue}</p>}
    {(result?.status === 'unavailable' || state.status === 'error') && <p className="banner banner--warn" role="alert">{t(language, 'carRouteUnavailable')}
      {result?.status === 'unavailable' && <small>{result.reason}</small>}</p>}
    {route && result?.status === 'ok' && <>
      <button type="button" className="btn btn--primary btn--block" onClick={following ? onPause : onFollow}>
        {following ? <Pause size={18} aria-hidden="true" /> : <Navigation size={18} aria-hidden="true" />}{t(language, following ? 'streetPause' : 'driveFollow')}</button>
      <div className="directions__turn" role="status" aria-live="polite"><Arrow size={28} aria-hidden="true" />
        <div><strong>{current && maneuverLabel(language, current.maneuver)}</strong><span>{current?.name ?? t(language, 'streetUnnamed')}{current?.ref ? ` · ${current.ref}` : ''}</span></div>
        <small>{!visible && following ? t(language, 'autoPaused') : progress?.status === 'off-route' ? t(language, 'streetOffRoute')
          : progress?.status === 'uncertain' ? t(language, 'driveNoFix') : progress?.status === 'arrived' ? t(language, 'carSnapArrival')
            : `${distance(progress?.remainingMetres ?? route.metres)} · ${t(language, 'carNetwork')}`}</small>
        {current && <small>{distance(Math.max(0, route.cumulativeMetres[current.endGeometryIndex] - (progress?.alongMetres ?? 0)))}</small>}
      </div>
      <div className="directions__summary"><strong>{formatNumber(language, route.metres / 1000, 2)} km</strong>
        <span>{formatMinuteRange(language, { min: route.estimatedSeconds.min / 60, max: route.estimatedSeconds.max / 60 })}</span><small>{t(language, 'fastestHint')}</small></div>
      <ol className="directions__steps" aria-label={t(language, 'streetSteps')}>{route.steps.map((step, stepIndex) => {
        const StepArrow = arrows[step.maneuver]
        return <li key={stepIndex}><button type="button" className={`directions__step${selectedStep === stepIndex ? ' is-selected' : ''}`}
          data-step-index={stepIndex} aria-current={index === stepIndex ? 'step' : undefined} onClick={() => onStep(stepIndex)}>
          <StepArrow size={22} aria-hidden="true" /><span><strong>{maneuverLabel(language, step.maneuver)}</strong>
            <span className="directions__road">{step.name ?? t(language, 'streetUnnamed')}{step.ref ? ` · ${step.ref}` : ''}</span>
            <small>{[step.flags.flyover ? t(language, 'carFlyover') : step.flags.bridge ? t(language, 'carBridge') : '', step.flags.toll ? t(language, 'carToll') : '', step.flags.tunnel ? t(language, 'streetTunnel') : ''].filter(Boolean).join(' · ')}</small></span>
          <span className="directions__distance">{distance(step.metres)}</span></button></li>
      })}</ol>
      <p className="hint">{t(language, 'carAccessNote')}</p>
      <p className="hint">{t(language, 'streetStartGap', { distance: distance(result.snaps.origin.offsetMetres) })} {t(language, 'streetDestinationGap', { distance: distance(result.snaps.destination.offsetMetres) })}</p>
      <details className="directions__source"><summary>{t(language, 'source')}</summary><p>{formatDate(language, result.source.timestamp.slice(0, 10))} · OpenStreetMap / Geofabrik · ODbL-1.0</p>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
        <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
    </>}
    {!locating && state.status !== 'loading' && <button type="button" className="btn btn--quiet" onClick={() => onRecalculate(Boolean(progress))}><RotateCcw size={18} aria-hidden="true" />{t(language, progress ? 'replanFromHere' : 'streetRetry')}</button>}
    {fallbackUrl && <a className="btn btn--quiet directions__external" href={fallbackUrl} target="_blank" rel="noopener noreferrer" data-testid="external-navigation-launch"><ExternalLink size={17} aria-hidden="true" />{t(language, 'streetExternal')}</a>}
  </section>
}