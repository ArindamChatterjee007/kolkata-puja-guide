import { LocateFixed, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Coordinate, CrowdReport, Language, Pandal, Zone } from '../types'
import { estimateCrowd } from '../domain/crowd'
import { CATALOGUE_NOTICE } from '../data/pandals'
import type { CuratedRoute } from '../data/pandals'
import { PANDAL_MEDIA } from '../data/pandalMedia'
import type { Landmark } from '../types'
import { crowdLabel, formatNumber, otherName, pickName, t, zoneLabel } from '../i18n'
import { PandalPreview } from './PandalPreview'
import { NearbyPandals } from './NearbyPandals'
import type { NearbyPandalsProps } from './NearbyPandals'
import { matchesPandal, sortPandals } from './uiState'
import type { SortMode } from './uiState'

const ZONES: Zone[] = ['North', 'Central', 'South', 'Behala', 'Salt Lake', 'New Town']

interface ExploreTabProps {
  language: Language
  pandals: readonly Pandal[]
  stopIds: readonly string[]
  reports: readonly CrowdReport[]
  now: number
  origin: Coordinate | null
  selectedId: string | null
  query: string
  zone: Zone | 'all'
  sort: SortMode
  nearby: NearbyPandalsProps | null
  locationNotice: string | null
  locating: boolean
  onUseLocation: () => void
  curatedRoutes: readonly CuratedRoute[]
  startPoints: readonly Landmark[]
  onQuery: (query: string) => void
  onZone: (zone: Zone | 'all') => void
  onSort: (sort: SortMode) => void
  onUseRoute: (route: CuratedRoute) => void
  onToggleStop: (id: string) => void
  onOpenDetails: (id: string) => void
  onShowOnMap: (id: string) => void
}

export function ExploreTab(props: ExploreTabProps) {
  const {
    language, pandals, stopIds, reports, now, origin, selectedId, query, zone, sort, curatedRoutes, startPoints,
    onQuery, onZone, onSort, onUseRoute, onToggleStop, onOpenDetails, onShowOnMap,
    nearby, locationNotice, locating, onUseLocation,
  } = props
  const filtering = query.trim() !== '' || zone !== 'all'
  const filtered = sortPandals(
    pandals.filter((pandal) => (zone === 'all' || pandal.zone === zone) && matchesPandal(pandal, query, zoneLabel('bn', pandal.zone))),
    sort, language, origin,
  )
  const full = stopIds.length >= 12
  const stopKey = [...stopIds].sort().join(',')

  const curatedSection = !filtering && (
    <section className="routes" aria-labelledby="routes-heading">
      <div className="routes__head">
        <figure className="strip">
          <img
            src={`${import.meta.env.BASE_URL}images/puja-kolkata.webp`}
            width={720}
            height={960}
            alt={t(language, 'photoCaption')}
            loading="lazy"
            decoding="async"
          />
        </figure>
        <div className="routes__intro">
          <h2 id="routes-heading" className="section-title">{t(language, 'suggestedRoutes')}</h2>
          <p className="strip__credit">
            {t(language, 'photoCredit')}{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Kolkata_Durga_Puja_Pandle_1.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
            {' · '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
          </p>
        </div>
      </div>
      <ul className="route-list">
        {curatedRoutes.map((route) => {
          const inUse = [...route.stopIds].sort().join(',') === stopKey
          const start = startPoints.find((point) => point.id === route.startId)
          return (
            <li key={route.id} className="route-item">
              <div className="route-item__text">
                <strong lang={language}>{pickName(language, route)}</strong>
                <span className="alt-name">{otherName(language, route)}</span>
                <p>{language === 'bn' ? route.descriptionBn : route.description}</p>
                <small>
                  {t(language, 'stopsCount', { n: formatNumber(language, route.stopIds.length) })}
                  {start && ` · ${t(language, 'startFrom')}: ${pickName(language, start)}`}
                </small>
              </div>
              {inUse ? (
                <span className="badge badge--emerald">{t(language, 'routeInUse')}</span>
              ) : (
                <button type="button" className="btn btn--quiet" onClick={() => onUseRoute(route)}>
                  {t(language, 'useRoute')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )

  return (
    <div className="tab-body">
      {nearby ? <NearbyPandals {...nearby} /> : (
        <div className="explore-location">
          <button type="button" className="btn btn--quiet" onClick={onUseLocation} disabled={locating}>
            <LocateFixed size={18} aria-hidden="true" /> {t(language, locating ? 'locating' : 'useMyLocation')}
          </button>
        </div>
      )}
      {locationNotice && <p className="hint hint--warn" role="alert">{locationNotice}</p>}
      <div className="search">
        <label className="search__field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t(language, 'searchLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="icon-btn icon-btn--inline" onClick={() => onQuery('')} aria-label={t(language, 'clearSearch')} title={t(language, 'clearSearch')}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </label>
        <label className="select select--inline">
          <span className="sr-only">{t(language, 'sortLabel')}</span>
          <select value={sort} onChange={(event) => onSort(event.target.value as SortMode)} title={t(language, 'sortLabel')}>
            <option value="zone">{t(language, 'sortLabel')}: {t(language, 'sortZone')}</option>
            <option value="name">{t(language, 'sortLabel')}: {t(language, 'sortName')}</option>
            <option value="popular">{t(language, 'sortLabel')}: {t(language, 'sortPopular')}</option>
            {origin && <option value="nearest">{t(language, 'sortLabel')}: {t(language, 'sortNearest')}</option>}
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label={t(language, 'zoneFilter')}>
        <button type="button" className={`chip${zone === 'all' ? ' is-active' : ''}`} aria-pressed={zone === 'all'} onClick={() => onZone('all')}>
          {t(language, 'allZones')}
        </button>
        {ZONES.map((item) => (
          <button key={item} type="button" className={`chip${zone === item ? ' is-active' : ''}`} aria-pressed={zone === item} onClick={() => onZone(item)}>
            {zoneLabel(language, item)}
          </button>
        ))}
      </div>

      {!nearby && curatedSection}

      <section aria-labelledby="catalogue-heading" className="catalogue">
        <div className="catalogue__head">
          <h2 id="catalogue-heading" className="section-title">{t(language, 'resultCount', { n: formatNumber(language, filtered.length) })}</h2>
          <details className="notice">
            <summary>{t(language, 'catalogueNotice')}</summary>
            <p>{CATALOGUE_NOTICE[language]}</p>
          </details>
        </div>
        {filtered.length === 0 ? (
          <p className="empty">{t(language, 'noResults')}</p>
        ) : (
          <ul className="pandal-list">
            {filtered.map((pandal, index) => {
              const inRoute = stopIds.includes(pandal.id)
              const name = pickName(language, pandal)
              const report = reports.find((item) => item.pandalId === pandal.id)
              const crowd = estimateCrowd(pandal, now, report)
              const details = t(language, 'detailsFor', { name })
              return (
                <li
                  key={pandal.id}
                  className={`pandal-row${selectedId === pandal.id ? ' is-selected' : ''}`}
                  data-pandal={pandal.id}
                  style={{ '--stagger': `${Math.min(index, 8) * 20}ms` } as CSSProperties}
                >
                  {/* Pointer shortcut only: the title button is the keyboard and screen-reader route to details. */}
                  <button type="button" className="pandal-row__thumb" tabIndex={-1} onClick={() => onOpenDetails(pandal.id)} aria-label={details} title={details}>
                    <PandalPreview language={language} media={PANDAL_MEDIA[pandal.id]} variant="thumb" />
                  </button>
                  <div className="pandal-row__main">
                    <button type="button" className="link-title" onClick={() => onOpenDetails(pandal.id)} title={details}>
                      {name}
                    </button>
                    <div className="pandal-row__meta">
                      <span className="alt-name">{otherName(language, pandal)}</span>
                      <span className="chip-static">{zoneLabel(language, pandal.zone)}</span>
                      <span className={`crowd crowd--${crowd.level}`}>
                        <span className="crowd__basis">{t(language, crowd.basis === 'local-report' ? 'crowdReported' : 'crowdEstimated')}:</span>{' '}
                        {crowdLabel(language, crowd.level)}
                      </span>
                      <span>{t(language, 'visitAllowance', { n: formatNumber(language, pandal.visitMinutes) })}</span>
                    </div>
                  </div>
                  <div className="pandal-row__actions">
                    <button type="button" className="icon-btn" onClick={() => onShowOnMap(pandal.id)} aria-label={`${t(language, 'showOnMap')}: ${name}`} title={t(language, 'showOnMap')}>
                      <MapPin size={20} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`btn ${inRoute ? 'btn--quiet' : 'btn--primary'}`}
                      onClick={() => onToggleStop(pandal.id)}
                      disabled={!inRoute && full}
                      aria-label={inRoute ? t(language, 'removeFromRoute', { name }) : t(language, 'addToRoute', { name })}
                      title={!inRoute && full ? t(language, 'routeFull') : undefined}
                    >
                      {inRoute ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                      {inRoute ? t(language, 'remove') : t(language, 'add')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {nearby && curatedSection}
    </div>
  )
}
