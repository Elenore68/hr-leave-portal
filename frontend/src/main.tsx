import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { loadConfig } from './lib/config'

const root = createRoot(document.getElementById('root')!)

loadConfig()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err: unknown) => {
    root.render(
      <div className="flex min-h-screen items-center justify-center p-6">
        <div role="alert" className="max-w-md rounded-3xl bg-white p-8 shadow-soft">
          <h1 className="mb-2 text-lg font-semibold text-primary">Configuration problem</h1>
          <p className="text-sm text-secondary">
            {err instanceof Error ? err.message : 'Could not load configuration.'}
          </p>
        </div>
      </div>,
    )
  })
