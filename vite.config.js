import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set to your repo name (used for GitHub Pages base path)
const repo = 'aptella-reseller-portal';
const isPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: isPages ? `/${repo}/` : '/',  // important for GH Pages routing
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
