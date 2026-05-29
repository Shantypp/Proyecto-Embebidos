import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SmartHomeProvider } from './context/SmartHomeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SmartHomeProvider>
      <App />
    </SmartHomeProvider>
  </StrictMode>,
)
