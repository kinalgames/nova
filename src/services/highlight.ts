// Lazy syntax highlighting on shiki's JavaScript regex engine — no oniguruma
// wasm chunk (~230 kB gz saved). The core loads once; each language grammar
// loads on first use as its own chunk.

import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { bundledLanguages } from 'shiki/langs'
import { bundledThemes } from 'shiki/themes'

const THEME = 'min-dark'

let corePromise: Promise<HighlighterCore> | null = null
const loaded = new Set<string>()

function getCore(): Promise<HighlighterCore> {
  corePromise ??= (async () =>
    createHighlighterCore({
      themes: [(await bundledThemes[THEME]()).default],
      langs: [],
      // forgiving: a grammar the JS engine cannot fully compile degrades
      // gracefully instead of throwing
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    }))()
  return corePromise
}

/**
 * Highlight `code` as `lang` with the terminal theme. Returns null for an
 * unknown language so callers keep their plain fallback rendering.
 */
export async function highlight(code: string, lang: string): Promise<string | null> {
  const importer = (
    bundledLanguages as Record<string, (() => Promise<{ default: unknown }>) | undefined>
  )[lang]
  if (!importer) return null
  const core = await getCore()
  if (!loaded.has(lang)) {
    await core.loadLanguage((await importer()).default as never)
    loaded.add(lang)
  }
  return core.codeToHtml(code, { lang, theme: THEME })
}
