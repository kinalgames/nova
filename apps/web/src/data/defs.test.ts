// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defaultSlots, findModel, findModelById, findProvider, provDefs } from './defs'

describe('model catalog lookups — corrupted refs heal to safe defaults', () => {
  it('an unknown provider id falls back to the first provider', () => {
    expect(findProvider('nope' as never)).toBe(provDefs[0])
  })

  it('a retired model id falls back to its provider first model', () => {
    expect(findModel({ providerId: 'claude', modelId: 'claude-opus-4' })).toBe(provDefs[0].models[0])
    expect(findModel(defaultSlots.smart).id).toBe('claude-opus-4-8')
  })

  it('a global model lookup misses cleanly', () => {
    expect(findModelById('ghost-model')).toBeUndefined()
    expect(findModelById('claude-haiku-4-5')?.name).toBe('Claude Haiku 4.5')
  })
})
