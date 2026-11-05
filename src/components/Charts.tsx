import { useState } from 'react'
import { useCountUp, useMounted } from '../lib/hooks.ts'
import { money, moneyShort } from '../lib/format.ts'
import type { CategoryTotal, SeriesPoint } from '../lib/stats.ts'

const R = 78
const C = 2 * Math.PI * R

export function Donut({
  rows,
  total,
  hover,
  onHover,
  label,
}: {
  rows: CategoryTotal[]
  total: number
  hover: string | null
  onHover: (id: string | null) => void
  label: string
}) {
  const mounted = useMounted()
  const shown = useCountUp(total)
  const hovered = rows.find((r) => r.category.id === hover)
  let acc = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Rozdělení: ${label}`}>
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="26" />
          {rows.map((r, i) => {
            const len = total > 0 ? (r.total / total) * C : 0
            const gap = rows.length > 1 ? 2.5 : 0
            const dash = Math.max(len - gap, 0)
            const off = -acc
            acc += len
            const active = hover === r.category.id
            return (
              <circle
                key={r.category.id}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={r.category.color}
                strokeWidth={active ? 32 : 26}
                strokeLinecap="butt"
                strokeDasharray={mounted ? `${dash} ${C - dash}` : `0 ${C}`}
                strokeDashoffset={off}
                opacity={hover && !active ? 0.35 : 1}
                style={{
                  transition: `stroke-dasharray .9s cubic-bezier(.22,1,.36,1) ${i * 70}ms, stroke-dashoffset .6s ease, stroke-width .15s, opacity .15s`,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => onHover(r.category.id)}
                onMouseLeave={() => onHover(null)}
              />
            )
          })}
        </g>
      </svg>
      <div className="donut-center">
        {hovered ? (
          <>
            <span className="donut-icon">{hovered.category.icon}</span>
            <b>{money(hovered.total)}</b>
            <small>
              {hovered.category.name} · {total > 0 ? Math.round((hovered.total / total) * 100) : 0} %
            </small>
          </>
        ) : (
          <>
            <small>{label}</small>
            <b>{money(Math.round(shown))}</b>
            <small>{rows.length} {rows.length === 1 ? 'kategorie' : rows.length >= 2 && rows.length <= 4 ? 'kategorie' : 'kategorií'}</small>
          </>
        )}
      </div>
    </div>
  )
}

export function CategoryBars({
  rows,
  total,
  hover,
  onHover,
  budgetFactor,
  unit,
}: {
  rows: CategoryTotal[]
  total: number
  hover: string | null
  onHover: (id: string | null) => void
  /** multiplier for monthly budgets (1 = month, 12 = year, 0 = ignore) */
  budgetFactor: number
  unit: string
}) {
  const mounted = useMounted()
  return (
    <ul className="cat-bars">
      {rows.map((r, i) => {
        const limit = r.category.kind === 'expense' && r.category.budget && budgetFactor > 0 ? r.category.budget * budgetFactor : 0
        const share = total > 0 ? r.total / total : 0
        const ratio = limit ? r.total / limit : share
        const over = limit > 0 && r.total > limit
        return (
          <li
            key={r.category.id}
            className={hover === r.category.id ? 'hot' : hover ? 'dim' : ''}
            onMouseEnter={() => onHover(r.category.id)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="cat-line">
              <span className="chip-ico" style={{ background: `color-mix(in srgb, ${r.category.color} 20%, transparent)` }}>
                {r.category.icon}
              </span>
              <span className="cat-name">{r.category.name}</span>
              <span className="cat-amount">{money(r.total)}</span>
            </div>
            <div className="track" aria-hidden>
              <div
                className="fill"
                style={{
                  width: mounted ? `${Math.min(ratio, 1) * 100}%` : '0%',
                  background: over ? 'var(--expense)' : r.category.color,
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            </div>
            <div className="cat-sub">
              {limit > 0 ? (
                <span className={over ? 'neg' : ''}>
                  {over ? `překročeno o ${money(r.total - limit)}` : `zbývá ${money(limit - r.total)}`} · limit {money(limit)} ({Math.round(ratio * 100)} %)
                </span>
              ) : (
                <span>
                  {Math.round(share * 100)} % {unit}
                </span>
              )}
              <span>{r.count}×</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function TrendBars({ points }: { points: SeriesPoint[] }) {
  const mounted = useMounted()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.expense)))
  const step = points.length > 20 ? 5 : 1
  const h = hover !== null ? points[hover] : null
  return (
    <div className="trend">
      <div className="trend-info">
        {h ? (
          <>
            <b>{h.title}</b>
            <span className="pos">příjmy {money(h.income)}</span>
            <span className="neg">výdaje {money(h.expense)}</span>
          </>
        ) : (
          <span className="muted">Najeď na sloupec pro detail · max {moneyShort(max)} Kč</span>
        )}
      </div>
      <div className="trend-plot">
        <div className="grid-lines" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="cols" onMouseLeave={() => setHover(null)}>
          {points.map((p, i) => (
            <div key={p.key} className={`col${hover === i ? ' hot' : ''}`} onMouseEnter={() => setHover(i)}>
              <div className="pair">
                <div
                  className="bar inc"
                  style={{ height: mounted ? `${(p.income / max) * 100}%` : '0%', transitionDelay: `${i * 14}ms` }}
                />
                <div
                  className="bar exp"
                  style={{ height: mounted ? `${(p.expense / max) * 100}%` : '0%', transitionDelay: `${i * 14 + 40}ms` }}
                />
              </div>
              <span className="tick">{i % step === 0 ? p.label : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
