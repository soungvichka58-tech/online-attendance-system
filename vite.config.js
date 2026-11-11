import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the website calls the local platform through this proxy, so sign-in
// cookies are same-origin. Production builds call VITE_API_URL directly.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: process.env.DEV_API_PROXY || 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: process.env.DEV_WS_PROXY || 'ws://localhost:8081', ws: true, changeOrigin: true },
    },
  },
});
