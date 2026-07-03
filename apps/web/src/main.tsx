import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// self-hosted fonts (OFL) — bundled by Vite, no third-party font CDN
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
// Geist Sans is the identity face (latin only). Vietnamese glyphs it lacks
// fall through PER-GLYPH to Be Vietnam Pro (a vi-native sans that harmonizes
// with Geist) instead of Segoe UI, so mixed vi+latin words stay coherent.
// Geist Mono ships vietnamese itself — no fallback needed there.
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
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
