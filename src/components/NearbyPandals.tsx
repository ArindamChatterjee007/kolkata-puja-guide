import { Check, LocateFixed, Route } from 'lucide-react'
import type { Language } from '../types'
import { formatClock, formatNumber, pickName, t } from '../i18n'
import { NEARBY_RADIUS_METRES } from './uiState'
import type { NearbyCandidates } from './uiState'

export interface NearbyPandalsProps {
  language: Language
  nearby: NearbyCandidates
  accuracyMetres: number
  lastKnown: boolean
  updatedAt: number
  inUse: boolean
  locating: boolean
  onRefresh: () => void
  onUseRoute: () => void
  onOpenDetails: (id: string) => void
}

export function NearbyPandals({ language, nearby, accuracyMetres, lastKnown, updatedAt, inUse, locating, onRefresh, onUseRoute, onOpenDetails }: NearbyPandalsProps) {
  return (
    <section className="nearby" aria-labelledby="nearby-heading">
      <div className="nearby__head">
        <div>
          <h2 className="section-title" id="nearby-heading">{t(language, nearby.withinRadius ? 'nearbyHeading' : 'closestHeading')}</h2>
          <p className="nearby__source" role="status" aria-live="polite" aria-atomic="true">
            {t(language, lastKnown ? 'lastKnownLocation' : 'fromCurrentLocation')}
            {' · '}{t(language, 'locationUpdated', { time: formatClock(language, updatedAt) })}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onRefresh} disabled={locating} aria-label={t(language, 'refreshNearby')} title={t(language, 'refreshNearby')}>
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="nearby__meta">{t(language, 'nearbyDistanceNote', { m: formatNumber(language, Math.round(accuracyMetres)) })}</p>
      {!nearby.withinRadius && nearby.candidates.length > 0 && (
        <p className="nearby__meta">{t(language, 'noNearby', { km: formatNumber(language, NEARBY_RADIUS_METRES / 1_000) })}</p>
      )}
      {nearby.candidates.length > 0 ? (
        <>
          <button type="button" className="btn btn--emerald btn--block nearby__apply" disabled={locating || inUse} onClick={onUseRoute}>
            {inUse ? <Check size={18} aria-hidden="true" /> : <Route size={18} aria-hidden="true" />}
            <span>{t(language, inUse ? 'nearbyRouteInUse' : nearby.withinRadius ? 'useNearbyRoute' : 'useClosestRoute')}</span>
            <span className="nearby__count">{t(language, 'stopsCount', { n: formatNumber(language, nearby.candidates.length) })}</span>
          </button>
          <ul className="nearby__list">
            {nearby.candidates.map(({ pandal, distanceMetres }) => (
              <li key={pandal.id} data-nearby-pandal={pandal.id}>
                <button type="button" className="link-title" onClick={() => onOpenDetails(pandal.id)} title={t(language, 'detailsFor', { name: pickName(language, pandal) })}>
                  {pickName(language, pandal)}
                </button>
                <span className="nearby__distance">{t(language, 'distanceKm', { km: formatNumber(language, distanceMetres / 1_000, 2) })}</span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="hint">{t(language, 'nearbyNone')}</p>}
    </section>
  )
}