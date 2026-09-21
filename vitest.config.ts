import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@tracepad/core': src('./packages/core/src/index.ts'),
      '@tracepad/headless': src('./packages/headless/src/index.ts'),
      '@tracepad/elements': src('./packages/elements/src/index.ts'),
      '@tracepad/vue': src('./packages/vue/src/index.ts'),
      '@tracepad/react': src('./packages/react/src/index.ts')
    }
  },
  esbuild: {
    jsx: 'automatic'
  },
  test: {
    include: [
      'packages/*/tests/**/*.test.ts',
      'packages/*/tests/**/*.test.tsx',
      'apps/*/tests/**/*.test.ts'
    ],
    environment: 'node'
  }
});
