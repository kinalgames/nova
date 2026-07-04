import { Fragment, Suspense, lazy, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'
import { getSeed } from '../data/seed'
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
  // demo document bodies are locale-aware seed DATA, rendered live
  const docs = getSeed().previewDocs
  const names = getSeed().previewNames
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
              {v.previewName} <span className="text-meta text-code-dim">· {v.previewMeta}</span>
            </Dialog.Title>
            <div className="flex items-center gap-4 text-small">
              {!real && (
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
            ) : (
              <>
                {v.isPrevImage &&
                  (v.previewUrl ? (
                    <img
                      src={v.previewUrl}
                      alt={v.previewName}
                      className={`max-h-[70vh] max-w-[min(820px,90vw)] rounded-md object-contain ${POP}`}
                    />
                  ) : (
                    <div
                      className={`h-[min(560px,70vh)] w-[min(820px,90vw)] rounded-md bg-[linear-gradient(135deg,#E7C9A8,#C98F86_55%,#7E6E92)] ${POP}`}
                    />
                  ))}

                {v.isPrevPdf && (
                  <div
                    className={`paper-doc relative h-[min(640px,78vh)] w-[min(540px,92vw)] overflow-hidden rounded-sm bg-white px-12 py-12 ${POP}`}
                  >
                    <div className="mb-1 font-display text-h2 text-text">{docs.pdf.title}</div>
                    <div className="mb-6 text-meta text-muted">{docs.pdf.meta}</div>
                    <div className="text-ui leading-relaxed text-text">{docs.pdf.lead}</div>
                    <div className="mt-5 h-[9px] w-[92%] rounded-xs bg-border" />
                    <div className="mt-3 h-[9px] w-[84%] rounded-xs bg-border" />
                    <div className="mt-3 h-[9px] w-[88%] rounded-xs bg-border" />
                    <div className="mt-3 h-[9px] w-[58%] rounded-xs bg-border" />
                    <div className="absolute inset-x-0 bottom-[18px] text-center font-mono text-eyebrow text-faint">{docs.pdf.page}</div>
                  </div>
                )}

                {v.isPrevCode && (
                  <div className={`w-[min(680px,92vw)] overflow-hidden rounded-sm bg-code-bg ${POP}`}>
                    <div className="flex h-[34px] items-center border-b border-b-[rgba(255,255,255,.07)] px-3 font-mono text-eyebrow text-code-dim">
                      {names.code}
                    </div>
                    <div className="px-4 py-4 font-mono text-small leading-relaxed text-code-fg">
                      <div><span className="text-code-dim">1&nbsp;&nbsp;</span><span className="text-[#C98FB0]">import</span> pandas <span className="text-[#C98FB0]">as</span> pd</div>
                      <div><span className="text-code-dim">2&nbsp;&nbsp;</span></div>
                      <div><span className="text-code-dim">3&nbsp;&nbsp;</span>survey = pd.read_csv(<span className="text-[#9FBF9F]">"survey.csv"</span>)</div>
                      <div><span className="text-code-dim">4&nbsp;&nbsp;</span>bench&nbsp;&nbsp;= pd.read_json(<span className="text-[#9FBF9F]">"bench.json"</span>)</div>
                      <div><span className="text-code-dim">5&nbsp;&nbsp;</span>act = survey[<span className="text-[#9FBF9F]">"activated_72h"</span>].mean()</div>
                      <div><span className="text-code-dim">6&nbsp;&nbsp;</span><span className="text-[#C98FB0]">print</span>(<span className="text-[#9FBF9F]">{`f"${docs.code.print}: {act:.0%}"`}</span>)</div>
                    </div>
                  </div>
                )}

                {v.isPrevCsv && (
                  <div
                    className={`paper-doc max-h-[78vh] w-[min(620px,92vw)] overflow-auto rounded-sm bg-white font-mono text-small text-text ${POP}`}
                  >
                    <div className="grid grid-cols-[1.4fr_1fr_1fr]">
                      {docs.csv.head.map((h) => (
                        <div key={h} className="bg-side px-3 py-3 text-text-2">{h}</div>
                      ))}
                      {docs.csv.rows.map((r) => (
                        <Fragment key={r.id}>
                          <div className={CSV_CELL}>{r.id}</div>
                          <div className={`${CSV_CELL} ${r.ok ? 'text-success-text' : 'text-danger-text'}`}>{r.okText}</div>
                          <div className={CSV_CELL}>{r.channel}</div>
                        </Fragment>
                      ))}
                      <div className={`${CSV_CELL} text-faint`}>…</div>
                      <div className={`${CSV_CELL} text-faint`}>…</div>
                      <div className={`${CSV_CELL} text-faint`}>…</div>
                    </div>
                  </div>
                )}

                {v.isPrevMd && (
                  <div
                    className={`paper-doc max-h-[78vh] w-[min(620px,92vw)] overflow-auto rounded-sm bg-white px-10 py-9 text-text ${POP}`}
                  >
                    <div className="mb-4 font-display text-h2">{docs.md.title}</div>
                    <div className="mb-2 text-body font-semibold">{docs.md.gapHeading}</div>
                    <div className="flex flex-col gap-1.5 text-body leading-relaxed text-text">
                      {docs.md.bullets.map((b, i) => (
                        <div key={i}>
                          •&nbsp;&nbsp;{b.pre}
                          {b.strong && <b className="font-semibold">{b.strong}</b>}
                          {b.tail}
                        </div>
                      ))}
                    </div>
                    <div className="mb-2 mt-5 text-body font-semibold">{docs.md.sixHeading}</div>
                    <div className="text-body leading-relaxed text-text">{docs.md.sixBody}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
