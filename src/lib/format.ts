import { format, parseISO } from 'date-fns'
import { cs } from 'date-fns/locale'

const nf = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const money = (n: number): string => nf.format(n)

export const signed = (n: number, type: 'expense' | 'income'): string => `${type === 'income' ? '+' : '−'}${money(n)}`

/** Compact axis label: 1 200 -> "1,2 tis." */
export function moneyShort(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)} mil.`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)} tis.`
  return String(Math.round(n))
}

export const toISO = (d: Date): string => format(d, 'yyyy-MM-dd')
export const todayISO = (): string => toISO(new Date())

export const fmtDate = (iso: string, pattern = 'd. M. yyyy'): string => format(parseISO(iso), pattern, { locale: cs })
export const fmt = (d: Date, pattern: string): string => format(d, pattern, { locale: cs })

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export const round2 = (n: number): number => Math.round(n * 100) / 100

/** Parses "1 234,50" / "1234.5"; returns NaN when invalid. */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN
  return Number(cleaned)
}
