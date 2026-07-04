import { Fragment, Suspense, lazy, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { fetchFileObjectUrl, fetchFileText } from '../services/preview'
import { Icon } from './Icon'

const Markdown = lazy(() => import('./Markdown'))

const POP = 'shadow-[0_30px_80px_rgba(0,0,0,.5)] animate-[pop_.18s_ease]'
const CSV_CELL = 'border-t border-border px-3 py-3'
const DOC = `paper-doc max-h-[82vh] w-[min(720px,92vw)] overflow-auto rounded-sm bg-white ${POP}`

/** minimal CSV split — handles quoted fields with embedded commas/quotes */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const CODE_LANG: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript', tsx: 'tsx', jsx: 'jsx',
  json: 'json', sh: 'bash', bash: 'bash', go: 'go', rs: 'rust', java: 'java',
  rb: 'ruby', php: 'php', sql: 'sql', yml: 'yaml', yaml: 'yaml', html: 'html',
  css: 'css', c: 'c', cpp: 'cpp', cs: 'csharp', kt: 'kotlin', swift: 'swift',
}

function langOf(name: string): string {
  return CODE_LANG[(name.split('.').pop() ?? '').toLowerCase()] ?? 'text'
}

/** REAL uploaded file — fetches the bytes/text from R2 and renders it live */
function RealDoc({ fileId, kind, name }: { fileId: string; kind: string; name: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const binary = kind === 'image' || kind === 'pdf'

  useEffect(() => {
    let stop = false
    let made: string | null = null
    void (async () => {
      if (binary) {
        made = await fetchFileObjectUrl(fileId)
        if (stop) return
        if (made) setUrl(made)
        else setFailed(true)
      } else {
        const body = await fetchFileText(fileId)
        if (stop) return
        if (body !== null) setText(body)
        else setFailed(true)
      }
    })()
    return () => {
      stop = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [fileId, binary])

  if (failed)
    return <div className="text-ui text-code-dim">{t('preview.loadFailed')}</div>
  if (binary ? !url : text === null)
    return <div className="text-ui text-code-dim">{t('preview.loading')}</div>

  if (kind === 'image')
    return <img src={url!} alt={name} className={`max-h-[80vh] max-w-[min(900px,92vw)] rounded-md object-contain ${POP}`} />

  if (kind === 'pdf')
    return (
      <object data={url!} type="application/pdf" className={`h-[86vh] w-[min(820px,92vw)] rounded-sm ${POP}`}>
        <a href={url!} download={name} className="text-ui text-accent-text underline">
          {t('preview.download')}
        </a>
      </object>
    )

  if (kind === 'csv') {
    const rows = parseCsv(text!)
    const cols = rows[0]?.length ?? 1
    return (
      <div className={`${DOC} font-mono text-small text-text`}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {rows[0]?.map((h, i) => (
            <div key={i} className="sticky top-0 bg-side px-3 py-3 font-semibold text-text-2">{h}</div>
          ))}
          {rows.slice(1).map((r, ri) => (
            <Fragment key={ri}>
              {Array.from({ length: cols }).map((_, ci) => (
                <div key={ci} className={CSV_CELL}>{r[ci] ?? ''}</div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'md')
    return (
      <div className={`${DOC} px-10 py-9 text-text`}>
        <Suspense fallback={<div className="text-ui text-muted">{t('preview.loading')}</div>}>
          <Markdown text={text!} />
        </Suspense>
      </div>
    )

  // code
  return (
    <div className={`w-[min(820px,92vw)] overflow-hidden rounded-sm bg-code-bg ${POP}`}>
      <div className="flex h-[34px] items-center border-b border-b-[rgba(255,255,255,.07)] px-3 font-mono text-eyebrow text-code-dim">
        {name}
      </div>
      <Suspense fallback={<div className="px-4 py-4 font-mono text-small text-code-dim">{t('preview.loading')}</div>}>
        <div className="max-h-[80vh] overflow-auto px-4 py-4 font-mono text-small leading-relaxed text-code-fg">
          <CodeText code={text!} lang={langOf(name)} />
        </div>
      </Suspense>
    </div>
  )
}

/** shiki-highlighted code, generated locally from the fetched text */
function CodeText({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let stop = false
    void import('../services/highlight')
      .then(({ highlight }) => highlight(code, lang))
      .then((out) => {
        if (!stop) setHtml(out)
      })
      .catch(() => {
        if (!stop) setHtml(null)
      })
    return () => {
      stop = true
    }
  }, [code, lang])
  if (html === null)
    // plain fallback before shiki resolves (or if a grammar is missing)
    return <pre className="whitespace-pre-wrap">{code}</pre>
  // shiki output is generated locally from the file text, not remote HTML
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export function Preview() {
  const { v } = useStore()
  const { t } = useTranslation()
  const real = v.previewFileId
  // a preview can only surface bytes it actually has: a server file (fileId),
  // a local object URL (staged image), or nothing — never generated content
  const hasSource = !!(real || v.previewUrl)
  return (
    <Dialog.Root
      open={v.hasPreview}
      onOpenChange={(o) => {
        if (!o) v.closePreview()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] animate-[dim_140ms_ease] bg-scrim-lightbox" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col outline-none"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-4 text-code-fg">
            <Dialog.Title className="text-ui font-normal">
              {v.previewName}
              {v.previewMeta && <span className="text-meta text-code-dim"> · {v.previewMeta}</span>}
            </Dialog.Title>
            <div className="flex items-center gap-4 text-small">
              {hasSource && (
                <>
                  <button
                    type="button"
                    onClick={v.downloadPreview}
                    className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-inherit"
                  >
                    <Icon n="download" size={14} /> {t('preview.download')}
                  </button>
                  <button
                    type="button"
                    onClick={v.openPreviewExternal}
                    className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-inherit"
                  >
                    <Icon n="open" size={14} /> {t('preview.open')}
                  </button>
                </>
              )}
              <Dialog.Close asChild>
                <button type="button" aria-label={t('common.close')} className="flex cursor-pointer border-none bg-transparent text-inherit outline-none">
                  <Icon n="close" size={16} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          {/* clicking the dark backdrop (not the media) closes; keyboard users use Esc */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) v.closePreview()
            }}
            className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-5 pb-8"
          >
            {real ? (
              <RealDoc fileId={real} kind={v.preview?.kind ?? 'image'} name={v.previewName} />
            ) : v.isPrevImage ? (
              v.previewUrl ? (
                <img
                  src={v.previewUrl}
                  alt={v.previewName}
                  className={`max-h-[70vh] max-w-[min(820px,90vw)] rounded-md object-contain ${POP}`}
                />
              ) : (
                // an image reference without bytes (legacy row) — soft placeholder
                <div
                  className={`h-[min(560px,70vh)] w-[min(820px,90vw)] rounded-md bg-[linear-gradient(135deg,#E7C9A8,#C98F86_55%,#7E6E92)] ${POP}`}
                />
              )
            ) : (
              // a non-image reference without a server copy: nothing to render —
              // say so instead of inventing content
              <div className={`${DOC} px-10 py-9 text-center text-ui text-muted`}>
                {t('preview.unavailable')}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
