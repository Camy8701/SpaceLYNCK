import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  server: {
    host: '0.0.0.0', // Listen on all addresses including LAN and public
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true // Allow ALL hosts (Vite 6 syntax)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'query-vendor': ['@tanstack/react-query'],
          'date-vendor': ['date-fns'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
});