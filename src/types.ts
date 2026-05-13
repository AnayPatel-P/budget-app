/**
 * src/types.ts
 * Shared TypeScript interfaces for the whole app.
 */

export interface Transaction {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  date: string
}

export interface Budget {
  id: number
  category: string
  limit_amount: number
}

export interface CategorySpend {
  category: string
  spent: number
  limit: number
  percentage: number
}

export interface RecurringTransaction {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  day_of_month: number
}

export interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline?: string
  color: string
}

export interface NetWorthEntry {
  id: number
  name: string
  type: 'asset' | 'liability'
  amount: number
  category?: string
  updated_at: string
}

declare global {
  interface Window {
    api: {
      // Transactions
      getTransactions:   () => Promise<Transaction[]>
      addTransaction:    (tx: Omit<Transaction, 'id'>) => Promise<Transaction>
      updateTransaction: (tx: Transaction) => Promise<Transaction>
      deleteTransaction: (id: number) => Promise<{ success: boolean }>

      // Budgets
      getBudgets: () => Promise<Budget[]>
      setBudget:  (b: { category: string; limit_amount: number }) => Promise<{ success: boolean }>

      // Recurring
      getRecurring:    () => Promise<RecurringTransaction[]>
      addRecurring:    (r: Omit<RecurringTransaction, 'id'>) => Promise<RecurringTransaction>
      deleteRecurring: (id: number) => Promise<{ success: boolean }>

      // Goals
      getGoals:   () => Promise<Goal[]>
      addGoal:    (g: Omit<Goal, 'id'>) => Promise<Goal>
      updateGoal: (g: Goal) => Promise<Goal>
      deleteGoal: (id: number) => Promise<{ success: boolean }>

      // Net worth
      getNetWorth:         () => Promise<NetWorthEntry[]>
      addNetWorthEntry:    (e: Omit<NetWorthEntry, 'id' | 'updated_at'>) => Promise<NetWorthEntry>
      updateNetWorthEntry: (e: Omit<NetWorthEntry, 'updated_at'>) => Promise<NetWorthEntry>
      deleteNetWorthEntry: (id: number) => Promise<{ success: boolean }>
    }
  }
}
