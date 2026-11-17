import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Book } from '@/routes/Book'
import type { MeetingType } from '@calendar/sdk'
import { meetingTypesResponse } from './helpers/contract'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderBook() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Book />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Book', () => {
  it('shows each complete meeting type in API order and lets the guest change selection', async () => {
    const types: MeetingType[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Introduction',
        description: 'First conversation',
        durationMinutes: 45
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Review',
        description: 'Discuss a project',
        durationMinutes: 17
      }
    ]
    const fetch = vi.fn().mockResolvedValue(meetingTypesResponse('populated', types))
    vi.stubGlobal('fetch', fetch)
    renderBook()

    const first = await screen.findByRole('radio', { name: 'Introduction' })
    const second = screen.getByRole('radio', { name: 'Review' })
    expect(screen.getAllByRole('radio')).toEqual([first, second])
    expect(screen.getByText('First conversation')).toBeInTheDocument()
    expect(screen.getByText('45 мин.')).toBeInTheDocument()
    expect(screen.getByText('Discuss a project')).toBeInTheDocument()
    expect(screen.getByText('17 мин.')).toBeInTheDocument()
    expect(first).not.toBeChecked()
    fireEvent.click(first)
    expect(first).toBeChecked()
    fireEvent.click(second)
    expect(second).toBeChecked()
    expect(first).not.toBeChecked()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /записаться/i })).not.toBeInTheDocument()
  })

  it('loads the empty meeting type list with a way back home', async () => {
    const fetch = vi.fn().mockResolvedValue(meetingTypesResponse('empty'))
    vi.stubGlobal('fetch', fetch)

    renderBook()

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeInTheDocument()
    expect(await screen.findByText('Типов встреч пока нет. Загляните позже.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/')
    expect(fetch).toHaveBeenCalledTimes(1)
    const request = fetch.mock.calls[0]![0] as Request
    expect(request.method).toBe('GET')
    expect(new URL(request.url).pathname).toBe('/meeting-types')
    expect(new URL(request.url).search).toBe('')
  })

  it('distinguishes loading from an empty list until the response arrives', async () => {
    const response = Promise.withResolvers<Response>()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise))

    renderBook()

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем типы встреч…')
    expect(screen.queryByText('Типов встреч пока нет. Загляните позже.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    response.resolve(meetingTypesResponse('empty'))
    expect(await screen.findByText('Типов встреч пока нет. Загляните позже.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a contract HTTP error separately from empty data and lets the guest retry', async () => {
    const retry = Promise.withResolvers<Response>()
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(meetingTypesResponse('unknown-query'))
      .mockReturnValueOnce(retry.promise)
    vi.stubGlobal('fetch', fetch)

    renderBook()

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить типы встреч.')
    expect(screen.queryByText('Типов встреч пока нет. Загляните позже.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Загружаем типы встреч…')

    retry.resolve(meetingTypesResponse('empty'))
    expect(await screen.findByText('Типов встреч пока нет. Загляните позже.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('offers retry after a network failure without showing an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderBook()

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить типы встреч.')
    expect(screen.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled()
    expect(screen.queryByText('Типов встреч пока нет. Загляните позже.')).not.toBeInTheDocument()
  })
})
