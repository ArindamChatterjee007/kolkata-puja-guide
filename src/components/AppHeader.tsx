import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CircleCheck, Download, Ellipsis, ExternalLink, Flame, Images, Info, Share2, Smartphone, SquareKanban, Wifi, WifiOff } from 'lucide-react'
import type { Language } from '../types'
import { t } from '../i18n'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { InstallAppDialog } from './InstallAppDialog'
import { ThemeControl } from './ThemeControl'

interface AppHeaderProps {
  language: Language
  online: boolean
  onLanguage: (language: Language) => void
  onShare: () => void
  onInfo: () => void
}

const WORK_BOARD_URL = `${import.meta.env.BASE_URL}office.html`
const TRIP_ALBUMS_URL = `${import.meta.env.BASE_URL}photos.html`

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return menu ? [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')] : []
}

// 320-359px headers hold exactly four 44px targets beside the full brand name, so About joins the overflow
// menu there; phones keep Appearance in the menu because a sixth inline target would truncate the brand.
export function AppHeader({ language, online, onLanguage, onShare, onInfo }: AppHeaderProps) {
  const wide = useMediaQuery('(min-width: 760px)')
  const aboutInline = useMediaQuery('(min-width: 360px)')
  const install = useInstallPrompt()
  const [installOpen, setInstallOpen] = useState(false)
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

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!menuOpen) openMenu(event.key === 'ArrowDown' ? 'first' : 'last')
    }
  }

  const aboutLabel = t(language, 'about')
  const aboutIcon = <Info size={20} aria-hidden="true" />
  const installLabel = t(language, install.status === 'installed' ? 'installMenuDone' : install.status === 'ready' ? 'installMenuReady' : 'installMenu')
  const InstallIcon = install.status === 'installed' ? CircleCheck : install.status === 'ready' ? Download : Smartphone

  return (
    <header className="header">
      <div className="brand">
        <span className={`brand__mark${online ? '' : ' brand__mark--off'}`} aria-hidden="true">
          <Flame size={22} strokeWidth={2.2} />
          <span className="brand__status" />
        </span>
        <div className="brand__text">
          <h1 className="brand__name" lang={language}>{t(language, 'appName')}</h1>
          <span className="brand__sub">
            <span lang={language === 'bn' ? 'en' : 'bn'}>{t(language, 'appNameOther')}</span>
            <span aria-hidden="true"> · </span>
            <span>{t(language, 'city')}</span>
          </span>
        </div>
      </div>
      <div className="header__actions">
        <div className="segmented segmented--compact segmented--lang" role="radiogroup" aria-label={t(language, 'language')}>
          <button type="button" role="radio" aria-checked={language === 'en'} className={`segmented__item${language === 'en' ? ' is-active' : ''}`} onClick={() => onLanguage('en')} lang="en" title="English">
            EN
          </button>
          <button type="button" role="radio" aria-checked={language === 'bn'} className={`segmented__item${language === 'bn' ? ' is-active' : ''}`} onClick={() => onLanguage('bn')} lang="bn" title="বাংলা">
            বাংলা
          </button>
        </div>
        {wide && <ThemeControl language={language} variant="group" />}
        <span className={`status-pill${online ? '' : ' status-pill--off'}`} role="status" title={online ? t(language, 'online') : t(language, 'offlineHint')}>
          {online ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          <span className="status-pill__text">{online ? t(language, 'online') : t(language, 'offline')}</span>
        </span>
        {/* Below 960px a short word sits under a 16px icon so the link stays readable inside its 44px target. */}
        <a className="btn btn--quiet header__btn header__albums" href={TRIP_ALBUMS_URL} title={t(language, 'tripAlbums')} aria-label={t(language, 'tripAlbums')}>
          <Images size={18} aria-hidden="true" />
          <span className="header__albums-text header__albums-text--short">{t(language, 'albumsShort')}</span>
          <span className="header__albums-text header__albums-text--full">{t(language, 'tripAlbums')}</span>
        </a>
        {aboutInline && (
          <button type="button" className="icon-btn" onClick={onInfo} title={aboutLabel} aria-label={aboutLabel}>
            {aboutIcon}
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
            aria-label={t(language, 'menuMore')}
            title={t(language, 'menuMore')}
            onClick={() => (menuOpen ? closeMenu(false) : openMenu('first'))}
            onKeyDown={onTriggerKeyDown}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="header-menu" role="menu" id={menuId} aria-labelledby={triggerId} ref={menuRef} onKeyDown={onMenuKeyDown}>
              {!wide && (
                <>
                  <ThemeControl language={language} variant="menu" />
                  <div className="header-menu__separator" role="separator" />
                </>
              )}
              <button type="button" role="menuitem" className="header-menu__item" onClick={() => { closeMenu(true); onShare() }}>
                <Share2 size={18} aria-hidden="true" />
                <span>{t(language, 'share')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="header-menu__item"
                data-install-status={install.status}
                onClick={() => {
                  closeMenu(true)
                  setInstallOpen(true)
                }}
              >
                <InstallIcon size={18} aria-hidden="true" />
                <span>{installLabel}</span>
              </button>
              {!aboutInline && (
                <button
                  type="button"
                  role="menuitem"
                  className="header-menu__item"
                  onClick={() => {
                    // Focus returns to the trigger first so the About dialog restores focus to a live element.
                    closeMenu(true)
                    onInfo()
                  }}
                >
                  {aboutIcon}
                  <span>{aboutLabel}</span>
                </button>
              )}
              <a role="menuitem" className="header-menu__item" href={TRIP_ALBUMS_URL} onClick={() => setMenuOpen(false)}>
                <Images size={18} aria-hidden="true" />
                <span>{t(language, 'tripAlbums')}</span>
              </a>
              <a
                role="menuitem"
                className="header-menu__item"
                href={WORK_BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={newTabHintId}
                title={`${t(language, 'workBoard')} · ${t(language, 'opensNewTab')}`}
                onClick={() => setMenuOpen(false)}
              >
                <SquareKanban size={18} aria-hidden="true" />
                <span>{t(language, 'workBoard')}</span>
                <ExternalLink size={14} aria-hidden="true" className="header-menu__hint" />
              </a>
              <span id={newTabHintId} hidden>{t(language, 'opensNewTab')}</span>
            </div>
          )}
        </div>
      </div>
      <InstallAppDialog language={language} open={installOpen} onClose={() => setInstallOpen(false)} />
    </header>
  )
}
