# tracepad 使用说明

> [English](./USAGE.en.md) | 简体中文

tracepad 把 AI Agent 执行过程里那段"混乱的中间地带"——推理、工具调用、子任务、重试——归一化成一棵 trace 树，然后用可以塞进**任意技术栈**的组件渲染出来。

**它不是** 可观测性后端。不需要部署，不需要接入 OTLP，不会把数据发到任何地方。你的应用已经拿到了流，tracepad 只负责渲染。

---

## 1. 我该装哪个包

| 你的情况 | 装这个 |
|---|---|
| 只要数据，UI 完全自己写 | `@tracepad/core` |
| 要交互逻辑（展开/筛选/统计），不要我的标记 | `+ @tracepad/headless` |
| 原生页面、或框架不在 Vue/React 里 | `+ @tracepad/elements` |
| Vue 3 项目 | `+ @tracepad/vue` |
| React 项目 | `+ @tracepad/react` |

渲染层三选一即可，它们共用同一份 headless 逻辑，产出完全一致的行。

```bash
pnpm add @tracepad/core @tracepad/headless @tracepad/elements   # 原生
pnpm add @tracepad/core @tracepad/vue                            # Vue 3
pnpm add @tracepad/core @tracepad/react                          # React
```

---

## 2. 最快上手

### 2.1 原生 / 任意框架

```html
<tp-timeline summary></tp-timeline>
```

```ts
import '@tracepad/elements';
import { createTrace, openaiChat } from '@tracepad/core';
import type { TraceTimelineElement } from '@tracepad/elements';

const trace = createTrace({ adapter: openaiChat() });

const timeline = document.querySelector('tp-timeline') as TraceTimelineElement;
timeline.trace = trace;                       // 任何有 snapshot() + subscribe() 的对象
timeline.setAttribute('query', 'get_weather'); // 过滤

timeline.addEventListener('tp-select', (e) => console.log(e.detail.id));

await trace.consume(response.body);           // 任意 SSE / async iterable
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
  <input v-model="query" placeholder="过滤步骤" />
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

## 3. 数据从哪来

### 3.1 用现成的适配器

```ts
const trace = createTrace({ adapter: openaiChat() });
await trace.consume(response.body);
```

`openaiChat()` 处理 OpenAI Chat Completions SSE：推理内容、正文、增量工具调用参数、usage 统计。

### 3.2 自己 push 事件

协议不在支持列表里？直接推事件，跳过适配器：

```ts
trace.push({ type: 'run.start', id: 'run-1' });
trace.push({ type: 'step.start', id: 's1', kind: 'tool', parentId: 'run-1', label: 'search' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_args', text: '{"city":' });
trace.push({ type: 'step.delta', id: 's1', channel: 'tool_args', text: '"杭州"}' });
trace.push({ type: 'tool.result', id: 's1', output: '{"temp": "24~30℃"}' });
trace.push({ type: 'step.end', id: 's1', status: 'ok' });
trace.push({ type: 'usage', usage: { inputTokens: 128, outputTokens: 42 } });
trace.push({ type: 'run.end', status: 'ok' });
```

### 3.3 写一个新的适配器

适配器就是把你的协议块翻译成 `TraceEvent`。这是整个项目最容易贡献的部分：

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

规矩：只产出归一化事件，绝不外泄协议的原始形状；并且要为**截断的、残缺的块**写测试。

---

## 4. 数据模型

一次运行 = 一棵树。`applyEvent` 每次都返回新对象，快照可以放心持有。

| 类型 | 值 |
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
  content: string;      // 正文（流式累积）
  reasoning: string;    // 推理（流式累积）
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

`Trace` 实例：`push` / `consume` / `subscribe` / `snapshot` / `reset`。

---

## 5. 只要逻辑，不要组件

```ts
import { createTraceView } from '@tracepad/headless';

const view = createTraceView(trace, { defaultExpanded: true, follow: true });

view.rows();          // 扁平行：{ node, depth, hasChildren, expanded, selected, matched }
view.stats();         // { totalSteps, byKind, errors, running, durationMs, inputTokens, outputTokens }
view.toggle('s1');
view.expandAll();     // / collapseAll()
view.select('s1');
view.setFilter({ query: 'search', kinds: ['tool'] });
view.latestNodeId();  // 配合 follow 做"跟着最新一步滚"
view.dispose();       // 一定要在卸载时调用
```

`rows()` 已经拍平并带 `depth`，可以直接喂给虚拟滚动列表。
筛选默认**保留祖先链路**：命中一个工具调用时，通向它的那几步也会一起显示（用 `keepAncestors: false` 关掉）。

---

## 6. 组件属性与事件

### `@tracepad/elements`

| 元素 | 属性 | 事件 |
|---|---|---|
| `tp-timeline` | `query`、`kinds`、`default-expanded`、`follow`、`summary`、`theme` | `tp-select`、`tp-toggle` |
| `tp-reasoning` | `node-id`、`label`、`collapsed`、`theme` | `tp-toggle` |

```ts
import { defineTraceElements } from '@tracepad/elements';
defineTraceElements('my');   // 注册成 <my-timeline> / <my-reasoning>
```

### `@tracepad/vue`

| Prop | 类型 | 默认 |
|---|---|---|
| `trace` | `TraceLike`（必填） | — |
| `query` | `string` | `''` |
| `kinds` | `StepKind[]` | — |
| `defaultExpanded` | `boolean` | `true` |
| `summary` | `boolean` | `false` |

事件：`select`、`toggle`。

### `@tracepad/react`

同上，另加 `onSelect` / `onToggle` 回调。

---

## 7. 主题

`<tp-timeline>` 用 Shadow DOM 隔离样式，靠 CSS 自定义属性穿透：

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

内置浅色一套，直接 `<tp-timeline theme="light">`。

Vue / React 包装渲染在 light DOM，用这些类名写样式：
`tp-timeline`、`tp-row`、`tp-toggle`、`tp-kind`、`tp-label`、`tp-status`、`tp-stats`、`tp-empty`。
状态通过属性暴露：`data-selected`、`data-matched`、`data-status`、`data-empty`。

---

## 8. SSR / 服务端渲染

- `@tracepad/elements`：模块顶层不碰 `HTMLElement`，import 不会炸。但要**在客户端再给 `.trace` 赋值**（Next.js 里放进 `useEffect`）。
- `@tracepad/vue` / `@tracepad/react`：首屏由纯函数算出，不创建订阅，所以 `renderToString` 是安全的；状态化的 view 挂载后才建。

---

## 9. 常见问题

**能同时跑多个 run 吗？** 一个 `Trace` 就是一次运行。要么每个 run 建一个 `Trace`，要么复用同一个并调 `trace.reset()`（推荐，视图绑定不用重建）。

**能暂停吗？** 数据流是你自己的，停止读取即可；组件只是渲染当前快照。playground 里的暂停就是这么做的。

**步骤太多会卡吗？** `rows()` 返回扁平数组并带 `depth`，配虚拟滚动即可。另外更新是整棵树替换，超长链路建议限制渲染深度。

**LLM 输出会被当 HTML 执行吗？** 不会。渲染全程 `textContent`，`innerHTML` 一行都没用。

**支持 LangGraph / Vercel AI SDK / MCP 吗？** 还没。适配器是开放的扩展点，欢迎贡献——这是最好的第一个 PR。

---

## 10. 本地开发

```bash
pnpm install
pnpm verify          # = pnpm typecheck && pnpm test
pnpm --filter playground dev     # 三种渲染并排跑真实 SSE 回放
```

改了已发布的包要加变更集：

```bash
pnpm changeset       # 选包、选 patch / minor / major
```

---

## 11. 扩展点

v0.1 只开三个，多了不加——等真实需求来了再说：

1. **协议适配器**（`TraceAdapter`）
2. **渲染层**（基于 headless 自己写，参考 vue/react 各约 150 行）
3. **主题**（CSS 自定义属性）

---

MIT License。仓库：<https://github.com/wjf563745940/tracepad>
