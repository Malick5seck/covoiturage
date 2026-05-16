import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfirmDialogProvider } from './context/ConfirmDialogContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </ThemeProvider>
  </StrictMode>,
)