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

  it('a fresh chat shows the empty state', async () => {
    renderWithStore(<App />, (s) => s.v.pNewChat())
    expect(await screen.findByText(/Hỏi bất cứ điều gì/)).toBeInTheDocument()
  })
})
