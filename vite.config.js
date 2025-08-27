import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/aptella-reseller-portal/',   // <-- important for GitHub Pages
  plugins: [react()],
})
