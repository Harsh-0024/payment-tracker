import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RecoveryGate from './Recovery'
import './theme'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RecoveryGate>
      <App />
    </RecoveryGate>
  </StrictMode>,
)