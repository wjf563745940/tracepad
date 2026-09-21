import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
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

function render(props: Partial<Parameters<typeof TraceTimeline>[0]> = {}): string {
  const trace = buildTrace();
  return renderToStaticMarkup(<TraceTimeline trace={trace} {...props} />);
}

describe('@tracepad/react', () => {
  it('renders one row per visible step', () => {
    const html = render();

    expect(html).toContain('data-id="run-1"');
    expect(html).toContain('data-id="step-1"');
    expect(html).toContain('data-id="tool-1"');
    expect(html).toContain('plan');
    expect(html).toContain('search');
  });

  it('honours the query prop through the pure path', () => {
    const html = render({ query: 'search' });

    expect(html).toContain('data-id="tool-1"');
    expect(html).not.toContain('data-id="step-1"');
  });

  it('renders the stats bar when summary is set', () => {
    const html = render({ summary: true });
    expect(html).toContain('tp-stats');
    expect(html).toContain('steps');
  });
});
