import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function Book() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Запись на звонок</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Скоро здесь появятся типы встреч и свободные слоты.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  )
}
