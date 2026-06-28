import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('ConversationView — response states', () => {
  it('streaming shows the live "writing" indicator and a stop control', async () => {
    renderWithStore(<App />, (s) => s.set({ respState: 'stream' }))
    expect(await screen.findByText(/Đang viết câu trả lời/)).toBeInTheDocument()
    expect(screen.getByText('Dừng')).toBeInTheDocument()
  })

  it('streaming shows an animated Nova working indicator', async () => {
    renderWithStore(<App />, (s) => s.set({ respState: 'stream' }))
    expect(await screen.findByLabelText('Nova đang làm việc')).toBeInTheDocument()
  })

  it('error shows the interrupted banner with a retry', async () => {
    renderWithStore(<App />, (s) => s.set({ respState: 'error' }))
    expect(await screen.findByText('Phản hồi bị gián đoạn')).toBeInTheDocument()
  })

  it('approval shows the permission prompt for a bash command', async () => {
    renderWithStore(<App />, (s) => s.set({ respState: 'approval' }))
    expect(await screen.findByText('Cho phép')).toBeInTheDocument()
    expect(screen.getByText('Từ chối')).toBeInTheDocument()
  })

  it('advanced mode reveals the raw tool trace when expanded', async () => {
    renderWithStore(<App />, (s) => s.set({ advanced: true, traceOpen: true, respState: 'done' }))
    expect(await screen.findByText('web_search')).toBeInTheDocument()
    expect(screen.getByText('read_file')).toBeInTheDocument()
  })

  it('trace shows the thinking step but no "SUY NGHĨ" label', async () => {
    renderWithStore(<App />, (s) => s.set({ advanced: true, traceOpen: true, respState: 'done' }))
    expect(await screen.findByText(/Cần số liệu benchmark/)).toBeInTheDocument()
    expect(screen.queryByText('SUY NGHĨ')).not.toBeInTheDocument()
  })

  it('a fresh chat shows the empty state', async () => {
    renderWithStore(<App />, (s) => s.v.pNewChat())
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
  })
})

describe('ConversationView — demo content is scoped to the demo conversation', () => {
  it('does not leak the scripted answer into a real conversation', async () => {
    renderWithStore(<App />, (s) => s.set({ activeConv: 'c2', respState: 'done' }))
    // the real c2 thread is shown
    expect(await screen.findByText(/Viết giúp mình đoạn mở đầu/)).toBeInTheDocument()
    // the Aurora benchmark answer (demo-only) must NOT appear
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
    // nor the demo state switcher
    expect(screen.queryByText('demo:')).not.toBeInTheDocument()
  })

  it('a fresh chat shows only the empty state, no scripted answer', async () => {
    renderWithStore(<App />, (s) => s.v.pNewChat())
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
    expect(screen.queryByText(/đối chiếu khảo sát với 6 đối thủ/)).not.toBeInTheDocument()
  })

  it('shows the demo state switcher on the demo conversation', async () => {
    renderWithStore(<App />)
    expect(await screen.findByText('demo:')).toBeInTheDocument()
  })
})
