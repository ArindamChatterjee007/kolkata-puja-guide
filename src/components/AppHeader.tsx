import { Flame, Info, Share2, Wifi, WifiOff } from 'lucide-react'
import type { Language } from '../types'
import { t } from '../i18n'

interface AppHeaderProps {
  language: Language
  online: boolean
  onLanguage: (language: Language) => void
  onShare: () => void
  onInfo: () => void
}

export function AppHeader({ language, online, onLanguage, onShare, onInfo }: AppHeaderProps) {
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
        <span className={`status-pill${online ? '' : ' status-pill--off'}`} role="status" title={online ? t(language, 'online') : t(language, 'offlineHint')}>
          {online ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          <span className="status-pill__text">{online ? t(language, 'online') : t(language, 'offline')}</span>
        </span>
        <button type="button" className="btn btn--quiet header__btn" onClick={onShare} title={t(language, 'share')} aria-label={t(language, 'share')}>
          <Share2 size={18} aria-hidden="true" />
          <span className="header__btn-text">{t(language, 'share')}</span>
        </button>
        <button type="button" className="icon-btn" onClick={onInfo} title={t(language, 'about')} aria-label={t(language, 'about')}>
          <Info size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
