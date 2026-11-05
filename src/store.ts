import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { demoTransactions } from './lib/demo.ts'
import { round2 } from './lib/format.ts'
import type { Category, Theme, Transaction, TxType } from './types.ts'

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c-food', name: 'Jídlo a pití', color: '#f59e0b', icon: '🛒', kind: 'expense', budget: 9000 },
  { id: 'c-home', name: 'Bydlení', color: '#6366f1', icon: '🏠', kind: 'expense', budget: 18000 },
  { id: 'c-transport', name: 'Doprava', color: '#0ea5e9', icon: '🚗', kind: 'expense', budget: 3500 },
  { id: 'c-fun', name: 'Zábava', color: '#ec4899', icon: '🎬', kind: 'expense', budget: 3000 },
  { id: 'c-health', name: 'Zdraví', color: '#10b981', icon: '💊', kind: 'expense' },
  { id: 'c-shop', name: 'Nákupy', color: '#8b5cf6', icon: '🛍️', kind: 'expense' },
  { id: 'c-other', name: 'Ostatní', color: '#94a3b8', icon: '📦', kind: 'expense' },
  { id: 'c-salary', name: 'Výplata', color: '#22c55e', icon: '💼', kind: 'income' },
  { id: 'c-extra', name: 'Přivýdělek', color: '#14b8a6', icon: '💡', kind: 'income' },
  { id: 'c-gift', name: 'Dárky a ostatní příjmy', color: '#a3e635', icon: '🎁', kind: 'income' },
]

export type TxInput = Omit<Transaction, 'id' | 'createdAt'>

interface DataState {
  categories: Category[]
  transactions: Transaction[]
  theme: Theme

  addTx: (t: TxInput) => string
  updateTx: (id: string, patch: Partial<TxInput>) => void
  deleteTx: (id: string) => void

  addCat: (c: Omit<Category, 'id'>) => string
  updateCat: (id: string, patch: Partial<Omit<Category, 'id'>>) => void
  /** Moves transactions to `moveTo`; without it they are deleted together with the category. */
  deleteCat: (id: string, moveTo?: string) => void

  setTheme: (t: Theme) => void
  loadDemo: () => void
  /** Removes only the sample payments (ids starting with "demo-"). */
  removeDemo: () => void
  importData: (categories: Category[], transactions: Transaction[]) => void
  clearAll: () => void
}

const initialTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const useData = create<DataState>()(
  persist(
    (set) => ({
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      theme: initialTheme(),

      addTx: (t) => {
        const id = uid()
        set((s) => ({
          transactions: [...s.transactions, { ...t, amount: round2(Math.abs(t.amount)), id, createdAt: Date.now() }],
        }))
        return id
      },
      updateTx: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, amount: round2(Math.abs(patch.amount ?? t.amount)) } : t,
          ),
        })),
      deleteTx: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addCat: (c) => {
        const id = uid()
        set((s) => ({ categories: [...s.categories, { ...c, id }] }))
        return id
      },
      updateCat: (id, patch) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCat: (id, moveTo) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          transactions: moveTo
            ? s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: moveTo } : t))
            : s.transactions.filter((t) => t.categoryId !== id),
        })),

      setTheme: (theme) => set({ theme }),

      loadDemo: () =>
        set((s) => {
          const have = new Set(s.categories.map((c) => c.id))
          const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.id))
          return {
            categories: [...s.categories, ...missing],
            transactions: [...s.transactions.filter((t) => !t.id.startsWith('demo-')), ...demoTransactions()],
          }
        }),
      removeDemo: () => set((s) => ({ transactions: s.transactions.filter((t) => !t.id.startsWith('demo-')) })),
      importData: (categories, transactions) => set({ categories, transactions }),
      clearAll: () => set({ categories: DEFAULT_CATEGORIES, transactions: [] }),
    }),
    {
      name: 'expense-tracker:v1',
      version: 1,
      partialize: (s) => ({ categories: s.categories, transactions: s.transactions, theme: s.theme }),
    },
  ),
)

export type DialogState =
  | { kind: 'tx'; id?: string; defaults?: Partial<Pick<Transaction, 'date' | 'type' | 'title' | 'amount' | 'categoryId'>> }
  | { kind: 'cat'; id?: string; defaultKind?: TxType }
  | null

interface UiState {
  dialog: DialogState
  openTx: (id?: string, defaults?: Extract<DialogState, { kind: 'tx' }>['defaults']) => void
  openCat: (id?: string, defaultKind?: TxType) => void
  closeDialog: () => void
}

export const useUi = create<UiState>()((set) => ({
  dialog: null,
  openTx: (id, defaults) => set({ dialog: { kind: 'tx', id, defaults } }),
  openCat: (id, defaultKind) => set({ dialog: { kind: 'cat', id, defaultKind } }),
  closeDialog: () => set({ dialog: null }),
}))
