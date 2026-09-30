import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/arduino-mobile-lab/',
  plugins: [react()],
})
