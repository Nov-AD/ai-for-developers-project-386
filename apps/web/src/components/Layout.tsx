import { Link, NavLink, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Календарь звонков
          </Link>
          <nav aria-label="Основная навигация" className="flex gap-4 text-sm">
            <NavLink
              to="/book"
              className="underline-offset-4 hover:underline aria-[current=page]:underline"
            >
              Запись
            </NavLink>
            <NavLink
              to="/owner"
              className="underline-offset-4 hover:underline aria-[current=page]:underline"
            >
              Владельцу
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-4xl px-6 py-6 text-sm text-muted-foreground">
          Учебный проект Хекслета
        </div>
      </footer>
    </div>
  )
}
