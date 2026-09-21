# @tracepad/headless

Interaction logic for tracepad, with no rendering attached.

Feed it a trace from [`@tracepad/core`](https://github.com/wjf563745940/tracepad) and
it gives you everything a UI needs — flattened rows with depth, expansion and
selection state, filtering, derived stats — without dictating how any of it looks.

```bash
pnpm add @tracepad/headless
```

```ts
import { createTrace } from '@tracepad/core';
import { createTraceView } from '@tracepad/headless';

const view = createTraceView(createTrace());

view.rows(); // flattened rows with depth — ready for virtualised lists
view.stats(); // step counts, errors, duration, tokens
view.toggle('step-1');
view.setFilter({ query: 'search' });
view.latestNodeId(); // for follow-the-stream behaviour
```

Filtering keeps ancestor context by default, so a matched tool call still shows the
path that led to it.

Use it directly if you want your own markup, or use one of the render layers built on
top of it: `@tracepad/elements`, `@tracepad/vue`, `@tracepad/react`.

MIT
