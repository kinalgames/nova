import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App'
import { installChunkRecovery } from './services/update'

// after a deploy the old hashed chunks are gone — reload once instead of
// stranding the user on a broken lazy import
installChunkRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
