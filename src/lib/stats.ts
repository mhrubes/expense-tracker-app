import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  parseISO,
  startOfMonth,
  startOfYear,
} from 'date-fns'
import type { Category, Transaction, TxType } from '../types.ts'
import { fmt, toISO } from './format.ts'

export type PeriodMode = 'month' | 'year' | 'all'
export interface Range {
  from: string
  to: string
}

export const NO_CATEGORY: Category = { id: '__none', name: 'Bez kategorie', color: '#8b93a7', icon: '❓', kind: 'expense' }

export function periodRange(mode: PeriodMode, anchor: Date): Range | null {
  if (mode === 'all') return null
  const from = mode === 'month' ? startOfMonth(anchor) : startOfYear(anchor)
  const to = mode === 'month' ? endOfMonth(anchor) : endOfYear(anchor)
  return { from: toISO(from), to: toISO(to) }
}

export function shiftAnchor(mode: PeriodMode, anchor: Date, dir: 1 | -1): Date {
  return mode === 'year' ? addYears(anchor, dir) : addMonths(anchor, dir)
}

export function inRange(t: Transaction, r: Range | null): boolean {
  return !r || (t.date >= r.from && t.date <= r.to)
}

export function sumType(tx: Transaction[], type: TxType): number {
  let s = 0
  for (const t of tx) if (t.type === type) s += t.amount
  return Math.round(s * 100) / 100
}

export interface CategoryTotal {
  category: Category
  total: number
  count: number
}

export function byCategory(tx: Transaction[], type: TxType, categories: Category[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const t of tx) {
    if (t.type !== type) continue
    let row = map.get(t.categoryId)
    if (!row) {
      const category = categories.find((c) => c.id === t.categoryId) ?? { ...NO_CATEGORY, kind: type }
      row = { category, total: 0, count: 0 }
      map.set(t.categoryId, row)
    }
    row.total += t.amount
    row.count++
  }
  return [...map.values()].map((r) => ({ ...r, total: Math.round(r.total * 100) / 100 })).sort((a, b) => b.total - a.total)
}

export interface SeriesPoint {
  key: string
  label: string
  title: string
  income: number
  expense: number
}

/** Days for a month range, months otherwise. */
export function series(tx: Transaction[], mode: PeriodMode, anchor: Date): SeriesPoint[] {
  const points: SeriesPoint[] = []
  const index = new Map<string, SeriesPoint>()
  const push = (key: string, label: string, title: string) => {
    const p = { key, label, title, income: 0, expense: 0 }
    points.push(p)
    index.set(key, p)
  }
  if (mode === 'month') {
    for (const d of eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })) {
      push(toISO(d), fmt(d, 'd'), fmt(d, 'EEEE d. M.'))
    }
  } else {
    let start: Date
    let end: Date
    if (mode === 'year') {
      start = startOfYear(anchor)
      end = endOfYear(anchor)
    } else {
      if (tx.length === 0) return []
      const dates = tx.map((t) => t.date).sort()
      start = startOfMonth(parseISO(dates[0]))
      end = startOfMonth(parseISO(dates[dates.length - 1]))
      if (differenceInCalendarDays(end, start) > 36 * 31) start = addMonths(end, -35)
    }
    for (const d of eachMonthOfInterval({ start, end })) push(toISO(d).slice(0, 7), fmt(d, 'LLL'), fmt(d, 'LLLL yyyy'))
  }
  for (const t of tx) {
    const p = index.get(mode === 'month' ? t.date : t.date.slice(0, 7))
    if (!p) continue
    p[t.type] += t.amount
  }
  return points
}

export function elapsedDays(range: Range | null, tx: Transaction[], today: Date): number {
  let from: Date
  let to: Date
  if (range) {
    from = parseISO(range.from)
    to = parseISO(range.to)
  } else {
    if (tx.length === 0) return 1
    from = parseISO(tx.map((t) => t.date).sort()[0])
    to = today
  }
  if (to > today) to = today
  return Math.max(differenceInCalendarDays(to, from) + 1, 1)
}

export const normalize = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export interface Suggestion {
  title: string
  categoryId: string
  amount: number
  count: number
}

/** Previously used titles (per type), most relevant first. */
export function suggest(tx: Transaction[], type: TxType, query: string, limit = 6): Suggestion[] {
  const q = normalize(query)
  const map = new Map<string, Suggestion & { lastDate: string; key: string }>()
  for (const t of tx) {
    if (t.type !== type) continue
    const key = normalize(t.title)
    const s = map.get(key)
    if (!s) {
      map.set(key, { key, title: t.title, categoryId: t.categoryId, amount: t.amount, count: 1, lastDate: t.date })
    } else {
      s.count++
      if (t.date >= s.lastDate) {
        s.lastDate = t.date
        s.amount = t.amount
        s.categoryId = t.categoryId
        s.title = t.title
      }
    }
  }
  let rows = [...map.values()]
  if (q) rows = rows.filter((r) => r.key.includes(q))
  rows.sort((a, b) => {
    if (q) {
      const sa = a.key.startsWith(q) ? 0 : 1
      const sb = b.key.startsWith(q) ? 0 : 1
      if (sa !== sb) return sa - sb
    }
    return b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1)
  })
  return rows.slice(0, limit).map(({ title, categoryId, amount, count }) => ({ title, categoryId, amount, count }))
}

export interface Filters {
  q: string
  type: TxType | 'all'
  categoryId: string
  from: string
  to: string
  min: string
  max: string
}

export const EMPTY_FILTERS: Filters = { q: '', type: 'all', categoryId: '', from: '', to: '', min: '', max: '' }

export function applyFilters(tx: Transaction[], f: Filters, categories: Category[]): Transaction[] {
  const q = normalize(f.q)
  const min = f.min === '' ? NaN : Number(f.min.replace(',', '.'))
  const max = f.max === '' ? NaN : Number(f.max.replace(',', '.'))
  const catName = new Map(categories.map((c) => [c.id, normalize(c.name)]))
  return tx.filter((t) => {
    if (f.type !== 'all' && t.type !== f.type) return false
    if (f.categoryId && t.categoryId !== f.categoryId) return false
    if (f.from && t.date < f.from) return false
    if (f.to && t.date > f.to) return false
    if (!Number.isNaN(min) && t.amount < min) return false
    if (!Number.isNaN(max) && t.amount > max) return false
    if (q && !(normalize(t.title).includes(q) || normalize(t.note).includes(q) || (catName.get(t.categoryId) ?? '').includes(q))) return false
    return true
  })
}
