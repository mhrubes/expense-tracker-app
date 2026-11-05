import { useMemo, useState } from 'react'
import { CategoryBars, Donut, TrendBars } from '../components/Charts.tsx'
import { useCountUp } from '../lib/hooks.ts'
import { capitalize, fmt, fmtDate, money, signed } from '../lib/format.ts'
import { byCategory, elapsedDays, inRange, periodRange, series, shiftAnchor, sumType } from '../lib/stats.ts'
import type { PeriodMode } from '../lib/stats.ts'
import { useData, useUi } from '../store.ts'
import type { TxType } from '../types.ts'

function Kpi({ label, value, tone, delta, goodWhenUp, hint }: { label: string; value: number; tone: 'pos' | 'neg' | 'neutral'; delta?: number | null; goodWhenUp?: boolean; hint?: string }) {
  const shown = useCountUp(value)
  const good = delta === null || delta === undefined ? null : goodWhenUp ? delta >= 0 : delta <= 0
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <b className={`kpi-value ${tone}`}>{money(Math.round(shown))}</b>
      <span className="kpi-sub">
        {delta !== null && delta !== undefined ? (
          <span className={good ? 'pos' : 'neg'}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))} %
          </span>
        ) : null}{' '}
        <span className="muted">{hint}</span>
      </span>
    </div>
  )
}

export function Dashboard() {
  const transactions = useData((s) => s.transactions)
  const categories = useData((s) => s.categories)
  const loadDemo = useData((s) => s.loadDemo)
  const openTx = useUi((s) => s.openTx)
  const [mode, setMode] = useState<PeriodMode>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [tab, setTab] = useState<TxType>('expense')
  const [hover, setHover] = useState<string | null>(null)

  const range = periodRange(mode, anchor)
  const prevRange = mode === 'all' ? null : periodRange(mode, shiftAnchor(mode, anchor, -1))

  const cur = useMemo(() => transactions.filter((t) => inRange(t, range)), [transactions, range?.from, range?.to])
  const prev = useMemo(() => (prevRange ? transactions.filter((t) => inRange(t, prevRange)) : []), [transactions, prevRange?.from, prevRange?.to])

  const income = sumType(cur, 'income')
  const expense = sumType(cur, 'expense')
  const balance = Math.round((income - expense) * 100) / 100
  const days = elapsedDays(range, cur, new Date())
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null)
  const prevLabel = mode === 'month' ? 'oproti minulému měsíci' : 'oproti minulému roku'

  const rows = useMemo(() => byCategory(cur, tab, categories), [cur, tab, categories])
  const tabTotal = tab === 'expense' ? expense : income
  const points = useMemo(() => series(cur, mode, anchor), [cur, mode, anchor])
  const top = useMemo(() => cur.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5), [cur])
  const recent = useMemo(
    () => [...cur].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 6),
    [cur],
  )
  const cat = (id: string) => categories.find((c) => c.id === id)

  const title = mode === 'month' ? capitalize(fmt(anchor, 'LLLL yyyy')) : mode === 'year' ? fmt(anchor, 'yyyy') : 'Celé období'

  if (transactions.length === 0) {
    return (
      <div className="page">
        <div className="card empty hero">
          <div className="empty-ico">💸</div>
          <h1>Kolik jsi utratil a za co?</h1>
          <p className="muted">Zatím tu nejsou žádné platby. Přidej první, nebo si nech nahrát ukázková data a prohlédni si grafy.</p>
          <div className="actions center">
            <button className="btn primary" onClick={() => openTx()}>
              ＋ Přidat první platbu
            </button>
            <button className="btn" onClick={loadDemo}>
              Načíst ukázková data
            </button>
          </div>
          <p className="muted small">Tip: v kalendáři přidáš platbu dvojklikem na prázdné místo ve dni.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Přehled</h1>
          <p className="muted">{title}</p>
        </div>
        <div className="period">
          {mode !== 'all' && (
            <div className="stepper">
              <button className="icon-btn" aria-label="Předchozí období" onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))}>
                ‹
              </button>
              <button className="btn small" onClick={() => setAnchor(new Date())}>
                Dnes
              </button>
              <button className="icon-btn" aria-label="Další období" onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))}>
                ›
              </button>
            </div>
          )}
          <div className="seg">
            {(['month', 'year', 'all'] as const).map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m === 'month' ? 'Měsíc' : m === 'year' ? 'Rok' : 'Vše'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="kpis">
        <Kpi label="Příjmy" value={income} tone="pos" delta={prevRange ? pct(income, sumType(prev, 'income')) : null} goodWhenUp hint={prevRange ? prevLabel : `${cur.filter((t) => t.type === 'income').length} plateb`} />
        <Kpi label="Výdaje" value={expense} tone="neg" delta={prevRange ? pct(expense, sumType(prev, 'expense')) : null} hint={prevRange ? prevLabel : `${cur.filter((t) => t.type === 'expense').length} plateb`} />
        <Kpi label="Bilance" value={balance} tone={balance >= 0 ? 'pos' : 'neg'} hint={balance >= 0 ? 'ušetřeno' : 'schodek'} />
        <Kpi label="Průměrný výdaj / den" value={expense / days} tone="neutral" hint={`za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`} />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Kam peníze jdou</h2>
            <div className="seg">
              <button className={tab === 'expense' ? 'on' : ''} onClick={() => setTab('expense')}>
                Výdaje
              </button>
              <button className={tab === 'income' ? 'on' : ''} onClick={() => setTab('income')}>
                Příjmy
              </button>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="muted pad">V tomto období nejsou žádné {tab === 'expense' ? 'výdaje' : 'příjmy'}.</p>
          ) : (
            <div key={`${tab}-${mode}`}>
              <Donut rows={rows} total={tabTotal} hover={hover} onHover={setHover} label={tab === 'expense' ? 'Výdaje' : 'Příjmy'} />
              <CategoryBars rows={rows} total={tabTotal} hover={hover} onHover={setHover} budgetFactor={tab === 'expense' ? (mode === 'month' ? 1 : mode === 'year' ? 12 : 0) : 0} unit={tab === 'expense' ? 'výdajů' : 'příjmů'} />
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>{mode === 'month' ? 'Vývoj po dnech' : 'Vývoj po měsících'}</h2>
              <div className="legend">
                <span>
                  <i className="dot inc" /> příjmy
                </span>
                <span>
                  <i className="dot exp" /> výdaje
                </span>
              </div>
            </div>
            {points.length ? <TrendBars key={`${mode}-${range?.from}`} points={points} /> : <p className="muted pad">Žádná data.</p>}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Největší výdaje</h2>
            </div>
            {top.length === 0 ? (
              <p className="muted pad">Žádné výdaje.</p>
            ) : (
              <ul className="list">
                {top.map((t) => (
                  <li key={t.id} onClick={() => openTx(t.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openTx(t.id)}>
                    <span className="chip-ico" style={{ background: `color-mix(in srgb, ${cat(t.categoryId)?.color ?? '#94a3b8'} 20%, transparent)` }}>
                      {cat(t.categoryId)?.icon ?? '❓'}
                    </span>
                    <span className="li-main">
                      <b>{t.title}</b>
                      <small className="muted">{fmtDate(t.date)}</small>
                    </span>
                    <span className="neg">{signed(t.amount, 'expense')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="card">
        <div className="card-head">
          <h2>Poslední platby</h2>
          <a className="link" href="#/transakce">
            Všechny platby →
          </a>
        </div>
        <ul className="list">
          {recent.map((t) => (
            <li key={t.id} onClick={() => openTx(t.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openTx(t.id)}>
              <span className="chip-ico" style={{ background: `color-mix(in srgb, ${cat(t.categoryId)?.color ?? '#94a3b8'} 20%, transparent)` }}>
                {cat(t.categoryId)?.icon ?? '❓'}
              </span>
              <span className="li-main">
                <b>{t.title}</b>
                <small className="muted">
                  {cat(t.categoryId)?.name ?? 'Bez kategorie'} · {fmtDate(t.date)}
                </small>
              </span>
              <span className={t.type === 'income' ? 'pos' : 'neg'}>{signed(t.amount, t.type)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
