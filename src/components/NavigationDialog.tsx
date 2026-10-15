import { useEffect, useRef } from 'react'
import { CarFront, ExternalLink, Footprints, Navigation, TrainFront } from 'lucide-react'
import type { Landmark, Language, Pandal } from '../types'
import { pickName, t } from '../i18n'
import { Modal } from './Modal'
import { Segmented } from './Segmented'
import { NAVIGATION_QUERY_LIMIT, navigationUrl } from './uiState'
import type { DirectionsMode } from './uiState'

export type NavigationDestination =
  | { kind: 'pandal' | 'landmark', id: string }
  | { kind: 'query', query: string }

export interface NavigationDraft {
  destination: NavigationDestination
  originId: string
  mode: DirectionsMode | null
}

interface NavigationDialogProps {
  language: Language
  draft: NavigationDraft | null
  pandals: readonly Pandal[]
  startPoints: readonly Landmark[]
  plannedStart: Landmark | null
  previousStop: Pandal | undefined
  recommendedMode: DirectionsMode | undefined
  online: boolean
  onChange: (draft: NavigationDraft) => void
  onClose: () => void
}

export function NavigationDialog({
  language, draft, pandals, startPoints, plannedStart, previousStop, recommendedMode, online, onChange, onClose,
}: NavigationDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const open = draft !== null
  useEffect(() => {
    const dialog = contentRef.current?.closest('dialog')
    if (!dialog || !open) return
    if (draft?.destination.kind === 'query' && !draft.destination.query.trim()) {
      contentRef.current?.querySelector<HTMLInputElement>('input[list]')?.focus()
    }
    const cycleFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')]
        .filter((element) => element.tabIndex >= 0 && element.checkVisibility())
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    dialog.addEventListener('keydown', cycleFocus)
    return () => dialog.removeEventListener('keydown', cycleFocus)
  }, [open])
  const places = [
    ...pandals.map((point) => ({ kind: 'pandal' as const, point })),
    ...startPoints.map((point) => ({ kind: 'landmark' as const, point })),
  ]
  const destination = draft?.destination
  const selectedPlace = destination && destination.kind !== 'query'
    ? places.find(({ kind, point }) => kind === destination.kind && point.id === destination.id)?.point
    : undefined
  const selectedPandal = destination?.kind === 'pandal' ? pandals.find((point) => point.id === destination.id) : undefined
  const destinationText = destination?.kind === 'query' ? destination.query
    : selectedPlace ? pickName(language, selectedPlace) : ''
  const publicOrigins = [
    ...(plannedStart ? [{ id: 'planned', point: plannedStart, label: t(language, 'navigationPlannedStart', { name: pickName(language, plannedStart) }) }] : []),
    ...(previousStop ? [{ id: `pandal:${previousStop.id}`, point: previousStop, label: t(language, 'navigationPreviousStop', { name: pickName(language, previousStop) }) }] : []),
    ...places.filter(({ point }) => point.id !== previousStop?.id)
      .map(({ kind, point }) => ({ id: `${kind}:${point.id}`, point, label: pickName(language, point) })),
  ]
  const currentLocation = draft?.originId === 'current'
  const selectedOrigin = publicOrigins.find((option) => option.id === draft?.originId)
  const mode = draft?.mode ?? recommendedMode ?? 'walking'
  const url = draft && (currentLocation || selectedOrigin)
    ? navigationUrl(selectedPlace ?? destinationText, currentLocation ? null : selectedOrigin!.point, mode)
    : null
  const actionKey = !currentLocation ? 'navigationPreview'
    : mode === 'transit' ? 'navigationTransit'
      : mode === 'driving' ? 'navigationDriving' : 'navigationWalking'
  const action = <><Navigation size={18} aria-hidden="true" /><span>{t(language, actionKey)}</span><ExternalLink size={16} aria-hidden="true" /></>

  function changeDestination(value: string) {
    if (!draft) return
    const chosen = places.find(({ point }) => pickName(language, point) === value)
    onChange({
      ...draft,
      destination: chosen ? { kind: chosen.kind, id: chosen.point.id }
        : { kind: 'query', query: value.slice(0, NAVIGATION_QUERY_LIMIT) },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={t(language, 'navigation')} closeLabel={t(language, 'close')}>
      {draft && (
        <div className="navigation" ref={contentRef}>
          {!online && <p className="banner" role="status">{t(language, 'navigationOffline')}</p>}
          <div className="setting">
            <label className="select select--stacked">
              <span className="setting__label">{t(language, 'navigationFrom')}</span>
              <select value={draft.originId} onChange={(event) => onChange({ ...draft, originId: event.target.value })} aria-describedby="navigation-origin-note">
                <option value="current">{t(language, 'navigationCurrent')}</option>
                {publicOrigins.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            {selectedOrigin && <p className="navigation__address">{pickName(language, selectedOrigin.point)}{'address' in selectedOrigin.point ? `: ${selectedOrigin.point.address}` : ''}</p>}
            <p className="hint" id="navigation-origin-note">{t(language, currentLocation ? 'navigationCurrentNote' : 'navigationPreviewNote')}</p>
          </div>

          <div className="setting">
            <label className="navigation__field">
              <span className="setting__label">{t(language, 'navigationTo')}</span>
              <input
                type="text"
                list="navigation-places"
                value={destinationText}
                onChange={(event) => changeDestination(event.target.value)}
                placeholder={t(language, 'navigationPlacePlaceholder')}
                maxLength={NAVIGATION_QUERY_LIMIT}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={destination?.kind === 'query' ? 'navigation-destination-note' : undefined}
              />
            </label>
            <datalist id="navigation-places">
              {places.map(({ kind, point }) => <option key={`${kind}:${point.id}`} value={pickName(language, point)} />)}
            </datalist>
            <p className="navigation__address" aria-live={selectedPlace ? 'polite' : 'off'}>
              {selectedPandal?.address ?? destinationText.trim()}
            </p>
            {destination?.kind === 'query' && (
              <p className="hint" id="navigation-destination-note">
                {t(language, destinationText.trim() ? 'navigationSearchQuery' : 'navigationDestinationRequired')}
              </p>
            )}
          </div>

          <div className="setting">
            <span className="setting__label">{t(language, 'navigationTravel')}</span>
            <Segmented<DirectionsMode>
              label={t(language, 'navigationTravel')}
              value={mode}
              onChange={(next) => onChange({ ...draft, mode: next })}
              options={[
                { value: 'walking', title: t(language, 'modeWalk'), label: <span className="navigation__mode"><Footprints size={20} aria-hidden="true" /><span>{t(language, 'modeWalk')}</span></span> },
                { value: 'transit', title: t(language, 'navigationMetroBus'), label: <span className="navigation__mode"><TrainFront size={20} aria-hidden="true" /><span>{t(language, 'navigationMetroBus')}</span></span> },
                { value: 'driving', title: t(language, 'navigationDrive'), label: <span className="navigation__mode"><CarFront size={20} aria-hidden="true" /><span>{t(language, 'navigationDrive')}</span></span> },
              ]}
            />
            {draft.mode === null && recommendedMode && <p className="hint">{t(language, 'navigationPlannedMode')}</p>}
          </div>

          <div className="setting">
            <strong className="setting__label">{t(language, 'navigationProvider')}</strong>
            {url ? (
              <a className="btn btn--primary btn--block" href={url} target="_blank" rel="noopener noreferrer">{action}</a>
            ) : <button type="button" className="btn btn--primary btn--block" disabled>{action}</button>}
            <p className="hint">{t(language, 'navigationProviderNote')}</p>
          </div>
          <div className="navigation__notes">
            {destination?.kind === 'pandal' && <p className="hint">{t(language, 'navigationApproximate')}</p>}
            <p className="hint">{t(language, 'navigationBackground')}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}