import { useEffect, useRef } from 'react'
import { CircleCheck, Download, EllipsisVertical, Globe, MonitorSmartphone, Smartphone, SquarePlus, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Language } from '../types'
import { t } from '../i18n'
import type { MessageKey } from '../i18n'
import { promptInstall, useInstallPrompt } from '../hooks/useInstallPrompt'
import type { InstallPlatformInfo } from '../hooks/useInstallPrompt'
import { Modal } from './Modal'

interface InstallAppDialogProps {
  language: Language
  open: boolean
  onClose: () => void
}

type Step = readonly [LucideIcon, MessageKey]

// Browser-menu routes only: iOS has no programmatic install, and in-app browsers get a generic "open in a real browser" path.
function manualSteps({ platform, iosSafari, inAppBrowser }: InstallPlatformInfo): readonly Step[] {
  if (inAppBrowser) return [[EllipsisVertical, 'installStepInApp1'], [Globe, 'installStepInApp2'], [SquarePlus, 'installStepInApp3']]
  if (platform === 'ios') {
    return iosSafari
      ? [[Upload, 'installStepIos1'], [SquarePlus, 'installStepIos2'], [Smartphone, 'installStepIos3']]
      : [[Upload, 'installStepIosOther1'], [SquarePlus, 'installStepIosOther2'], [Smartphone, 'installStepIos3']]
  }
  if (platform === 'android') return [[EllipsisVertical, 'installStepAndroid1'], [SquarePlus, 'installStepAndroid2'], [Smartphone, 'installStepAndroid3']]
  return [[EllipsisVertical, 'installStepDesktop1'], [SquarePlus, 'installStepDesktop2'], [MonitorSmartphone, 'installStepDesktop3']]
}

export function InstallAppDialog({ language, open, onClose }: InstallAppDialogProps) {
  const install = useInstallPrompt()
  const { status } = install
  const statusRef = useRef<HTMLParagraphElement>(null)
  const showSteps = status === 'manual' || status === 'dismissed'

  // The Install button unmounts once the prompt is consumed, so keep focus on the outcome text.
  useEffect(() => {
    if (open && (status === 'installing' || status === 'accepted' || status === 'dismissed')) statusRef.current?.focus()
  }, [open, status])

  return (
    <Modal open={open} onClose={onClose} title={t(language, 'installTitle')} closeLabel={t(language, 'close')}>
      <div className="install" data-install-status={status} data-install-platform={install.platform}>
        {status === 'installed' ? (
          <p className="install__status">
            <CircleCheck size={20} aria-hidden="true" />
            <span>{t(language, 'installedBody')}</span>
          </p>
        ) : (
          <p>{t(language, 'installLead')}</p>
        )}
        {status === 'ready' && (
          <>
            <p>{t(language, 'installReady')}</p>
            <div className="confirm__actions">
              <button type="button" className="btn btn--quiet" onClick={onClose}>{t(language, 'installLater')}</button>
              <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
                <Download size={18} aria-hidden="true" /> {t(language, 'installNow')}
              </button>
            </div>
          </>
        )}
        {(status === 'installing' || status === 'accepted') && (
          <p ref={statusRef} tabIndex={-1} role="status" aria-busy={status === 'installing'} className="install__status">
            {status === 'accepted' && <CircleCheck size={20} aria-hidden="true" />}
            <span>{t(language, status === 'installing' ? 'installWaiting' : 'installAccepted')}</span>
          </p>
        )}
        {status === 'dismissed' && <p ref={statusRef} tabIndex={-1} role="status">{t(language, 'installDismissed')}</p>}
        {showSteps && (
          <ol className="install__steps">
            {manualSteps(install).map(([Icon, key]) => (
              <li key={key} className="install__step">
                <span className="install__icon" aria-hidden="true"><Icon size={20} /></span>
                <span>{t(language, key)}</span>
              </li>
            ))}
          </ol>
        )}
        <ul className="install__notes">
          <li>{t(language, 'installNoteUpdates')}</li>
          <li>{t(language, 'installNoteLocation')}</li>
          {install.platform === 'ios' && status !== 'installed' && <li>{t(language, 'installNoteIosData')}</li>}
        </ul>
      </div>
    </Modal>
  )
}
