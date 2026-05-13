/**
 * src/components/Transactions.tsx
 *
 * Searchable, filterable transaction list with:
 * - Edit modal
 * - Amount range filter
 * - CSV export
 * - Recurring transactions management
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Trash2, Pencil, Download, RefreshCw, Plus, X, CreditCard } from 'lucide-react'
import { Transaction, RecurringTransaction } from '../types'
import { fmtAED, fmtUSD } from '../utils/currency'
import AmexImport from './AmexImport'

interface Props {
  transactions: Transaction[]
  onUpdate: (tx: Transaction) => void
  onDelete: (id: number) => void
}

const EXPENSE_CATS = ['Food','Rent','Transport','Entertainment','Health','Shopping','Utilities','Other']
const INCOME_CATS  = ['Salary','Freelance','Investment','Gift','Other']

// ─── Edit Modal ────────────────────────────────────────────────────────────
function EditModal({
  tx, onSave, onClose,
}: { tx: Transaction; onSave: (t: Transaction) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...tx, description: tx.description ?? '' })

  function set(field: keyof typeof form, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const categories = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div style={modal.overlay}>
      <div style={modal.box}>
        <div style={modal.header}>
          <span style={modal.title}>Edit Transaction</span>
          <button onClick={onClose} style={modal.close}><X size={18} /></button>
        </div>

        {/* Type */}
        <div style={modal.field}>
          <label style={modal.label}>Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['expense','income'] as const).map(t => (
              <button key={t} onClick={() => set('type', t)} style={{
                ...modal.toggleBtn,
                ...(form.type === t ? { background: t === 'income' ? '#16a34a' : '#dc2626', color: '#fff' } : {}),
              }}>
                {t === 'income' ? '+ Income' : '− Expense'}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={modal.field}>
          <label style={modal.label}>Category</label>
          <select style={modal.input} value={form.category}
            onChange={e => set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Amount */}
        <div style={modal.field}>
          <label style={modal.label}>Amount (AED)</label>
          <input style={modal.input} type="number" min="0" step="0.01"
            value={form.amount} onChange={e => set('amount', parseFloat(e.target.value))} />
        </div>

        {/* Date */}
        <div style={modal.field}>
          <label style={modal.label}>Date</label>
          <input style={modal.input} type="date" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>

        {/* Description */}
        <div style={modal.field}>
          <label style={modal.label}>Description</label>
          <input style={modal.input} placeholder="Optional"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={modal.cancelBtn}>Cancel</button>
          <button onClick={() => onSave({ ...form, description: form.description || undefined })}
            style={modal.saveBtn}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ─── Recurring Section ─────────────────────────────────────────────────────
function RecurringSection({ onLog }: { onLog: (tx: Omit<Transaction, 'id'>) => void }) {
  const [list, setList] = useState<RecurringTransaction[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '', amount: '', description: '', day_of_month: '1',
  })

  useEffect(() => { window.api.getRecurring().then(setList) }, [])

  async function handleAdd() {
    const amt = parseFloat(form.amount)
    if (!form.category || isNaN(amt) || amt <= 0) return
    const saved = await window.api.addRecurring({
      type: form.type, category: form.category, amount: amt,
      description: form.description || undefined,
      day_of_month: parseInt(form.day_of_month) || 1,
    })
    setList(prev => [...prev, saved])
    setForm({ type: 'expense', category: '', amount: '', description: '', day_of_month: '1' })
    setOpen(false)
  }

  async function handleDelete(id: number) {
    await window.api.deleteRecurring(id)
    setList(prev => prev.filter(r => r.id !== id))
  }

  function logNow(r: RecurringTransaction) {
    onLog({
      type: r.type, category: r.category, amount: r.amount,
      description: r.description, date: new Date().toISOString().split('T')[0],
    })
  }

  const categories = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div style={rec.wrap}>
      <div style={rec.header}>
        <span style={rec.title}><RefreshCw size={15} style={{ marginRight: 6 }} />Recurring Transactions</span>
        <button onClick={() => setOpen(o => !o)} style={rec.addBtn}>
          <Plus size={14} /> Add
        </button>
      </div>

      {open && (
        <div style={rec.form}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['expense','income'] as const).map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t, category: '' }))}
                style={{ ...rec.toggleBtn, ...(form.type === t ? { background: '#3b82f6', color: '#fff' } : {}) }}>
                {t === 'income' ? '+ Income' : '− Expense'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <select style={rec.input} value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="">Category…</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={{ ...rec.input, width: 110 }} type="number" placeholder="Amount (AED)"
              value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            <input style={{ ...rec.input, width: 90 }} type="number" min="1" max="31"
              placeholder="Day of month" value={form.day_of_month}
              onChange={e => setForm(p => ({ ...p, day_of_month: e.target.value }))} />
            <input style={{ ...rec.input, flex: 1 }} placeholder="Description (optional)"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <button style={rec.saveBtn} onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p style={{ color: '#475569', fontSize: 13, padding: '8px 0' }}>No recurring entries yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {list.map(r => (
            <div key={r.id} style={rec.row}>
              <span style={{ ...rec.badge, background: r.type === 'income' ? '#14532d' : '#450a0a', color: r.type === 'income' ? '#86efac' : '#fca5a5' }}>
                {r.type}
              </span>
              <span style={rec.rowCat}>{r.category}</span>
              {r.description && <span style={rec.rowDesc}>{r.description}</span>}
              <span style={{ flex: 1 }} />
              <span style={rec.rowAmt}>{fmtAED(r.amount)}</span>
              <span style={rec.rowDay}>day {r.day_of_month}</span>
              <button onClick={() => logNow(r)} style={rec.logBtn} title="Log today">Log Now</button>
              <button onClick={() => handleDelete(r.id)} style={rec.delBtn} title="Delete"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function Transactions({ transactions, onUpdate, onDelete }: Props) {
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<'all' | 'income' | 'expense'>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [editing,   setEditing]   = useState<Transaction | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    const min = minAmount ? parseFloat(minAmount) : null
    const max = maxAmount ? parseFloat(maxAmount) : null
    return transactions.filter(tx => {
      const matchesType   = filter === 'all' || tx.type === filter
      const matchesSearch =
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        (tx.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesMin = min === null || tx.amount >= min
      const matchesMax = max === null || tx.amount <= max
      return matchesType && matchesSearch && matchesMin && matchesMax
    })
  }, [transactions, search, filter, minAmount, maxAmount])

  function exportCSV() {
    const header = 'Date,Type,Category,Description,Amount (AED),Amount (USD)'
    const rows = filtered.map(tx => {
      const usd = (tx.amount / 3.6725).toFixed(2)
      return `"${tx.date}","${tx.type}","${tx.category}","${tx.description ?? ''}","${tx.amount.toFixed(2)}","${usd}"`
    })
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSaveEdit(tx: Transaction) {
    onUpdate(tx)
    setEditing(null)
  }

  async function handleBulkImport(txs: Omit<Transaction, 'id'>[]) {
    for (const tx of txs) {
      const saved = await window.api.addTransaction(tx)
      window.dispatchEvent(new CustomEvent('tx-added', { detail: saved }))
    }
  }

  // Allow logging recurring items directly into the transaction list
  async function handleLogRecurring(tx: Omit<Transaction, 'id'>) {
    const saved = await window.api.addTransaction(tx)
    onUpdate({ ...saved }) // triggers parent re-load via optimistic update isn't ideal; parent handles via loadAll
    // Notify parent by calling onUpdate with a fake existing-id-less tx isn't ideal.
    // Instead, reload via the same mechanism as add: just invoke addTransaction and then
    // the parent's setTransactions will be updated by App.tsx's handleUpdateTransaction.
    // Simplest: reload page data. We call window.api.addTransaction and then trigger parent.
    // Since parent doesn't expose onAdd here, we call addTransaction and force a page reload approach.
    // Best: add an onAdd prop. For now we use a workaround via window location reload.
    // Actually, let's just use window.api directly and dispatch a custom event to App.
    window.dispatchEvent(new CustomEvent('tx-added', { detail: saved }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={styles.heading}>Transactions</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImporting(true)} style={styles.importBtn}>
            <CreditCard size={15} style={{ marginRight: 6 }} /> Import Amex
          </button>
          <button onClick={exportCSV} style={styles.exportBtn}>
            <Download size={15} style={{ marginRight: 6 }} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Search by category or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          style={{ ...styles.input, width: 130, flex: 'none' }}
          type="number" min="0" placeholder="Min AED"
          value={minAmount} onChange={e => setMinAmount(e.target.value)}
        />
        <input
          style={{ ...styles.input, width: 130, flex: 'none' }}
          type="number" min="0" placeholder="Max AED"
          value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
        />
        <div style={styles.tabs}>
          {(['all','income','expense'] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ ...styles.tab, ...(filter === t ? styles.tabActive : {}) }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>No transactions found.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date','Type','Category','Description','Amount',''].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(tx.date + 'T00:00:00').toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: tx.type === 'income' ? '#14532d' : '#450a0a',
                      color:      tx.type === 'income' ? '#86efac' : '#fca5a5',
                    }}>{tx.type}</span>
                  </td>
                  <td style={styles.td}>{tx.category}</td>
                  <td style={{ ...styles.td, color: '#94a3b8' }}>{tx.description ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    <span style={{ color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {tx.type === 'income' ? '+' : '−'}{fmtAED(tx.amount)}
                    </span>
                    <br />
                    <span style={{ color: '#475569', fontSize: 11, fontWeight: 400 }}>
                      {fmtUSD(tx.amount)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setEditing(tx)} style={styles.iconBtn} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(tx.id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recurring ── */}
      <RecurringSection onLog={handleLogRecurring} />

      {/* ── Edit Modal ── */}
      {editing && (
        <EditModal tx={editing} onSave={handleSaveEdit} onClose={() => setEditing(null)} />
      )}

      {/* ── Amex Import Modal ── */}
      {importing && (
        <AmexImport
          onClose={() => setImporting(false)}
          onImport={handleBulkImport}
        />
      )}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  heading:   { fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  importBtn: {
    display: 'flex', alignItems: 'center',
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#1d4ed8', color: '#fff', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
  exportBtn: {
    display: 'flex', alignItems: 'center',
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#334155', color: '#cbd5e1', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
  controls: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 8,
    border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9',
    fontSize: 14, outline: 'none',
  },
  tabs:      { display: 'flex', gap: 4 },
  tab: {
    padding: '10px 16px', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
  },
  tabActive: { background: '#3b82f6', color: '#fff', border: '1px solid #3b82f6' },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid #334155', marginBottom: 24 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: 12,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
    borderBottom: '1px solid #334155', background: '#1e293b',
  },
  tr:      { borderBottom: '1px solid #1e293b' },
  td:      { padding: '12px 16px', fontSize: 14, color: '#cbd5e1', background: '#0f172a' },
  badge:   { padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  iconBtn: {
    background: 'transparent', border: 'none', color: '#475569',
    cursor: 'pointer', padding: 4, borderRadius: 4,
  },
}

const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  box: {
    background: '#1e293b', borderRadius: 12, padding: 28,
    width: 440, border: '1px solid #334155',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:     { fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  close: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 },
  field:     { display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 12, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase' },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #334155',
    background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none',
  },
  toggleBtn: {
    flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 14, cursor: 'pointer',
  },
  saveBtn: {
    flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}

const rec: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, padding: '16px 20px', marginTop: 8,
  },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title:   { fontSize: 14, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 12px', borderRadius: 6, border: 'none',
    background: '#334155', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
  },
  form:    { background: '#0f172a', borderRadius: 8, padding: 12 },
  input: {
    flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #334155',
    background: '#1e293b', color: '#f1f5f9', fontSize: 13, outline: 'none',
  },
  toggleBtn: {
    padding: '6px 14px', borderRadius: 6, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 16px', borderRadius: 6, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#0f172a', borderRadius: 8, padding: '8px 12px',
    fontSize: 13,
  },
  badge:   { padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, flexShrink: 0 },
  rowCat:  { fontWeight: 600, color: '#f1f5f9' },
  rowDesc: { color: '#64748b', fontSize: 12 },
  rowAmt:  { color: '#f1f5f9', fontWeight: 600, flexShrink: 0 },
  rowDay:  { color: '#475569', fontSize: 12, flexShrink: 0 },
  logBtn: {
    padding: '4px 10px', borderRadius: 6, border: 'none',
    background: '#334155', color: '#94a3b8', fontSize: 12, cursor: 'pointer', flexShrink: 0,
  },
  delBtn: {
    background: 'transparent', border: 'none', color: '#475569',
    cursor: 'pointer', padding: 4, flexShrink: 0,
  },
}
