/**
 * src/components/Budget.tsx
 *
 * Monthly budgets with:
 * - Month picker (browse historical months)
 * - Salary + end-of-month projection with savings rate
 * - 80%+ warning badges on category rows
 */

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Transaction, Budget } from '../types'
import { fmtAED, fmtUSD } from '../utils/currency'

interface Props {
  transactions: Transaction[]
  budgets: Budget[]
  onSetBudget: (category: string, limit: number) => void
}

const SALARY_KEY = 'budget_app_monthly_salary'

export default function BudgetPage({ transactions, budgets, onSetBudget }: Props) {
  const [editCategory, setEditCategory] = useState('')
  const [editLimit, setEditLimit] = useState('')

  // Salary persisted in localStorage
  const [salaryInput, setSalaryInput] = useState(() => localStorage.getItem(SALARY_KEY) ?? '')
  const salary = parseFloat(salaryInput) || 0
  function handleSaveSalary() {
    if (salary > 0) localStorage.setItem(SALARY_KEY, String(salary))
  }

  // Month picker — default to current month
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())   // 0-based

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    // Don't navigate past the current month
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  // Spending for selected month
  const spendByCategory = useMemo(() => {
    const result: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue
      const d = new Date(tx.date + 'T00:00:00')
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        result[tx.category] = (result[tx.category] ?? 0) + tx.amount
      }
    }
    return result
  }, [transactions, viewMonth, viewYear])

  const allCategories = useMemo(() => {
    const fromBudgets = budgets.map(b => b.category)
    const fromSpend   = Object.keys(spendByCategory)
    return [...new Set([...fromBudgets, ...fromSpend])].sort()
  }, [budgets, spendByCategory])

  // Projection (only meaningful for current month)
  const projection = useMemo(() => {
    const totalDays  = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysPassed = isCurrentMonth ? today.getDate() : totalDays
    const totalBudgeted = budgets.reduce((s, b) => s + b.limit_amount, 0)
    const totalSpent    = Object.values(spendByCategory).reduce((s, v) => s + v, 0)
    const dailyRate     = daysPassed > 0 ? totalSpent / daysPassed : 0
    const projectedSpend = isCurrentMonth ? dailyRate * totalDays : totalSpent
    const savingsRate   = salary > 0 ? ((salary - totalSpent) / salary) * 100 : null

    return {
      totalDays, daysPassed, totalBudgeted, totalSpent,
      projectedSpend,
      budgetHeadroom:    salary - totalBudgeted,
      projectedLeftover: salary - projectedSpend,
      savingsRate,
    }
  }, [budgets, spendByCategory, salary, isCurrentMonth, viewYear, viewMonth])

  function handleSaveBudget() {
    const limit = parseFloat(editLimit)
    if (!editCategory || isNaN(limit) || limit <= 0) return
    onSetBudget(editCategory, limit)
    setEditCategory('')
    setEditLimit('')
  }

  return (
    <div>
      <h1 style={styles.heading}>Monthly Budgets</h1>

      {/* ── Salary ── */}
      <div style={styles.salaryRow}>
        <span style={styles.salaryLabel}>Monthly Salary</span>
        <input
          style={{ ...styles.input, width: 200, flex: 'none' }}
          type="number" min="0" step="100" placeholder="Enter salary (AED)"
          value={salaryInput}
          onChange={e => setSalaryInput(e.target.value)}
          onBlur={handleSaveSalary}
        />
        {salary > 0 && <span style={styles.salaryUSD}>{fmtUSD(salary)} / mo</span>}
      </div>

      {/* ── Month Picker ── */}
      <div style={styles.monthPicker}>
        <button onClick={prevMonth} style={styles.monthBtn}><ChevronLeft size={18} /></button>
        <span style={styles.monthLabel}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ ...styles.monthBtn, opacity: isCurrentMonth ? 0.3 : 1 }}
          disabled={isCurrentMonth}>
          <ChevronRight size={18} />
        </button>
        {!isCurrentMonth && (
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}
            style={styles.todayBtn}>
            Today
          </button>
        )}
      </div>

      {/* ── Projection Card ── */}
      {salary > 0 && (
        <div style={styles.projCard}>
          <h2 style={styles.projTitle}>📊 {isCurrentMonth ? 'Month Projection' : 'Month Summary'}</h2>
          <div style={styles.projGrid}>
            <ProjRow label="Monthly Salary"    aed={salary}  color="#f1f5f9" />
            <ProjRow label={`Total budgeted (${budgets.length} categories)`}
              aed={-projection.totalBudgeted} color="#94a3b8" />
            <div style={styles.divider} />
            <ProjRow label="Budget headroom" aed={projection.budgetHeadroom}
              color={projection.budgetHeadroom >= 0 ? '#22c55e' : '#ef4444'} bold />

            <div style={{ height: 8 }} />

            <ProjRow
              label={isCurrentMonth
                ? `Spent so far (day ${projection.daysPassed} / ${projection.totalDays})`
                : 'Total spent'}
              aed={-projection.totalSpent} color="#94a3b8" />

            {isCurrentMonth && (
              <ProjRow label="Projected total (current pace)"
                aed={-projection.projectedSpend} color="#f97316" />
            )}
            <div style={styles.divider} />
            <ProjRow
              label={isCurrentMonth ? 'Projected end-of-month leftover' : 'Leftover'}
              aed={projection.projectedLeftover}
              color={projection.projectedLeftover >= 0 ? '#22c55e' : '#ef4444'}
              bold large />

            {projection.savingsRate !== null && (
              <div style={styles.savingsRate}>
                💰 Savings rate so far:{' '}
                <strong style={{ color: projection.savingsRate >= 20 ? '#22c55e' : projection.savingsRate >= 0 ? '#f97316' : '#ef4444' }}>
                  {projection.savingsRate.toFixed(1)}%
                </strong>
                <span style={{ color: '#475569', fontSize: 12, marginLeft: 8 }}>
                  (target: 20%+)
                </span>
              </div>
            )}
          </div>

          {isCurrentMonth && salary > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Spending pace vs salary</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {((projection.projectedSpend / salary) * 100).toFixed(0)}% of salary
                </span>
              </div>
              <div style={styles.barBg}>
                <div style={{
                  ...styles.barFill,
                  width: `${Math.min((projection.projectedSpend / salary) * 100, 100)}%`,
                  background: projection.projectedLeftover < 0 ? '#ef4444'
                    : projection.projectedSpend / salary > 0.85 ? '#f97316' : '#22c55e',
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Set Budget Form ── */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="Category (e.g. Food)"
          value={editCategory}
          onChange={e => setEditCategory(e.target.value)}
          list="category-suggestions"
        />
        <datalist id="category-suggestions">
          {allCategories.map(c => <option key={c} value={c} />)}
        </datalist>
        <input
          style={{ ...styles.input, width: 140, flex: 'none' }}
          type="number" min="1" step="1" placeholder="Limit (AED)"
          value={editLimit}
          onChange={e => setEditLimit(e.target.value)}
        />
        <button style={styles.saveBtn} onClick={handleSaveBudget}>Set Budget</button>
      </div>

      {/* ── Budget Rows ── */}
      <div style={styles.list}>
        {allCategories.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
            No categories yet. Add transactions or set a budget above.
          </p>
        )}

        {allCategories.map(category => {
          const budget = budgets.find(b => b.category === category)
          const spent  = spendByCategory[category] ?? 0
          const limit  = budget?.limit_amount ?? 0
          const pct    = limit > 0 ? (spent / limit) * 100 : 0
          const over   = limit > 0 && spent > limit
          const warn   = !over && pct >= 80

          return (
            <div key={category} style={styles.row}>
              <div style={styles.rowHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.catName}>{category}</span>
                  {over && <span style={styles.tagRed}>Over budget</span>}
                  {warn && <span style={styles.tagOrange}>⚠ {pct.toFixed(0)}%</span>}
                </div>
                <span style={{ color: over ? '#ef4444' : '#94a3b8', fontSize: 14, textAlign: 'right' }}>
                  {fmtAED(spent)}{limit > 0 ? ` / ${fmtAED(limit)}` : ' (no limit)'}
                  <br />
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    {fmtUSD(spent)}{limit > 0 ? ` / ${fmtUSD(limit)}` : ''}
                  </span>
                </span>
              </div>

              {limit > 0 && (
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.barFill,
                    width: `${Math.min(pct, 100)}%`,
                    background: over ? '#ef4444' : pct > 75 ? '#f97316' : '#22c55e',
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjRow({ label, aed, color, bold, large }: {
  label: string; aed: number; color: string; bold?: boolean; large?: boolean
}) {
  const sign = aed < 0 ? '−' : ''
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#64748b', flex: 1 }}>{label}</span>
      <span style={{ fontSize: large ? 16 : 14, fontWeight: bold ? 700 : 400, color, whiteSpace: 'nowrap' }}>
        {sign}{fmtAED(Math.abs(aed))}
        <span style={{ fontSize: 11, color: '#475569', marginLeft: 6 }}>
          {sign}{fmtUSD(Math.abs(aed))}
        </span>
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' },

  salaryRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  salaryLabel: { fontSize: 14, fontWeight: 600, color: '#cbd5e1', minWidth: 130 },
  salaryUSD: { fontSize: 13, color: '#475569' },

  monthPicker: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  monthBtn: {
    background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  monthLabel: { fontSize: 16, fontWeight: 600, color: '#f1f5f9', minWidth: 180, textAlign: 'center' },
  todayBtn: {
    padding: '5px 12px', borderRadius: 6, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 12, cursor: 'pointer', marginLeft: 4,
  },

  projCard: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, padding: '20px 24px', marginBottom: 28,
  },
  projTitle: { fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 },
  projGrid:  { display: 'flex', flexDirection: 'column', gap: 10 },
  divider:   { borderTop: '1px solid #334155', margin: '2px 0' },
  savingsRate: { marginTop: 12, fontSize: 14, color: '#94a3b8', paddingTop: 10, borderTop: '1px solid #334155' },

  form: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 8,
    border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9',
    fontSize: 14, outline: 'none',
  },
  saveBtn: {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    background: '#1e293b', borderRadius: 12, padding: '18px 22px',
    border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 10,
  },
  rowHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catName:   { fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  tagRed:    { fontSize: 11, fontWeight: 600, background: '#450a0a', color: '#fca5a5', padding: '2px 8px', borderRadius: 99 },
  tagOrange: { fontSize: 11, fontWeight: 600, background: '#431407', color: '#fb923c', padding: '2px 8px', borderRadius: 99 },
  barBg:     { height: 10, borderRadius: 99, background: '#0f172a', overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
}
