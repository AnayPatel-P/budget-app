/**
 * src/components/AmexImport.tsx
 *
 * Imports transactions from an American Express CSV statement.
 *
 * Amex CSV format (consistent globally including UAE):
 *   Date,Description,Amount
 *   01/15/2026,"CARREFOUR UAE",-234.50
 *   01/13/2026,"PAYMENT RECEIVED",5000.00
 *
 * Amounts:  negative = purchase/expense
 *           positive = payment or credit (treated as income)
 * Date:     MM/DD/YYYY
 */

import React, { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import { Transaction } from '../types'
import { fmtAED } from '../utils/currency'

interface Props {
  onClose: () => void
  onImport: (txs: Omit<Transaction, 'id'>[]) => void
}

// ─── Auto-categorisation rules ────────────────────────────────────────────
// keyword (lowercase) → category
const RULES: [RegExp, string][] = [
  // Food & groceries
  [/carrefour|spinneys|lulu|waitrose|choithrams|geant|union coop|viva|zoom supermar/i, 'Food'],
  [/restaurant|cafe|coffee|starbucks|mcdonalds|kfc|pizza|sushi|burger|grill|bistro|diner|eatery|talabat|zomato|deliveroo/i, 'Food'],
  // Transport
  [/uber|careem|taxi|rta|metro|bus fare|parking|salik|petrol|adnoc fuel|enoc|eppco/i, 'Transport'],
  // Shopping
  [/amazon|noon\.com|namshi|ounass|ikea|h&m|zara|pull.bear|bershka|gap|uniqlo|centrepoint|max fashion/i, 'Shopping'],
  // Entertainment
  [/netflix|spotify|apple.music|youtube|cinema|vox cinema|reel cinema|playstation|steam|ticketmaster|entertainment/i, 'Entertainment'],
  // Health
  [/pharmacy|aster|life pharmacy|boots|clinic|hospital|doctor|dentist|medical|health/i, 'Health'],
  // Utilities
  [/dewa|addc|sewa|etisalat|du telecom|virgin mobile|telecom|internet|utility|utilities/i, 'Utilities'],
  // Rent / housing
  [/rent|property|real estate|emaar|nakheel|aldar|ejari/i, 'Rent'],
  // Travel
  [/emirates airline|flydubai|air arabia|etihad|hotel|marriott|hilton|radisson|hyatt|airbnb|booking\.com|expedia/i, 'Travel'],
  // Income / payments
  [/payment received|payment thank|autopay|direct debit payment/i, 'Salary'],
]

function guessCategory(description: string): string {
  for (const [re, cat] of RULES) {
    if (re.test(description)) return cat
  }
  return 'Other'
}

// ─── CSV Parser ────────────────────────────────────────────────────────────
interface ParsedRow {
  date: string        // YYYY-MM-DD
  description: string
  amount: number      // always positive
  type: 'income' | 'expense'
  category: string
  selected: boolean
}

function parseAmexCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')

  // Find header row — skip any leading blank/meta lines Amex sometimes adds
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('date') && l.toLowerCase().includes('description')
  )
  if (headerIdx === -1) throw new Error('Could not find a header row with "Date" and "Description" columns.')

  const headers = splitCSVLine(lines[headerIdx]).map(h => h.trim().toLowerCase())
  const dateIdx   = headers.findIndex(h => h === 'date')
  const descIdx   = headers.findIndex(h => h.includes('description'))
  const amountIdx = headers.findIndex(h => h.includes('amount'))

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error('CSV must have Date, Description, and Amount columns.')
  }

  const rows: ParsedRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = splitCSVLine(line)
    if (cols.length <= amountIdx) continue

    const rawDate   = cols[dateIdx]?.trim() ?? ''
    const rawDesc   = cols[descIdx]?.trim().replace(/^"|"$/g, '') ?? ''
    const rawAmount = cols[amountIdx]?.trim().replace(/[,"]/g, '') ?? ''

    const amount = parseFloat(rawAmount)
    if (isNaN(amount) || !rawDate || !rawDesc) continue

    // Parse MM/DD/YYYY → YYYY-MM-DD
    const dateParsed = parseAmexDate(rawDate)
    if (!dateParsed) continue

    // Amex: negative = charge (expense), positive = payment/credit (income)
    const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense'
    const absAmount = Math.abs(amount)

    rows.push({
      date: dateParsed,
      description: rawDesc,
      amount: absAmount,
      type,
      category: guessCategory(rawDesc),
      selected: type === 'expense', // pre-select expenses, deselect payments
    })
  }

  if (rows.length === 0) throw new Error('No valid transactions found in this file.')
  return rows
}

function parseAmexDate(raw: string): string | null {
  // Amex UAE: DD/MM/YYYY or MM/DD/YYYY — detect by context
  // Try MM/DD/YYYY first (US Amex standard), fall back to DD/MM/YYYY
  const parts = raw.split('/')
  if (parts.length !== 3) return null

  let [a, b, year] = parts
  // If 'a' > 12, it must be a day (DD/MM/YYYY)
  const aNum = parseInt(a), bNum = parseInt(b)
  let month: number, day: number

  if (aNum > 12) {
    // DD/MM/YYYY
    day = aNum; month = bNum
  } else {
    // MM/DD/YYYY (standard Amex)
    month = aNum; day = bNum
  }

  if (isNaN(month) || isNaN(day) || !year) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Split a CSV line respecting quoted fields */
function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ─── Component ─────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Food','Rent','Transport','Entertainment','Health','Shopping','Utilities','Other','Travel']
const INCOME_CATEGORIES  = ['Salary','Freelance','Investment','Gift','Other']

export default function AmexImport({ onClose, onImport }: Props) {
  const [rows,    setRows]    = useState<ParsedRow[]>([])
  const [error,   setError]   = useState('')
  const [step,    setStep]    = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string
        const parsed = parseAmexCSV(text)
        setRows(parsed)
        setStep('preview')
      } catch (err: any) {
        setError(err.message ?? 'Failed to parse file.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  function toggleRow(i: number) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll() {
    const allSelected = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  function setCategory(i: number, cat: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, category: cat } : r))
  }

  function setType(i: number, type: 'income' | 'expense') {
    setRows(prev => prev.map((r, idx) =>
      idx === i ? { ...r, type, category: type === 'income' ? 'Salary' : 'Other' } : r
    ))
  }

  async function handleImport() {
    const selected = rows.filter(r => r.selected)
    if (selected.length === 0) return
    const txs: Omit<Transaction, 'id'>[] = selected.map(r => ({
      type: r.type,
      category: r.category,
      amount: r.amount,
      description: r.description,
      date: r.date,
    }))
    onImport(txs)
    setStep('done')
  }

  const selectedCount = rows.filter(r => r.selected).length
  const totalExpenses = rows.filter(r => r.selected && r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0)

  return (
    <div style={s.overlay}>
      <div style={s.box}>
        {/* Header */}
        <div style={s.header}>
          <span style={s.title}>
            {step === 'upload'  && '💳 Import Amex Statement'}
            {step === 'preview' && `Review ${rows.length} Transactions`}
            {step === 'done'    && '✅ Import Complete'}
          </span>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div style={s.uploadArea}>
            <div style={s.uploadIcon}><Upload size={36} color="#3b82f6" /></div>
            <p style={s.uploadTitle}>Select your Amex CSV file</p>
            <p style={s.uploadSub}>
              Download from <strong style={{ color: '#cbd5e1' }}>americanexpress.com</strong>
              {' '}→ Statements → Download → <strong style={{ color: '#cbd5e1' }}>CSV</strong>
            </p>
            <button
              style={s.browseBtn}
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              {loading ? 'Parsing…' : 'Choose File'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            {error && (
              <div style={s.errorBox}>
                <AlertCircle size={15} style={{ marginRight: 6, flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <>
            {/* Summary bar */}
            <div style={s.summaryBar}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {selectedCount} of {rows.length} selected
              </span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                Total expenses: <strong style={{ color: '#ef4444' }}>{fmtAED(totalExpenses)}</strong>
              </span>
              <button onClick={toggleAll} style={s.toggleAllBtn}>
                {rows.every(r => r.selected) ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Table */}
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>✓</th>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Description</th>
                    <th style={s.th}>Type</th>
                    <th style={s.th}>Category</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ ...s.tr, opacity: row.selected ? 1 : 0.35 }}>
                      <td style={s.td}>
                        <input type="checkbox" checked={row.selected}
                          onChange={() => toggleRow(i)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                        {row.date}
                      </td>
                      <td style={{ ...s.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={row.description}>
                        {row.description}
                      </td>
                      <td style={s.td}>
                        <select
                          style={{ ...s.miniSelect, color: row.type === 'income' ? '#22c55e' : '#ef4444' }}
                          value={row.type}
                          onChange={e => setType(i, e.target.value as 'income' | 'expense')}
                        >
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                        </select>
                      </td>
                      <td style={s.td}>
                        <select style={s.miniSelect} value={row.category}
                          onChange={e => setCategory(i, e.target.value)}>
                          {(row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
                            .map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600,
                        color: row.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {row.type === 'income' ? '+' : '−'}{fmtAED(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={s.actions}>
              <button onClick={() => { setStep('upload'); setRows([]) }} style={s.backBtn}>
                ← Back
              </button>
              <button
                onClick={handleImport}
                style={{ ...s.importBtn, opacity: selectedCount === 0 ? 0.4 : 1 }}
                disabled={selectedCount === 0}
              >
                Import {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div style={s.doneBox}>
            <Check size={48} color="#22c55e" />
            <p style={s.doneTitle}>
              {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} imported!
            </p>
            <p style={s.doneSub}>Your transactions are now in the list.</p>
            <button onClick={onClose} style={s.importBtn}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  box: {
    background: '#1e293b', borderRadius: 14, border: '1px solid #334155',
    width: '85vw', maxWidth: 860, maxHeight: '85vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #334155', flexShrink: 0,
  },
  title:    { fontSize: 17, fontWeight: 700, color: '#f1f5f9' },
  closeBtn: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 },

  uploadArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '60px 40px', flex: 1,
  },
  uploadIcon:  {},
  uploadTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  uploadSub:   { fontSize: 14, color: '#64748b', textAlign: 'center', margin: 0 },
  browseBtn: {
    padding: '11px 28px', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    marginTop: 8,
  },
  errorBox: {
    display: 'flex', alignItems: 'flex-start',
    background: '#450a0a', color: '#fca5a5', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginTop: 8, maxWidth: 480,
  },

  summaryBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: '#0f172a', borderBottom: '1px solid #334155',
    flexShrink: 0, flexWrap: 'wrap', gap: 8,
  },
  toggleAllBtn: {
    padding: '4px 12px', borderRadius: 6, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
  },

  tableWrap: { overflowY: 'auto', flex: 1 },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', textAlign: 'left', fontSize: 11,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
    background: '#1e293b', borderBottom: '1px solid #334155',
    position: 'sticky', top: 0,
  },
  tr: { borderBottom: '1px solid #1a2744' },
  td: { padding: '10px 14px', fontSize: 13, color: '#cbd5e1', background: '#0f172a' },

  miniSelect: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 5,
    color: '#cbd5e1', fontSize: 12, padding: '3px 6px', cursor: 'pointer', outline: 'none',
  },

  actions: {
    display: 'flex', gap: 10, padding: '16px 24px',
    borderTop: '1px solid #334155', flexShrink: 0,
  },
  backBtn: {
    padding: '10px 20px', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#94a3b8', fontSize: 14, cursor: 'pointer',
  },
  importBtn: {
    flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },

  doneBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '60px 40px',
  },
  doneTitle: { fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  doneSub:   { fontSize: 14, color: '#64748b', margin: 0 },
}
