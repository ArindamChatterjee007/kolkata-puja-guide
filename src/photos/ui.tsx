import { useEffect, useId, useRef, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { CircleAlert, Ellipsis, ExternalLink, Flame, Images, Info, Monitor, Moon, ShieldCheck, SquareKanban, Sun, TriangleAlert } from 'lucide-react'
import type { Language } from '../types'
import { Modal } from '../components/Modal'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { THEME_PREFERENCES, useTheme } from '../hooks/useTheme'
import type { ThemePreference } from '../hooks/useTheme'
import type { ApiError } from './api'
import { tp } from './i18n'
import type { PhotoMessageKey } from './i18n'

/** Friendly, language-aware text for any API failure; raw server bodies and stacks are never rendered. */
export function describeError(language: Language, error: Pick<ApiError, 'kind' | 'status'>): string {
  switch (error.kind) {
    case 'unauthorized':
      return tp(language, 'errUnauthorized')
    case 'session-lost':
      return tp(language, 'errSessionLost')
    case 'forbidden':
      return tp(language, 'errForbidden')
    case 'not-found':
      return tp(language, 'errNotFound')
    case 'conflict':
      return tp(language, 'errConflict')
    case 'too-large':
      return tp(language, 'errTooLarge')
    case 'unsupported':
      return tp(language, 'errUnsupported')
    case 'rate-limited':
      return tp(language, 'errRateLimited')
    case 'storage-full':
      return tp(language, 'errStorageFull')
    case 'album-full':
      return tp(language, 'errAlbumFull')
    case 'unavailable':
      return tp(language, 'errUnavailable')
    case 'anonymous-disabled':
      return tp(language, 'errAnonDisabled')
    case 'captcha':
      return tp(language, 'errCaptcha')
    case 'secure-context':
      return tp(language, 'errSecure')
    case 'network':
    case 'aborted':
      return tp(language, 'errNetwork')
    case 'bad-response':
      return tp(language, 'errBadResponse')
    default:
      return tp(language, 'errServer', { code: error.status || '—' })
  }
}

const PLANNER_URL = import.meta.env.BASE_URL
const WORK_BOARD_URL = `${import.meta.env.BASE_URL}office.html`

const THEME_OPTIONS: Record<ThemePreference, { icon: typeof Sun; short: PhotoMessageKey; label: PhotoMessageKey }> = {
  light: { icon: Sun, short: 'themeLight', label: 'themeLightLabel' },
  dark: { icon: Moon, short: 'themeDark', label: 'themeDarkLabel' },
  system: { icon: Monitor, short: 'themeSystem', label: 'themeSystemLabel' },
}

// Same store and markup as the planner's ThemeControl, with the album dictionary instead of the planner's.
function PhotoThemeControl({ language, variant }: { language: Language; variant: 'group' | 'menu' }) {
  const { preference, resolved, setPreference } = useTheme()
  const label = tp(language, 'theme')
  if (variant === 'menu') {
    return (
      <div className="header-menu__group" role="group" aria-label={label} data-theme-preference={preference} data-theme-resolved={resolved}>
        <span className="header-menu__label" aria-hidden="true">{label}</span>
        {THEME_PREFERENCES.map((option) => {
          const Icon = THEME_OPTIONS[option].icon
          const checked = option === preference
          return (
            <button key={option} type="button" role="menuitemradio" aria-checked={checked} className={`header-menu__item${checked ? ' is-active' : ''}`} onClick={() => setPreference(option)} aria-label={tp(language, THEME_OPTIONS[option].label)} data-theme-option={option}>
              <Icon size={18} aria-hidden="true" />
              <span>{tp(language, THEME_OPTIONS[option].short)}</span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="theme-control" data-theme-preference={preference} data-theme-resolved={resolved}>
      <div className="segmented segmented--compact segmented--theme theme-control__group" role="radiogroup" aria-label={label}>
        {THEME_PREFERENCES.map((option) => {
          const Icon = THEME_OPTIONS[option].icon
          const checked = option === preference
          return (
            <button key={option} type="button" role="radio" aria-checked={checked} className={`segmented__item${checked ? ' is-active' : ''}`} onClick={() => setPreference(option)} title={tp(language, THEME_OPTIONS[option].label)} aria-label={tp(language, THEME_OPTIONS[option].label)}>
              <Icon size={16} aria-hidden="true" />
              <span className="theme-control__text">{tp(language, THEME_OPTIONS[option].short)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return menu ? [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')] : []
}

interface PhotoHeaderProps {
  language: Language
  configured: boolean
  onLanguage: (language: Language) => void
  onPrivacy: () => void
}

export function PhotoHeader({ language, configured, onLanguage, onPrivacy }: PhotoHeaderProps) {
  const wide = useMediaQuery('(min-width: 760px)')
  const [menuOpen, setMenuOpen] = useState(false)
  const [initialFocus, setInitialFocus] = useState<'first' | 'last'>('first')
  const menuId = useId()
  const triggerId = useId()
  const newTabHintId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const openMenu = (focus: 'first' | 'last') => {
    setInitialFocus(focus)
    setMenuOpen(true)
  }
  const closeMenu = (restoreFocus: boolean) => {
    setMenuOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!menuOpen) return
    const items = menuItems(menuRef.current)
    items[initialFocus === 'first' ? 0 : items.length - 1]?.focus()
    const closeIfOutside = (event: Event) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeIfOutside, true)
    document.addEventListener('focusin', closeIfOutside, true)
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside, true)
      document.removeEventListener('focusin', closeIfOutside, true)
    }
  }, [menuOpen, initialFocus])

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menuRef.current)
    const index = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => {
      event.preventDefault()
      items[(next + items.length) % items.length]?.focus()
    }
    if (event.key === 'ArrowDown') focusAt(index + 1)
    else if (event.key === 'ArrowUp') focusAt(index - 1)
    else if (event.key === 'Home') focusAt(0)
    else if (event.key === 'End') focusAt(items.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu(true)
    } else if (event.key === 'Tab') setMenuOpen(false)
  }

  return (
    <header className="header photos-header">
      <a className="brand brand--link" href={PLANNER_URL} aria-label={tp(language, 'brandLink')}>
        <span className="brand__mark" aria-hidden="true">
          <Images size={20} strokeWidth={2.2} />
        </span>
        <span className="brand__text">
          <span className="brand__name" lang={language}>{tp(language, 'brand')}</span>
          <span className="brand__sub">
            <span>{tp(language, 'brandSub')}</span>
            {!configured && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="brand__beta">{tp(language, 'betaBadge')}</span>
              </>
            )}
          </span>
        </span>
      </a>
      <div className="header__actions">
        <div className="segmented segmented--compact segmented--lang" role="radiogroup" aria-label={tp(language, 'language')}>
          <button type="button" role="radio" aria-checked={language === 'en'} className={`segmented__item${language === 'en' ? ' is-active' : ''}`} onClick={() => onLanguage('en')} lang="en" title="English">
            EN
          </button>
          <button type="button" role="radio" aria-checked={language === 'bn'} className={`segmented__item${language === 'bn' ? ' is-active' : ''}`} onClick={() => onLanguage('bn')} lang="bn" title="বাংলা">
            বাংলা
          </button>
        </div>
        {wide && <PhotoThemeControl language={language} variant="group" />}
        {wide && (
          <button type="button" className="btn btn--quiet header__btn" onClick={onPrivacy}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span className="header__btn-text">{tp(language, 'privacy')}</span>
          </button>
        )}
        <div className="header__menu" ref={wrapperRef}>
          <button
            type="button"
            id={triggerId}
            ref={triggerRef}
            className={`icon-btn header__more${menuOpen ? ' is-on' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            aria-label={tp(language, 'menuMore')}
            title={tp(language, 'menuMore')}
            onClick={() => (menuOpen ? closeMenu(false) : openMenu('first'))}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                if (!menuOpen) openMenu(event.key === 'ArrowDown' ? 'first' : 'last')
              }
            }}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="header-menu" role="menu" id={menuId} aria-labelledby={triggerId} ref={menuRef} onKeyDown={onMenuKeyDown}>
              {!wide && (
                <>
                  <PhotoThemeControl language={language} variant="menu" />
                  <div className="header-menu__separator" role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className="header-menu__item"
                    onClick={() => {
                      closeMenu(true)
                      onPrivacy()
                    }}
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>{tp(language, 'privacy')}</span>
                  </button>
                </>
              )}
              <a role="menuitem" className="header-menu__item" href={PLANNER_URL} onClick={() => setMenuOpen(false)}>
                <Flame size={18} aria-hidden="true" />
                <span>{tp(language, 'planner')}</span>
              </a>
              <a
                role="menuitem"
                className="header-menu__item"
                href={WORK_BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={newTabHintId}
                title={`${tp(language, 'workBoard')} · ${tp(language, 'opensNewTab')}`}
                onClick={() => setMenuOpen(false)}
              >
                <SquareKanban size={18} aria-hidden="true" />
                <span>{tp(language, 'workBoard')}</span>
                <ExternalLink size={14} aria-hidden="true" className="header-menu__hint" />
              </a>
              <span id={newTabHintId} hidden>{tp(language, 'opensNewTab')}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export type NoticeTone = 'info' | 'warn' | 'error' | 'ok'

interface NoticeProps {
  tone: NoticeTone
  title?: string
  children?: ReactNode
  actions?: ReactNode
  live?: boolean
}

export function Notice({ tone, title, children, actions, live }: NoticeProps) {
  const Icon = tone === 'error' ? CircleAlert : tone === 'warn' ? TriangleAlert : tone === 'ok' ? ShieldCheck : Info
  return (
    <div className={`notice notice--${tone}`} role={live ? 'status' : undefined}>
      <Icon size={20} aria-hidden="true" className="notice__icon" />
      <div className="notice__body">
        {title && <p className="notice__title">{title}</p>}
        {children && <div className="notice__text">{children}</div>}
        {actions && <div className="notice__actions">{actions}</div>}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyArt({ icon }: { icon: ReactNode }) {
  return (
    <div className="empty__art" aria-hidden="true">
      <span className="empty__tile" />
      <span className="empty__tile" />
      <span className="empty__tile empty__tile--icon">{icon}</span>
      <span className="empty__tile" />
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <EmptyArt icon={icon} />
      <p className="empty__title">{title}</p>
      {hint && <p className="empty__hint">{hint}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string | null
}

export function Field({ label, hint, error, ...input }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} className={`field__input${error ? ' is-invalid' : ''}`} aria-describedby={describedBy} aria-invalid={error ? true : undefined} {...input} />
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {error && <p id={errorId} className="field__error" role="alert">{error}</p>}
    </div>
  )
}

interface ConfirmDialogProps {
  language: Language
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  busyLabel?: string
  danger?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ language, open, title, body, confirmLabel, busyLabel, danger, busy, error, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title} closeLabel={tp(language, 'close')}>
      <div className="confirm__body">{body}</div>
      {error && <Notice tone="error" live>{error}</Notice>}
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>{tp(language, 'cancel')}</button>
        <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
          {busy ? busyLabel ?? tp(language, 'working') : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
