import type { ReactNode } from 'react'
import { AppHeader } from '../organisms/AppHeader'

interface MainScreenLayoutProps {
  children: ReactNode
}

export function MainScreenLayout({ children }: MainScreenLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 sm:gap-7 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border px-4 py-5 text-center text-xs text-ink-muted sm:px-6">
        © {new Date().getFullYear()} Citește-mi. Toate drepturile rezervate.
      </footer>
    </div>
  )
}
