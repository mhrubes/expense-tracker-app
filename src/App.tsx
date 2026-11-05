import { useEffect } from 'react'
import { CategoryDialog } from './components/CategoryDialog.tsx'
import { Navbar } from './components/Navbar.tsx'
import { TransactionDialog } from './components/TransactionDialog.tsx'
import { useHashPage } from './lib/hooks.ts'
import { Calendar } from './pages/Calendar.tsx'
import { Categories } from './pages/Categories.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Transactions } from './pages/Transactions.tsx'
import { useData, useUi } from './store.ts'
import type { Page } from './types.ts'

const PAGES = ['prehled', 'kalendar', 'transakce', 'kategorie'] as const satisfies readonly Page[]

export default function App() {
  const [page, go] = useHashPage<Page>(PAGES, 'prehled')
  const theme = useData((s) => s.theme)
  const setTheme = useData((s) => s.setTheme)
  const dialog = useUi((s) => s.dialog)
  const openTx = useUi((s) => s.openTx)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // "N" opens a new payment (unless typing in a field or a dialog is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (useUi.getState().dialog) return
      e.preventDefault()
      openTx()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTx])

  return (
    <>
      <Navbar page={page} go={go} theme={theme} setTheme={setTheme} />
      <main className="container" key={page}>
        {page === 'prehled' && <Dashboard />}
        {page === 'kalendar' && <Calendar />}
        {page === 'transakce' && <Transactions />}
        {page === 'kategorie' && <Categories />}
      </main>
      {dialog?.kind === 'tx' && <TransactionDialog key={dialog.id ?? 'new'} id={dialog.id} defaults={dialog.defaults} />}
      {dialog?.kind === 'cat' && <CategoryDialog key={dialog.id ?? 'new'} id={dialog.id} defaultKind={dialog.defaultKind} />}
    </>
  )
}
