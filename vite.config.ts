import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Strip all console.log/debugger from production bundle (no extra package needed)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['react-redux', '@reduxjs/toolkit'],
          'vendor-icons': ['lucide-react', 'react-icons'],
          'vendor-socket': ['socket.io-client'],
          // Heavy libs split into separate chunks — loaded only when the page that uses them loads
          'vendor-antd': ['antd'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-export': ['exceljs', 'jspdf'],
        },
      },
    },
  },
  esbuild: {
    // Drops all console.* and debugger statements in every build
    drop: ['console', 'debugger'],
  },
})
