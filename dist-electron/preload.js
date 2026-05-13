"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // Transactions
  getTransactions: () => electron.ipcRenderer.invoke("get-transactions"),
  addTransaction: (tx) => electron.ipcRenderer.invoke("add-transaction", tx),
  updateTransaction: (tx) => electron.ipcRenderer.invoke("update-transaction", tx),
  deleteTransaction: (id) => electron.ipcRenderer.invoke("delete-transaction", id),
  // Budgets
  getBudgets: () => electron.ipcRenderer.invoke("get-budgets"),
  setBudget: (b) => electron.ipcRenderer.invoke("set-budget", b),
  // Recurring
  getRecurring: () => electron.ipcRenderer.invoke("get-recurring"),
  addRecurring: (r) => electron.ipcRenderer.invoke("add-recurring", r),
  deleteRecurring: (id) => electron.ipcRenderer.invoke("delete-recurring", id),
  // Goals
  getGoals: () => electron.ipcRenderer.invoke("get-goals"),
  addGoal: (g) => electron.ipcRenderer.invoke("add-goal", g),
  updateGoal: (g) => electron.ipcRenderer.invoke("update-goal", g),
  deleteGoal: (id) => electron.ipcRenderer.invoke("delete-goal", id),
  // Net worth
  getNetWorth: () => electron.ipcRenderer.invoke("get-net-worth"),
  addNetWorthEntry: (e) => electron.ipcRenderer.invoke("add-net-worth-entry", e),
  updateNetWorthEntry: (e) => electron.ipcRenderer.invoke("update-net-worth-entry", e),
  deleteNetWorthEntry: (id) => electron.ipcRenderer.invoke("delete-net-worth-entry", id)
});
