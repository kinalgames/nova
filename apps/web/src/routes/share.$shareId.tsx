import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { fetchShare, shareFileUrl, type ShareDoc } from '../services/share'

export const Route = createFileRoute('/share/$shareId')({ component: SharePage })

const Markdown = lazy(() => import('../components/Markdown'))

/**
 * BE4 — the PUBLIC unlisted share page: a bare, read-only transcript.
 * No sidebar, no composer, no session required; unlisted means noindex.
 */
function SharePage() {
  const { shareId } = Route.useParams()
  const { t } = useTranslation()
  const [doc, setDoc] = useState<ShareDoc | null | 'loading'>('loading')

  useEffect(() => {
    // unlisted: never let a crawler index a leaked link
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    let stop = false
    void fetchShare(shareId).then((d) => {
      if (!stop) setDoc(d)
    })
    return () => {
      stop = true
    }
  }, [shareId])

  if (doc === 'loading')
    return (
      <div className="flex h-full w-full items-center justify-center text-body text-muted">
        {t('share.loading')}
      </div>
    )
  if (doc === null)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="font-display text-h2">{t('share.notFoundTitle')}</div>
        <div className="text-body text-muted">{t('share.notFoundBody')}</div>
        <Link to="/" className="mt-4 rounded-md bg-ink px-4 py-2.5 text-body text-bg no-underline">
          {t('share.tryNova')}
        </Link>
      </div>
    )
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
        <div className="mb-1 font-mono text-eyebrow tracking-[.14em] text-faint">
          {t('share.sharedFrom')}
        </div>
        <h1 className="mb-8 font-display text-h1 leading-tight">{doc.title}</h1>
        <div className="flex flex-col gap-8">
          {doc.messages.map((m, i) => (
            <div key={i}>
              <div className="mb-2 font-mono text-eyebrow tracking-[.12em] text-muted">
                {m.who}
              </div>
              {m.files && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {m.files.map((f, j) =>
                    f.kind === 'image' && f.fileId ? (
                      <img
                        key={j}
                        src={shareFileUrl(shareId, f.fileId)}
                        alt={f.name}
                        loading="lazy"
                        className="h-[140px] max-w-full rounded-md border border-edge-soft object-cover"
                      />
                    ) : (
                      <span
                        key={j}
                        className="rounded-sm border border-border bg-panel px-2.5 py-1 text-small text-muted"
                      >
                        {f.name}
                      </span>
                    ),
                  )}
                </div>
              )}
              {m.text && (
                <Suspense fallback={<div className="text-body">{m.text}</div>}>
                  <Markdown text={m.text} />
                </Suspense>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <span className="text-small text-muted">{t('share.footer')}</span>
          <Link
            to="/"
            className="rounded-md bg-ink px-4 py-2 text-small text-bg no-underline"
          >
            {t('share.tryNova')}
          </Link>
        </div>
      </div>
    </div>
  )
}
