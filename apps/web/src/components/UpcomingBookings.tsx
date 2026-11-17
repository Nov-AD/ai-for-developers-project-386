import { listUpcomingBookingsOptions, type Booking } from '@calendar/sdk'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { formatInstant } from '@/lib/time'

/** The owner is a single preconfigured person in this zone. */
const OWNER_TIME_ZONE = 'Europe/Moscow'

function BookingItem({ booking }: { booking: Booking }) {
  return (
    <li className="space-y-1 rounded-lg border p-4">
      <p className="font-medium">{booking.guestName}</p>
      <p className="text-sm text-muted-foreground">
        {booking.meetingType.name} · {booking.meetingType.durationMinutes} мин.
      </p>
      <p className="text-sm">
        {formatInstant(booking.start, OWNER_TIME_ZONE)} —{' '}
        {formatInstant(booking.end, OWNER_TIME_ZONE)}
      </p>
    </li>
  )
}

export function UpcomingBookings() {
  const upcoming = useQuery({
    ...listUpcomingBookingsOptions(),
    // Refresh on page entry and window focus; the button below covers a manual refresh.
    refetchOnWindowFocus: true,
    retry: false
  })

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Время указано в часовом поясе владельца: {OWNER_TIME_ZONE}.
      </p>

      {upcoming.isPending && (
        <p role="status" className="text-muted-foreground">
          Загружаем предстоящие записи…
        </p>
      )}

      {upcoming.isError && (
        <div role="alert" className="space-y-4">
          <p>Не удалось загрузить предстоящие записи. Проверьте соединение и попробуйте ещё раз.</p>
          <Button
            type="button"
            onClick={() => void upcoming.refetch()}
            disabled={upcoming.isFetching}
          >
            Повторить загрузку
          </Button>
        </div>
      )}

      {upcoming.isSuccess && upcoming.data.length === 0 && (
        <p className="text-muted-foreground">Предстоящих записей нет.</p>
      )}

      {upcoming.isSuccess && upcoming.data.length > 0 && (
        <ul aria-label="Предстоящие записи" className="space-y-2">
          {upcoming.data.map((booking) => (
            <BookingItem key={booking.id} booking={booking} />
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => void upcoming.refetch()}
        disabled={upcoming.isFetching}
      >
        Обновить список
      </Button>
    </div>
  )
}
