import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center px-6">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Календарь звонков
          </Link>
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
