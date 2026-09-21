import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@tracepad/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@tracepad/headless': fileURLToPath(new URL('./packages/headless/src/index.ts', import.meta.url)),
      '@tracepad/elements': fileURLToPath(new URL('./packages/elements/src/index.ts', import.meta.url))
    }
  },
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    environment: 'node'
  }
});
