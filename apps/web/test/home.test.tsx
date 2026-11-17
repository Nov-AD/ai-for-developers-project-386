import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Home } from '@/routes/Home'

describe('Home', () => {
  it('renders the landing heading and the booking call to action', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Записаться на звонок' })).toHaveAttribute(
      'href',
      '/book'
    )
  })

  it('explains the booking flow in three steps', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 3, name: 'Выберите тип встречи' })).toBeVisible()
  })
})
