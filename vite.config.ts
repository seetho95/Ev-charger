import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project at /Ev-charger/, not the domain root.
  // CI is set by GitHub Actions, so local dev/build still serve from "/".
  base: process.env.CI ? '/Ev-charger/' : '/',
})
