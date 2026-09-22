# tracepad usage

> 简体中文 | [English](./USAGE.md)

tracepad turns the messy middle of an AI agent run — reasoning, tool calls, sub-tasks,
retries — into one normalised trace tree, then renders it with components you can drop
into **any** stack.

It is **not** an observability backend. You do not deploy it, ingest OTLP, or send data
anywhere. Your app already has the stream; tracepad renders it.

---

## 1. Which package do I install?

| Situation | Install |
|---|---|
| I only want the data, I'll build my own UI | `@tracepad/core` |
| I want the interaction logic (expand / filter / stats), not your markup | `+ @tracepad/headless` |
| Plain page, or a framework other than Vue / React | `+ @tracepad/elements` |
| Vue 3 project | `+ @tracepad/vue` |
| React project | `+ @tracepad/react` |

Pick one render layer. All three share the same headless logic and produce identical rows.

```bash
pnpm add @tracepad/core @tracepad/headless @tracepad/elements   # native
pnpm add @tracepad/core @tracepad/vue                            # Vue 3
pnpm add @tracepad/core @tracepad/react                          # React
```

---

## 2. Fastest path

### 2.1 Native / any framework

```html
<tp-timeline summary></tp-timeline>
```

```ts
import '@tracepad/elements';
import { createTrace, openaiChat } from '@tracepad/core';
import type { TraceTimelineElement } from '@tracepad/elements';

const trace = createTrace({ adapter: openaiChat() });

const timeline = document.querySelector('tp-timeline') as TraceTimelineElement;
timeline.trace = trace;                        // anything with snapshot() + subscribe()
timeline.setAttribute('query', 'get_weather'); // filter

timeline.addEventListener('tp-select', (e) => console.log(e.detail.id));

await trace.consume(response.body);            // any SSE / async iterable
```

### 2.2 Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { createTrace, openaiChat } from '@tracepad/core';
import { TraceTimeline } from '@tracepad/vue';

const trace = createTrace({ adapter: openaiChat() });
const query = ref('');
await trace.consume(response.body);
</script>

<template>
  <input v-model="query" placeholder="filter steps" />
  <TraceTimeline :trace="trace" :query="query" summary @select="(e) => console.log(e.id)" />
</template>
```

### 2.3 React

```tsx
import { useState } from 'react';
import { createTrace, openaiChat } from '@tracepad/core';
import { TraceTimeline } from '@tracepad/react';

const trace = createTrace({ adapter: openaiChat() });

export function AgentTrace() {
  const [query, setQuery] = useState('');
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <TraceTimeline trace={trace} query={query} summary onSelect={(e) => console.log(e.id)} />
    </>
  );
}
```

---

## 3. Where the data comes from

### 3.1 Use a shipped adapter

```ts
const trace = createTrace({ adapter: openaiChat() });
await trace.consume(response.body);
```

`openaiChat()` handles OpenAI Chat Completions SSE: reasoning, content, incremental
tool call arguments, and usage.

### 3.2 Push events yourself

Protocol not supported? Skip the adapter and push events directly:

```ts
trace.push({ type: 'run.start', id: 'run-1' });
trace.push({ type: 'step.start', id: 's1', kind: 'tool', parentId: 'run-1', label: 'search' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_args', text: '{"city":' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_args', text: '"Hangzhou"}' });
trace.push({ type: 'tool.result', id: 's1', output: '{"temp": "24-30C"}' });
trace.push({ type: 'step.end', id: 's1', status: 'ok' });
trace.push({ type: 'usage', usage: { inputTokens: 128, outputTokens: 42 } });
trace.push({ type: 'run.end', status: 'ok' });
```

Did a step produce an image, a screenshot, a file? Attach it to the step that
made it and `<tp-media>` collects them into a gallery:

```ts
trace.push({
  type: 'media',
  id: 's1',
  media: { kind: 'image', url: '/media/chart.svg', alt: 'Temperature curve', label: 'Hourly' }
});
```

`media` and `tool.result` are deliberately separate: a result is **text the model
reads back**, media is **something a human looks at**. Merging them falls apart
the moment one step emits several artefacts.

Want to know which step burned the tokens? Give the `usage` event a step id:

```ts
trace.push({ type: 'usage', id: 's1', usage: { inputTokens: 428, outputTokens: 86 } });
```

An event with an id counts toward the run total *and* is attributed to that step,
which makes `tp-usage` render an extra group of per-step token bars. Without an
id it only moves the total.

### 3.3 Write a new adapter

An adapter is just a translation from your protocol chunks to `TraceEvent`. This is the
easiest part of the project to contribute to:

```ts
import type { TraceAdapter, TraceEvent } from '@tracepad/core';

export function myProtocol(): TraceAdapter<MyChunk> {
  return {
    name: 'my-protocol',
    async *toEvents(source): AsyncIterable<TraceEvent> {
      yield { type: 'run.start', id: 'run' };
      for await (const chunk of source) {
        if (chunk.kind === 'thought') {
          yield { type: 'step.start', id: chunk.id, kind: 'reasoning', parentId: 'run' };
          yield { type: 'step.delta', id: chunk.id, channel: 'reasoning', text: chunk.text };
        }
        if (chunk.kind === 'done') yield { type: 'run.end', status: 'ok' };
      }
    }
  };
}
```

Rules: emit normalised events only, never leak raw protocol shapes, and cover
**truncated and partial chunks** in tests.

---

## 4. Data model

One run = one tree. `applyEvent` returns a new object every time, so snapshots are safe
to hold on to.

| Type | Values |
|---|---|
| `StepKind` | `run` / `reasoning` / `message` / `tool` / `subagent` / `error` / `custom` |
| `RunStatus` | `running` / `ok` / `error` / `aborted` |
| `DeltaChannel` | `content` / `reasoning` / `tool_args` / `tool_result` |

```ts
interface TraceNode {
  id: string;
  parentId: string | null;
  kind: StepKind;
  label?: string;
  status: RunStatus;
  startedAt?: number;
  endedAt?: number;
  content: string;      // streamed body, accumulated
  reasoning: string;    // streamed reasoning, accumulated
  tool?: { name: string; args?: string; result?: string; error?: string };
  usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
  childIds: string[];
}

interface TraceTree {
  runId: string;
  status: RunStatus;
  nodes: Record<string, TraceNode>;
  rootIds: string[];
  usage: Usage;
  version: number;
}
```

A `Trace` instance exposes `push` / `consume` / `subscribe` / `snapshot` / `reset`.

---

## 5. Logic only, no components

```ts
import { createTraceView } from '@tracepad/headless';

const view = createTraceView(trace, { defaultExpanded: true, follow: true });

view.rows();          // flat rows: { node, depth, hasChildren, expanded, selected, matched }
view.stats();         // { totalSteps, byKind, errors, running, durationMs, inputTokens, outputTokens }
view.toggle('s1');
view.expandAll();     // / collapseAll()
view.select('s1');
view.setFilter({ query: 'search', kinds: ['tool'] });
view.latestNodeId();  // pair with follow for "stick to the newest step"
view.dispose();       // always call on unmount
```

`rows()` is already flattened and carries `depth`, so it drops straight into a
virtualised list. Filtering **keeps ancestor context** by default: when a tool call
matches, the path leading to it stays visible (`keepAncestors: false` to opt out).

---

## 6. Component props and events

### `@tracepad/elements`

| Element | What it shows | Attributes | Events |
|---|---|---|---|
| `tp-timeline` | step tree | `query`, `kinds`, `default-expanded`, `follow`, `summary`, `theme` | `tp-select`, `tp-toggle` |
| `tp-reasoning` | one step's reasoning | `node-id`, `label`, `collapsed`, `theme` | `tp-toggle` |
| `tp-cards` | expandable card per step (args / result / error) | `default-open` | `tp-toggle` |
| `tp-usage` | token totals + per-step duration bars | — | — |
| `tp-gantt` | steps on the real timeline | — | — |
| `tp-media` | gallery of produced artefacts | — | `tp-select` |

All six take the trace the same way — assign it to the element's `.trace` property.

```ts
import { defineTraceElements } from '@tracepad/elements';
defineTraceElements('my');   // registers <my-timeline> / <my-cards> / ...

const el = document.querySelector('tp-cards') as HTMLElement & { trace: TraceLike };
el.trace = trace;            // re-renders on its own from here on
```

`tp-media` only lays the images out; clicking emits `tp-select` and opening a
lightbox is the host app's job (the playground shows this with a fixed overlay).

### `@tracepad/vue`

Exports `TraceTimeline`, `TraceCards`, `TraceUsage`, `TraceGantt`, `TraceMedia`.

| Prop | Type | Default |
|---|---|---|
| `trace` | `TraceLike` (required) | — |
| `query` | `string` | `''` |
| `kinds` | `StepKind[]` | — |
| `defaultExpanded` | `boolean` | `true` |
| `summary` | `boolean` | `false` |

`query` / `kinds` / `defaultExpanded` / `summary` belong to `TraceTimeline`; the
other components take `trace` alone. Emits `select` and `toggle`.

### `@tracepad/react`

Same props, plus `onSelect` / `onToggle` callbacks.

---

## 7. Theming

`<tp-timeline>` lives in Shadow DOM and is themed through CSS custom properties:

```css
tp-timeline {
  --tp-font: ui-sans-serif, system-ui, sans-serif;
  --tp-font-size: 13px;
  --tp-radius: 8px;
  --tp-gap: 6px;
  --tp-color-text: #e6e6e6;
  --tp-color-muted: #9a9a9a;
  --tp-color-hover: rgba(140, 140, 140, 0.14);
  --tp-color-active: rgba(140, 140, 140, 0.24);
  --tp-color-surface: rgba(140, 140, 140, 0.1);
  --tp-color-error: #f09595;
  --tp-color-ok: #97c459;
  --tp-color-running: #85b7eb;
}
```

A light palette ships with it: `<tp-timeline theme="light">`.

The Vue and React wrappers render in the light DOM, using these class names:
`tp-timeline`, `tp-row`, `tp-toggle`, `tp-kind`, `tp-label`, `tp-status`, `tp-stats`,
`tp-empty`. State is exposed as attributes: `data-selected`, `data-matched`,
`data-status`, `data-empty`.

---

## 8. SSR

- `@tracepad/elements`: nothing touches `HTMLElement` at module scope, so importing is
  safe. Assign `.trace` on the client (inside `useEffect` in Next.js).
- `@tracepad/vue` / `@tracepad/react`: the first render is computed from pure helpers
  and creates no subscription, so `renderToString` is safe; the stateful view is built
  after mount.

---

## 9. FAQ

**Can I run several runs at once?** One `Trace` is one run. Either create a `Trace` per
run, or reuse one and call `trace.reset()` (recommended — bound views keep working).

**Can I pause?** The stream is yours; stop reading it. The components just render the
current snapshot. That is exactly how the playground pause button works.

**Will thousands of steps be slow?** `rows()` returns a flat array with `depth`, so pair
it with a virtualised list. Updates replace the whole tree, so cap the rendered depth
for very deep chains.

**Is LLM output executed as HTML?** No. Everything renders through `textContent`;
`innerHTML` is never used.

**Do you support LangGraph / Vercel AI SDK / MCP?** Not yet. Adapters are an open
extension point and contributions are very welcome — a great first PR.

---

## 10. Local development

```bash
pnpm install
pnpm verify          # = pnpm typecheck && pnpm test
pnpm --filter playground dev     # all three layers, live SSE replay
```

Changed a published package? Add a changeset:

```bash
pnpm changeset       # pick packages and patch / minor / major
```

---

## 11. Extension points

v0.1 opens exactly three, and not one more until real use cases demand them:

1. **Protocol adapters** (`TraceAdapter`)
2. **Render layers** (build on headless — the Vue and React wrappers are ~150 lines each)
3. **Theming** (CSS custom properties)

---

MIT License. Repo: <https://github.com/wjf563745940/tracepad>
