import { describe, expect, it } from 'vitest';
import { createTrace } from '@tracepad/core';
import { createTraceView } from '../src/index.js';

function buildTrace() {
  const trace = createTrace();
  trace.push({ type: 'run.start', id: 'run-1' });
  trace.push({ type: 'step.start', id: 'step-1', kind: 'reasoning', parentId: 'run-1', label: 'plan' });
  trace.push({ type: 'step.delta', id: 'step-1', channel: 'reasoning', text: '先检索天气' });
  trace.push({ type: 'tool.call', id: 'tool-1', parentId: 'run-1', name: 'search' });
  trace.push({ type: 'step.start', id: 'step-2', kind: 'message', parentId: 'tool-1' });
  trace.push({ type: 'step.end', id: 'step-1', status: 'ok' });
  trace.push({ type: 'step.end', id: 'step-2', status: 'ok' });
  return trace;
}

describe('tracepad headless', () => {
  it('flattens the tree with default expansion', () => {
    const view = createTraceView(buildTrace());
    const rows = view.rows();

    expect(rows.map((row) => row.node.id)).toEqual(['run-1', 'step-1', 'tool-1', 'step-2']);
    expect(rows[2]?.depth).toBe(1);
    expect(rows[3]?.depth).toBe(2);
  });

  it('collapses and expands', () => {
    const view = createTraceView(buildTrace());

    view.collapseAll();
    expect(view.rows()).toHaveLength(1);

    view.setExpanded('run-1', true);
    expect(view.rows().map((row) => row.node.id)).toEqual(['run-1', 'step-1', 'tool-1']);

    view.toggle('tool-1');
    expect(view.rows().map((row) => row.node.id)).toEqual(['run-1', 'step-1', 'tool-1', 'step-2']);
  });

  it('filters while keeping ancestor context', () => {
    const view = createTraceView(buildTrace());
    view.setFilter({ query: 'search' });

    const rows = view.rows();
    expect(rows.map((row) => row.node.id)).toEqual(['run-1', 'tool-1']);
    expect(rows[0]?.isAncestorOfMatch).toBe(true);
    expect(rows[1]?.matched).toBe(true);
  });

  it('derives stats and tracks the newest node', () => {
    const trace = buildTrace();
    const view = createTraceView(trace);

    expect(view.stats().totalSteps).toBe(4);
    expect(view.stats().byKind['tool']).toBe(1);
    expect(view.latestNodeId()).toBe('step-2');

    trace.push({ type: 'tool.result', id: 'tool-1', output: 'sunny' });
    const toolRow = view.rows().find((row) => row.node.id === 'tool-1');
    expect(toolRow?.node.tool?.result).toBe('sunny');
  });

  it('stops listening after dispose', () => {
    const trace = buildTrace();
    const view = createTraceView(trace);
    let calls = 0;
    view.subscribe(() => {
      calls += 1;
    });
    view.dispose();
    trace.push({ type: 'step.start', id: 'step-3', kind: 'custom', parentId: 'run-1' });

    expect(calls).toBe(1);
  });
});
