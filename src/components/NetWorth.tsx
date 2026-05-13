/**
 * src/components/NetWorth.tsx
 *
 * Track assets and liabilities to see your overall net worth.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { NetWorthEntry } from '../types'
import { fmtAED, fmtUSD } from '../utils/currency'

const ASSET_CATS     = ['Cash','Savings','Investments','Property','Vehicle','Other']
const LIABILITY_CATS = ['Mortgage','Car Loan','Personal Loan','Credit Card','Other']

const EMPTY_FORM = { name: '', type: 'asset' as 'asset' | 'liability', amount: '', category: '' }

export default function NetWorthPage() {
  const [entries,  setEntries]  = useState<NetWorthEntry[]>([])
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editing,  setEditing]  = useState<NetWorthEntry | null>(null)
  const [showAdd,  setShowAdd]  = useState(false)

  useEffect(() => { window.api.getNetWorth().then(setEntries) }, [])

  const assets      = useMemo(() => entries.filter(e => e.type === 'asset'),     [entries])
  const liabilities = useMemo(() => entries.filter(e => e.type === 'liability'), [entries])
  const totalAssets = useMemo(() => assets.reduce((s, e) => s + e.amount, 0),      [assets])
  const totalLiab   = useMemo(() => liabilities.reduce((s, e) => s + e.amount, 0), [liabilities])
  const netWorth    = totalAssets - totalLiab

  async function handleAdd() {
    const amount = parseFloat(form.amount)
    if (!form.name || isNaN(amount) || amount < 0) return
    const saved = await window.api.addNetWorthEntry({
      name: form.name, type: form.type, amount,
      category: form.category || undefined,
    })
    setEntries(prev => [...prev, saved])
    setForm(EMPTY_FORM)
    setShowAdd(false)
  }

  async function handleSaveEdit() {
    if (!editing) return
    const updated = await window.api.updateNetWorthEntry(editing)
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setEditing(null)
  }

  async function handleDelete(id: number) {
    await window.api.deleteNetWorthEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const categories = form.type === 'asset' ? ASSET_CATS : LIABILITY_CATS
  const editCats   = editing ? (editing.type === 'asset' ? ASSET_CATS : LIABILITY_CATS) : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={styles.heading}>Net Worth</h1>
        <button onClick={() => setShowAdd(o => !o)} style={styles.addBtn}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add Entry
        </button>
      </div>

      {/* ── Summary ── */}
      <div style={styles.summary}>
        <SummaryTile label="Total Assets"      value={totalAssets} color="#22c55e" />
        <SummaryTile label="Total Liabilities" value={totalLiab}   color="#ef4444" />
        <div style={{
          ...styles.netTile,
          borderColor: netWorth >= 0 ? '#22c55e' : '#ef4444',
        }}>
          <span style={styles.tileLabel}>Net Worth</span>
          <span style={{ ...styles.netValue, color: netWorth >= 0 ? '#22c55e' : '#ef4444' }}>
            {netWorth < 0 ? '−' : ''}{fmtAED(Math.abs(netWorth))}
          </span>
          <span style={styles.tileUSD}>
            {netWorth < 0 ? '−' : ''}{fmtUSD(Math.abs(netWorth))}
          </span>
        </div>
      </div>

      {/* ── Add Form ── */}
      {showAdd && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>New Entry</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['asset', 'liability'] as const).map(t => (
              <button key={t}
                onClick={() => setForm(p => ({ ...p, type: t, category: '' }))}
                style={{
                  ...styles.toggleBtn,
                  ...(form.type === t
                    ? { background: t === 'asset' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none' }
                    : {}),
                }}>
                {t === 'asset' ? '+ Asset' : '− Liability'}
              </button>
            ))}
          </div>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input style={styles.input} placeholder="e.g. Savings Account"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Amount (AED)</label>
              <input style={styles.input} type="number" min="0" placeholder="0"
                value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <select style={styles.input} value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleAdd} style={styles.saveBtn}>Add Entry</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd && (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 60 }}>
          No entries yet. Add your assets and liabilities to track your net worth.
        </p>
      )}

      {/* ── Assets & Liabilities ── */}
      <div style={styles.columns}>
        {/* Assets */}
        <div style={{ flex: 1 }}>
          <h2 style={{ ...styles.sectionTitle, color: '#22c55e' }}>
            Assets
            <span style={styles.sectionTotal}>{fmtAED(totalAssets)}</span>
          </h2>
          {assets.length === 0 && (
            <p style={styles.empty}>No assets yet.</p>
          )}
          {assets.map(e => (
            <EntryRow key={e.id} entry={e}
              onEdit={() => setEditing(e)}
              onDelete={() => handleDelete(e.id)} />
          ))}
        </div>

        <div style={styles.columnDivider} />

        {/* Liabilities */}
        <div style={{ flex: 1 }}>
          <h2 style={{ ...styles.sectionTitle, color: '#ef4444' }}>
            Liabilities
            <span style={styles.sectionTotal}>{fmtAED(totalLiab)}</span>
          </h2>
          {liabilities.length === 0 && (
            <p style={styles.empty}>No liabilities yet.</p>
          )}
          {liabilities.map(e => (
            <EntryRow key={e.id} entry={e}
              onEdit={() => setEditing(e)}
              onDelete={() => handleDelete(e.id)} />
          ))}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <div style={modal.overlay}>
          <div style={modal.box}>
            <h2 style={modal.title}>Edit Entry</h2>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Name</label>
                <input style={styles.input} value={editing.name}
                  onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Amount (AED)</label>
                <input style={styles.input} type="number" min="0" value={editing.amount}
                  onChange={e => setEditing(p => p && ({ ...p, amount: parseFloat(e.target.value) }))} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select style={styles.input} value={editing.category ?? ''}
                  onChange={e => setEditing(p => p && ({ ...p, category: e.target.value || undefined }))}>
                  <option value="">Select…</option>
                  {editCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditing(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleSaveEdit} style={styles.saveBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, onEdit, onDelete }: {
  entry: NetWorthEntry
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={styles.entryRow}>
      <div style={{ flex: 1 }}>
        <div style={styles.entryName}>{entry.name}</div>
        {entry.category && <div style={styles.entryCat}>{entry.category}</div>}
      </div>
      <div style={{ textAlign: 'right', marginRight: 12 }}>
        <div style={styles.entryAmt}>{fmtAED(entry.amount)}</div>
        <div style={styles.entryUSD}>{fmtUSD(entry.amount)}</div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <button onClick={onEdit}   style={styles.iconBtn}><Pencil size={13} /></button>
        <button onClick={onDelete} style={{ ...styles.iconBtn, color: '#ef4444' }}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.tile}>
      <span style={styles.tileLabel}>{label}</span>
      <span style={{ ...styles.tileValue, color }}>{fmtAED(value)}</span>
      <span style={styles.tileUSD}>{fmtUSD(value)}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  addBtn: {
    display: 'flex', alignItems: 'center', padding: '9px 18px',
    borderRadius: 8, border: 'none', background: '#3b82f6',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 },
  tile: {
    background: '#1e293b', borderRadius: 12, padding: '18px 22px',
    border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 4,
  },
  netTile: {
    background: '#1e293b', borderRadius: 12, padding: '18px 22px',
    border: '2px solid', display: 'flex', flexDirection: 'column', gap: 4,
  },
  tileLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  tileValue: { fontSize: 22, fontWeight: 700 },
  netValue:  { fontSize: 26, fontWeight: 800 },
  tileUSD:   { fontSize: 12, color: '#475569' },

  card: {
    background: '#1e293b', borderRadius: 12, padding: '22px 24px',
    border: '1px solid #334155', marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 14 },
  toggleBtn: {
    flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field:    { display: 'flex', flexDirection: 'column', gap: 6 },
  label:    { fontSize: 12, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase' },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #334155',
    background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none',
  },
  cancelBtn: {
    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 14, cursor: 'pointer',
  },
  saveBtn: {
    flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  columns: { display: 'flex', gap: 0 },
  columnDivider: { width: 1, background: '#334155', margin: '0 24px', flexShrink: 0 },
  sectionTitle: {
    fontSize: 15, fontWeight: 700, marginBottom: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTotal: { fontSize: 14, color: '#94a3b8', fontWeight: 600 },
  empty: { color: '#475569', fontSize: 13, padding: '8px 0' },

  entryRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1e293b', borderRadius: 10, padding: '12px 14px',
    border: '1px solid #334155', marginBottom: 8,
  },
  entryName: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' },
  entryCat:  { fontSize: 12, color: '#475569', marginTop: 2 },
  entryAmt:  { fontSize: 14, fontWeight: 600, color: '#cbd5e1' },
  entryUSD:  { fontSize: 11, color: '#475569' },
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
  },
  title: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 },
}
