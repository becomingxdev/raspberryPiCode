import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No API proxy needed — frontend talks directly to the Raspberry Pi backend URL
// entered by the user at runtime (stored in localStorage).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // expose on local network so the laptop browser can access it
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
