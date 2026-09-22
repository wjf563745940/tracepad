import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTrace } from '@tracepad/core';
import { TraceCards, TraceGantt, TraceMedia, TraceUsage } from '../src/index.js';

function buildTrace() {
  const trace = createTrace();
  trace.push({ type: 'run.start', id: 'run-1' });
  trace.push({
    type: 'tool.call',
    id: 'tool-1',
    parentId: 'run-1',
    name: 'search_web',
    args: '{"q":"西湖"}'
  });
  trace.push({ type: 'tool.result', id: 'tool-1', output: '{"top":"环湖线"}' });
  trace.push({
    type: 'media',
    id: 'tool-1',
    media: { kind: 'image', url: '/media/route.svg', label: '路线图' }
  });
  trace.push({ type: 'usage', usage: { inputTokens: 120, outputTokens: 40 } });
  trace.push({ type: 'run.end', status: 'ok' });
  return trace;
}

describe('react extra components', () => {
  it('TraceCards renders one card per step without a DOM', () => {
    const html = renderToStaticMarkup(createElement(TraceCards, { trace: buildTrace() }));
    expect(html).toContain('tp-card');
    expect(html).toContain('search_web');
  });

  it('TraceUsage renders token metrics', () => {
    const html = renderToStaticMarkup(createElement(TraceUsage, { trace: buildTrace() }));
    expect(html).toContain('120');
    expect(html).toContain('40');
    expect(html).toContain('tp-bar-fill');
  });

  it('TraceGantt renders a positioned bar', () => {
    const html = renderToStaticMarkup(createElement(TraceGantt, { trace: buildTrace() }));
    expect(html).toContain('tp-gantt-fill');
    expect(html).toContain('search_web');
  });

  it('TraceMedia renders the image source', () => {
    const html = renderToStaticMarkup(createElement(TraceMedia, { trace: buildTrace() }));
    expect(html).toContain('/media/route.svg');
    expect(html).toContain('路线图');
  });
});
