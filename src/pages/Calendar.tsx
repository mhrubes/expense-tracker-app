import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { capitalize, fmt, money, signed, toISO } from '../lib/format.ts'
import { sumType } from '../lib/stats.ts'
import { useData, useUi } from '../store.ts'
import type { Category, Transaction } from '../types.ts'

type View = 'month' | 'week' | 'day'
const WEEK = { weekStartsOn: 1 as const }
const VIEW_KEY = 'expense-tracker:calendar-view'

function loadView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'week' || v === 'day' ? v : 'month'
  } catch {
    return 'month'
  }
}

function Chip({ t, cat, full }: { t: Transaction; cat?: Category; full?: boolean }) {
  const openTx = useUi((s) => s.openTx)
  return (
    <button
      className={`cal-chip ${t.type}${full ? ' full' : ''}`}
      style={{ ['--c' as string]: cat?.color ?? '#94a3b8' }}
      onClick={(e) => {
        e.stopPropagation()
        openTx(t.id)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      title={`${t.title} · ${signed(t.amount, t.type)}${t.note ? `\n${t.note}` : ''}`}
    >
      <span className="cal-ico">{cat?.icon ?? '❓'}</span>
      <span className="cal-title">{t.title}</span>
      <span className="cal-amt">{signed(t.amount, t.type)}</span>
    </button>
  )
}

function DaySums({ items }: { items: Transaction[] }) {
  const inc = sumType(items, 'income')
  const exp = sumType(items, 'expense')
  if (!items.length) return null
  return (
    <span className="day-sums">
      {inc > 0 && <span className="pos">+{money(inc)}</span>}
      {exp > 0 && <span className="neg">−{money(exp)}</span>}
    </span>
  )
}

export function Calendar() {
  const transactions = useData((s) => s.transactions)
  const categories = useData((s) => s.categories)
  const openTx = useUi((s) => s.openTx)
  const [view, setViewState] = useState<View>(loadView)
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<string>(() => toISO(new Date()))

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* storage unavailable */
    }
  }

  const byDate = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const a = m.get(t.date)
      if (a) a.push(t)
      else m.set(t.date, [t])
    }
    for (const a of m.values()) a.sort((x, y) => y.amount - x.amount)
    return m
  }, [transactions])
  const cat = (id: string) => categories.find((c) => c.id === id)

  const days = useMemo(() => {
    if (view === 'month') {
      return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), WEEK), end: endOfWeek(endOfMonth(cursor), WEEK) })
    }
    if (view === 'week') return eachDayOfInterval({ start: startOfWeek(cursor, WEEK), end: endOfWeek(cursor, WEEK) })
    return [cursor]
  }, [view, cursor])

  const periodTx = useMemo(() => {
    const keys = new Set(days.filter((d) => view !== 'month' || isSameMonth(d, cursor)).map(toISO))
    return transactions.filter((t) => keys.has(t.date))
  }, [days, view, cursor, transactions])

  const step = (dir: 1 | -1) => setCursor((c) => (view === 'month' ? addMonths(c, dir) : view === 'week' ? addWeeks(c, dir) : addDays(c, dir)))

  const title =
    view === 'month'
      ? `${capitalize(fmt(cursor, 'LLLL yyyy'))} (${cursor.getMonth() + 1})`
      : view === 'week'
        ? `${fmt(days[0], 'd. M.')} – ${fmt(days[6], 'd. M. yyyy')}`
        : capitalize(fmt(cursor, 'EEEE d. MMMM yyyy'))

  const addAt = (iso: string) => openTx(undefined, { date: iso })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Kalendář</h1>
          <p className="muted">
            Dvojklik na prázdné místo ve dni přidá platbu, klik na platbu ji upraví.
          </p>
        </div>
        <div className="period">
          <div className="seg">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                {v === 'month' ? 'Měsíc' : v === 'week' ? 'Týden' : 'Den'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card cal">
        <div className="cal-bar">
          <div className="stepper">
            <button className="icon-btn" aria-label="Předchozí" onClick={() => step(-1)}>
              ‹
            </button>
            <button
              className="btn small"
              onClick={() => {
                setCursor(new Date())
                setSelected(toISO(new Date()))
              }}
            >
              Dnes
            </button>
            <button className="icon-btn" aria-label="Další" onClick={() => step(1)}>
              ›
            </button>
          </div>
          <h2 className="cal-title-big">{title}</h2>
          <div className="cal-totals">
            <span className="pos">+{money(sumType(periodTx, 'income'))}</span>
            <span className="neg">−{money(sumType(periodTx, 'expense'))}</span>
          </div>
        </div>

        {view === 'month' && (
          <div className="month" key={`m-${title}`}>
            {days.slice(0, 7).map((d) => (
              <div key={toISO(d)} className={`dow${isWeekend(d) ? ' we' : ''}`}>
                {fmt(d, 'EEEEEE')}
              </div>
            ))}
            {days.map((d) => {
              const iso = toISO(d)
              const items = byDate.get(iso) ?? []
              const shown = items.slice(0, 3)
              return (
                <div
                  key={iso}
                  className={`cell${isSameMonth(d, cursor) ? '' : ' other'}${isWeekend(d) ? ' we' : ''}${isToday(d) ? ' today' : ''}${selected === iso ? ' sel' : ''}`}
                  onClick={() => setSelected(iso)}
                  onDoubleClick={() => addAt(iso)}
                >
                  <div className="cell-top">
                    <button
                      className="daynum"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCursor(d)
                        setSelected(iso)
                        setView('day')
                      }}
                      title="Otevřít den"
                    >
                      {d.getDate()}
                    </button>
                    <DaySums items={items} />
                    <button
                      className="cell-add"
                      aria-label={`Přidat platbu ${fmt(d, 'd. M.')}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        addAt(iso)
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      ＋
                    </button>
                  </div>
                  <div className="chips">
                    {shown.map((t) => (
                      <Chip key={t.id} t={t} cat={cat(t.categoryId)} />
                    ))}
                    {items.length > shown.length && (
                      <button
                        className="more"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCursor(d)
                          setView('day')
                        }}
                      >
                        + další {items.length - shown.length}
                      </button>
                    )}
                  </div>
                  {items.length > 0 && (
                    <div className="dots" aria-hidden>
                      {items.slice(0, 6).map((t) => (
                        <i key={t.id} style={{ background: cat(t.categoryId)?.color ?? '#94a3b8' }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {view === 'week' && (
          <div className="week" key={`w-${title}`}>
            {days.map((d) => {
              const iso = toISO(d)
              const items = byDate.get(iso) ?? []
              return (
                <div key={iso} className={`wcol${isWeekend(d) ? ' we' : ''}${isToday(d) ? ' today' : ''}`} onDoubleClick={() => addAt(iso)}>
                  <div className="wcol-head">
                    <button
                      className="daynum"
                      onClick={() => {
                        setCursor(d)
                        setView('day')
                      }}
                    >
                      <small>{fmt(d, 'EEE')}</small>
                      {d.getDate()}
                    </button>
                    <DaySums items={items} />
                  </div>
                  <div className="wcol-body">
                    {items.map((t) => (
                      <Chip key={t.id} t={t} cat={cat(t.categoryId)} full />
                    ))}
                    {items.length === 0 && <span className="muted small hint-empty">dvojklik = přidat</span>}
                  </div>
                  <button className="cell-add always" onClick={() => addAt(iso)} onDoubleClick={(e) => e.stopPropagation()} aria-label={`Přidat platbu ${fmt(d, 'd. M.')}`}>
                    ＋
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {view === 'day' && (
          <div className="dayview" key={`d-${title}`} onDoubleClick={() => addAt(toISO(cursor))}>
            {(() => {
              const items = byDate.get(toISO(cursor)) ?? []
              return (
                <>
                  <div className="day-kpis">
                    <div>
                      <small>Příjmy</small>
                      <b className="pos">+{money(sumType(items, 'income'))}</b>
                    </div>
                    <div>
                      <small>Výdaje</small>
                      <b className="neg">−{money(sumType(items, 'expense'))}</b>
                    </div>
                    <button className="btn primary" onClick={() => addAt(toISO(cursor))} onDoubleClick={(e) => e.stopPropagation()}>
                      ＋ Přidat v tento den
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <div className="empty-day">
                      <p className="muted">V tento den nejsou žádné platby. Dvojklikem kamkoli sem nějakou přidáš.</p>
                    </div>
                  ) : (
                    <ul className="list roomy">
                      {items.map((t) => {
                        const c = cat(t.categoryId)
                        return (
                          <li
                            key={t.id}
                            tabIndex={0}
                            onClick={() => openTx(t.id)}
                            onDoubleClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === 'Enter' && openTx(t.id)}
                          >
                            <span className="chip-ico" style={{ background: `color-mix(in srgb, ${c?.color ?? '#94a3b8'} 20%, transparent)` }}>
                              {c?.icon ?? '❓'}
                            </span>
                            <span className="li-main">
                              <b>{t.title}</b>
                              <small className="muted">
                                {c?.name ?? 'Bez kategorie'}
                                {t.note ? ` · ${t.note}` : ''}
                              </small>
                            </span>
                            <span className={t.type === 'income' ? 'pos' : 'neg'}>{signed(t.amount, t.type)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
