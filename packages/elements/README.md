# @tracepad/elements

Web Components skin for [tracepad](https://github.com/wjf563745940/tracepad) — drop
into any framework, or none.

```bash
pnpm add @tracepad/elements @tracepad/core
```

```html
<tp-timeline summary></tp-timeline>
<tp-reasoning></tp-reasoning>
```

```ts
import '@tracepad/elements'; // registers <tp-timeline> and <tp-reasoning>
import { createTrace, openaiChat } from '@tracepad/core';

const trace = createTrace({ adapter: openaiChat() });

const timeline = document.querySelector('tp-timeline')!;
timeline.trace = trace; // any object with snapshot() + subscribe()
timeline.setAttribute('query', 'search');

document.querySelector('tp-reasoning')!.trace = trace;

timeline.addEventListener('tp-select', (event) => console.log(event.detail.id));

await trace.consume(response.body);
```

| Element | Attributes | Events |
|---|---|---|
| `tp-timeline` | `query`, `kinds`, `default-expanded`, `follow`, `summary`, `theme` | `tp-select`, `tp-toggle` |
| `tp-reasoning` | `node-id`, `label`, `collapsed`, `theme` | `tp-toggle` |

Notes that matter in production:

- **Shadow DOM is on**, and styling pierces it through `--tp-*` custom properties
  (`--tp-color-text`, `--tp-color-error`, …). Set `theme="light"` for the light palette.
- **LLM output is never written through `innerHTML`** — everything is `textContent`.
- **Import-safe under SSR**: nothing touches `HTMLElement` at module scope.
- `defineTraceElements('my')` registers the same classes under a different prefix.

Full docs: [使用说明（中文）](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.md) · [Usage (English)](https://github.com/wjf563745940/tracepad/blob/main/docs/USAGE.en.md)

MIT
