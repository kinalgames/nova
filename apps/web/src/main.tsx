import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// self-hosted fonts (OFL) — bundled by Vite, no third-party font CDN
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
// Inter is the identity face for body text — it ships full Vietnamese
// coverage natively, so mixed vi+latin prose never falls back per-glyph to a
// second typeface mid-word. Geist Mono ships vietnamese itself and stays for code.
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
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
