import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createTrace } from '@tracepad/core';
import { TraceTimeline } from '../src/index.js';

function buildTrace() {
  const trace = createTrace();
  trace.push({ type: 'run.start', id: 'run-1' });
  trace.push({ type: 'step.start', id: 'step-1', kind: 'reasoning', parentId: 'run-1', label: 'plan' });
  trace.push({ type: 'step.delta', id: 'step-1', channel: 'reasoning', text: '先检索天气' });
  trace.push({ type: 'tool.call', id: 'tool-1', parentId: 'run-1', name: 'search' });
  trace.push({ type: 'step.end', id: 'step-1', status: 'ok' });
  return trace;
}

async function render(props: Record<string, unknown> = {}): Promise<string> {
  const trace = buildTrace();
  const app = createSSRApp({
    render: () => h(TraceTimeline, { trace, ...props })
  });
  return renderToString(app);
}

describe('@tracepad/vue', () => {
  it('renders one row per visible step', async () => {
    const html = await render();

    expect(html).toContain('data-id="run-1"');
    expect(html).toContain('data-id="step-1"');
    expect(html).toContain('data-id="tool-1"');
    expect(html).toContain('plan');
    expect(html).toContain('search');
  });

  it('renders without mounting, so SSR leaks no subscription', async () => {
    const html = await render();
    expect(html).toContain('tp-timeline');
  });

  it('honours the query prop through the pure path', async () => {
    const html = await render({ query: 'search' });

    expect(html).toContain('data-id="tool-1"');
    expect(html).not.toContain('data-id="step-1"');
  });

  it('renders the stats bar when summary is set', async () => {
    const html = await render({ summary: true });
    expect(html).toContain('tp-stats');
    expect(html).toContain('steps');
  });
});
