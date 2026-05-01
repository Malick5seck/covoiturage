import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true   // Ouvre le navigateur automatiquement au démarrage
    // open: 'edge'  // Si tu veux forcer Microsoft Edge spécifiquement
  }
})