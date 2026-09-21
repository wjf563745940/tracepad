import { describe, expect, it } from 'vitest';
import type { TraceNode } from '@tracepad/core';
import {
  firstLine,
  formatDuration,
  nodeDuration,
  rowLabel,
  statusLabel,
  statusTone
} from '../src/format.js';

function node(overrides: Partial<TraceNode> = {}): TraceNode {
  return {
    id: 'n',
    parentId: null,
    kind: 'message',
    status: 'running',
    content: '',
    reasoning: '',
    childIds: [],
    ...overrides
  };
}

describe('elements/format', () => {
  it('formats durations by magnitude', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(450)).toBe('450ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(65_000)).toBe('1m 5s');
    expect(formatDuration(-1)).toBe('');
  });

  it('measures a node that is still running against `now`', () => {
    expect(nodeDuration(node({ startedAt: 1_000, endedAt: 2_500 }))).toBe('1.5s');
    expect(nodeDuration(node({ startedAt: 1_000 }), 3_000)).toBe('2.0s');
    expect(nodeDuration(node({}), 3_000)).toBe('');
  });

  it('maps status to tone and label', () => {
    expect(statusTone(node({ status: 'error' }))).toBe('error');
    expect(statusTone(node({ status: 'running' }))).toBe('running');
    expect(statusTone(node({ status: 'ok' }))).toBe('ok');
    expect(statusTone(node({ status: 'aborted' }))).toBe('idle');

    expect(statusLabel(node({ status: 'error' }))).toBe('error');
    expect(statusLabel(node({ status: 'aborted' }))).toBe('aborted');
    expect(statusLabel(node({ status: 'running' }))).toBe('running');
    expect(statusLabel(node({ status: 'running', startedAt: 0 }), 500)).toBe('500ms');
  });

  it('takes the first line and truncates long text', () => {
    expect(firstLine('hello\nworld')).toBe('hello');
    expect(firstLine('  padded  ')).toBe('padded');
    expect(firstLine('x'.repeat(200))).toHaveLength(80);
    expect(firstLine('x'.repeat(200)).endsWith('…')).toBe(true);
  });

  it('derives a row label with a stable precedence', () => {
    expect(rowLabel(node({ label: 'plan' }))).toBe('plan');
    expect(rowLabel(node({ tool: { name: 'search' } }))).toBe('search');
    expect(rowLabel(node({ content: 'first line\nsecond' }))).toBe('first line');
    expect(rowLabel(node({ reasoning: 'thinking' }))).toBe('reasoning');
    expect(rowLabel(node({}))).toBe('message');
  });
});
