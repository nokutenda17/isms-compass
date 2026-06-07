import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/(steps|risks|soa)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'ISMS Compass',
        short_name: 'ISMS',
        theme_color: '#1F3864',
        background_color: '#ffffff',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
