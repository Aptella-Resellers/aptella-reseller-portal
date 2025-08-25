import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/aptella-reseller-portal/',   // keep this for GH Pages
  plugins: [react()],
  optimizeDeps: {
    include: ['leaflet', 'leaflet.markercluster']
  }
})
