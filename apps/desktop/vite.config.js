import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'events', 'path', 'fs'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  server: {
    port: 3000
  }
});
