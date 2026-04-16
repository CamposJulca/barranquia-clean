import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // base: la SPA se publica bajo /joz/ en producción (nginx).
  // VITE_BASENAME se inyecta en el Docker build; en dev queda '/'.
  base: process.env.VITE_BASENAME ? `${process.env.VITE_BASENAME}/` : '/',

  server: {
    // En dev, reenvía /api/ directamente al backend Django
    proxy: {
      '/api': 'http://localhost:8003',
    },
  },
})
