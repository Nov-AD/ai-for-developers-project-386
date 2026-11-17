import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Book } from '@/routes/Book'
import type { MeetingType } from '@calendar/sdk'
import { availabilityResponse, meetingTypesResponse } from './helpers/contract'

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

describe('Book availability', () => {
  const intro: MeetingType = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Introduction',
    description: 'First conversation',
    durationMinutes: 45
  }
  const review: MeetingType = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Review',
    description: 'Discuss a project',
    durationMinutes: 30
  }
  const window = {
    ownerTimeZone: 'Europe/Moscow',
    windowStartDate: '2026-11-18',
    windowEndDate: '2026-11-21'
  }
  const twoDays = {
    ...window,
    slots: [
      { start: '2026-11-18T06:00:00Z', end: '2026-11-18T06:45:00Z' },
      { start: '2026-11-18T06:30:00Z', end: '2026-11-18T07:15:00Z' },
      { start: '2026-11-19T06:00:00Z', end: '2026-11-19T06:45:00Z' }
    ]
  }

  function mockApi(availability: (url: URL) => Response) {
    const fetch = vi.fn(async (input: Request) => {
      const url = new URL(input.url)
      if (url.pathname === '/meeting-types')
        return meetingTypesResponse('populated', [intro, review])
      if (url.pathname === '/availability') return availability(url)
      throw new Error(`Unexpected request ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('loads availability for the selected type, shows days without slots and keeps the chosen slot', async () => {
    const fetch = mockApi(() => availabilityResponse('available', twoDays))
    renderBook()

    fireEvent.click(await screen.findByRole('radio', { name: 'Introduction' }))

    const day18 = await screen.findByRole('button', { name: /18 ноября/ })
    expect(day18).toHaveTextContent('2 слотов')
    // 2026-11-20 is a Friday with no slots in the response.
    const emptyDay = screen.getByRole('button', { name: /20 ноября/ })
    expect(emptyDay).toBeDisabled()
    expect(emptyDay).toHaveTextContent('нет слотов')

    fireEvent.click(day18)
    const slot = screen.getByRole('radio', { name: /09:00/ })
    fireEvent.click(slot)
    expect(slot).toBeChecked()

    const availabilityCalls = fetch.mock.calls.filter(
      ([request]) => new URL(request.url).pathname === '/availability'
    )
    expect(availabilityCalls).toHaveLength(1)
    expect(new URL(availabilityCalls[0]![0].url).searchParams.get('meetingTypeId')).toBe(intro.id)
  })

  it('resets the day and slot and reloads availability when the guest changes the type', async () => {
    const fetch = mockApi((url) =>
      availabilityResponse(
        'available',
        url.searchParams.get('meetingTypeId') === intro.id
          ? twoDays
          : { ...window, slots: [{ start: '2026-11-19T06:00:00Z', end: '2026-11-19T06:30:00Z' }] }
      )
    )
    renderBook()

    fireEvent.click(await screen.findByRole('radio', { name: 'Introduction' }))
    fireEvent.click(await screen.findByRole('button', { name: /18 ноября/ }))
    fireEvent.click(screen.getByRole('radio', { name: /09:00/ }))
    expect(screen.getByRole('radio', { name: /09:00/ })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: 'Review' }))

    expect(await screen.findByRole('button', { name: /19 ноября/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /09:00/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Выберите день, чтобы увидеть свободное время/)).toBeInTheDocument()
    const calls = fetch.mock.calls
      .filter(([request]) => new URL(request.url).pathname === '/availability')
      .map(([request]) => new URL(request.url).searchParams.get('meetingTypeId'))
    expect(calls).toEqual([intro.id, review.id])
  })

  it('shows a clear no-slots state instead of day buttons when nothing is available', async () => {
    mockApi(() => availabilityResponse('empty'))
    renderBook()

    fireEvent.click(await screen.findByRole('radio', { name: 'Introduction' }))

    expect(await screen.findByText(/На ближайшие дни свободных слотов нет/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ноября/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an availability error separately and refetches on retry', async () => {
    let attempt = 0
    mockApi(() => {
      attempt += 1
      return attempt === 1
        ? availabilityResponse('unknown-type')
        : availabilityResponse('available', twoDays)
    })
    renderBook()

    fireEvent.click(await screen.findByRole('radio', { name: 'Introduction' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось загрузить свободное время.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }))
    expect(await screen.findByText(/Время показано в вашем часовом поясе/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows slot times in the guest time zone with an explicit zone label', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    mockApi(() => availabilityResponse('available', twoDays))
    renderBook()

    fireEvent.click(await screen.findByRole('radio', { name: 'Introduction' }))
    fireEvent.click(await screen.findByRole('button', { name: /18 ноября/ }))

    const slot = await screen.findByRole('radio', { name: /01:00/ })
    const label = slot.closest('label')
    expect(label).toHaveTextContent('18 нояб. 2026 г., 01:00')
    expect(label?.textContent).toMatch(/GMT-5|EST|UTC−5/)
    expect(screen.getByText(/America\/New_York/)).toBeInTheDocument()
  })
})
