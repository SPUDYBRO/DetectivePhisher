import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
}

export default defineConfig({
  plugins: [react(), svgr()],

  server: {
    port: 5173,
    headers: securityHeaders,
    proxy: {
      '/api': 'http://127.0.0.1:8000'
    }
  },

  preview: {
    headers: securityHeaders
  }
})