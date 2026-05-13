/**
 * electron/main.ts
 * Backend of the desktop app — creates the window and handles all DB access via IPC.
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'

// ─── Database Setup ────────────────────────────────────────────────────────
const dbPath = path.join(app.getPath('userData'), 'budget.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    category    TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    description TEXT,
    date        TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    category     TEXT    NOT NULL UNIQUE,
    limit_amount REAL    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recurring_transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT    NOT NULL CHECK(type IN ('income','expense')),
    category     TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    description  TEXT,
    day_of_month INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    target_amount  REAL    NOT NULL,
    current_amount REAL    NOT NULL DEFAULT 0,
    deadline       TEXT,
    color          TEXT    NOT NULL DEFAULT '#3b82f6'
  );

  CREATE TABLE IF NOT EXISTS net_worth_entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('asset','liability')),
    amount     REAL NOT NULL,
    category   TEXT,
    updated_at TEXT NOT NULL
  );
`)

// ─── Transactions ──────────────────────────────────────────────────────────
ipcMain.handle('get-transactions', () =>
  db.prepare('SELECT * FROM transactions ORDER BY date DESC').all()
)

ipcMain.handle('add-transaction', (_event, tx) => {
  const result = db.prepare(
    'INSERT INTO transactions (type, category, amount, description, date) VALUES (?, ?, ?, ?, ?)'
  ).run(tx.type, tx.category, tx.amount, tx.description ?? null, tx.date)
  return { id: Number(result.lastInsertRowid), ...tx }
})

ipcMain.handle('update-transaction', (_event, tx) => {
  db.prepare(
    'UPDATE transactions SET type=?, category=?, amount=?, description=?, date=? WHERE id=?'
  ).run(tx.type, tx.category, tx.amount, tx.description ?? null, tx.date, tx.id)
  return tx
})

ipcMain.handle('delete-transaction', (_event, id: number) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
  return { success: true }
})

// ─── Budgets ───────────────────────────────────────────────────────────────
ipcMain.handle('get-budgets', () =>
  db.prepare('SELECT * FROM budgets').all()
)

ipcMain.handle('set-budget', (_event, { category, limit_amount }) => {
  db.prepare(
    'INSERT INTO budgets (category, limit_amount) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET limit_amount = excluded.limit_amount'
  ).run(category, limit_amount)
  return { success: true }
})

// ─── Recurring Transactions ────────────────────────────────────────────────
ipcMain.handle('get-recurring', () =>
  db.prepare('SELECT * FROM recurring_transactions ORDER BY day_of_month').all()
)

ipcMain.handle('add-recurring', (_event, r) => {
  const result = db.prepare(
    'INSERT INTO recurring_transactions (type, category, amount, description, day_of_month) VALUES (?, ?, ?, ?, ?)'
  ).run(r.type, r.category, r.amount, r.description ?? null, r.day_of_month)
  return { id: Number(result.lastInsertRowid), ...r }
})

ipcMain.handle('delete-recurring', (_event, id: number) => {
  db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id)
  return { success: true }
})

// ─── Goals ────────────────────────────────────────────────────────────────
ipcMain.handle('get-goals', () =>
  db.prepare('SELECT * FROM goals').all()
)

ipcMain.handle('add-goal', (_event, g) => {
  const result = db.prepare(
    'INSERT INTO goals (name, target_amount, current_amount, deadline, color) VALUES (?, ?, ?, ?, ?)'
  ).run(g.name, g.target_amount, g.current_amount ?? 0, g.deadline ?? null, g.color ?? '#3b82f6')
  return { id: Number(result.lastInsertRowid), current_amount: 0, color: '#3b82f6', ...g }
})

ipcMain.handle('update-goal', (_event, g) => {
  db.prepare(
    'UPDATE goals SET name=?, target_amount=?, current_amount=?, deadline=?, color=? WHERE id=?'
  ).run(g.name, g.target_amount, g.current_amount, g.deadline ?? null, g.color, g.id)
  return g
})

ipcMain.handle('delete-goal', (_event, id: number) => {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
  return { success: true }
})

// ─── Net Worth ─────────────────────────────────────────────────────────────
ipcMain.handle('get-net-worth', () =>
  db.prepare('SELECT * FROM net_worth_entries ORDER BY type, name').all()
)

ipcMain.handle('add-net-worth-entry', (_event, e) => {
  const now = new Date().toISOString()
  const result = db.prepare(
    'INSERT INTO net_worth_entries (name, type, amount, category, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(e.name, e.type, e.amount, e.category ?? null, now)
  return { id: Number(result.lastInsertRowid), updated_at: now, ...e }
})

ipcMain.handle('update-net-worth-entry', (_event, e) => {
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE net_worth_entries SET name=?, type=?, amount=?, category=?, updated_at=? WHERE id=?'
  ).run(e.name, e.type, e.amount, e.category ?? null, now, e.id)
  return { ...e, updated_at: now }
})

ipcMain.handle('delete-net-worth-entry', (_event, id: number) => {
  db.prepare('DELETE FROM net_worth_entries WHERE id = ?').run(id)
  return { success: true }
})

// ─── Window ────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
