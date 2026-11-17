import { useState } from 'react'
import { Link } from 'react-router'
import { MeetingTypes } from '@/components/MeetingTypes'
import { Button } from '@/components/ui/button'

export function Book() {
  const [selectedId, setSelectedId] = useState<string>()

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Запись на звонок</h1>
      <fieldset className="mt-8">
        <legend className="text-xl font-semibold">Выберите тип встречи</legend>
        <MeetingTypes selectedId={selectedId} onSelect={setSelectedId} />
      </fieldset>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
