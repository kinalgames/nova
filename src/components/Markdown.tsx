import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'

/**
 * Markdown renderer for assistant/user text blocks, mapped onto the paper
 * design system. Loaded lazily (React.lazy in MessageView) so the parser and
 * the shiki highlighter stay out of the main bundle; shiki itself loads only
 * when a code fence is actually rendered.
 */

function CodeCard({ code, lang }: { code: string; lang: string }) {
  const { t } = useTranslation()
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    import('shiki')
      .then(async ({ codeToHtml }) => {
        const out = await codeToHtml(code, { lang: lang || 'text', theme: 'min-dark' })
        if (live) setHtml(out)
      })
      .catch(() => {
        /* unknown language or loader failure — keep the plain <pre> fallback */
      })
    return () => {
      live = false
    }
  }, [code, lang])

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(code)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="my-3 overflow-hidden rounded-sm bg-code-bg">
      <div className="flex h-[30px] items-center justify-between border-b border-b-[rgba(255,255,255,.07)] px-3 font-mono text-eyebrow text-code-dim">
        <span>{lang || 'text'}</span>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-eyebrow text-code-dim outline-none hover:text-code-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Icon n={copied ? 'check' : 'copy'} size={12} /> {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
      {html ? (
        <div
          className="font-mono text-small leading-relaxed [&_pre]:overflow-x-auto [&_pre]:!bg-transparent [&_pre]:px-4 [&_pre]:py-3"
          // shiki output is generated locally from the message text, not remote HTML
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto px-4 py-3 font-mono text-small leading-relaxed text-code-fg">
          {code}
        </pre>
      )}
    </div>
  )
}

export default function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: (p) => <p className="m-0 [&:not(:first-child)]:mt-3" {...p} />,
        strong: (p) => <b className="font-semibold" {...p} />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent-text underline decoration-accent-line underline-offset-2"
          >
            {children}
          </a>
        ),
        ul: (p) => <ul className="my-2 list-disc pl-5 [&>li]:mt-1" {...p} />,
        ol: (p) => <ol className="my-2 list-decimal pl-5 [&>li]:mt-1" {...p} />,
        h1: ({ children }) => <div className="mb-2 mt-4 font-display text-h2">{children}</div>,
        h2: ({ children }) => <div className="mb-2 mt-4 font-display text-h3">{children}</div>,
        h3: ({ children }) => <div className="mb-1.5 mt-3 text-body font-semibold">{children}</div>,
        blockquote: (p) => (
          <blockquote className="my-2 border-l-2 border-border pl-3 italic text-text-2" {...p} />
        ),
        table: (p) => (
          <div className="my-3 overflow-x-auto">
            <table
              className="w-full border-collapse overflow-hidden rounded-sm border border-border font-sans text-ui"
              {...p}
            />
          </div>
        ),
        th: (p) => <th className="bg-panel px-3 py-2.5 text-left font-medium text-muted" {...p} />,
        td: (p) => <td className="border-t border-border px-3 py-2.5" {...p} />,
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children }) => {
          const m = /language-(\w+)/.exec(className || '')
          const raw = String(children).replace(/\n$/, '')
          if (!m && !raw.includes('\n'))
            return (
              <code className="rounded-xs bg-fill px-1 py-0.5 font-mono text-[0.9em]">
                {children}
              </code>
            )
          return <CodeCard code={raw} lang={m?.[1] ?? ''} />
        },
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
