import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Served from the domain root (custom domain batchmate.duckdns.org).
  base: '/',
  resolve: {
    alias: {
      // Runtime-neutral logic shared with the Supabase Edge Functions.
      '@shared': fileURLToPath(new URL('../supabase/functions/_shared', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'BatchMate — scholarships that fit you',
        short_name: 'BatchMate',
        description: 'Find scholarships you actually qualify for, track applications and prep for aptitude tests.',
        theme_color: '#f2eee7',
        background_color: '#f2eee7',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never cache API/auth traffic.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Mirror the production /api/edge proxy (see client/api/edge) so Edge
    // Function calls work from the Vite dev server too.
    proxy: {
      '/api/edge': {
        target: 'https://tresgtfjlqxrixitafjv.supabase.co/functions/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/edge/, ''),
      },
    },
  },
});
