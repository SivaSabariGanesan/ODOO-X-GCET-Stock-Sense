import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // '@/' maps to src/ — use throughout the project instead of relative paths
      // e.g. import { cn } from '@/lib/cn'
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '127.0.0.1',
    port: 3000,
    // Proxy API requests to the Hono backend (Bun, port 8000)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    // Raise the chunk warning threshold slightly — enterprise dashboards
    // tend to be heavier than consumer apps
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react:  ['react', 'react-dom'],
          router: ['react-router-dom'],
          query:  ['@tanstack/react-query'],
          forms:  ['react-hook-form', 'zod'],
        },
      },
    },
  },
})
