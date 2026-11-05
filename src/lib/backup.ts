import type { Category, Transaction } from '../types.ts'

export interface Backup {
  categories: Category[]
  transactions: Transaction[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Validates a JSON backup; returns an error message (Czech) on invalid data. */
export function parseBackup(text: string): Backup | string {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return 'Soubor není platný JSON.'
  }
  if (!isObj(data) || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    return 'Soubor nemá očekávanou strukturu (categories, transactions).'
  }
  const categories: Category[] = []
  for (const c of data.categories) {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || (c.kind !== 'expense' && c.kind !== 'income')) {
      return 'Nevalidní kategorie v souboru.'
    }
    categories.push({
      id: c.id,
      name: c.name,
      kind: c.kind,
      color: typeof c.color === 'string' ? c.color : '#94a3b8',
      icon: typeof c.icon === 'string' ? c.icon : '📦',
      budget: typeof c.budget === 'number' && c.budget > 0 ? c.budget : undefined,
    })
  }
  const transactions: Transaction[] = []
  for (const t of data.transactions) {
    if (
      !isObj(t) ||
      typeof t.id !== 'string' ||
      typeof t.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(t.date) ||
      typeof t.amount !== 'number' ||
      !Number.isFinite(t.amount) ||
      (t.type !== 'expense' && t.type !== 'income') ||
      typeof t.categoryId !== 'string'
    ) {
      return 'Nevalidní platba v souboru.'
    }
    transactions.push({
      id: t.id,
      date: t.date,
      title: typeof t.title === 'string' ? t.title : '',
      amount: Math.abs(t.amount),
      type: t.type,
      categoryId: t.categoryId,
      note: typeof t.note === 'string' ? t.note : '',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    })
  }
  return { categories, transactions }
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

/** Semicolon CSV with BOM so that Czech Excel opens it with diacritics. */
export function toCsv(rows: Transaction[], categories: Category[]): string {
  const name = new Map(categories.map((c) => [c.id, c.name]))
  const head = ['Datum', 'Typ', 'Název', 'Kategorie', 'Částka', 'Poznámka']
  const lines = rows.map((t) =>
    [t.date, t.type === 'income' ? 'Příjem' : 'Výdaj', t.title, name.get(t.categoryId) ?? '', t.type === 'income' ? t.amount : -t.amount, t.note]
      .map(csvCell)
      .join(';'),
  )
  return '﻿' + [head.map(csvCell).join(';'), ...lines].join('\r\n')
}
