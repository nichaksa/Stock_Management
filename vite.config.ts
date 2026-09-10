import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/Stock_Management/' : '/',
  server: {
    port: 5176,
    host: true,
  },
  plugins: [react()],
}))
