import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // VOX backend (AI providers, GitHub proxy). Optional — frontend works without it.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // agent bridge WebSocket (dev)
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          prism: ['prismjs'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
