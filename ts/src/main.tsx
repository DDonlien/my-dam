import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installElectronFileSystem } from './lib/electronFileSystem.ts'

// Activate Electron API bridge polyfill if running inside Electron wrapper
installElectronFileSystem()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

