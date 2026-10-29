import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'safari15', chunkSizeWarningLimit: 650 },
  server: { port: 5173, strictPort: true },
});
