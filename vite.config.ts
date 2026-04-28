import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  /** Иконки и прочие ассеты лежат в корневом `public/` (рядом с legacy), не в `renderer/public`. */
  publicDir: path.resolve(__dirname, 'public'),
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer/src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'renderer-build'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/recharts/') || id.includes('/chart.js/')) return 'charts-vendor';
            if (id.includes('/radix-ui/') || id.includes('/@radix-ui/')) return 'radix-vendor';
            if (id.includes('/lucide-react/')) return 'icons-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    // Needed for Telegram Mini App access via temporary tunnel domains.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
