import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { money, parseAmount, todayISO } from '../lib/format.ts'
import { suggest } from '../lib/stats.ts'
import { useData, useUi } from '../store.ts'
import type { DialogState } from '../store.ts'
import type { TxType } from '../types.ts'
import { Modal } from './Modal.tsx'

type TxDialog = Extract<NonNullable<DialogState>, { kind: 'tx' }>

export function TransactionDialog({ id, defaults }: Pick<TxDialog, 'id' | 'defaults'>) {
  const close = useUi((s) => s.closeDialog)
  const categories = useData((s) => s.categories)
  const transactions = useData((s) => s.transactions)
  const addTx = useData((s) => s.addTx)
  const updateTx = useData((s) => s.updateTx)
  const deleteTx = useData((s) => s.deleteTx)
  const existing = id ? transactions.find((t) => t.id === id) : undefined

  const [type, setType] = useState<TxType>(existing?.type ?? defaults?.type ?? 'expense')
  const [amount, setAmount] = useState(
    existing ? String(existing.amount).replace('.', ',') : defaults?.amount ? String(defaults.amount).replace('.', ',') : '',
  )
  const [title, setTitle] = useState(existing?.title ?? defaults?.title ?? '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? defaults?.categoryId ?? '')
  const [date, setDate] = useState(existing?.date ?? defaults?.date ?? todayISO())
  const [note, setNote] = useState(existing?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sugOpen, setSugOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [confirmDel, setConfirmDel] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const cats = useMemo(() => categories.filter((c) => c.kind === type), [categories, type])
  useEffect(() => {
    if (!cats.some((c) => c.id === categoryId)) setCategoryId(cats[0]?.id ?? '')
  }, [cats, categoryId])

  const suggestions = useMemo(
    () => suggest(transactions.filter((t) => t.id !== id), type, title, 6),
    [transactions, type, title, id],
  )
  const catById = (cid: string) => categories.find((c) => c.id === cid)

  function pick(i: number) {
    const s = suggestions[i]
    if (!s) return
    setTitle(s.title)
    if (cats.some((c) => c.id === s.categoryId)) setCategoryId(s.categoryId)
    if (!amount.trim()) setAmount(String(s.amount).replace('.', ','))
    setSugOpen(false)
    setActive(-1)
  }

  function validate() {
    const e: Record<string, string> = {}
    const n = parseAmount(amount)
    if (Number.isNaN(n) || n <= 0) e.amount = 'Zadej kladnou částku, např. 249 nebo 249,90.'
    if (!title.trim()) e.title = 'Vyplň název.'
    if (!categoryId) e.category = 'Vyber kategorii (přidej ji v záložce Kategorie).'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Zadej platné datum.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function save(another: boolean) {
    if (!validate()) return
    const input = { type, amount: parseAmount(amount), title: title.trim(), categoryId, date, note: note.trim() }
    if (existing) updateTx(existing.id, input)
    else addTx(input)
    if (another && !existing) {
      setAmount('')
      setTitle('')
      setNote('')
      setErrors({})
      titleRef.current?.focus()
    } else close()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save(false)
  }

  return (
    <Modal title={existing ? 'Upravit platbu' : 'Nová platba'} onClose={close}>
      <form onSubmit={onSubmit} className="form">
        <div className="seg wide" role="tablist" aria-label="Typ platby">
          <button type="button" className={type === 'expense' ? 'on neg-bg' : ''} onClick={() => setType('expense')}>
            − Výdaj
          </button>
          <button type="button" className={type === 'income' ? 'on pos-bg' : ''} onClick={() => setType('income')}>
            + Příjem
          </button>
        </div>

        <label className="field">
          <span>Částka (Kč)</span>
          <input
            inputMode="decimal"
            autoFocus={!!existing}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!!errors.amount}
          />
          {errors.amount && <em className="err">{errors.amount}</em>}
        </label>

        <div className="field combo">
          <label htmlFor="tx-title">Název</label>
          <input
            id="tx-title"
            ref={titleRef}
            autoFocus={!existing}
            autoComplete="off"
            placeholder="Např. Albert, Nájem, Výplata…"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setSugOpen(true)
              setActive(-1)
            }}
            onFocus={() => setSugOpen(true)}
            onBlur={() => setSugOpen(false)}
            onKeyDown={(e) => {
              if (!sugOpen || !suggestions.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => (a + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1))
              } else if (e.key === 'Enter' && active >= 0) {
                e.preventDefault()
                pick(active)
              } else if (e.key === 'Escape' && sugOpen) {
                e.stopPropagation()
                setSugOpen(false)
              }
            }}
            aria-invalid={!!errors.title}
          />
          {errors.title && <em className="err">{errors.title}</em>}
          {sugOpen && suggestions.length > 0 && (
            <ul className="suggest" role="listbox">
              <li className="suggest-head">{title.trim() ? 'Již použité' : 'Často používané'}</li>
              {suggestions.map((s, i) => {
                const c = catById(s.categoryId)
                return (
                  <li
                    key={s.title}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? 'on' : ''}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(i)
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className="dot" style={{ background: c?.color ?? '#94a3b8' }} />
                    <span className="s-title">{s.title}</span>
                    <span className="s-cat">{c?.name ?? '—'}</span>
                    <span className="s-amt">{money(s.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="row2">
          <label className="field">
            <span>Kategorie</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            {errors.category && <em className="err">{errors.category}</em>}
          </label>
          <label className="field">
            <span>Datum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
            {errors.date && <em className="err">{errors.date}</em>}
          </label>
        </div>

        <label className="field">
          <span>Popis (volitelné)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Poznámka k platbě…" />
        </label>

        <footer className="actions">
          {existing && (
            <button
              type="button"
              className={`btn danger${confirmDel ? ' armed' : ''}`}
              onClick={() => {
                if (!confirmDel) return setConfirmDel(true)
                deleteTx(existing.id)
                close()
              }}
            >
              {confirmDel ? 'Opravdu smazat?' : 'Smazat'}
            </button>
          )}
          <span className="grow" />
          {!existing && (
            <button type="button" className="btn" onClick={() => save(true)}>
              Uložit a další
            </button>
          )}
          <button type="submit" className="btn primary">
            Uložit
          </button>
        </footer>
      </form>
    </Modal>
  )
}
