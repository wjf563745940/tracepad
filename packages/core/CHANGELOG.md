# @tracepad/core

## 0.1.0

### Minor Changes

- Initial release. Streaming protocols in, one immutable trace tree out.
- `createTrace()` with `push`, `consume`, `subscribe`, `snapshot`, `reset`.
- `openaiChat()` adapter for OpenAI Chat Completions SSE (reasoning, content,
  incremental tool call arguments, usage).
- `parseSseChunks()` for reusing the SSE framing with other protocols.
- Zero runtime dependencies.
