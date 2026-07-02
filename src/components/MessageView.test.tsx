import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { makeUser, renderApp } from '../test/util'
import { addSibling, fromLinear } from '../state/thread'
import type { Message } from '../state/types'

beforeEach(() => localStorage.clear())

const msg = (id: string, role: Message['role'], text: string): Message => ({
  id,
  role,
  who: role === 'user' ? 'MINH' : 'NOVA',
  blocks: [{ type: 'text', text }],
})

const linear = () =>
  fromLinear([msg('u1', 'user', 'Prompt gốc'), msg('a1', 'assistant', 'Trả lời một')])

const forked = () => addSibling(linear(), 'a1', msg('a2', 'assistant', 'Trả lời hai'))

const seed = (thread: ReturnType<typeof linear>) => async () =>
  renderApp((s) => s.set({ activeConv: 'c1', threads: { c1: thread } }))

describe('version navigator ‹ i/n ›', () => {
  it('walks between reply versions and clamps at the edges', async () => {
    const user = makeUser()
    await seed(forked())()

    expect(await screen.findByText('Trả lời hai')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()

    const prev = screen.getByRole('button', { name: 'Phiên bản trước' })
    const next = screen.getByRole('button', { name: 'Phiên bản sau' })
    expect(next).toBeDisabled()

    await user.click(prev)
    expect(screen.getByText('Trả lời một')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phiên bản trước' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Phiên bản sau' }))
    expect(screen.getByText('Trả lời hai')).toBeInTheDocument()
  })
})

describe('per-message actions', () => {
  it('copies a message through the clipboard', async () => {
    const user = makeUser()
    const write = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    })
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    const copies = screen.getAllByRole('button', { name: 'Sao chép' })
    await user.click(copies[0])
    expect(write).toHaveBeenCalledWith('Prompt gốc')
  })

  it('toggles feedback — up, switch to down, off again', async () => {
    const user = makeUser()
    await seed(linear())()

    const good = await screen.findByRole('button', { name: 'Hữu ích' })
    const bad = screen.getByRole('button', { name: 'Chưa tốt' })

    await user.click(good)
    expect(good).toHaveAttribute('aria-pressed', 'true')

    await user.click(bad)
    expect(bad).toHaveAttribute('aria-pressed', 'true')
    expect(good).toHaveAttribute('aria-pressed', 'false')

    await user.click(bad)
    expect(bad).toHaveAttribute('aria-pressed', 'false')
  })

  it('regenerates a reply as a new version, stoppable mid-stream', async () => {
    const user = makeUser()
    await seed(linear())()

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }))
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Dừng/ }))
    expect(screen.queryByText('Đang viết câu trả lời…')).not.toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })
})

describe('inline edit-and-rerun', () => {
  it('opens prefilled, cancels without changes', async () => {
    const user = makeUser()
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    await user.click(screen.getByRole('button', { name: 'Sửa' }))
    const box = screen.getByRole('textbox', { name: 'Sửa tin nhắn' })
    expect(box).toHaveValue('Prompt gốc')

    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('textbox', { name: 'Sửa tin nhắn' })).not.toBeInTheDocument()
    expect(screen.getByText('Prompt gốc')).toBeInTheDocument()
  })

  it('saves an edit as a new prompt version and re-runs the reply', async () => {
    const user = makeUser()
    await seed(linear())()

    await screen.findByText('Prompt gốc')
    await user.click(screen.getByRole('button', { name: 'Sửa' }))
    const box = screen.getByRole('textbox', { name: 'Sửa tin nhắn' })
    await user.clear(box)
    await user.type(box, 'Prompt chỉnh sửa')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Prompt chỉnh sửa')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(await screen.findByText('Đang viết câu trả lời…')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Dừng/ }))
  })
})
