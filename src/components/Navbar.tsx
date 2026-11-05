import type { Page, Theme } from '../types.ts'
import { useUi } from '../store.ts'

const TABS: { id: Page; label: string; icon: string }[] = [
  { id: 'prehled', label: 'Přehled', icon: '📊' },
  { id: 'kalendar', label: 'Kalendář', icon: '📅' },
  { id: 'transakce', label: 'Platby', icon: '🧾' },
  { id: 'kategorie', label: 'Kategorie', icon: '🏷️' },
]

export function Navbar({ page, go, theme, setTheme }: { page: Page; go: (p: Page) => void; theme: Theme; setTheme: (t: Theme) => void }) {
  const openTx = useUi((s) => s.openTx)
  return (
    <header className="nav">
      <div className="nav-in">
        <a className="brand" href="#/prehled" onClick={() => go('prehled')}>
          <span className="logo">₭</span>
          <span>Moje výdaje</span>
        </a>
        <nav aria-label="Hlavní navigace">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${page === t.id ? ' on' : ''}`} onClick={() => go(t.id)} aria-current={page === t.id ? 'page' : undefined}>
              <span className="tab-ico" aria-hidden>
                {t.icon}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="btn primary add" onClick={() => openTx()} title="Přidat platbu (N)">
            <span aria-hidden>＋</span>
            <span className="add-label">Přidat</span>
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
            title={theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
