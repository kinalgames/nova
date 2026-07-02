import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { GrowingTextarea } from './GrowingTextarea'

afterEach(() => vi.restoreAllMocks())

const stubScrollHeight = (px: number) =>
  vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(px)

const renderArea = (maxHeight: number) => {
  const { container } = render(
    <GrowingTextarea value="hi" onChange={() => {}} maxHeight={maxHeight} />,
  )
  return container.querySelector('textarea') as HTMLTextAreaElement
}

describe('<GrowingTextarea>', () => {
  it('grows with content and hides the inner scrollbar under the cap', () => {
    stubScrollHeight(120)
    const el = renderArea(220)
    expect(el.style.height).toBe('120px')
    expect(el.style.overflowY).toBe('hidden')
  })

  it('caps at maxHeight and scrolls inside itself beyond it', () => {
    stubScrollHeight(500)
    const el = renderArea(220)
    expect(el.style.height).toBe('220px')
    expect(el.style.overflowY).toBe('auto')
  })
})
