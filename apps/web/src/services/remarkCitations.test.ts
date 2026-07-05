import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root, Text } from 'mdast'
import { remarkCitations, type CitationSpan } from './remarkCitations'

/** parses `text` then runs the plugin, returning the resulting mdast tree */
function transform(text: string, citations: CitationSpan[]): Root {
  const processor = unified().use(remarkParse).use(remarkCitations(citations))
  const tree = processor.parse(text) as Root
  processor.runSync(tree)
  return tree
}

/** flattens the tree's direct paragraph children into a compact shape for
 *  easy assertions: plain text nodes as their value, citation nodes as
 *  `{n, citetext}` pulled from the injected hProperties */
function shapeOf(tree: Root): unknown[] {
  const para = tree.children[0] as { children: (Text & { data?: { hProperties?: Record<string, unknown> } })[] }
  return para.children.map((n) =>
    n.type === 'text' ? n.value : { n: n.data?.hProperties?.n, citetext: n.data?.hProperties?.citetext },
  )
}

describe('remarkCitations', () => {
  it('no citations at all — the tree is untouched (early return, no traversal cost)', () => {
    const tree = transform('Xin chào.', [])
    expect(shapeOf(tree)).toEqual(['Xin chào.'])
  })

  it('a single citation splits into [before, cited-span, marker, after]', () => {
    const tree = transform('A B C.', [{ start: 2, end: 3, n: 1, text: 'B' }])
    expect(shapeOf(tree)).toEqual(['A ', 'B', { n: 1, citetext: 'B' }, ' C.'])
  })

  it('a citation at the very start of the node has no "before" piece', () => {
    const tree = transform('AB C.', [{ start: 0, end: 2, n: 1 }])
    expect(shapeOf(tree)).toEqual(['AB', { n: 1, citetext: '' }, ' C.'])
  })

  it('a citation at the very end of the node has no "after" piece', () => {
    const tree = transform('A BC', [{ start: 2, end: 4, n: 1 }])
    expect(shapeOf(tree)).toEqual(['A ', 'BC', { n: 1, citetext: '' }])
  })

  it('two citations in one node, given out of order, are applied in stream (left-to-right) order', () => {
    const tree = transform('X A Y B Z', [
      { start: 6, end: 7, n: 2 },
      { start: 2, end: 3, n: 1 },
    ])
    expect(shapeOf(tree)).toEqual([
      'X ',
      'A',
      { n: 1, citetext: '' },
      ' Y ',
      'B',
      { n: 2, citetext: '' },
      ' Z',
    ])
  })

  it('a span straddling into a **bold** run is left unmarked — never split across a formatting boundary', () => {
    // "Giá **vàng**" — the plain-text node is just "Giá ", the bold run is a
    // SEPARATE text node inside a strong node; a span crossing both is
    // contained in NEITHER node fully, so both are matched against but skip
    const tree = transform('Giá **vàng** tăng.', [{ start: 0, end: 8, n: 1 }])
    // nothing was injected anywhere in the tree — walk it looking for any citation node
    function hasCitation(node: unknown): boolean {
      if (node && typeof node === 'object' && (node as { type?: string }).type === 'citation') return true
      const children = (node as { children?: unknown[] }).children
      return Array.isArray(children) && children.some(hasCitation)
    }
    expect(hasCitation(tree)).toBe(false)
  })

  it('a span with start === end (empty range) is never treated as a hit', () => {
    const tree = transform('ABC', [{ start: 1, end: 1, n: 1 }])
    expect(shapeOf(tree)).toEqual(['ABC'])
  })
})
