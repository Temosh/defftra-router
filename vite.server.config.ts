import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/cli/index.ts',
    outDir: 'dist',
    emptyOutDir: false,
    minify: 'esbuild',
    rolldownOptions: {
      output: {
        entryFileNames: 'defftra-router.mjs',
        codeSplitting: false,
      },
    },
  },
});
