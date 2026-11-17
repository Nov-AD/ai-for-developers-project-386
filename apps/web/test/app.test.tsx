import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '@/App'

describe('App', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('redirects an unknown path to the landing page', () => {
    window.history.pushState({}, '', '/unknown')

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument()
  })
})
