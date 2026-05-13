/**
 * electron/preload.ts
 * Secure bridge: exposes exactly the IPC methods React is allowed to call.
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Transactions
  getTransactions:   () => ipcRenderer.invoke('get-transactions'),
  addTransaction:    (tx: any) => ipcRenderer.invoke('add-transaction', tx),
  updateTransaction: (tx: any) => ipcRenderer.invoke('update-transaction', tx),
  deleteTransaction: (id: number) => ipcRenderer.invoke('delete-transaction', id),

  // Budgets
  getBudgets: () => ipcRenderer.invoke('get-budgets'),
  setBudget:  (b: any) => ipcRenderer.invoke('set-budget', b),

  // Recurring
  getRecurring:    () => ipcRenderer.invoke('get-recurring'),
  addRecurring:    (r: any) => ipcRenderer.invoke('add-recurring', r),
  deleteRecurring: (id: number) => ipcRenderer.invoke('delete-recurring', id),

  // Goals
  getGoals:   () => ipcRenderer.invoke('get-goals'),
  addGoal:    (g: any) => ipcRenderer.invoke('add-goal', g),
  updateGoal: (g: any) => ipcRenderer.invoke('update-goal', g),
  deleteGoal: (id: number) => ipcRenderer.invoke('delete-goal', id),

  // Net worth
  getNetWorth:         () => ipcRenderer.invoke('get-net-worth'),
  addNetWorthEntry:    (e: any) => ipcRenderer.invoke('add-net-worth-entry', e),
  updateNetWorthEntry: (e: any) => ipcRenderer.invoke('update-net-worth-entry', e),
  deleteNetWorthEntry: (id: number) => ipcRenderer.invoke('delete-net-worth-entry', id),
})
