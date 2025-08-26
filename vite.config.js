// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: for a repo served at https://<org>.github.io/aptella-reseller-portal/
// base MUST be "/aptella-reseller-portal/"
export default defineConfig({
  base: '/aptella-reseller-portal/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
})
