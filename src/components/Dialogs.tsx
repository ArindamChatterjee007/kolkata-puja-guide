import { useRef } from 'react'
import { Copy, ExternalLink, Phone, Trash2 } from 'lucide-react'
import type { Language } from '../types'
import { METRO_NOTICE, METRO_NOTICES_URL } from '../data/metro'
import { SOURCE_CHECKED_ON } from '../data/pandals'
import { formatDate, t } from '../i18n'
import { Modal } from './Modal'

interface InfoDialogProps {
  language: Language
  open: boolean
  onClose: () => void
  onRequestClear: () => void
}

export function InfoDialog({ language, open, onClose, onRequestClear }: InfoDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={t(language, 'aboutTitle')} closeLabel={t(language, 'close')} wide>
      <div className="about">
        <section>
          <h3 className="section-title">{t(language, 'aboutAssumptions')}</h3>
          <p>{t(language, 'aboutAssumptionsBody')}</p>
          <p>{t(language, 'aboutEvents', { date: formatDate(language, SOURCE_CHECKED_ON) })}</p>
          <p>{METRO_NOTICE[language]}{' '}
            <a href={METRO_NOTICES_URL} target="_blank" rel="noopener noreferrer" className="link-external">
              <ExternalLink size={14} aria-hidden="true" /> {t(language, 'metroNotice')}
            </a>
          </p>
        </section>
        <section>
          <h3 className="section-title">{t(language, 'aboutSafety')}</h3>
          <p>{t(language, 'aboutSafetyBody')}</p>
          <a className="btn btn--primary" href="tel:112">
            <Phone size={18} aria-hidden="true" /> {t(language, 'call112')}
          </a>
        </section>
        <section>
          <h3 className="section-title">{t(language, 'aboutPrivacy')}</h3>
          <p>{t(language, 'aboutPrivacyBody')}</p>
          <button type="button" className="btn btn--quiet btn--danger-text" onClick={onRequestClear}>
            <Trash2 size={18} aria-hidden="true" /> {t(language, 'clearDevice')}
          </button>
        </section>
        <section>
          <h3 className="section-title">{t(language, 'aboutCredits')}</h3>
          <p>{t(language, 'creditsData')}</p>
          <p>
            {t(language, 'creditsMap')}{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">openstreetmap.org/copyright</a>
          </p>
          <p>
            {t(language, 'photoCredit')}{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Kolkata_Durga_Puja_Pandle_1.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
            {' · '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
          </p>
          <p>{t(language, 'creditsFonts')}</p>
        </section>
      </div>
    </Modal>
  )
}

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
}

interface ConfirmDialogProps {
  language: Language
  request: ConfirmRequest | null
  onClose: () => void
}

export function ConfirmDialog({ language, request, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={request !== null} onClose={onClose} title={request?.title ?? ''} closeLabel={t(language, 'close')}>
      {request && (
        <div className="confirm">
          <p>{request.body}</p>
          <div className="confirm__actions">
            <button type="button" className="btn btn--quiet" onClick={onClose}>{t(language, 'cancel')}</button>
            <button
              type="button"
              className={`btn ${request.danger ? 'btn--danger' : 'btn--primary'}`}
              onClick={() => {
                request.onConfirm()
                onClose()
              }}
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

interface ShareDialogProps {
  language: Language
  url: string | null
  onClose: () => void
  onCopied: () => void
}

export function ShareDialog({ language, url, onClose, onCopied }: ShareDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const copy = async () => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
    try {
      if (navigator.clipboard?.writeText && url) {
        await navigator.clipboard.writeText(url)
        onCopied()
      }
    } catch {
      // Selection stays visible so the user can copy manually.
    }
  }
  return (
    <Modal open={url !== null} onClose={onClose} title={t(language, 'shareTitle')} closeLabel={t(language, 'close')}>
      {url && (
        <div className="share">
          <p>{t(language, 'shareBody')}</p>
          <label className="share__field">
            <span className="sr-only">{t(language, 'shareLink')}</span>
            <input ref={inputRef} type="text" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <div className="confirm__actions">
            <button type="button" className="btn btn--primary" onClick={() => void copy()}>
              <Copy size={18} aria-hidden="true" /> {t(language, 'copyLink')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
