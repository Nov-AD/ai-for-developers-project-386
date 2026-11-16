import { useQuery } from '@tanstack/react-query'
import { getHealth } from '@calendar/sdk'
import './App.css'

function App () {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await getHealth()
      return data
    }
  })

  return (
    <main className="page">
      <p className="eyebrow">Hexlet · AI for developers</p>
      <h1>Календарь звонков</h1>
      <p className="lead">
        Каркас приложения: TypeSpec → OpenAPI → сгенерированный SDK → Fastify
        API → React.
      </p>

      <section className="card" aria-live="polite">
        <span
          className={
            health.isSuccess ? 'dot dot-ok' : health.isError ? 'dot dot-error' : 'dot'
          }
        />
        <div>
          <h2>Статус API</h2>
          {health.isPending && <p>Проверяем соединение…</p>}
          {health.isSuccess && <p>Сервис доступен: {health.data?.status}</p>}
          {health.isError && <p>Сервис недоступен. Запущен ли бекенд?</p>}
        </div>
      </section>
    </main>
  )
}

export default App
