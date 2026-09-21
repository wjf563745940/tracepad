# @tracepad/vue

Vue 3 wrapper for [tracepad](https://github.com/wjf563745940/tracepad) — a thin
props-and-events bridge over `@tracepad/headless`. No logic of its own.

```bash
pnpm add @tracepad/vue @tracepad/core
```

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
  <TraceTimeline
    :trace="trace"
    :query="query"
    summary
    @select="(e) => console.log(e.id)"
    @toggle="(e) => console.log(e.id, e.expanded)"
  />
</template>
```

| Prop | Type | Default |
|---|---|---|
| `trace` | `TraceLike` (required) | — |
| `query` | `string` | `''` |
| `kinds` | `StepKind[]` | — |
| `defaultExpanded` | `boolean` | `true` |
| `summary` | `boolean` | `false` |

Emits `select` and `toggle`. The first render is computed from pure helpers, so it
also works under `renderToString` without leaking a subscription.

Markup uses these class names for styling: `tp-timeline`, `tp-row`, `tp-toggle`,
`tp-kind`, `tp-label`, `tp-status`, `tp-stats`, `tp-empty`.

Full docs: [使用说明（中文）](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.md) · [Usage (English)](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.en.md)

MIT
