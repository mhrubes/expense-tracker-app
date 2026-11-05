import test from 'node:test'
import assert from 'node:assert/strict'
import { applyFilters, byCategory, EMPTY_FILTERS, periodRange, series, suggest, sumType } from '../src/lib/stats.ts'
import { parseAmount } from '../src/lib/format.ts'
import { demoTransactions } from '../src/lib/demo.ts'
import { parseBackup } from '../src/lib/backup.ts'
import type { Category, Transaction } from '../src/types.ts'

const cats: Category[] = [
  { id: 'f', name: 'Jídlo', color: '#f00', icon: '🛒', kind: 'expense' },
  { id: 's', name: 'Výplata', color: '#0f0', icon: '💼', kind: 'income' },
]
let n = 0
const tx = (date: string, title: string, amount: number, type: 'expense' | 'income', categoryId: string): Transaction => ({
  id: `t${n++}`,
  date,
  title,
  amount,
  type,
  categoryId,
  note: '',
  createdAt: n,
})
const data = [
  tx('2026-03-02', 'Albert', 300, 'expense', 'f'),
  tx('2026-03-15', 'Albert', 500.5, 'expense', 'f'),
  tx('2026-03-20', 'Výplata', 40000, 'income', 's'),
  tx('2026-04-01', 'Rohlík', 700, 'expense', 'f'),
]

test('period range and sums', () => {
  const r = periodRange('month', new Date(2026, 2, 10))!
  assert.deepEqual(r, { from: '2026-03-01', to: '2026-03-31' })
  const inMonth = data.filter((t) => t.date >= r.from && t.date <= r.to)
  assert.equal(sumType(inMonth, 'expense'), 800.5)
  assert.equal(sumType(inMonth, 'income'), 40000)
})

test('byCategory sorts and falls back to "Bez kategorie"', () => {
  const rows = byCategory([...data, tx('2026-03-03', 'x', 10, 'expense', 'gone')], 'expense', cats)
  assert.equal(rows[0].category.id, 'f')
  assert.equal(rows[rows.length - 1].category.name, 'Bez kategorie')
})

test('series: month has one point per day, year per month', () => {
  const m = series(data, 'month', new Date(2026, 2, 10))
  assert.equal(m.length, 31)
  assert.equal(m[14].expense, 500.5)
  const y = series(data, 'year', new Date(2026, 5, 1))
  assert.equal(y.length, 12)
  assert.equal(y[3].expense, 700)
})

test('suggest ignores diacritics and prefers frequent titles', () => {
  const s = suggest(data, 'expense', 'alb')
  assert.equal(s[0].title, 'Albert')
  assert.equal(s[0].count, 2)
  assert.equal(s[0].amount, 500.5)
  assert.equal(suggest(data, 'income', 'vyp')[0].title, 'Výplata')
  assert.equal(suggest(data, 'income', 'albert').length, 0)
})

test('filters', () => {
  const f = { ...EMPTY_FILTERS, type: 'expense' as const, min: '400' }
  assert.equal(applyFilters(data, f, cats).length, 2)
  assert.equal(applyFilters(data, { ...EMPTY_FILTERS, q: 'jidlo' }, cats).length, 3)
})

test('parseAmount', () => {
  assert.equal(parseAmount('1 234,5'), 1234.5)
  assert.equal(parseAmount('12.99'), 12.99)
  assert.ok(Number.isNaN(parseAmount('abc')))
  assert.ok(Number.isNaN(parseAmount('-5')))
})

test('demo data is deterministic and valid', () => {
  const now = new Date(2026, 5, 20)
  const a = demoTransactions(now)
  assert.ok(a.length > 80)
  assert.deepEqual(
    a.map((t) => [t.date, t.title, t.amount]),
    demoTransactions(now).map((t) => [t.date, t.title, t.amount]),
  )
  assert.ok(a.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.amount > 0))
})

test('backup validation', () => {
  assert.equal(typeof parseBackup('nope'), 'string')
  assert.equal(typeof parseBackup('{"categories":[],"transactions":[{"id":1}]}'), 'string')
  const ok = parseBackup(JSON.stringify({ categories: cats, transactions: data }))
  assert.equal(typeof ok, 'object')
})
