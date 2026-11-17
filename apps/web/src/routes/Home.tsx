import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const steps = [
  {
    title: 'Выберите тип встречи',
    description: 'У каждого типа своя длительность.'
  },
  {
    title: 'Найдите свободный слот',
    description: 'Календарь на 14 дней вперёд, время в вашей таймзоне.'
  },
  {
    title: 'Подтвердите запись',
    description: 'Слот займёт выбранное время, пересечения исключены.'
  }
]

export function Home() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Календарь звонков
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Выберите тип встречи и свободный слот на ближайшие 14 дней — и запишитесь на звонок без
          переписки.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/book">Записаться на звонок</Link>
        </Button>
      </section>

      <section aria-labelledby="how-it-works" className="mt-20">
        <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight">
          Как это работает
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader>
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-2 font-semibold leading-none">{step.title}</h3>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
