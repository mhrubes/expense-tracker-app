import { useRef, useState } from 'react'
import { download, parseBackup } from '../lib/backup.ts'
import { money, todayISO } from '../lib/format.ts'
import { useData, useUi } from '../store.ts'
import type { Category, TxType } from '../types.ts'

function Group({ kind, title }: { kind: TxType; title: string }) {
  const categories = useData((s) => s.categories)
  const transactions = useData((s) => s.transactions)
  const openCat = useUi((s) => s.openCat)
  const list = categories.filter((c) => c.kind === kind)
  const stats = (c: Category) => {
    const tx = transactions.filter((t) => t.categoryId === c.id)
    return { n: tx.length, total: tx.reduce((a, t) => a + t.amount, 0) }
  }
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <button className="btn small primary" onClick={() => openCat(undefined, kind)}>
          ＋ Nová kategorie
        </button>
      </div>
      {list.length === 0 ? (
        <p className="muted pad">Zatím žádná kategorie.</p>
      ) : (
        <ul className="cat-grid">
          {list.map((c) => {
            const s = stats(c)
            return (
              <li key={c.id}>
                <button className="cat-card" onClick={() => openCat(c.id)} style={{ ['--c' as string]: c.color }}>
                  <span className="chip-ico big" style={{ background: `color-mix(in srgb, ${c.color} 22%, transparent)` }}>
                    {c.icon}
                  </span>
                  <span className="li-main">
                    <b>{c.name}</b>
                    <small className="muted">
                      {s.n} plateb · {money(s.total)}
                    </small>
                    {c.budget ? <small className="muted">limit {money(c.budget)} / měsíc</small> : null}
                  </span>
                  <span className="edit-hint">✏️</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function Categories() {
  const categories = useData((s) => s.categories)
  const transactions = useData((s) => s.transactions)
  const importData = useData((s) => s.importData)
  const clearAll = useData((s) => s.clearAll)
  const loadDemo = useData((s) => s.loadDemo)
  const removeDemo = useData((s) => s.removeDemo)
  const demoCount = transactions.filter((t) => t.id.startsWith('demo-')).length
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [armed, setArmed] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    const parsed = parseBackup(await file.text())
    if (typeof parsed === 'string') return setMsg({ ok: false, text: parsed })
    importData(parsed.categories, parsed.transactions)
    setMsg({ ok: true, text: `Načteno: ${parsed.categories.length} kategorií, ${parsed.transactions.length} plateb.` })
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Kategorie</h1>
          <p className="muted">Spravuj kategorie výdajů a příjmů, barvy, ikony a měsíční limity.</p>
        </div>
      </div>

      <Group kind="expense" title="Výdaje" />
      <Group kind="income" title="Příjmy" />

      <section className="card">
        <div className="card-head">
          <h2>Data</h2>
          <span className="muted small">Ukládají se jen v tomto prohlížeči (localStorage).</span>
        </div>
        <div className="actions wrap">
          <button className="btn" onClick={() => download(`vydaje-zaloha-${todayISO()}.json`, JSON.stringify({ categories, transactions }, null, 2), 'application/json')}>
            Zálohovat do JSON
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Obnovit ze zálohy
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ''))} />
          <button className="btn" onClick={loadDemo}>
            Načíst ukázková data
          </button>
          {demoCount > 0 && (
            <button
              className="btn"
              onClick={() => {
                removeDemo()
                setMsg({ ok: true, text: `Ukázková data odstraněna (${demoCount} plateb). Tvoje vlastní platby zůstaly.` })
              }}
            >
              Smazat jen ukázková data ({demoCount})
            </button>
          )}
          <button
            className={`btn danger${armed ? ' armed' : ''}`}
            onClick={() => {
              if (!armed) return setArmed(true)
              clearAll()
              setArmed(false)
              setMsg({ ok: true, text: 'Všechna data byla smazána, kategorie vráceny na výchozí.' })
            }}
            onBlur={() => setArmed(false)}
          >
            {armed ? 'Opravdu smazat vše?' : 'Smazat všechna data'}
          </button>
        </div>
        {msg && <p className={msg.ok ? 'pos small' : 'neg small'}>{msg.text}</p>}
      </section>
    </div>
  )
}
