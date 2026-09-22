// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createTrace } from '@tracepad/core';
import {
  TraceCardsElement,
  TraceGanttElement,
  TraceMediaElement,
  TraceUsageElement
} from '../src/index.js';

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
  trace.push({ type: 'step.start', id: 'msg-1', kind: 'message', parentId: 'run-1' });
  trace.push({ type: 'step.delta', id: 'msg-1', channel: 'content', text: '明天适合骑行。' });
  trace.push({ type: 'step.end', id: 'msg-1', status: 'ok' });
  trace.push({ type: 'usage', usage: { inputTokens: 120, outputTokens: 40 } });
  trace.push({ type: 'run.end', status: 'ok' });
  return trace;
}

function mount<T extends HTMLElement>(tag: string): T {
  const el = document.createElement(tag) as T;
  document.body.append(el);
  return el;
}

function all<T extends HTMLElement>(el: HTMLElement, selector: string): T[] {
  return Array.from(el.shadowRoot?.querySelectorAll<T>(selector) ?? []);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<tp-cards>', () => {
  it('renders one card per step, closed by default', () => {
    const el = mount<TraceCardsElement>('tp-cards');
    el.trace = buildTrace();

    const cards = all<HTMLElement>(el, '.card');
    expect(cards.map((card) => card.dataset['id'])).toEqual(['tool-1', 'msg-1']);
    expect(el.shadowRoot?.querySelector<HTMLElement>('.body')?.dataset['open']).toBe('false');
  });

  it('reveals arguments and result when opened', () => {
    const el = mount<TraceCardsElement>('tp-cards');
    el.trace = buildTrace();

    el.shadowRoot?.querySelector<HTMLElement>('.head')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    const body = el.shadowRoot?.querySelector('.body');
    expect(body?.dataset['open']).toBe('true');
    expect(body?.textContent).toContain('{"q":"西湖"}');
    expect(body?.textContent).toContain('{"top":"环湖线"}');
  });

  it('shows an empty state before a trace is attached', () => {
    const el = mount<TraceCardsElement>('tp-cards');
    expect(el.shadowRoot?.querySelector('.empty')?.textContent).toContain('No trace attached');
  });
});

describe('<tp-usage>', () => {
  it('shows token totals and one bar per timed step', () => {
    const el = mount<TraceUsageElement>('tp-usage');
    el.trace = buildTrace();

    const metrics = all<HTMLElement>(el, '.metric').map((box) => box.textContent);
    expect(metrics.join(' ')).toContain('120');
    expect(metrics.join(' ')).toContain('40');

    const fills = all<HTMLElement>(el, '.bar-fill');
    expect(fills).toHaveLength(2);
    expect(fills[0]?.style.width).toMatch(/%$/);
  });
});

describe('<tp-gantt>', () => {
  it('draws a positioned bar per step', () => {
    const el = mount<TraceGanttElement>('tp-gantt');
    el.trace = buildTrace();

    const fills = all<HTMLElement>(el, '.gantt-fill');
    expect(fills).toHaveLength(2);
    expect(fills[0]?.style.left).toMatch(/%$/);
    expect(fills[0]?.style.width).toMatch(/%$/);
    expect(el.shadowRoot?.querySelector('.foot')?.textContent).toContain('最长一步');
  });
});

describe('<tp-media>', () => {
  it('renders an image per attachment', () => {
    const el = mount<TraceMediaElement>('tp-media');
    el.trace = buildTrace();

    const img = el.shadowRoot?.querySelector<HTMLImageElement>('img');
    expect(img?.getAttribute('src')).toBe('/media/route.svg');
    expect(el.shadowRoot?.querySelector('.cap')?.textContent).toBe('路线图');
  });

  it('emits tp-select with the item when clicked', () => {
    const el = mount<TraceMediaElement>('tp-media');
    const picked: string[] = [];
    el.addEventListener('tp-select', (event) => {
      picked.push((event as CustomEvent<{ item: { url: string } }>).detail.item.url);
    });
    el.trace = buildTrace();

    el.shadowRoot?.querySelector<HTMLElement>('.item')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(picked).toEqual(['/media/route.svg']);
  });
});
