# tracepad

> Framework-agnostic UI components for visualising AI agent execution.

tracepad turns the messy middle of an AI agent run — reasoning, tool calls, sub-tasks, retries — into one normalised trace tree, then renders it with components you can drop into **any** stack.

It is **not** an observability backend. You do not deploy it, ingest OTLP, or send data anywhere. It is a frontend library: your app already has the stream, tracepad renders it.

## Why

Existing AI chat libraries stop at the bubble: they render the final message well, and treat everything in between as a loading state. But agent products live in the middle — users wait through reasoning, tool calls and multi-step research, and they need to see what is happening.

Existing agent-trace tools are the opposite: excellent CLI/backend observability platforms for reviewing logs after the fact. None of them give you embeddable UI components.

tracepad fills that gap.

| | chat UI libraries | agent observability platforms | **tracepad** |
|---|---|---|---|
| Renders reasoning / tool calls | partial | yes (their own dashboard) | **yes, in your app** |
| Embeddable in your product | yes | no | **yes** |
| Framework agnostic | no (Vue or React) | n/a | **yes** |
| Ships UI components | yes | no | **yes** |

## Architecture

| Layer | Package | Role |
|---|---|---|
| L0 | `@tracepad/core` | Streaming protocols in, one trace tree out. Zero dependencies. |
| L1 | `@tracepad/headless` | Rendering-agnostic interaction logic (planned) |
| L2 | `@tracepad/elements` | Web Components skin — works in any framework (planned) |
| L2 | `@tracepad/vue`, `@tracepad/react` | Thin framework wrappers (planned) |

Business logic lives in L0/L1 only. Framework packages contain no logic — just prop and event bridging.

## Quick start (core)

```ts
import { createTrace, openaiChat } from '@tracepad/core';

const trace = createTrace({ adapter: openaiChat() });

trace.subscribe((tree) => {
  // tree.nodes — steps, reasoning, tool calls
  // tree.usage — tokens in / out
  // tree.status — running | ok | error | aborted
});

await trace.consume(response.body); // any SSE / async iterable
```

Or push events yourself if you already have a protocol:

```ts
trace.push({ type: 'step.start', id: 's1', kind: 'tool', label: 'search' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_result', text: '...' });
trace.push({ type: 'step.end', id: 's1', status: 'ok' });
```

## Extensibility

v0.1 opens exactly three extension points:

- **Protocol adapters** — `registerAdapter`-style plug-ins; `openaiChat` ships first, Vercel AI SDK / LangGraph / MCP planned.
- **Tool renderers** — register a renderer per tool name.
- **Theming** — CSS custom properties, scoped.

More extension points will be added when real use cases demand them, not before.

## Status

Early. `@tracepad/core` is the foundation and is being built first; UI layers follow. Star/watch if this matches a problem you have.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Good first issues are labelled.

## License

MIT
