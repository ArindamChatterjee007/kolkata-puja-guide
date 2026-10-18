import { useState } from 'react'
import { ExternalLink, FileText, Play, Video } from 'lucide-react'
import type { Language } from '../types'
import { getRegionalPreviewEmbedUrl } from '../data/regionalCuration'
import type { RegionalPostPreview } from '../data/regionalCuration'
import { formatDate, t } from '../i18n'

function publicationDate(language: Language, value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(language, value)
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-IN' : 'en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(timestamp)
}

export function RegionalPreviews({ language, previews }: { language: Language; previews: readonly RegionalPostPreview[] }) {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null)
  if (previews.length === 0) return null
  return <section className="regional-previews" aria-label={t(language, 'publicPreviews')}>
    <h3 className="section-title">{t(language, 'publicPreviews')}</h3>
    <ul>{previews.map((preview) => {
      const year = preview.footageYear === null ? null : new Intl.NumberFormat(language === 'bn' ? 'bn-IN' : 'en-IN', { useGrouping: false }).format(preview.footageYear)
      const label = preview.contentKind === 'theme-plan' ? t(language, 'previewThemePlan')
        : preview.contentKind === 'historical-article' || preview.contentKind === 'retrospective' ? t(language, 'previewHistorical', { year: year ?? t(language, 'previewYearUnknown') })
          : year === null ? t(language, 'previewFootageUnknown') : t(language, 'previewFootageYear', { year })
      return <li key={preview.id} className="regional-preview" data-preview-id={preview.id}>
        <strong className="regional-preview__label">{preview.sourceType === 'news' ? <FileText size={16} aria-hidden="true" /> : <Video size={16} aria-hidden="true" />}{label}</strong>
        <a href={preview.url} target="_blank" rel="noopener noreferrer" className="link-external"><ExternalLink size={14} aria-hidden="true" />{preview.title}</a>
        <small>{preview.publisher}{preview.publishedAt && <> · {t(language, 'previewPublished')} <time dateTime={preview.publishedAt}>{publicationDate(language, preview.publishedAt)}</time></>}</small>
        <p>{language === 'en' ? preview.caption : t(language, preview.contentKind === 'theme-plan' ? 'previewPlanNote'
          : preview.contentKind === 'historical-article' || preview.contentKind === 'retrospective' ? 'previewHistoryNote'
            : preview.footageYear === null ? 'previewUnknownNote' : 'previewCaptureNote')}</p>
        {preview.embed && <>
          {loaded?.id === preview.id ? <iframe src={loaded.url} title={`${t(language, 'publicVideo')}: ${preview.title}`}
            loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen />
            : <><p className="hint">{t(language, 'previewConsent')}</p><button type="button" className="btn btn--quiet" onClick={() => {
              const url = getRegionalPreviewEmbedUrl(preview.id, true)
              if (url) setLoaded({ id: preview.id, url })
            }}><Play size={16} aria-hidden="true" />{t(language, 'loadPublicVideo')}</button></>}
          <p className="hint">{t(language, 'previewSourceFallback')}</p>
        </>}
      </li>
    })}</ul>
  </section>
}