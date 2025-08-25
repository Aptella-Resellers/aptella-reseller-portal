import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: set your GitHub Pages base to the repo name:
const base = '/aptella-reseller-portal/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
})
