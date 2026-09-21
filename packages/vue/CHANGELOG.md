# @tracepad/vue

## 0.1.0

### Minor Changes

- Initial release. Vue 3 wrapper over `@tracepad/headless`.
- `TraceTimeline` component: `trace`, `query`, `kinds`, `default-expanded`, `summary`;
  emits `select` and `toggle`.
- First render is computed from pure helpers, so SSR renders without creating a
  subscription that would never be released.
