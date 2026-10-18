import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import type { Language } from '../types'
import { FESTIVAL_PORTRAIT } from '../data/pandalMedia'
import { t } from '../i18n'

// Hold plus the CSS exit fade stays inside the 1.8 s auto-entry bound; the timer never waits for the photo.
const FESTIVAL_INTRO_HOLD_MS = 1600

const PORTRAIT_SRC = `${import.meta.env.BASE_URL}${FESTIVAL_PORTRAIT.image}`

type PhotoState = 'loading' | 'ready' | 'failed'

interface FestivalIntroProps {
  language: Language
  open: boolean
  onClose: () => void
}

export function FestivalIntro({ language, open, onClose }: FestivalIntroProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [photo, setPhoto] = useState<PhotoState>('loading')
  const close = () => {
    if (open) onClose()
  }
  const closeFromTimer = useEffectEvent(close)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      skipRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const deadline = Date.now() + FESTIVAL_INTRO_HOLD_MS
    const timer = window.setTimeout(closeFromTimer, FESTIVAL_INTRO_HOLD_MS)
    // Hidden tabs throttle timers; close as soon as the tab is visible again past the deadline.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() >= deadline) closeFromTimer()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [open])

  const otherLanguage: Language = language === 'bn' ? 'en' : 'bn'
  const bengali = language === 'bn'

  return (
    <dialog
      ref={ref}
      className="festival-intro"
      aria-labelledby={titleId}
      data-photo={photo}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClose={close}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
    >
      <button
        ref={skipRef}
        type="button"
        className="festival-intro__skip"
        onClick={close}
        aria-label={t(language, 'introSkipLabel')}
        title={t(language, 'introSkipLabel')}
      >
        {t(language, 'introSkip')}
      </button>
      {photo !== 'failed' && (
        <>
          {/* Same cached file, blurred: only fills the sides on ultra-wide screens where cover would crop the face. */}
          <img className="festival-intro__backdrop" src={PORTRAIT_SRC} alt="" aria-hidden="true" decoding="async" />
          <img
            className="festival-intro__photo"
            src={PORTRAIT_SRC}
            width={FESTIVAL_PORTRAIT.width}
            height={FESTIVAL_PORTRAIT.height}
            alt={bengali ? FESTIVAL_PORTRAIT.altBn : FESTIVAL_PORTRAIT.alt}
            decoding="async"
            fetchPriority="high"
            onLoad={() => setPhoto('ready')}
            onError={() => setPhoto('failed')}
          />
        </>
      )}
      <div className="festival-intro__scrim" aria-hidden="true" />
      <div className="festival-intro__text">
        <p className="festival-intro__brand">
          <span className="festival-intro__mark" aria-hidden="true"><Flame size={16} strokeWidth={2.2} /></span>
          <span lang={language}>{t(language, 'appName')}</span>
          <span aria-hidden="true"> · </span>
          <span lang={otherLanguage}>{t(language, 'appNameOther')}</span>
        </p>
        <h2 id={titleId} className="festival-intro__title" lang={language}>{t(language, 'introTitle')}</h2>
        <p className="festival-intro__title-other" lang={otherLanguage}>{t(language, 'introTitleOther')}</p>
        <p className="festival-intro__tagline" lang={language}>{t(language, 'introTagline')}</p>
        {photo !== 'failed' && (
          <p className="festival-intro__credit" lang={language}>
            {t(language, 'introCredit')}: {bengali ? FESTIVAL_PORTRAIT.captionBn : FESTIVAL_PORTRAIT.caption}
            {' · '}{FESTIVAL_PORTRAIT.author}
            {' · '}
            <a href={FESTIVAL_PORTRAIT.sourceUrl} target="_blank" rel="noopener noreferrer">{t(language, 'mediaSourceCommons')}</a>
            {' · '}
            <a href={FESTIVAL_PORTRAIT.licenseUrl} target="_blank" rel="noopener noreferrer">{FESTIVAL_PORTRAIT.license}</a>
            {' · '}{t(language, 'mediaChanges')}
          </p>
        )}
      </div>
    </dialog>
  )
}
