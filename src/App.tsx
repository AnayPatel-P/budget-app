/**
 * src/App.tsx
 * Root component — manages routing, top-level data, and passes props down.
 */

import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, PieChart, Target, TrendingUp,
} from 'lucide-react'
import { Transaction, Budget } from './types'
import Dashboard    from './components/Dashboard'
import Transactions from './components/Transactions'
import AddTransaction from './components/AddTransaction'
import BudgetPage   from './components/Budget'
import GoalsPage    from './components/Goals'
import NetWorthPage from './components/NetWorth'

type Page = 'dashboard' | 'transactions' | 'add' | 'budget' | 'goals' | 'networth'

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={20} /> },
  { id: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={20} /> },
  { id: 'add',          label: 'Add Entry',    icon: <PlusCircle size={20} /> },
  { id: 'budget',       label: 'Budgets',      icon: <PieChart size={20} /> },
  { id: 'goals',        label: 'Goals',        icon: <Target size={20} /> },
  { id: 'networth',     label: 'Net Worth',    icon: <TrendingUp size={20} /> },
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])

  useEffect(() => {
    loadAll()
    const handler = (e: Event) => {
      const tx = (e as CustomEvent).detail
      setTransactions(prev => [tx, ...prev])
    }
    window.addEventListener('tx-added', handler)
    return () => window.removeEventListener('tx-added', handler)
  }, [])

  async function loadAll() {
    const [txs, bgs] = await Promise.all([
      window.api.getTransactions(),
      window.api.getBudgets(),
    ])
    setTransactions(txs)
    setBudgets(bgs)
  }

  async function handleAddTransaction(tx: Omit<Transaction, 'id'>) {
    const saved = await window.api.addTransaction(tx)
    setTransactions(prev => [saved, ...prev])
    setPage('transactions')
  }

  async function handleUpdateTransaction(tx: Transaction) {
    const updated = await window.api.updateTransaction(tx)
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  async function handleDeleteTransaction(id: number) {
    await window.api.deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function handleSetBudget(category: string, limit: number) {
    await window.api.setBudget({ category, limit_amount: limit })
    await loadAll()
  }

  return (
    <div style={styles.shell}>
      {/* ── Sidebar ── */}
      <nav style={styles.sidebar}>
        <div style={styles.logo}>💰 BudgetApp</div>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{ ...styles.navBtn, ...(page === item.id ? styles.navBtnActive : {}) }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main style={styles.content}>
        {page === 'dashboard' && (
          <Dashboard transactions={transactions} budgets={budgets} />
        )}
        {page === 'transactions' && (
          <Transactions
            transactions={transactions}
            onUpdate={handleUpdateTransaction}
            onDelete={handleDeleteTransaction}
          />
        )}
        {page === 'add' && (
          <AddTransaction onAdd={handleAddTransaction} />
        )}
        {page === 'budget' && (
          <BudgetPage
            transactions={transactions}
            budgets={budgets}
            onSetBudget={handleSetBudget}
          />
        )}
        {page === 'goals'    && <GoalsPage />}
        {page === 'networth' && <NetWorthPage />}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    width: 220,
    background: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 12px',
    gap: 4,
    flexShrink: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    padding: '0 12px 24px',
    letterSpacing: '-0.5px',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  navBtnActive: { background: '#3b82f6', color: '#ffffff' },
  content: { flex: 1, overflowY: 'auto', padding: 32 },
}
