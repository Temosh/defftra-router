import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: 'src/ui',
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: false,
  },
  server: {
    host: '127.0.0.1',
  },
});
