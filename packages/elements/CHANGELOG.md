# @tracepad/elements

## 0.1.0

### Minor Changes

- Initial release. Web Components skin over `@tracepad/headless`.
- `<tp-timeline>` — `query`, `kinds`, `default-expanded`, `follow`, `summary`, `theme`;
  emits `tp-select` and `tp-toggle`.
- `<tp-reasoning>` — `node-id`, `label`, `collapsed`, `theme`; emits `tp-toggle`.
- Shadow DOM on by default, themed through `--tp-*` custom properties.
- Import-safe under SSR; `defineTraceElements(prefix)` for custom tag names.
- LLM output is rendered as text only — never through `innerHTML`.
