import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy sends /api calls to the Express server so the browser sees one address.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
