import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { getAvailabilityOptions } from '@calendar/sdk'
import { useQuery } from '@tanstack/react-query'
import { MeetingTypes } from '@/components/MeetingTypes'
import { Button } from '@/components/ui/button'
import {
  dateKeyInZone,
  dateKeysBetween,
  formatDateKey,
  formatInstant,
  guestTimeZone,
  ownerZone
} from '@/lib/time'

export function Book() {
  const [selectedTypeId, setSelectedTypeId] = useState<string>()
  const [selectedDay, setSelectedDay] = useState<string>()
  const [selectedSlot, setSelectedSlot] = useState<string>()

  const availability = useQuery({
    ...getAvailabilityOptions({ query: { meetingTypeId: selectedTypeId ?? '' } }),
    enabled: Boolean(selectedTypeId),
    retry: false
  })

  const timeZone = guestTimeZone()
  const zone = ownerZone(availability.data?.ownerTimeZone)

  const days = useMemo(() => {
    const data = availability.data
    if (!data) return []
    const slotsByDay = new Map<string, Array<{ start: string; end: string }>>()
    for (const slot of data.slots) {
      const key = dateKeyInZone(slot.start, zone)
      slotsByDay.set(key, [...(slotsByDay.get(key) ?? []), slot])
    }
    return dateKeysBetween(data.windowStartDate, data.windowEndDate).map((key) => ({
      key,
      slots: slotsByDay.get(key) ?? []
    }))
  }, [availability.data, zone])

  const activeDay = days.find((day) => day.key === selectedDay)

  function chooseType(id: string) {
    setSelectedTypeId(id)
    // A slot and a day belong to the availability of one type.
    setSelectedDay(undefined)
    setSelectedSlot(undefined)
  }

  function chooseDay(key: string) {
    setSelectedDay(key)
    const stillAvailable = days
      .find((day) => day.key === key)
      ?.slots.some((slot) => slot.start === selectedSlot)
    if (!stillAvailable) setSelectedSlot(undefined)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Запись на звонок</h1>

      <fieldset>
        <legend className="text-xl font-semibold">Выберите тип встречи</legend>
        <MeetingTypes selectedId={selectedTypeId} onSelect={chooseType} />
      </fieldset>

      {!selectedTypeId && (
        <p className="text-muted-foreground">
          Выберите тип встречи, чтобы увидеть свободное время.
        </p>
      )}

      {selectedTypeId && availability.isPending && (
        <p role="status" className="text-muted-foreground">
          Загружаем свободное время…
        </p>
      )}

      {selectedTypeId && availability.isError && (
        <div role="alert" className="space-y-4">
          <p>Не удалось загрузить свободное время. Проверьте соединение и попробуйте ещё раз.</p>
          <Button
            type="button"
            onClick={() => void availability.refetch()}
            disabled={availability.isFetching}
          >
            Повторить загрузку
          </Button>
        </div>
      )}

      {selectedTypeId && availability.data && (
        <section aria-labelledby="slot-heading" className="space-y-4">
          <div>
            <h2 id="slot-heading" className="text-xl font-semibold">
              Свободное время
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {availability.data.slots.length === 0
                ? 'На ближайшие дни свободных слотов нет. Попробуйте другой тип встречи или загляните позже.'
                : `Время показано в вашем часовом поясе: ${timeZone}.`}
            </p>
          </div>

          {availability.data.slots.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">Выберите день</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {days.map((day) => (
                    <li key={day.key}>
                      <Button
                        type="button"
                        variant={selectedDay === day.key ? 'default' : 'outline'}
                        disabled={day.slots.length === 0}
                        aria-pressed={selectedDay === day.key}
                        onClick={() => chooseDay(day.key)}
                      >
                        {formatDateKey(day.key)}
                        <span className="ml-2 text-xs">
                          {day.slots.length === 0 ? 'нет слотов' : `${day.slots.length} слотов`}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {activeDay && activeDay.slots.length > 0 && (
                <fieldset>
                  <legend className="text-base font-semibold">Выберите время</legend>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {activeDay.slots.map((slot) => (
                      <li key={slot.start}>
                        <label
                          className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary"
                          htmlFor={`slot-${slot.start}`}
                        >
                          <input
                            id={`slot-${slot.start}`}
                            type="radio"
                            name="slot"
                            value={slot.start}
                            checked={selectedSlot === slot.start}
                            onChange={() => setSelectedSlot(slot.start)}
                            className="size-4 shrink-0 accent-primary"
                          />
                          {formatInstant(slot.start, timeZone)}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}

              {!selectedDay && (
                <p className="text-muted-foreground">
                  Выберите день, чтобы увидеть свободное время.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <Button asChild variant="outline">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
