/**
 * src/components/Dashboard.tsx
 * Home screen: summary cards, 6-month trends chart, and category pie + bar charts.
 */

import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { Transaction, Budget } from '../types'
import { fmtAED, fmtUSD } from '../utils/currency'

interface Props {
  transactions: Transaction[]
  budgets: Budget[]
}

const COLORS = ['#3b82f6','#22c55e','#f97316','#a855f7','#ec4899','#14b8a6','#f59e0b','#ef4444']

export default function Dashboard({ transactions, budgets }: Props) {

  // ── Summary totals ──────────────────────────────────────────────────────
  const { income, expenses, byCategory } = useMemo(() => {
    let income = 0, expenses = 0
    const byCategory: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'income') {
        income += tx.amount
      } else {
        expenses += tx.amount
        byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount
      }
    }
    return {
      income,
      expenses,
      byCategory: Object.entries(byCategory)
        .map(([category, spent]) => ({ category, spent: parseFloat(spent.toFixed(2)) }))
        .sort((a, b) => b.spent - a.spent),
    }
  }, [transactions])

  const balance = income - expenses

  // ── 6-month trends ──────────────────────────────────────────────────────
  const trends = useMemo(() => {
    const months: { label: string; year: number; month: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      })
    }
    return months.map(({ label, year, month }) => {
      let inc = 0, exp = 0
      for (const tx of transactions) {
        const d = new Date(tx.date + 'T00:00:00')
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (tx.type === 'income') inc += tx.amount
          else exp += tx.amount
        }
      }
      return { label, income: parseFloat(inc.toFixed(2)), expenses: parseFloat(exp.toFixed(2)) }
    })
  }, [transactions])

  // ── Pie data (top 7 + Other) ────────────────────────────────────────────
  const pieData = useMemo(() => {
    if (byCategory.length === 0) return []
    const top = byCategory.slice(0, 7)
    const rest = byCategory.slice(7).reduce((s, c) => s + c.spent, 0)
    return rest > 0 ? [...top, { category: 'Other', spent: rest }] : top
  }, [byCategory])

  return (
    <div>
      <h1 style={styles.heading}>Dashboard</h1>

      {/* ── Summary Cards ── */}
      <div style={styles.cards}>
        <SummaryCard label="Total Income"   value={income}   color="#22c55e" />
        <SummaryCard label="Total Expenses" value={expenses} color="#ef4444" />
        <SummaryCard
          label="Net Balance"
          value={balance}
          color={balance >= 0 ? '#3b82f6' : '#f97316'}
        />
      </div>

      {transactions.length === 0 && (
        <p style={{ color: '#64748b', marginTop: 40, textAlign: 'center' }}>
          No transactions yet. Add one to get started!
        </p>
      )}

      {/* ── 6-Month Trends ── */}
      {transactions.length > 0 && (
        <div style={styles.chartBox}>
          <h2 style={styles.subheading}>6-Month Trends</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}
                tickFormatter={v => `AED ${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(v: number, name: string) => [fmtAED(v), name]}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="income"   name="Income"   fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Category Charts ── */}
      {byCategory.length > 0 && (
        <div style={styles.row}>
          {/* Bar: spending by category */}
          <div style={{ ...styles.chartBox, flex: 1 }}>
            <h2 style={styles.subheading}>Spending by Category</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(v: number) => [fmtAED(v), 'Spent']}
                />
                <Bar dataKey="spent" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie: expense breakdown */}
          <div style={{ ...styles.chartBox, width: 340, flexShrink: 0 }}>
            <h2 style={styles.subheading}>Expense Breakdown</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="spent"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number, name: string) => [fmtAED(v), name]}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardLabel}>{label}</span>
      <span style={{ ...styles.cardValue, color }}>{fmtAED(value)}</span>
      <span style={styles.cardUSD}>{fmtUSD(value)}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heading:    { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' },
  subheading: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#cbd5e1' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    border: '1px solid #334155',
  },
  cardLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { fontSize: 26, fontWeight: 700 },
  cardUSD:   { fontSize: 12, color: '#475569' },
  chartBox: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 24,
    border: '1px solid #334155',
    marginBottom: 16,
  },
  row: { display: 'flex', gap: 16, alignItems: 'flex-start' },
}
