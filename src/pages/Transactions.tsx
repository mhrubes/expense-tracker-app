import { useMemo, useState } from 'react'
import { download, toCsv } from '../lib/backup.ts'
import { fmtDate, money, signed, todayISO } from '../lib/format.ts'
import { EMPTY_FILTERS, applyFilters, sumType } from '../lib/stats.ts'
import type { Filters } from '../lib/stats.ts'
import { useData, useUi } from '../store.ts'

type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
const PAGE = 50

export function Transactions() {
  const transactions = useData((s) => s.transactions)
  const categories = useData((s) => s.categories)
  const deleteTx = useData((s) => s.deleteTx)
  const openTx = useUi((s) => s.openTx)
  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<Sort>('date-desc')
  const [limit, setLimit] = useState(PAGE)
  const [confirm, setConfirm] = useState<string | null>(null)

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setF((p) => ({ ...p, [k]: v }))
    setLimit(PAGE)
  }
  const active = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS)

  const rows = useMemo(() => {
    const list = applyFilters(transactions, f, categories)
    const cmp: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      'date-desc': (a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1),
      'date-asc': (a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1),
      'amount-desc': (a, b) => b.amount - a.amount,
      'amount-asc': (a, b) => a.amount - b.amount,
    }
    return list.sort(cmp[sort])
  }, [transactions, categories, f, sort])

  const income = sumType(rows, 'income')
  const expense = sumType(rows, 'expense')
  const cat = (id: string) => categories.find((c) => c.id === id)
  const visible = rows.slice(0, limit)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Platby</h1>
          <p className="muted">Vyhledávání, filtry a úpravy všech plateb.</p>
        </div>
        <div className="period">
          <button className="btn" disabled={!rows.length} onClick={() => download(`platby-${todayISO()}.csv`, toCsv(rows, categories), 'text/csv;charset=utf-8')}>
            Export CSV
          </button>
          <button className="btn primary" onClick={() => openTx()}>
            ＋ Přidat
          </button>
        </div>
      </div>

      <div className="card filters">
        <label className="field grow2">
          <span>Hledat</span>
          <input type="search" placeholder="Název, popis nebo kategorie…" value={f.q} onChange={(e) => set('q', e.target.value)} />
        </label>
        <div className="field">
          <span>Typ</span>
          <div className="seg">
            {(['all', 'expense', 'income'] as const).map((t) => (
              <button key={t} className={f.type === t ? 'on' : ''} onClick={() => set('type', t)}>
                {t === 'all' ? 'Vše' : t === 'expense' ? 'Výdaje' : 'Příjmy'}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Kategorie</span>
          <select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Všechny</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Od</span>
          <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="field">
          <span>Do</span>
          <input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
        </label>
        <label className="field narrow">
          <span>Částka od</span>
          <input inputMode="decimal" value={f.min} onChange={(e) => set('min', e.target.value)} placeholder="0" />
        </label>
        <label className="field narrow">
          <span>Částka do</span>
          <input inputMode="decimal" value={f.max} onChange={(e) => set('max', e.target.value)} placeholder="∞" />
        </label>
        <label className="field">
          <span>Řazení</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="date-desc">Nejnovější</option>
            <option value="date-asc">Nejstarší</option>
            <option value="amount-desc">Nejvyšší částka</option>
            <option value="amount-asc">Nejnižší částka</option>
          </select>
        </label>
        {active && (
          <button
            className="btn small clear"
            onClick={() => {
              setF(EMPTY_FILTERS)
              setLimit(PAGE)
            }}
          >
            Zrušit filtry
          </button>
        )}
      </div>

      <div className="summary">
        <span>
          <b>{rows.length}</b> {rows.length === 1 ? 'platba' : rows.length >= 2 && rows.length <= 4 ? 'platby' : 'plateb'}
        </span>
        <span className="pos">+{money(income)}</span>
        <span className="neg">−{money(expense)}</span>
        <span className={income - expense >= 0 ? 'pos' : 'neg'}>
          bilance {income - expense >= 0 ? '+' : '−'}
          {money(Math.abs(income - expense))}
        </span>
      </div>

      <div className="card table-card">
        {rows.length === 0 ? (
          <p className="muted pad center">{transactions.length === 0 ? 'Zatím žádné platby.' : 'Filtrům nic neodpovídá.'}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Název</th>
                <th>Kategorie</th>
                <th className="hide-sm">Popis</th>
                <th className="r">Částka</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const c = cat(t.categoryId)
                return (
                  <tr key={t.id} onClick={() => openTx(t.id)}>
                    <td className="nowrap">{fmtDate(t.date)}</td>
                    <td>
                      <b>{t.title}</b>
                    </td>
                    <td>
                      <span className="pill" style={{ ['--c' as string]: c?.color ?? '#94a3b8' }}>
                        {c?.icon ?? '❓'} {c?.name ?? 'Bez kategorie'}
                      </span>
                    </td>
                    <td className="hide-sm muted note">{t.note}</td>
                    <td className={`r nowrap ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</td>
                    <td className="r nowrap" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" aria-label="Upravit" onClick={() => openTx(t.id)}>
                        ✏️
                      </button>
                      {confirm === t.id ? (
                        <button
                          className="btn small danger armed"
                          onClick={() => {
                            deleteTx(t.id)
                            setConfirm(null)
                          }}
                          onBlur={() => setConfirm(null)}
                          autoFocus
                        >
                          Smazat?
                        </button>
                      ) : (
                        <button className="icon-btn" aria-label="Smazat" onClick={() => setConfirm(t.id)}>
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {rows.length > limit && (
          <div className="more-row">
            <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
              Zobrazit dalších {Math.min(PAGE, rows.length - limit)} (zbývá {rows.length - limit})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
