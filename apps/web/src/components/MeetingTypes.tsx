import { listMeetingTypesOptions, type MeetingType } from '@calendar/sdk'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type Props = {
  selectedId?: string
  onSelect?: (type: MeetingType) => void
}

export function MeetingTypes({ selectedId, onSelect }: Props) {
  const meetingTypes = useQuery({ ...listMeetingTypesOptions(), retry: false })

  return (
    <div className="mt-4">
      {meetingTypes.isPending && (
        <p role="status" className="text-muted-foreground">
          Загружаем типы встреч…
        </p>
      )}
      {meetingTypes.isError && (
        <div role="alert" className="space-y-4">
          <p>Не удалось загрузить типы встреч. Проверьте соединение и попробуйте ещё раз.</p>
          <Button
            type="button"
            onClick={() => void meetingTypes.refetch()}
            disabled={meetingTypes.isFetching}
          >
            Повторить загрузку
          </Button>
        </div>
      )}
      {meetingTypes.isSuccess && meetingTypes.data.length === 0 && (
        <p className="text-lg text-muted-foreground">Типов встреч пока нет. Загляните позже.</p>
      )}
      {meetingTypes.data && meetingTypes.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {meetingTypes.data.map((type) => (
            <li key={type.id} className="min-w-0">
              <Card className="h-full break-words has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                <CardHeader>
                  <h3 className="font-semibold">
                    {onSelect ? (
                      <label
                        className="flex cursor-pointer items-start gap-3"
                        htmlFor={`type-${type.id}`}
                      >
                        <input
                          id={`type-${type.id}`}
                          type="radio"
                          name="meetingTypeId"
                          value={type.id}
                          checked={selectedId === type.id}
                          onChange={() => onSelect(type)}
                          aria-describedby={`details-${type.id}`}
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        {type.name}
                      </label>
                    ) : (
                      type.name
                    )}
                  </h3>
                </CardHeader>
                <CardContent id={`details-${type.id}`} className="space-y-2">
                  <p className="whitespace-pre-wrap text-muted-foreground">{type.description}</p>
                  <p>{type.durationMinutes} мин.</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
