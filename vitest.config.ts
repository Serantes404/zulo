import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'], exclude: ['node_modules', '.next'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // Next resuelve 'server-only' por dentro (no está en node_modules); en los tests es un módulo vacío.
      'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)),
    },
  },
});
