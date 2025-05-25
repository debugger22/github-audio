import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable gzip compression
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          styled: ['styled-components']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Use Terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        // Drop console logs in production
        drop_console: true,
        drop_debugger: true,
        // Additional optimizations
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        // Remove unused code
        dead_code: true,
        // Optimize conditionals
        conditionals: true,
        // Optimize comparisons
        comparisons: true,
        // Optimize sequences
        sequences: true,
        // Optimize booleans
        booleans: true
      },
      mangle: {
        // Mangle variable names for smaller size
        safari10: true
      },
      format: {
        // Remove comments
        comments: false
      }
    }
  },
  server: {
    // Add cache headers for development
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'styled-components']
  }
})
