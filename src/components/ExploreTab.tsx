import { ImageOff, LocateFixed, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Coordinate, CrowdReport, JourneyStop, Language, StopKind, Zone } from '../types'
import { estimateCrowd } from '../domain/crowd'
import { CATALOGUE_NOTICE } from '../data/pandals'
import type { CuratedRoute } from '../data/pandals'
import { PANDAL_MEDIA } from '../data/pandalMedia'
import type { Landmark } from '../types'
import { crowdLabel, formatNumber, otherName, pickName, t, zoneLabel } from '../i18n'
import { PandalPreview } from './PandalPreview'
import { RegionalPreviews } from './RegionalPreviews'
import { NearbyPandals } from './NearbyPandals'
import type { NearbyPandalsProps } from './NearbyPandals'
import { matchesPandal, sortPandals } from './uiState'
import type { SortMode } from './uiState'
import { hasCrowdModel, isEditorPick } from '../data/regions'
import type { Area } from '../data/regions'
import { REGIONAL_COVERAGE_NOTICES, UNLOCATED_PUJA_LEADS } from '../data/regionalPlaces'
import type { UnlocatedPujaLead } from '../data/regionalPlaces'
import { PLACE_INSIGHTS, RECENT_COVERAGE } from '../data/placeInsights'
import { Segmented } from './Segmented'

const ZONES: Zone[] = ['North', 'Central', 'South', 'Behala', 'Salt Lake', 'New Town']

interface ExploreTabProps {
  language: Language
  pandals: readonly JourneyStop[]
  area?: Area
  kind?: StopKind | 'all'
  mustVisit?: boolean
  onKind?: (kind: StopKind | 'all') => void
  onMustVisit?: (checked: boolean) => void
  onPinLead?: (lead: UnlocatedPujaLead) => void
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
  const { area = 'kolkata', kind = 'pandal', mustVisit = false, onKind, onMustVisit, onPinLead } = props
  const filtering = query.trim() !== '' || zone !== 'all'
  const filtered = sortPandals(
    pandals.filter((pandal) => (zone === 'all' || pandal.zone === zone) && (kind === 'all' || (pandal.kind ?? 'pandal') === kind)
      && (!mustVisit || isEditorPick(pandal)) && matchesPandal(pandal, query, zoneLabel('bn', pandal.zone))),
    sort, language, origin,
  )
  const full = stopIds.length >= 12
  const stopKey = [...stopIds].sort().join(',')

  const curatedSection = !filtering && area === 'kolkata' && kind === 'pandal' && !mustVisit && (
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
      {onKind && <Segmented label={t(language, 'placeKinds')} value={kind} onChange={onKind} compact options={[
        { value: 'pandal', label: t(language, 'pujaKind') }, { value: 'restaurant', label: t(language, 'foodKind') },
        { value: 'sight', label: t(language, 'sightKind') }, { value: 'all', label: t(language, 'allKinds') },
      ]} />}
      {onMustVisit && <label className="trip-check"><input type="checkbox" checked={mustVisit} onChange={(event) => onMustVisit(event.target.checked)} />{t(language, 'mustVisit')}</label>}
      {area !== 'kolkata' && <p className="hint hint--warn" data-testid="regional-coverage">
        {area === 'all' ? `${REGIONAL_COVERAGE_NOTICES.asansol[language]} ${REGIONAL_COVERAGE_NOTICES.durgapur[language]}` : REGIONAL_COVERAGE_NOTICES[area][language]}
      </p>}
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

      {area === 'kolkata' && <div className="chips" role="group" aria-label={t(language, 'zoneFilter')}>
        <button type="button" className={`chip${zone === 'all' ? ' is-active' : ''}`} aria-pressed={zone === 'all'} onClick={() => onZone('all')}>
          {t(language, 'allZones')}
        </button>
        {ZONES.map((item) => (
          <button key={item} type="button" className={`chip${zone === item ? ' is-active' : ''}`} aria-pressed={zone === item} onClick={() => onZone(item)}>
            {zoneLabel(language, item)}
          </button>
        ))}
      </div>}

      {!nearby && curatedSection}

      <section aria-labelledby="catalogue-heading" className="catalogue">
        <div className="catalogue__head">
          <h2 id="catalogue-heading" className="section-title">{t(language, kind === 'pandal' ? 'resultCount' : 'placesCount', { n: formatNumber(language, filtered.length) })}</h2>
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
              const crowd = hasCrowdModel(pandal) ? estimateCrowd(pandal, now, report) : null
              const insight = PLACE_INSIGHTS[pandal.id]
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
                    {PANDAL_MEDIA[pandal.id] ? <PandalPreview language={language} media={PANDAL_MEDIA[pandal.id]} variant="thumb" />
                      : <span className="place-no-photo" title={t(language, 'noPlacePhoto')}><ImageOff size={24} aria-hidden="true" /><span className="sr-only">{t(language, 'noPlacePhoto')}</span></span>}
                  </button>
                  <div className="pandal-row__main">
                    <button type="button" className="link-title" onClick={() => onOpenDetails(pandal.id)} title={details}>
                      {name}
                    </button>
                    <div className="pandal-row__meta">
                      <span className="alt-name">{otherName(language, pandal)}</span>
                      <span className="chip-static">{pandal.zone ? zoneLabel(language, pandal.zone) : pandal.city}</span>
                      {isEditorPick(pandal) && <span className="badge badge--emerald">{t(language, 'featuredLabel')}</span>}
                      {crowd && <span className={`crowd crowd--${crowd.level}`}>
                        <span className="crowd__basis">{t(language, crowd.basis === 'local-report' ? 'crowdReported' : 'crowdEstimated')}:</span>{' '}
                        {crowdLabel(language, crowd.level)}
                      </span>}
                      {insight?.food && <span>{insight.food.cuisine?.join(', ') ?? t(language, 'hoursUnknown')}</span>}
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
      {area !== 'kolkata' && <details className="block unlocated-leads">
        <summary>{t(language, 'unlocatedLeads')}</summary>
        <p className="hint">{t(language, 'manualPinNote')}</p>
        <ul>{UNLOCATED_PUJA_LEADS.filter((lead) => area === 'all' || lead.city === area).map((lead) => <li key={lead.id}>
          <strong>{pickName(language, lead)}</strong><p>{lead.address ?? lead.locationNote}</p>
          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">{t(language, 'source')}</a>
          {onPinLead && <button type="button" className="btn btn--quiet" onClick={() => onPinLead(lead)}><MapPin size={16} aria-hidden="true" />{t(language, 'pinPlace')}</button>}
          <RegionalPreviews language={language} previews={PLACE_INSIGHTS[lead.id]?.media.previews ?? []} />
        </li>)}</ul>
      </details>}
      {area !== 'kolkata' && <details className="block recent-coverage"><summary>{t(language, 'recentCoverage')}</summary>
        <p className="hint">{t(language, 'noTrending')}</p>
        <ul>{RECENT_COVERAGE.filter((entry) => area === 'all' || entry.city === area).map((entry) => <li key={entry.id}>
          <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.title}</a>
          <small>{entry.publisher} · {entry.publishedAt}</small><p>{entry.summary}</p>
        </li>)}</ul>
      </details>}
    </div>
  )
}
