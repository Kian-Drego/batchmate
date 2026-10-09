import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The site is served from the domain root (custom domain). If you ever deploy
  // to the default https://<user>.github.io/<repo>/ URL instead, change this to
  // '/<repo>/'.
  base: '/',
  server: {
    port: 5173,
    proxy: {
      // Proxy API + locally stored files to the Express server during dev.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
