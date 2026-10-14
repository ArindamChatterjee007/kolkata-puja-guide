import { X } from 'lucide-react'
import type { Language } from '../types'
import type { Toast } from '../hooks/useToasts'
import { t } from '../i18n'

interface ToastsProps {
  language: Language
  toasts: readonly Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ language, toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toasts" role="status" aria-live="polite" aria-label={t(language, 'notifications')}>
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span className="toast__text">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="btn btn--small btn--toast"
              onClick={() => {
                toast.action?.onClick()
                onDismiss(toast.id)
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="icon-btn icon-btn--toast" onClick={() => onDismiss(toast.id)} aria-label={t(language, 'dismiss')} title={t(language, 'dismiss')}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
