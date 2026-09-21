# @tracepad/headless

## 0.1.0

### Minor Changes

- Initial release. Rendering-agnostic interaction logic for a trace tree.
- `createTraceView()` with expansion, selection, filtering, follow and dispose.
- `visibleRows()` flattens the tree with depth and match metadata; filtering keeps
  ancestor context by default.
- `traceStats()` derives step counts, errors, running count, duration and tokens.
- Shared display helpers (`rowLabel`, `statusLabel`, `statusTone`, `formatDuration`)
  so every render layer formats identically.
