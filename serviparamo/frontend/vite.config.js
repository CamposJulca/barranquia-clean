import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // base: la SPA se publica bajo /serviparamo/ en producción (nginx).
  // En dev (npm run dev) Vite sirve en localhost:5173/serviparamo/.
  base: '/serviparamo/',

  server: {
    // En dev, reenvía /api/ directamente al backend Django
    proxy: {
      '/api': 'http://localhost:8005',
    },
  },
})
