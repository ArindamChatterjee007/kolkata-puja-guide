import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Camera, ImageOff, Map as MapIcon } from 'lucide-react'
import type { Language } from '../types'
import { AREA_MAP_CREDIT } from '../data/pandalMedia'
import type { PandalPreview as PandalMedia } from '../data/pandalMedia'
import { t } from '../i18n'
import { Segmented } from './Segmented'

export type PreviewVariant = 'thumb' | 'popup' | 'detail'
type PreviewView = 'photo' | 'area'
type EffectiveKind = PreviewView | 'none'

interface PandalPreviewProps {
  language: Language
  media: PandalMedia
  variant: PreviewVariant
}

interface Failures {
  id: string
  photo: boolean
  area: boolean
}

const freshFailures = (id: string): Failures => ({ id, photo: false, area: false })

function yearLabel(language: Language, year: number | null): string {
  if (year === null) return t(language, 'previewYearUnknown')
  return language === 'bn' ? year.toLocaleString('bn-IN', { useGrouping: false }) : String(year)
}

export function PandalPreview({ language, media, variant }: PandalPreviewProps) {
  const [view, setView] = useState<{ id: string, view: PreviewView }>({ id: media.id, view: 'photo' })
  const [failures, setFailures] = useState<Failures>(() => freshFailures(media.id))
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  // A different pandal in the same slot starts clean: no borrowed view or failure state.
  if (failures.id !== media.id) setFailures(freshFailures(media.id))
  if (view.id !== media.id) setView({ id: media.id, view: 'photo' })
  const current = failures.id === media.id ? failures : freshFailures(media.id)
  const chosen = view.id === media.id ? view.view : 'photo'

  const bengali = language === 'bn'
  const photoAvailable = media.kind === 'photo' && !current.photo
  const kind: EffectiveKind = photoAvailable && chosen === 'photo' ? 'photo' : current.area ? 'none' : 'area'
  const base = import.meta.env.BASE_URL
  const image = kind === 'photo'
    ? { src: base + media.image, width: media.width, height: media.height, alt: bengali ? media.altBn : media.alt }
    : {
        src: base + media.areaImage,
        width: media.areaWidth,
        height: media.areaHeight,
        alt: media.kind === 'area' ? (bengali ? media.altBn : media.alt) : (bengali ? media.approximateAreaLabelBn : media.approximateAreaLabel),
      }
  const caption = kind === 'photo'
    ? (bengali ? media.captionBn : media.caption)
    : media.kind === 'area' ? (bengali ? media.captionBn : media.caption) : t(language, 'previewAreaCaption')
  const badge = kind === 'photo'
    ? t(language, 'previewBadgePhoto', { year: yearLabel(language, media.year) })
    : t(language, 'previewBadgeArea')
  const shortBadge = kind === 'photo'
    ? (media.year === null ? t(language, 'previewPhoto') : yearLabel(language, media.year))
    : t(language, 'previewMap')
  const credit = kind === 'photo'
    ? { author: media.author, sourceUrl: media.sourceUrl, sourceLabel: t(language, 'mediaSourceCommons'), license: media.license, licenseUrl: media.licenseUrl }
    : { author: AREA_MAP_CREDIT.author, sourceUrl: AREA_MAP_CREDIT.sourceUrl, sourceLabel: null, license: AREA_MAP_CREDIT.license, licenseUrl: AREA_MAP_CREDIT.licenseUrl }
  const failCurrent = () => {
    if (kind === 'none') return
    setFailures((previous) => ({ ...(previous.id === media.id ? previous : freshFailures(media.id)), [kind]: true }))
  }
  // The thumb lives inside a button, so it uses phrasing elements; the other variants are real figures.
  const Root = variant === 'thumb' ? 'span' : 'figure'
  const Frame = variant === 'thumb' ? 'span' : 'div'

  return (
    <Root className={`preview preview--${variant}`} data-kind={kind} data-pandal={media.id}>
      <Frame className="preview__frame" style={{ '--preview-ratio': `${image.width} / ${image.height}` } as CSSProperties}>
        {kind === 'none' ? (
          <Frame className="preview__empty">
            <ImageOff size={variant === 'thumb' ? 18 : 24} aria-hidden="true" />
            <span className={variant === 'thumb' ? 'sr-only' : undefined}>{t(language, 'previewUnavailable')}</span>
          </Frame>
        ) : (
          <>
            {variant === 'detail' && (
              <img className="preview__backdrop" src={image.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            )}
            <img
              key={image.src}
              className={`preview__img${loadedSrc === image.src ? ' is-loaded' : ''}`}
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoadedSrc(image.src)}
              onError={failCurrent}
            />
            <span className="preview__badge" title={caption}>
              {kind === 'photo' ? <Camera size={12} aria-hidden="true" /> : <MapIcon size={12} aria-hidden="true" />}
              <span className="preview__badge-full">{badge}</span>
              <span className="preview__badge-short" aria-hidden="true">{shortBadge}</span>
            </span>
          </>
        )}
      </Frame>
      {variant === 'detail' && photoAvailable && (
        <Segmented
          compact
          label={t(language, 'previewViewLabel')}
          value={chosen}
          onChange={(next) => setView({ id: media.id, view: next })}
          options={[
            { value: 'photo', title: t(language, 'previewPhoto'), label: <><Camera size={16} aria-hidden="true" />{t(language, 'previewPhoto')}</> },
            { value: 'area', title: t(language, 'previewArea'), label: <><MapIcon size={16} aria-hidden="true" />{t(language, 'previewArea')}</> },
          ]}
        />
      )}
      {variant !== 'thumb' && kind !== 'none' && (
        <figcaption className="preview__caption">
          {variant === 'detail' && <span className="preview__note">{caption}</span>}
          <span className="preview__credit">
            {credit.sourceLabel ? (
              <>
                {credit.author}
                {' · '}
                <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.sourceLabel}</a>
              </>
            ) : (
              <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.author}</a>
            )}
            {' · '}
            <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a>
          </span>
        </figcaption>
      )}
    </Root>
  )
}
