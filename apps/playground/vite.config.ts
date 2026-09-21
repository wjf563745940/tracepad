import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/** Point at package sources so the playground hot-reloads with library edits. */
const src = (relative: string): string =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@tracepad/core': src('../../packages/core/src/index.ts'),
      '@tracepad/headless': src('../../packages/headless/src/index.ts'),
      '@tracepad/elements': src('../../packages/elements/src/index.ts'),
      '@tracepad/vue': src('../../packages/vue/src/index.ts'),
      '@tracepad/react': src('../../packages/react/src/index.ts')
    }
  },
  server: {
    port: 5173
  }
});
