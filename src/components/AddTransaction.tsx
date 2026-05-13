/**
 * src/components/AddTransaction.tsx
 *
 * A controlled form for adding new income or expense entries.
 *
 * "Controlled" means every input's value is stored in React state —
 * React is always the source of truth, not the DOM.
 */

import React, { useState } from 'react'
import { Transaction } from '../types'

// Preset categories — users can also type their own
const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Utilities', 'Other']
const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']

interface Props {
  onAdd: (tx: Omit<Transaction, 'id'>) => void
}

interface FormState {
  type: 'income' | 'expense'
  category: string
  customCategory: string
  amount: string
  description: string
  date: string
}

export default function AddTransaction({ onAdd }: Props) {
  const [form, setForm] = useState<FormState>({
    type: 'expense',
    category: '',
    customCategory: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // today's date
  })
  const [error, setError] = useState('')

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') {
        updated.category = ''
        updated.customCategory = ''
      }
      return updated
    })
    setError('')
  }

  function handleSubmit() {
    // Validation
    const finalCategory = form.category === 'Custom' ? form.customCategory : form.category
    if (!finalCategory) return setError('Please select or enter a category.')
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      return setError('Please enter a valid positive amount.')
    }
    if (!form.date) return setError('Please select a date.')

    onAdd({
      type: form.type,
      category: finalCategory,
      amount: parseFloat(parseFloat(form.amount).toFixed(2)),
      description: form.description || undefined,
      date: form.date,
    })

    // Reset the form
    setForm({
      type: 'expense',
      category: '',
      customCategory: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div>
      <h1 style={styles.heading}>Add Transaction</h1>

      <div style={styles.card}>
        {/* Type toggle */}
        <div style={styles.field}>
          <label style={styles.label}>Type</label>
          <div style={styles.toggle}>
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleChange('type', t)}
                style={{
                  ...styles.toggleBtn,
                  ...(form.type === t
                    ? { background: t === 'income' ? '#16a34a' : '#dc2626', color: '#fff' }
                    : {}),
                }}
              >
                {t === 'income' ? '+ Income' : '− Expense'}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select
            style={styles.select}
            value={form.category}
            onChange={e => handleChange('category', e.target.value)}
          >
            <option value="">Select a category…</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Custom">Custom…</option>
          </select>
        </div>

        {form.category === 'Custom' && (
          <div style={styles.field}>
            <label style={styles.label}>Custom Category</label>
            <input
              style={styles.input}
              placeholder="Enter category name"
              value={form.customCategory}
              onChange={e => handleChange('customCategory', e.target.value)}
            />
          </div>
        )}

        {/* Amount */}
        <div style={styles.field}>
          <label style={styles.label}>Amount (AED)</label>
          <input
            style={styles.input}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => handleChange('amount', e.target.value)}
          />
        </div>

        {/* Date */}
        <div style={styles.field}>
          <label style={styles.label}>Date</label>
          <input
            style={styles.input}
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
          />
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label style={styles.label}>Description (optional)</label>
          <input
            style={styles.input}
            placeholder="What was this for?"
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.submit} onClick={handleSubmit}>
          Add {form.type === 'income' ? 'Income' : 'Expense'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' },
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 32,
    maxWidth: 520,
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: 15,
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: 15,
    outline: 'none',
    cursor: 'pointer',
  },
  toggle: { display: 'flex', gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#f87171', fontSize: 13 },
  submit: {
    padding: '12px 0',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
}
