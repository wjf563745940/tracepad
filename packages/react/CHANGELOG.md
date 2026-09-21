# @tracepad/react

## 0.1.0

### Minor Changes

- Initial release. React wrapper over `@tracepad/headless`.
- `TraceTimeline` component: `trace`, `query`, `kinds`, `defaultExpanded`, `summary`,
  `onSelect`, `onToggle`.
- First render is computed from pure helpers, so SSR renders without creating a
  subscription that would never be released.
