import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from '../App'
import { renderWithStore } from '../test/util'

beforeEach(() => localStorage.clear())

describe('<Auth>', () => {
  it('login form shows social + email options', async () => {
    renderWithStore(<App />, (s) => s.set({ authView: 'login' }))
    expect(await screen.findByText('Tiếp tục với Google')).toBeInTheDocument()
    expect(screen.getByText('Tiếp tục với GitHub')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('signup form switches the title and CTA', async () => {
    renderWithStore(<App />, (s) => s.set({ authView: 'signup' }))
    expect(await screen.findAllByText('Tạo tài khoản')).not.toHaveLength(0)
  })

  it('onboarding asks for assistant name + default model', async () => {
    renderWithStore(<App />, (s) => s.set({ authView: 'onboarding' }))
    expect(await screen.findByText('Chào mừng đến Lumen')).toBeInTheDocument()
    expect(screen.getByText('TÊN TRỢ LÝ')).toBeInTheDocument()
  })
})

describe('mobile layout', () => {
  it('hides the sidebar and exposes the drawer menu button', async () => {
    renderWithStore(<App />, (s) => s.set({ vw: 375 }))
    expect(await screen.findByRole('button', { name: 'Mở menu' })).toBeInTheDocument()
  })

  it('opens the mobile drawer dialog', async () => {
    renderWithStore(<App />, (s) => s.set({ vw: 375, drawerOpen: true }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
