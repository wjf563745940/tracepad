# @tracepad/react

React wrapper for [tracepad](https://github.com/wjf563745940/tracepad) — a thin
props-and-events bridge over `@tracepad/headless`. No logic of its own.

```bash
pnpm add @tracepad/react @tracepad/core
```

```tsx
import { useState } from 'react';
import { createTrace, openaiChat } from '@tracepad/core';
import { TraceTimeline } from '@tracepad/react';

const trace = createTrace({ adapter: openaiChat() });

function AgentTrace() {
  const [query, setQuery] = useState('');
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <TraceTimeline
        trace={trace}
        query={query}
        summary
        onSelect={(e) => console.log(e.id)}
        onToggle={(e) => console.log(e.id, e.expanded)}
      />
    </>
  );
}

await trace.consume(response.body);
```

| Prop | Type | Default |
|---|---|---|
| `trace` | `TraceLike` (required) | — |
| `query` | `string` | `''` |
| `kinds` | `StepKind[]` | — |
| `defaultExpanded` | `boolean` | `true` |
| `summary` | `boolean` | `false` |
| `onSelect` / `onToggle` | `(payload) => void` | — |

The first render is computed from pure helpers, so it also works under
`renderToString` without leaking a subscription.

Markup uses these class names for styling: `tp-timeline`, `tp-row`, `tp-toggle`,
`tp-kind`, `tp-label`, `tp-status`, `tp-stats`, `tp-empty`.

Full docs: [使用说明（中文）](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.md) · [Usage (English)](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.en.md)

MIT
