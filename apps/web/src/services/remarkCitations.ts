import { visit } from 'unist-util-visit'
import type { Root, Text, Parent } from 'mdast'
import type { Plugin } from 'unified'

/** one citation span, offsets into the RAW markdown source string this
 *  block renders — the exact same coordinates Markdown.tsx receives as
 *  `text` (source and offsets always describe the same string). */
export interface CitationSpan {
  start: number
  end: number
  n?: number
  text?: string
  url?: string
  title?: string
}

/**
 * remark plugin: splits a markdown text node that a citation span falls
 * fully within into [before, cited-span, <marker>, after] pieces, using
 * each text node's own tracked source position (remark-parse's default
 * behavior) to test overlap. The cited span's OWN text is always kept
 * verbatim — the marker is a footnote appended right after it, never a
 * replacement, so no reply content ever disappears behind a citation.
 * A span that straddles more than one text node — e.g. it crosses into a
 * **bold** run, or spans two paragraphs — is left unmarked rather than
 * splitting across a formatting boundary; the marker is additive UI,
 * never load-bearing, so silently skipping an un-splittable span is the
 * safe default.
 *
 * The injected node carries `data.hName`/`data.hProperties` so
 * remark-rehype emits it as a `<sup n="…">` element — `sup` is a plain,
 * already-typed HTML tag (no custom-element JSX augmentation needed), and
 * neither remark-gfm nor remark-breaks ever produce one on their own, so
 * react-markdown's `components.sup` override only ever sees these.
 */
export function remarkCitations(citations: CitationSpan[]): Plugin<[], Root> {
  return () => (tree: Root) => {
    if (!citations.length) return
    const sorted = [...citations].sort((a, b) => a.start - b.start)
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (index == null || !parent) return undefined
      const start = node.position?.start.offset
      const end = node.position?.end.offset
      if (start == null || end == null) return undefined
      const hits = sorted.filter((c) => c.start >= start && c.end <= end && c.start < c.end)
      if (!hits.length) return undefined

      const pieces: (Text | ({ type: 'citation' } & Record<string, unknown>))[] = []
      let cursor = start
      for (const c of hits) {
        if (c.start > cursor) pieces.push({ type: 'text', value: node.value.slice(cursor - start, c.start - start) })
        // the cited text itself, kept verbatim — the marker never replaces content
        pieces.push({ type: 'text', value: node.value.slice(c.start - start, c.end - start) })
        pieces.push({
          type: 'citation',
          data: {
            hName: 'sup',
            hProperties: { n: c.n ?? '', citetext: c.text ?? '', url: c.url ?? '', title: c.title ?? '' },
          },
        })
        cursor = c.end
      }
      if (cursor < end) pieces.push({ type: 'text', value: node.value.slice(cursor - start) })

      parent.children.splice(index, 1, ...(pieces as Parent['children']))
      return index + pieces.length
    })
  }
}
