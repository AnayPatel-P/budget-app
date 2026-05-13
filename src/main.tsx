/**
 * src/main.tsx
 *
 * React's entry point. It mounts the <App /> component
 * into the <div id="root"> in index.html.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode renders components twice in dev to catch bugs early
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
