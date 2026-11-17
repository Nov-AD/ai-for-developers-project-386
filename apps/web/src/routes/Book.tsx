import { listMeetingTypesOptions } from '@calendar/sdk'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function Book() {
  const meetingTypes = useQuery({ ...listMeetingTypesOptions(), retry: false })

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Запись на звонок</h1>
      {meetingTypes.isPending && (
        <p role="status" className="mt-4 text-muted-foreground">
          Загружаем типы встреч…
        </p>
      )}
      {meetingTypes.isError && (
        <div role="alert" className="mt-4 space-y-4">
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
        <p className="mt-4 text-lg text-muted-foreground">
          Типов встреч пока нет. Загляните позже.
        </p>
      )}
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
