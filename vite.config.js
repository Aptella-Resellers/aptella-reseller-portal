import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // IMPORTANT for GitHub Pages project sites:
  base: "/aptella-reseller-portal/",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
