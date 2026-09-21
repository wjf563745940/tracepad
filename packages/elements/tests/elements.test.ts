// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createTrace } from '@tracepad/core';
import { TraceReasoningElement, TraceTimelineElement } from '../src/index.js';

function buildTrace() {
  const trace = createTrace();
  trace.push({ type: 'run.start', id: 'run-1' });
  trace.push({ type: 'step.start', id: 'step-1', kind: 'reasoning', parentId: 'run-1', label: 'plan' });
  trace.push({ type: 'step.delta', id: 'step-1', channel: 'reasoning', text: '先检索天气' });
  trace.push({ type: 'tool.call', id: 'tool-1', parentId: 'run-1', name: 'search' });
  trace.push({ type: 'step.start', id: 'step-2', kind: 'message', parentId: 'tool-1', label: 'answer' });
  trace.push({ type: 'step.end', id: 'step-1', status: 'ok' });
  trace.push({ type: 'step.end', id: 'step-2', status: 'ok' });
  return trace;
}

function mount<T extends HTMLElement>(tag: string): T {
  const el = document.createElement(tag) as T;
  document.body.append(el);
  return el;
}

function rowsOf(el: TraceTimelineElement): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('.row') ?? []);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<tp-timeline>', () => {
  it('renders one row per visible step', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    el.trace = buildTrace();

    expect(rowsOf(el).map((row) => row.dataset['id'])).toEqual([
      'run-1',
      'step-1',
      'tool-1',
      'step-2'
    ]);
    expect(rowsOf(el)[1]?.textContent).toContain('plan');
    expect(rowsOf(el)[2]?.textContent).toContain('search');
  });

  it('shows an empty state before a trace is attached', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toContain('No trace attached');
  });

  it('collapses when the caret is clicked', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    el.trace = buildTrace();

    const caret = rowsOf(el)[0]?.querySelector<HTMLElement>('.toggle');
    caret?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(rowsOf(el)).toHaveLength(1);
  });

  it('emits tp-select when a row is clicked', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    const selected: string[] = [];
    el.addEventListener('tp-select', (event) => {
      selected.push((event as CustomEvent<{ id: string }>).detail.id);
    });
    el.trace = buildTrace();

    rowsOf(el)[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(selected).toEqual(['step-1']);
    expect(rowsOf(el)[1]?.dataset['selected']).toBe('true');
  });

  it('filters through the query attribute', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    el.trace = buildTrace();
    el.setAttribute('query', 'search');

    expect(rowsOf(el).map((row) => row.dataset['id'])).toEqual(['run-1', 'tool-1']);
    expect(rowsOf(el)[0]?.dataset['matched']).toBe('false');
    expect(rowsOf(el)[1]?.dataset['matched']).toBe('true');
  });

  it('re-renders while the trace streams', () => {
    const trace = buildTrace();
    const el = mount<TraceTimelineElement>('tp-timeline');
    el.trace = trace;
    expect(rowsOf(el)).toHaveLength(4);

    trace.push({ type: 'tool.result', id: 'tool-1', output: 'sunny' });
    trace.push({ type: 'step.start', id: 'step-3', kind: 'message', parentId: 'run-1', label: 'final' });

    expect(rowsOf(el)).toHaveLength(5);
    expect(rowsOf(el).at(-1)?.dataset['id']).toBe('step-3');
  });

  it('renders a stats bar when summary is set', () => {
    const el = mount<TraceTimelineElement>('tp-timeline');
    el.setAttribute('summary', '');
    el.trace = buildTrace();

    const stats = el.shadowRoot?.querySelector('.stats');
    expect(stats).toBeTruthy();
    expect(stats?.textContent).toContain('steps');
    expect(stats?.textContent).toContain('4');
  });
});

describe('<tp-reasoning>', () => {
  it('renders the reasoning channel of the first reasoning step', () => {
    const el = mount<TraceReasoningElement>('tp-reasoning');
    el.trace = buildTrace();

    expect(el.shadowRoot?.querySelector('.body')?.textContent).toBe('先检索天气');
  });

  it('toggles open state and reflects it as the collapsed attribute', () => {
    const el = mount<TraceReasoningElement>('tp-reasoning');
    el.trace = buildTrace();

    const body = () => el.shadowRoot?.querySelector<HTMLElement>('.body');
    expect(body()?.dataset['open']).toBe('true');

    el.shadowRoot?.querySelector<HTMLElement>('.summary')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(body()?.dataset['open']).toBe('false');
    expect(el.hasAttribute('collapsed')).toBe(true);
  });

  it('honours node-id and keeps updating as text streams in', () => {
    const trace = buildTrace();
    const el = mount<TraceReasoningElement>('tp-reasoning');
    el.setAttribute('node-id', 'step-1');
    el.trace = trace;

    expect(el.shadowRoot?.querySelector('.body')?.textContent).toBe('先检索天气');

    trace.push({ type: 'step.delta', id: 'step-1', channel: 'reasoning', text: '，再对比' });
    expect(el.shadowRoot?.querySelector('.body')?.textContent).toBe('先检索天气，再对比');

    el.setAttribute('node-id', 'nope');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toContain('No reasoning');
  });
});
