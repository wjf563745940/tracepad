# @tracepad/core

Streaming protocols in, one trace tree out. Zero dependencies.

This is the bottom layer of [tracepad](https://github.com/wjf563745940/tracepad): it
normalises whatever your agent streams — OpenAI Chat Completions SSE today — into a
single immutable trace tree of steps, reasoning, tool calls and usage.

```bash
pnpm add @tracepad/core
```

```ts
import { createTrace, openaiChat } from '@tracepad/core';

const trace = createTrace({ adapter: openaiChat() });

trace.subscribe((tree) => {
  tree.nodes; // Record<id, TraceNode> — steps, reasoning, tool calls
  tree.usage; // tokens in / out
  tree.status; // running | ok | error | aborted
});

await trace.consume(response.body); // any SSE / async iterable
```

Already have your own protocol? Skip the adapter and push events directly:

```ts
trace.push({ type: 'step.start', id: 's1', kind: 'tool', label: 'search' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_result', text: '...' });
trace.push({ type: 'step.end', id: 's1', status: 'ok' });
```

Every update produces a new tree object — snapshots are safe to hold on to.

Full docs: [使用说明（中文）](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.md) · [Usage (English)](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.en.md)

MIT
