import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, closeLabel, children, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal--wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={() => {
        if (open) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="modal__frame">
          <header className="modal__header">
            <h2 id={titleId} className="modal__title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <div className="modal__body">{children}</div>
        </div>
      )}
    </dialog>
  )
}
