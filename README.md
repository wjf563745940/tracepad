# tracepad

[![CI](https://github.com/wjf563745940/tracepad/actions/workflows/ci.yml/badge.svg)](https://github.com/wjf563745940/tracepad/actions/workflows/ci.yml)

> Framework-agnostic UI components for visualising AI agent execution.

**Repo:** https://github.com/wjf563745940/tracepad

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
| L1 | `@tracepad/headless` | Expansion, selection, filtering, derived rows and stats |
| L2 | `@tracepad/elements` | Web Components skin — drop into any framework, or none |
| L2 | `@tracepad/vue`, `@tracepad/react` | Thin framework wrappers: props in, events out |
| L3 | `playground` | Replays a real agent stream through all three layers at once |

Business logic lives in L0/L1 only. Framework packages contain no logic — just prop and event bridging.

| Package | npm | |
|---|---|---|
| `@tracepad/core` | [npm](https://www.npmjs.com/package/@tracepad/core) | Streaming protocols in, one trace tree out |
| `@tracepad/headless` | [npm](https://www.npmjs.com/package/@tracepad/headless) | Interaction logic, no rendering |
| `@tracepad/elements` | [npm](https://www.npmjs.com/package/@tracepad/elements) | `<tp-timeline>`, `<tp-reasoning>` |
| `@tracepad/vue` | [npm](https://www.npmjs.com/package/@tracepad/vue) | Vue 3 wrapper |
| `@tracepad/react` | [npm](https://www.npmjs.com/package/@tracepad/react) | React wrapper |

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

## View layer (headless)

Rendering-agnostic interaction logic — no DOM, no framework:

```ts
import { createTrace } from '@tracepad/core';
import { createTraceView } from '@tracepad/headless';

const trace = createTrace();
const view = createTraceView(trace);

view.rows();          // flattened rows with depth — ready for virtualised lists
view.stats();         // step counts, errors, duration, tokens
view.toggle('step-1');
view.setFilter({ query: 'search' });
```

Filtering keeps ancestor context by default, so a matched tool call still shows the path that led to it.

## Render layer (elements)

The same headless logic, wrapped as Web Components. Importing the package registers
`<tp-timeline>` and `<tp-reasoning>` — no framework required, Shadow DOM on by default,
CSS custom properties pierce it for theming.

```html
<tp-timeline summary></tp-timeline>
<tp-reasoning></tp-reasoning>
```

```ts
import '@tracepad/elements';
import { createTrace, openaiChat } from '@tracepad/core';

const trace = createTrace({ adapter: openaiChat() });

const timeline = document.querySelector('tp-timeline')!;
timeline.trace = trace;                 // any object with snapshot() + subscribe()
timeline.setAttribute('query', 'search');

document.querySelector('tp-reasoning')!.trace = trace;

timeline.addEventListener('tp-select', (event) => console.log(event.detail.id));

await trace.consume(response.body);
```

| Element | Attributes | Events |
|---|---|---|
| `tp-timeline` | `query`, `kinds`, `default-expanded`, `follow`, `summary`, `theme` | `tp-select`, `tp-toggle` |
| `tp-reasoning` | `node-id`, `label`, `collapsed`, `theme` | `tp-toggle` |

Everything is text-content based — LLM output is never written through `innerHTML`.
The package is import-safe under SSR (no `HTMLElement` at module scope), and
`defineTraceElements('my')` registers the same classes under a different prefix.

## Framework wrappers

The Vue and React packages are ~150 lines each and contain no logic: they render the
rows that `@tracepad/headless` produces and forward interaction back to the view.
The first render is computed from pure helpers, so both work under SSR.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { TraceTimeline } from '@tracepad/vue';

const trace = useMyAgentTrace();
const query = ref('');
</script>

<template>
  <input v-model="query" />
  <TraceTimeline :trace="trace" :query="query" summary @select="console.log($event.id)" />
</template>
```

```tsx
import { TraceTimeline } from '@tracepad/react';

<TraceTimeline trace={trace} query={query} summary onSelect={(e) => console.log(e.id)} />;
```

| Package | Component | Props | Events |
|---|---|---|---|
| `@tracepad/vue` | `TraceTimeline` | `trace`, `query`, `kinds`, `default-expanded`, `summary` | `select`, `toggle` |
| `@tracepad/react` | `TraceTimeline` | `trace`, `query`, `kinds`, `defaultExpanded`, `summary` | `onSelect`, `onToggle` |

## Playground

One trace object, three render layers side by side, driven by a scripted two-turn
agent run that goes through the real `openaiChat()` adapter:

```bash
pnpm install
pnpm --filter playground dev
```

## Extensibility

v0.1 opens exactly three extension points:

- **Protocol adapters** — `registerAdapter`-style plug-ins; `openaiChat` ships first, Vercel AI SDK / LangGraph / MCP planned.
- **Tool renderers** — register a renderer per tool name.
- **Theming** — CSS custom properties, scoped.

More extension points will be added when real use cases demand them, not before.

## Status

| Package | State |
|---|---|
| `@tracepad/core` | working, tested |
| `@tracepad/headless` | working, tested |
| `@tracepad/elements` | working, tested (`tp-timeline`, `tp-reasoning`) |
| `@tracepad/vue`, `@tracepad/react` | working, SSR smoke-tested |
| playground | working — real agent replay, native + Vue + React in one page |

31 tests, zero runtime dependencies in `core`. A playground test asserts that all
three render layers produce the exact same rows from the same trace.

## Documentation

- [使用说明（简体中文）](./docs/USAGE.md)
- [Usage (English)](./docs/USAGE.en.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The easiest way in is a protocol adapter —
Vercel AI SDK, LangGraph and MCP are all unclaimed.

## License

MIT
