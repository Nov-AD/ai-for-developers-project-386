import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { meetingTypesResponse } from './helpers/contract'

describe('App', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
    vi.unstubAllGlobals()
  })

  it('redirects an unknown path to the landing page', () => {
    window.history.pushState({}, '', '/unknown')

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument()
  })

  it('loads the meeting type list when /book is opened directly', async () => {
    window.history.pushState({}, '', '/book')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(meetingTypesResponse('empty')))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeInTheDocument()
    expect(await screen.findByText('Типов встреч пока нет. Загляните позже.')).toBeInTheDocument()
  })
})
