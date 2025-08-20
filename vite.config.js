import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If your repo name changes, update the base path.
export default defineConfig({
  plugins: [react()],
  base: '/aptella-reseller-portal/',
})
