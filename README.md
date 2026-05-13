# 💰 Budget App

A personal finance desktop app built with **Electron**, **React**, and **TypeScript**. Track your income and expenses, set monthly spending budgets, and visualise your finances — all stored locally on your machine. No accounts, no cloud, no subscriptions.

---

## Screenshots

> _Add screenshots here once you have the app running — drag images into this section on GitHub._

---

## Features

- **Dashboard** — summary cards for total income, expenses, and net balance, plus a bar chart of spending by category
- **Transactions** — searchable, filterable list of all entries with the ability to delete
- **Add Entry** — log income or expenses with category, amount, date, and description
- **Monthly Budgets** — set spending limits per category and track progress with colour-coded bars (green → orange → red)
- **Local SQLite database** — all data is stored on your machine in your OS app-data folder, never sent anywhere

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) |
| Frontend | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vitejs.dev/) + [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron) |
| Database | [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Lucide React](https://lucide.dev/) |

---

## Project Structure

```
budget-app/
├── electron/
│   ├── main.ts          # Electron main process — window, IPC handlers, SQLite
│   └── preload.ts       # Secure bridge exposing window.api to React
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Root component, navigation, shared state
│   ├── types.ts         # Shared TypeScript interfaces
│   └── components/
│       ├── Dashboard.tsx
│       ├── Transactions.tsx
│       ├── AddTransaction.tsx
│       └── Budget.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repo
git clone git@github.com:AnayPatel-P/budget-app.git
cd budget-app

# Install dependencies
npm install
```

### Run in development

```bash
npm run dev
```

Vite starts a dev server and launches the Electron window automatically. Hot-reload is enabled for the React frontend.

### Build for production

```bash
npm run build
```

Output is placed in the `release/` folder as a `.dmg` (Mac), `.exe` (Windows), or `.AppImage` (Linux).

---

## How It Works

Electron runs two processes:

- **Main process** (`electron/main.ts`) — Node.js environment. Creates the window, manages the SQLite database, and handles IPC (Inter-Process Communication) calls from the frontend.
- **Renderer process** (`src/`) — a standard React app running in a sandboxed browser context. It talks to the main process via `window.api`, which is securely exposed by the preload script.

```
React (renderer)
    ↓  window.api.getTransactions()
electron/preload.ts
    ↓  ipcRenderer.invoke('get-transactions')
electron/main.ts
    ↓  better-sqlite3 query
SQLite database (budget.db)
```

---

## Data Storage

The SQLite database (`budget.db`) is stored in your OS app-data directory — it is never included in the repository.

| OS | Location |
|---|---|
| macOS | `~/Library/Application Support/budget-app/budget.db` |
| Windows | `%APPDATA%\budget-app\budget.db` |
| Linux | `~/.config/budget-app/budget.db` |

---

## Roadmap

- [ ] CSV export
- [ ] Monthly breakdown charts
- [ ] Recurring transactions
- [ ] Light / dark theme toggle
- [ ] Multi-month budget history

---

## License

MIT — do whatever you like with it.
