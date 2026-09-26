import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ── Design system entry point (Tailwind + CSS custom properties + base resets)
import '@/styles/index.css'

import App from '@/app/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    '[StockSense] Could not find #root element. Check index.html.'
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
