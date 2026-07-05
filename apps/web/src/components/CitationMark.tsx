import type React from 'react'
import * as HoverCard from '@radix-ui/react-hover-card'
import { API_BASE } from '../services/llm'

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** a favicon that 404s (or the domain simply has none) hides itself — the
 *  preview still reads fine with just title + hostname, never a broken-image icon */
export function hideOnError(e: React.SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.visibility = 'hidden'
}

/**
 * One inline citation marker inside Nova's reply text — rendered by
 * Markdown.tsx via the `nova-citation` element the remark-citations
 * plugin injects. Hovering (or tapping on touch) opens a small preview:
 * favicon + title + hostname + the quoted span, when the provider sent one.
 *
 * Without a resolved source url, this degrades to a plain numbered
 * superscript — still visible, never a dead/broken control.
 */
export function CitationMark({
  n,
  citetext,
  url,
  title,
}: {
  n?: string
  citetext?: string
  url?: string
  title?: string
}) {
  if (!url) return <sup className="mx-px text-eyebrow text-accent-text">[{n}]</sup>
  const host = hostOf(url)
  return (
    <HoverCard.Root openDelay={150} closeDelay={80}>
      <HoverCard.Trigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={title || host}
          className="tap-sm mx-px cursor-pointer rounded-xs bg-accent-soft px-[5px] align-super text-eyebrow text-accent-text no-underline"
        >
          {n}
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          sideOffset={8}
          className="z-[80] w-[280px] rounded-sm border border-border bg-panel p-3 shadow-overlay animate-[fadeUp_140ms_var(--ease-paper)]"
        >
          <div className="flex items-start gap-2.5">
            <img
              src={`${API_BASE}/v1/favicon?domain=${encodeURIComponent(host)}`}
              alt=""
              width={16}
              height={16}
              className="mt-0.5 shrink-0 rounded-xs"
              onError={hideOnError}
            />
            <div className="min-w-0">
              <div className="truncate text-small font-medium text-text">{title || host}</div>
              <div className="truncate text-eyebrow text-faint">{host}</div>
              {citetext && <div className="mt-1.5 text-small italic text-text-2">“{citetext}”</div>}
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
