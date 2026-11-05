export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  kind: TxType
  /** monthly limit in CZK (expense categories only) */
  budget?: number
}

export interface Transaction {
  id: string
  /** yyyy-MM-dd (local date, no timezone) */
  date: string
  title: string
  /** always positive; the sign comes from `type` */
  amount: number
  type: TxType
  categoryId: string
  note: string
  createdAt: number
}

export type Theme = 'light' | 'dark'
export type Page = 'prehled' | 'kalendar' | 'transakce' | 'kategorie'
