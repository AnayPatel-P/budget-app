/**
 * src/components/Goals.tsx
 *
 * Savings goals: set a target, track contributions, see progress.
 */

import React, { useState, useEffect } from 'react'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { Goal } from '../types'
import { fmtAED, fmtUSD } from '../utils/currency'

const COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316',
  '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
]

const EMPTY_FORM = { name: '', target_amount: '', deadline: '', color: COLORS[0] }

export default function GoalsPage() {
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contrib, setContrib] = useState<{ [id: number]: string }>({})
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { window.api.getGoals().then(setGoals) }, [])

  async function handleAdd() {
    const target = parseFloat(form.target_amount)
    if (!form.name || isNaN(target) || target <= 0) return
    const saved = await window.api.addGoal({
      name: form.name, target_amount: target, current_amount: 0,
      deadline: form.deadline || undefined, color: form.color,
    })
    setGoals(prev => [...prev, saved])
    setForm(EMPTY_FORM)
    setShowAdd(false)
  }

  async function handleSaveEdit() {
    if (!editing) return
    const updated = await window.api.updateGoal(editing)
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g))
    setEditing(null)
  }

  async function handleDelete(id: number) {
    await window.api.deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  async function handleContrib(goal: Goal) {
    const amount = parseFloat(contrib[goal.id] ?? '')
    if (isNaN(amount) || amount === 0) return
    const updated = await window.api.updateGoal({
      ...goal,
      current_amount: Math.max(0, goal.current_amount + amount),
    })
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g))
    setContrib(prev => ({ ...prev, [goal.id]: '' }))
  }

  const totalSaved  = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount,  0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={styles.heading}>Savings Goals</h1>
        <button onClick={() => setShowAdd(o => !o)} style={styles.addBtn}>
          <Plus size={16} style={{ marginRight: 6 }} /> New Goal
        </button>
      </div>

      {/* ── Summary ── */}
      {goals.length > 0 && (
        <div style={styles.summary}>
          <SummaryTile label="Total Saved"  value={totalSaved}  color="#22c55e" />
          <SummaryTile label="Total Target" value={totalTarget} color="#3b82f6" />
          <SummaryTile label="Remaining"    value={totalTarget - totalSaved}
            color={totalTarget - totalSaved <= 0 ? '#22c55e' : '#f97316'} />
        </div>
      )}

      {/* ── Add Form ── */}
      {showAdd && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>New Goal</h2>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Goal Name</label>
              <input style={styles.input} placeholder="e.g. Emergency Fund"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Target (AED)</label>
              <input style={styles.input} type="number" min="0" placeholder="50000"
                value={form.target_amount}
                onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Deadline (optional)</label>
              <input style={styles.input} type="date"
                value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: form.color === c ? '3px solid #fff' : '3px solid transparent',
                      cursor: 'pointer',
                    }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleAdd} style={styles.saveBtn}>Add Goal</button>
          </div>
        </div>
      )}

      {/* ── Goals List ── */}
      {goals.length === 0 && !showAdd && (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 60 }}>
          No goals yet. Click "New Goal" to get started!
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {goals.map(goal => {
          const pct      = goal.target_amount > 0
            ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
          const done     = goal.current_amount >= goal.target_amount
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000)
            : null

          // Edit mode inline
          if (editing?.id === goal.id) {
            return (
              <div key={goal.id} style={styles.card}>
                <div style={styles.formGrid}>
                  <div style={styles.field}>
                    <label style={styles.label}>Goal Name</label>
                    <input style={styles.input} value={editing.name}
                      onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Target (AED)</label>
                    <input style={styles.input} type="number"
                      value={editing.target_amount}
                      onChange={e => setEditing(p => p && ({ ...p, target_amount: parseFloat(e.target.value) }))} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Deadline</label>
                    <input style={styles.input} type="date"
                      value={editing.deadline ?? ''}
                      onChange={e => setEditing(p => p && ({ ...p, deadline: e.target.value || undefined }))} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Color</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setEditing(p => p && ({ ...p, color: c }))}
                          style={{
                            width: 24, height: 24, borderRadius: '50%', background: c,
                            border: editing.color === c ? '3px solid #fff' : '3px solid transparent',
                            cursor: 'pointer',
                          }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setEditing(null)} style={styles.cancelBtn}>Cancel</button>
                  <button onClick={handleSaveEdit} style={styles.saveBtn}>Save</button>
                </div>
              </div>
            )
          }

          return (
            <div key={goal.id} style={{ ...styles.goalCard, borderLeft: `4px solid ${goal.color}` }}>
              <div style={styles.goalHeader}>
                <div>
                  <span style={styles.goalName}>{goal.name}</span>
                  {done && <span style={styles.doneTag}>🎉 Complete!</span>}
                  {daysLeft !== null && !done && (
                    <span style={{ ...styles.deadlineTag, color: daysLeft < 30 ? '#ef4444' : '#64748b' }}>
                      {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditing(goal)} style={styles.iconBtn}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(goal.id)} style={{ ...styles.iconBtn, color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {fmtAED(goal.current_amount)} saved
                </span>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {fmtAED(goal.target_amount)} target · {pct.toFixed(0)}%
                </span>
              </div>
              <div style={styles.barBg}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${pct}%`,
                  background: done ? '#22c55e' : goal.color,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                {fmtUSD(goal.current_amount)} / {fmtUSD(goal.target_amount)}
              </div>

              {/* Add/remove funds */}
              {!done && (
                <div style={styles.contribRow}>
                  <input
                    style={styles.contribInput}
                    type="number"
                    placeholder="AED amount (negative to remove)"
                    value={contrib[goal.id] ?? ''}
                    onChange={e => setContrib(p => ({ ...p, [goal.id]: e.target.value }))}
                  />
                  <button onClick={() => handleContrib(goal)} style={styles.contribBtn}>
                    Update
                  </button>
                </div>
              )}
            </div>
          )
        })}
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
  summary: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: 14, marginBottom: 24,
  },
  tile: {
    background: '#1e293b', borderRadius: 12, padding: '18px 22px',
    border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 4,
  },
  tileLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  tileValue: { fontSize: 22, fontWeight: 700 },
  tileUSD:   { fontSize: 12, color: '#475569' },

  card: {
    background: '#1e293b', borderRadius: 12, padding: '22px 24px',
    border: '1px solid #334155', marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field:     { display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 12, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase' },
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

  goalCard: {
    background: '#1e293b', borderRadius: 12, padding: '20px 24px',
    border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 10,
  },
  goalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalName:   { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginRight: 10 },
  doneTag:    { fontSize: 12, color: '#22c55e', fontWeight: 600 },
  deadlineTag:{ fontSize: 12, marginLeft: 8 },
  barBg:      { height: 12, borderRadius: 99, background: '#0f172a', overflow: 'hidden' },
  iconBtn: {
    background: 'transparent', border: 'none', color: '#475569',
    cursor: 'pointer', padding: 4,
  },
  contribRow:  { display: 'flex', gap: 8, marginTop: 4 },
  contribInput: {
    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155',
    background: '#0f172a', color: '#f1f5f9', fontSize: 14, outline: 'none',
  },
  contribBtn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#334155', color: '#cbd5e1', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
}
