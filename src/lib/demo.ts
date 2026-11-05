import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import type { Transaction } from '../types.ts'

// Deterministic PRNG so demo data looks the same on every load.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Rule {
  title: string
  cat: string
  min: number
  max: number
  perMonth: number
}

const RULES: Rule[] = [
  { title: 'Albert', cat: 'c-food', min: 180, max: 1400, perMonth: 9 },
  { title: 'Rohlík.cz', cat: 'c-food', min: 600, max: 2100, perMonth: 2 },
  { title: 'Oběd', cat: 'c-food', min: 110, max: 220, perMonth: 8 },
  { title: 'Kavárna', cat: 'c-food', min: 60, max: 160, perMonth: 4 },
  { title: 'Benzín', cat: 'c-transport', min: 900, max: 1800, perMonth: 2 },
  { title: 'MHD měsíční', cat: 'c-transport', min: 550, max: 550, perMonth: 1 },
  { title: 'Kino', cat: 'c-fun', min: 180, max: 320, perMonth: 2 },
  { title: 'Netflix', cat: 'c-fun', min: 259, max: 259, perMonth: 1 },
  { title: 'Restaurace', cat: 'c-fun', min: 350, max: 1100, perMonth: 3 },
  { title: 'Lékárna', cat: 'c-health', min: 90, max: 600, perMonth: 2 },
  { title: 'Oblečení', cat: 'c-shop', min: 400, max: 2600, perMonth: 2 },
  { title: 'Elektronika', cat: 'c-shop', min: 300, max: 3500, perMonth: 1 },
]

export function demoTransactions(now = new Date()): Transaction[] {
  const rnd = mulberry32(42)
  const out: Transaction[] = []
  let n = 0
  const add = (date: Date, title: string, cat: string, amount: number, type: 'expense' | 'income') => {
    out.push({
      id: `demo-${n++}`,
      date: format(date, 'yyyy-MM-dd'),
      title,
      amount: Math.round(amount),
      type,
      categoryId: cat,
      note: '',
      createdAt: Date.now() + n,
    })
  }
  for (let m = -3; m <= 0; m++) {
    const base = addMonths(startOfMonth(now), m)
    const last = m === 0 ? now.getDate() : endOfMonth(base).getDate()
    const at = (day: number) => new Date(base.getFullYear(), base.getMonth(), Math.min(day, last))
    if (m < 0 || last >= 1) add(at(1), 'Nájem', 'c-home', 14500, 'expense')
    if (m < 0 || last >= 5) add(at(5), 'Energie a internet', 'c-home', 2300 + Math.round(rnd() * 600), 'expense')
    if (m < 0 || last >= 10) add(at(10), 'Výplata', 'c-salary', 52000, 'income')
    if (m < 0 || last >= 18) add(at(18), 'Freelance zakázka', 'c-extra', 3000 + Math.round(rnd() * 6000), 'income')
    for (const r of RULES) {
      for (let i = 0; i < r.perMonth; i++) {
        const day = 1 + Math.floor(rnd() * last)
        add(at(day), r.title, r.cat, r.min + rnd() * (r.max - r.min), 'expense')
      }
    }
  }
  return out
}
