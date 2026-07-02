import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { getSeed } from './seed'
import { seedVi } from './seed.vi'
import { seedEn } from './seed.en'
import { renderStore } from '../test/util'

beforeEach(() => localStorage.clear())
afterEach(async () => {
  await i18n.changeLanguage('vi')
})

describe('locale-aware seed bundles (i18n phase 2)', () => {
  it('vi is the default bundle', () => {
    expect(getSeed()).toBe(seedVi)
    expect(getSeed().convs[0].title).toBe('Đối chiếu benchmark đối thủ')
  })

  it('the english language selects the english bundle', async () => {
    await i18n.changeLanguage('en')
    expect(getSeed()).toBe(seedEn)
    expect(getSeed().convs[0].title).toBe('Competitor benchmark comparison')
    expect(getSeed().projects[0].name).toBe('General')
  })

  it('both bundles stay structurally aligned', () => {
    expect(seedEn.projects.map((p) => p.id)).toEqual(seedVi.projects.map((p) => p.id))
    expect(seedEn.convs.map((c) => c.id)).toEqual(seedVi.convs.map((c) => c.id))
    expect(Object.keys(seedEn.threads)).toEqual(Object.keys(seedVi.threads))
    for (const id of Object.keys(seedVi.threads)) {
      expect(seedEn.threads[id].map((m) => m.id)).toEqual(seedVi.threads[id].map((m) => m.id))
      // block shapes match so the demo switcher and tests behave identically
      expect(seedEn.threads[id].map((m) => m.blocks.map((b) => b.type))).toEqual(
        seedVi.threads[id].map((m) => m.blocks.map((b) => b.type)),
      )
    }
    expect(Object.keys(seedEn.profiles)).toEqual(Object.keys(seedVi.profiles))
    expect(seedEn.quiet.risks).toHaveLength(seedVi.quiet.risks.length)
    expect(Object.keys(seedEn.samples)).toEqual(Object.keys(seedVi.samples))
    expect(Object.keys(seedEn.previewNames)).toEqual(Object.keys(seedVi.previewNames))
    expect(Object.keys(seedEn.previewDocs)).toEqual(Object.keys(seedVi.previewDocs))
    expect(seedEn.previewDocs.csv.rows).toHaveLength(seedVi.previewDocs.csv.rows.length)
    expect(seedEn.previewDocs.md.bullets).toHaveLength(seedVi.previewDocs.md.bullets.length)
    expect(seedEn.replies.templates).toHaveLength(seedVi.replies.templates.length)
    expect(seedEn.replies.fallbacks).toHaveLength(seedVi.replies.fallbacks.length)
  })

  it('an english boot seeds the store with english demo content', async () => {
    await i18n.changeLanguage('en')
    const { result } = await renderStore()
    expect(result.current.s.conversations.find((c) => c.id === 'c1')?.title).toBe(
      'Competitor benchmark comparison',
    )
    expect(result.current.s.projects.find((p) => p.id === 'chung')?.name).toBe('General')
    expect(result.current.s.profiles.claude[0].name).toBe('Personal')
  })
})
