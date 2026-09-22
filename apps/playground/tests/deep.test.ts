import { describe, expect, it } from 'vitest';
import { createTrace, openaiChat } from '@tracepad/core';
import type { SseChunk, Trace, TraceEvent } from '@tracepad/core';
import { durationBars, mediaItems, stepCards, usageBreakdown } from '@tracepad/headless';
import { MULTIMODAL_SCRIPT } from '../src/script-multimodal.js';

/**
 * The script is the demo's whole payload: if it stays shallow, every view looks
 * empty no matter how good the components are. These assertions pin its depth.
 */

async function* sse(chunks: unknown[]): AsyncGenerator<SseChunk> {
  for (const chunk of chunks) yield `data: ${JSON.stringify(chunk)}\n\n`;
}

async function runScript(): Promise<Trace<SseChunk>> {
  const adapter = openaiChat();
  const trace = createTrace<SseChunk>({ adapter });

  for (let i = 0; i < MULTIMODAL_SCRIPT.length; i += 1) {
    const phase = MULTIMODAL_SCRIPT[i];
    if (!phase) continue;
    const isLast = i === MULTIMODAL_SCRIPT.length - 1;

    if (phase.kind === 'push') {
      for (const event of phase.events) trace.push(event as TraceEvent);
      continue;
    }
    for await (const event of adapter.toEvents(sse(phase.chunks))) {
      // The adapter closes every stream; only the final turn should end the run.
      if (event.type === 'run.end' && !isLast) continue;
      trace.push(event);
    }
  }

  return trace;
}

describe('multimodal script depth', () => {
  it('builds a deep tree and actually closes the run', async () => {
    const tree = (await runScript()).snapshot();
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(10);
    expect(tree.status).toBe('ok');
  });

  it('nests a sub-agent instead of staying flat', async () => {
    const tree = (await runScript()).snapshot();
    const sub = Object.values(tree.nodes).find((node) => node.kind === 'subagent');
    expect(sub).toBeTruthy();
    expect(sub?.childIds.length).toBeGreaterThan(0);
    // The image call belongs to the sub-agent, not to the run root.
    expect(sub?.childIds.some((id) => id.includes('call_image'))).toBe(true);
  });

  it('contains a failed call so error styling is exercised', async () => {
    const tree = (await runScript()).snapshot();
    const failed = Object.values(tree.nodes).filter((node) => node.status === 'error');
    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0]?.tool?.error).toBeTruthy();
  });

  it('attaches three media artefacts to the calls that made them', async () => {
    const tree = (await runScript()).snapshot();
    const items = mediaItems(tree);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((item) => item.nodeId)).size).toBe(3);
  });

  it('attributes tokens per step, not just to the run', async () => {
    const tree = (await runScript()).snapshot();
    const usage = usageBreakdown(tree);
    expect(usage.perStep.length).toBeGreaterThanOrEqual(6);
    expect(usage.inputTokens).toBeGreaterThan(1000);
    // Per-step attribution must not inflate the run total.
    const summed = usage.perStep.reduce((sum, step) => sum + step.tokens, 0);
    expect(summed).toBe(usage.totalTokens);
  });

  it('gives every step a duration', async () => {
    const tree = (await runScript()).snapshot();
    const cards = stepCards(tree);
    expect(cards.length).toBeGreaterThan(8);
    expect(cards.every((card) => card.durationMs !== null)).toBe(true);
    expect(durationBars(tree).length).toBeGreaterThan(8);
  });

  it('spaces the script unevenly so durations are not uniform', () => {
    const gaps = MULTIMODAL_SCRIPT.map((phase) => phase.gap ?? 0).filter((gap) => gap > 0);
    const slowest = Math.max(...gaps);
    const fastest = Math.min(...gaps);
    // A believable gantt needs some steps to be several times slower than others.
    expect(slowest / fastest).toBeGreaterThan(10);
  });
});
