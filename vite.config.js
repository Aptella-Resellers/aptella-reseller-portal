import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT for GitHub Pages under a subpath:
export default defineConfig({
  base: '/aptella-reseller-portal/',
  plugins: [react()],
  build: {
    target: 'es2019'
  }
});
