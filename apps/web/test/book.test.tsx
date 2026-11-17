import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Book } from '@/routes/Book'

describe('Book', () => {
  it('renders the booking placeholder with a way back home', () => {
    render(
      <MemoryRouter>
        <Book />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/')
  })
})
