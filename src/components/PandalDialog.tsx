import { Check, ExternalLink, MapPin, Minus, Navigation, Plus, Undo2 } from 'lucide-react'
import type { CrowdLevel, CrowdReport, Language, MetroStation, Pandal, Visit } from '../types'
import { estimateCrowd } from '../domain/crowd'
import { haversineMetres } from '../domain/geo'
import { crowdLabel, formatClock, formatDate, formatDuration, formatMinuteRange, formatNumber, otherName, pickName, t, zoneLabel } from '../i18n'
import { Modal } from './Modal'
import { reportTimeLeftMs } from './uiState'

interface PandalDialogProps {
  language: Language
  pandal: Pandal | null
  now: number
  stopIds: readonly string[]
  visit: Visit | undefined
  report: CrowdReport | undefined
  metroStations: readonly MetroStation[]
  onClose: () => void
  onNavigate: (id: string) => void
  onToggleStop: (id: string) => void
  onToggleVisit: (id: string) => void
  onReport: (id: string, level: CrowdLevel) => void
  onClearReport: (id: string) => void
  onShowOnMap: (id: string) => void
}

const LEVELS: CrowdLevel[] = ['light', 'moderate', 'heavy']

export function PandalDialog(props: PandalDialogProps) {
  const {
    language, pandal, now, stopIds, visit, report, metroStations,
    onClose, onToggleStop, onToggleVisit, onReport, onClearReport, onShowOnMap, onNavigate,
  } = props
  const open = pandal !== null
  const name = pandal ? pickName(language, pandal) : ''
  const crowd = pandal ? estimateCrowd(pandal, now, report) : null
  const inRoute = pandal ? stopIds.includes(pandal.id) : false
  const metro = pandal?.nearestMetro ? metroStations.find((station) => station.id === pandal.nearestMetro) : undefined
  const metroMetres = pandal && metro ? haversineMetres(pandal, metro) : null
  const metroDistance = metroMetres === null ? null
    : metroMetres < 950 ? t(language, 'metres', { m: formatNumber(language, Math.round(metroMetres / 50) * 50) })
      : t(language, 'distanceKm', { km: formatNumber(language, metroMetres / 1000, 1) })
  const timeLeft = reportTimeLeftMs(report, now)

  return (
    <Modal open={open} onClose={onClose} title={name} closeLabel={t(language, 'close')}>
      {pandal && crowd && (
        <div className="detail">
          <p className="detail__alt">
            <span className="alt-name">{otherName(language, pandal)}</span>
            <span className="chip-static">{zoneLabel(language, pandal.zone)}</span>
            {pandal.featured && <span className="chip-static chip-static--ochre">{t(language, 'featuredLabel')}</span>}
          </p>
          <p className="detail__highlight">{language === 'bn' ? pandal.highlightBn : pandal.highlight}</p>
          <p>{language === 'bn' ? pandal.descriptionBn : pandal.description}</p>

          <dl className="facts">
            <div>
              <dt>{t(language, 'address')}</dt>
              <dd>{pandal.address}</dd>
            </div>
            <div>
              <dt>{t(language, 'nearestMetro')}</dt>
              <dd>
                {metro ? pickName(language, metro) : t(language, 'metroNone')}
                {metro && metroDistance && <small className="facts__note">{t(language, 'metroStraightLine', { d: metroDistance })}</small>}
              </dd>
            </div>
            <div>
              <dt>{t(language, 'visitAllowance', { n: formatNumber(language, pandal.visitMinutes) })}</dt>
              <dd>{t(language, 'popularity', { n: formatNumber(language, pandal.popularity) })}</dd>
            </div>
          </dl>

          <div className="detail__actions">
            <button type="button" className="btn btn--primary" onClick={() => onNavigate(pandal.id)} aria-label={t(language, 'navigateTo', { name })} title={t(language, 'navigateTo', { name })}>
              <Navigation size={18} aria-hidden="true" /> {t(language, 'navigate')}
            </button>
            <button
              type="button"
              className={`btn ${inRoute ? 'btn--quiet' : 'btn--primary'}`}
              onClick={() => onToggleStop(pandal.id)}
              disabled={!inRoute && stopIds.length >= 12}
              title={!inRoute && stopIds.length >= 12 ? t(language, 'routeFull') : undefined}
            >
              {inRoute ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              {inRoute ? t(language, 'remove') : t(language, 'add')}
            </button>
            <button type="button" className={`btn ${visit ? 'btn--quiet' : 'btn--emerald'}`} onClick={() => onToggleVisit(pandal.id)} aria-pressed={Boolean(visit)}>
              {visit ? <Undo2 size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
              {visit ? t(language, 'unmarkVisited') : t(language, 'markVisited')}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => { onShowOnMap(pandal.id); onClose() }}>
              <MapPin size={18} aria-hidden="true" /> {t(language, 'showOnMap')}
            </button>
          </div>
          {visit && (
            <p className="hint hint--ok">
              {t(language, 'visitedAt', { time: formatClock(language, visit.at) })}{visit.method === 'auto' && ` · ${t(language, 'visitedAuto')}`}
            </p>
          )}

          <section className="detail__section" aria-labelledby="crowd-heading">
            <h3 id="crowd-heading" className="section-title">{t(language, 'reportCrowd')}</h3>
            <p className="detail__crowd">
              <span className={`crowd crowd--${crowd.level}`}>{crowdLabel(language, crowd.level)}</span>
              {' · '}{t(language, 'queueRange', { range: formatMinuteRange(language, crowd.queueMinutes) })}
              <br />
              <small>{t(language, crowd.basis === 'local-report' ? 'crowdBasisReport' : 'crowdBasisModel')}</small>
            </p>
            <div className="level-buttons" role="group" aria-label={t(language, 'reportCrowd')}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`btn btn--level btn--level-${level}${report?.level === level ? ' is-active' : ''}`}
                  aria-pressed={report?.level === level}
                  onClick={() => onReport(pandal.id, level)}
                >
                  {crowdLabel(language, level)}
                </button>
              ))}
            </div>
            {report && timeLeft > 0 ? (
              <p className="hint hint--row">
                <span>
                  <strong>{t(language, 'yourReport')}</strong> · {t(language, 'expiresIn', { t: formatDuration(language, Math.ceil(timeLeft / 60_000)) })}
                </span>
                <button type="button" className="btn btn--small btn--quiet" onClick={() => onClearReport(pandal.id)}>{t(language, 'clearReport')}</button>
              </p>
            ) : (
              <p className="hint">{t(language, 'reportHint')}</p>
            )}
          </section>

          <section className="detail__section" aria-labelledby="source-heading">
            <h3 id="source-heading" className="section-title">{t(language, 'source')}</h3>
            <p className="hint">{t(language, 'approximatePin')}</p>
            <p className="hint">
              <a href={pandal.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-external">
                <ExternalLink size={14} aria-hidden="true" /> {pandal.sourceLabel}
              </a>
              <br />
              {t(language, 'sourceChecked', { date: formatDate(language, pandal.verifiedOn) })}
            </p>
          </section>
        </div>
      )}
    </Modal>
  )
}
