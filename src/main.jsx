import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Auto update the service worker
console.log('PWA: Registering Service Worker...');
registerSW({
  immediate: true,
  onRegistered(r) { console.log('PWA: SW Registered', r); },
  onRegisterError(e) { console.error('PWA: SW Register Error', e); }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
