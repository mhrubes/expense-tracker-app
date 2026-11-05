import { useState } from 'react'
import type { FormEvent } from 'react'
import { money, parseAmount } from '../lib/format.ts'
import { sumType } from '../lib/stats.ts'
import { useData, useUi } from '../store.ts'
import type { TxType } from '../types.ts'
import { Modal } from './Modal.tsx'

export const PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#a16207']
const ICONS = ['🛒', '🏠', '🚗', '🎬', '💊', '🛍️', '✈️', '📚', '🍽️', '☕', '🐶', '👶', '🎁', '💼', '💡', '📱', '⚡', '🏋️', '🎓', '📦']

export function CategoryDialog({ id, defaultKind }: { id?: string; defaultKind?: TxType }) {
  const close = useUi((s) => s.closeDialog)
  const categories = useData((s) => s.categories)
  const transactions = useData((s) => s.transactions)
  const addCat = useData((s) => s.addCat)
  const updateCat = useData((s) => s.updateCat)
  const deleteCat = useData((s) => s.deleteCat)
  const existing = id ? categories.find((c) => c.id === id) : undefined
  const used = existing ? transactions.filter((t) => t.categoryId === existing.id) : []

  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<TxType>(existing?.kind ?? defaultKind ?? 'expense')
  const [color, setColor] = useState(existing?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)])
  const [icon, setIcon] = useState(existing?.icon ?? '📦')
  const [budget, setBudget] = useState(existing?.budget ? String(existing.budget) : '')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [moveTo, setMoveTo] = useState('')

  const targets = categories.filter((c) => c.id !== existing?.id && c.kind === existing?.kind)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Vyplň název kategorie.')
    if (categories.some((c) => c.id !== id && c.kind === kind && c.name.toLowerCase() === n.toLowerCase())) {
      return setError('Kategorie se stejným názvem už existuje.')
    }
    let b: number | undefined
    if (kind === 'expense' && budget.trim()) {
      b = parseAmount(budget)
      if (Number.isNaN(b) || b <= 0) return setError('Měsíční limit musí být kladné číslo (nebo nech prázdné).')
    }
    const data = { name: n, kind, color, icon: icon.trim() || '📦', budget: b }
    if (existing) updateCat(existing.id, data)
    else addCat(data)
    close()
  }

  function confirmDelete() {
    if (!existing) return
    if (used.length === 0) {
      deleteCat(existing.id)
      return close()
    }
    if (!moveTo) return setError('Vyber kategorii, do které se platby přesunou.')
    deleteCat(existing.id, moveTo)
    close()
  }

  return (
    <Modal title={existing ? 'Upravit kategorii' : 'Nová kategorie'} onClose={close}>
      <form className="form" onSubmit={onSubmit}>
        <div className="seg wide">
          <button type="button" disabled={!!existing && used.length > 0} className={kind === 'expense' ? 'on neg-bg' : ''} onClick={() => setKind('expense')}>
            Výdaje
          </button>
          <button type="button" disabled={!!existing && used.length > 0} className={kind === 'income' ? 'on pos-bg' : ''} onClick={() => setKind('income')}>
            Příjmy
          </button>
        </div>
        {existing && used.length > 0 && <p className="muted small">Typ nejde změnit, dokud kategorie obsahuje platby.</p>}

        <label className="field">
          <span>Název</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Např. Dovolená" />
        </label>

        <div className="field">
          <span>Barva</span>
          <div className="swatches">
            {PALETTE.map((c) => (
              <button key={c} type="button" className={`sw${color === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Vlastní barva" className="sw-input" />
          </div>
        </div>

        <div className="field">
          <span>Ikona</span>
          <div className="icons">
            {ICONS.map((i) => (
              <button key={i} type="button" className={icon === i ? 'sel' : ''} onClick={() => setIcon(i)}>
                {i}
              </button>
            ))}
            <input className="icon-in" maxLength={4} value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="Vlastní emoji" />
          </div>
        </div>

        {kind === 'expense' && (
          <label className="field">
            <span>Měsíční limit (volitelné)</span>
            <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Např. 5000" />
            <small className="muted">Na přehledu se u kategorie ukáže, kolik z limitu zbývá.</small>
          </label>
        )}

        {error && <em className="err">{error}</em>}

        {deleting && existing && (
          <div className="callout">
            {used.length > 0 ? (
              <>
                <p>
                  Kategorie obsahuje <b>{used.length}</b> plateb ({money(sumType(used, existing.kind))}). Kam je přesunout?
                </p>
                {targets.length === 0 ? (
                  <p className="neg small">Není kam přesunout. Nejdřív vytvoř jinou kategorii stejného typu.</p>
                ) : (
                  <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                    <option value="">— vyber kategorii —</option>
                    {targets.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              <p>Kategorie je prázdná, smazání je bezpečné.</p>
            )}
          </div>
        )}

        <footer className="actions">
          {existing && (
            <button
              type="button"
              className={`btn danger${deleting ? ' armed' : ''}`}
              disabled={deleting && used.length > 0 && targets.length === 0}
              onClick={() => (deleting ? confirmDelete() : setDeleting(true))}
            >
              {deleting ? 'Potvrdit smazání' : 'Smazat'}
            </button>
          )}
          <span className="grow" />
          <button type="submit" className="btn primary">
            Uložit
          </button>
        </footer>
      </form>
    </Modal>
  )
}
