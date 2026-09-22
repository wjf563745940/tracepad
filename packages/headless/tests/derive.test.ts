import { describe, expect, it } from 'vitest';
import { applyEvent, emptyTree } from '@tracepad/core';
import type { TraceEvent, TraceTree } from '@tracepad/core';
import { durationBars, mediaItems, stepCards, usageBreakdown } from '../src/index.js';

function buildTree(): TraceTree {
  let tree = emptyTree('run-1');
  const push = (event: TraceEvent): void => {
    tree = applyEvent(tree, event);
  };

  push({ type: 'run.start', id: 'run-1', ts: 0 });
  push({
    type: 'tool.call',
    id: 'tool-1',
    parentId: 'run-1',
    name: 'search_web',
    args: '{"q":"西湖"}',
    ts: 10
  });
  push({ type: 'tool.result', id: 'tool-1', output: '{"top":"环湖线"}', ts: 60 });
  push({
    type: 'media',
    id: 'tool-1',
    media: { kind: 'image', url: '/media/route.svg', label: '路线图' }
  });
  push({ type: 'step.start', id: 'msg-1', kind: 'message', parentId: 'run-1', ts: 70 });
  push({ type: 'step.delta', id: 'msg-1', channel: 'content', text: '明天适合骑行。' });
  push({ type: 'step.end', id: 'msg-1', status: 'ok', ts: 100 });
  push({ type: 'usage', usage: { inputTokens: 120, outputTokens: 40 } });
  push({ type: 'run.end', status: 'ok', ts: 120 });

  return tree;
}

describe('stepCards', () => {
  it('emits one card per step and skips the run root', () => {
    const cards = stepCards(buildTree());
    expect(cards.map((card) => card.id)).toEqual(['tool-1', 'msg-1']);
  });

  it('carries tool arguments and result onto the card', () => {
    const [first] = stepCards(buildTree());
    expect(first?.title).toBe('search_web');
    expect(first?.args).toBe('{"q":"西湖"}');
    expect(first?.result).toBe('{"top":"环湖线"}');
    expect(first?.mediaCount).toBe(1);
  });

  it('computes duration from the step timestamps', () => {
    const [first] = stepCards(buildTree());
    expect(first?.durationMs).toBe(50);
    expect(first?.status).toBe('ok');
  });

  it('falls back to content when a step has no tool', () => {
    const cards = stepCards(buildTree());
    expect(cards[1]?.summary).toBe('明天适合骑行。');
    expect(cards[1]?.args).toBeUndefined();
  });
});

describe('usageBreakdown', () => {
  it('totals tokens from the run', () => {
    const usage = usageBreakdown(buildTree());
    expect(usage).toMatchObject({ inputTokens: 120, outputTokens: 40, totalTokens: 160 });
    expect(usage.cost).toBeNull();
  });

  it('counts steps including the root', () => {
    expect(usageBreakdown(buildTree()).steps).toBe(3);
  });
});

describe('durationBars', () => {
  it('positions each step on the run timeline', () => {
    const bars = durationBars(buildTree());
    expect(bars).toHaveLength(2);

    const first = bars[0];
    expect(first?.id).toBe('tool-1');
    expect(first?.durationMs).toBe(50);
    expect(first?.offsetPct).toBeCloseTo(8.33, 1);
  });

  it('keeps every bar inside the track', () => {
    for (const bar of durationBars(buildTree())) {
      expect(bar.offsetPct).toBeGreaterThanOrEqual(0);
      expect(bar.offsetPct + bar.widthPct).toBeLessThanOrEqual(100.5);
    }
  });
});

describe('mediaItems', () => {
  it('flattens attachments with the step that produced them', () => {
    const items = mediaItems(buildTree());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      nodeId: 'tool-1',
      stepLabel: 'search_web',
      kind: 'image',
      url: '/media/route.svg',
      label: '路线图'
    });
  });

  it('returns nothing when no step produced media', () => {
    let tree = emptyTree('run-1');
    tree = applyEvent(tree, { type: 'run.start', id: 'run-1', ts: 0 });
    expect(mediaItems(tree)).toEqual([]);
  });
});
