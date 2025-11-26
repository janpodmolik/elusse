import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: '/elusse/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Phaser is ~1.2MB minified - this is expected for a full game engine
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Phaser into its own chunk for better caching
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
