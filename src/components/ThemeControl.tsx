import { Monitor, Moon, Sun } from 'lucide-react'
import type { Language } from '../types'
import { t } from '../i18n'
import type { MessageKey } from '../i18n'
import { THEME_PREFERENCES, useTheme } from '../hooks/useTheme'
import type { ThemePreference } from '../hooks/useTheme'

const OPTIONS: Record<ThemePreference, { icon: typeof Sun, short: MessageKey, label: MessageKey }> = {
  light: { icon: Sun, short: 'themeLight', label: 'themeLightLabel' },
  dark: { icon: Moon, short: 'themeDark', label: 'themeDarkLabel' },
  system: { icon: Monitor, short: 'themeSystem', label: 'themeSystemLabel' },
}

export type ThemeControlVariant = 'group' | 'menu'

interface ThemeControlProps {
  language: Language
  // The header decides where the control lives: an inline radiogroup on wide headers, menuitemradio rows
  // inside the overflow menu on phones. Both read the same store, so the stored preference never diverges.
  variant: ThemeControlVariant
}

export function ThemeControl({ language, variant }: ThemeControlProps) {
  const { preference, resolved, setPreference } = useTheme()
  const label = t(language, 'theme')
  if (variant === 'menu') {
    return (
      <div className="header-menu__group" role="group" aria-label={label} data-theme-preference={preference} data-theme-resolved={resolved}>
        <span className="header-menu__label" aria-hidden="true">{label}</span>
        {THEME_PREFERENCES.map((option) => {
          const Icon = OPTIONS[option].icon
          const checked = option === preference
          return (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              className={`header-menu__item${checked ? ' is-active' : ''}`}
              onClick={() => setPreference(option)}
              aria-label={t(language, OPTIONS[option].label)}
              data-theme-option={option}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(language, OPTIONS[option].short)}</span>
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
          const Icon = OPTIONS[option].icon
          const checked = option === preference
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`segmented__item${checked ? ' is-active' : ''}`}
              onClick={() => setPreference(option)}
              title={t(language, OPTIONS[option].label)}
              aria-label={t(language, OPTIONS[option].label)}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="theme-control__text">{t(language, OPTIONS[option].short)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
