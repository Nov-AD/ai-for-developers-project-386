import { useQuery } from '@tanstack/react-query'
import { getHealth } from '@calendar/sdk'

export function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await getHealth()
      return data
    }
  })

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Календарь звонков</h1>
      <p className="mt-4 text-muted-foreground">
        Статус API: {health.isPending ? 'проверяем' : health.isError ? 'недоступен' : 'доступен'}
      </p>
    </div>
  )
}
