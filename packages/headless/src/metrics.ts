import type { StepKind, TraceTree } from '@tracepad/core';
import { rowLabel } from './format.js';

/** Token and cost totals for a run. */
export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
  steps: number;
}

export function usageBreakdown(tree: TraceTree): UsageBreakdown {
  const inputTokens = tree.usage.inputTokens ?? 0;
  const outputTokens = tree.usage.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cost: tree.usage.cost ?? null,
    steps: Object.keys(tree.nodes).length
  };
}

/**
 * One bar per step, positioned on the run's timeline. Percentages are
 * pre-computed so every render layer draws the same picture.
 */
export interface DurationBar {
  id: string;
  label: string;
  kind: StepKind;
  durationMs: number;
  offsetPct: number;
  widthPct: number;
  running: boolean;
}

export function durationBars(tree: TraceTree, now: number = Date.now()): DurationBar[] {
  const root = tree.nodes[tree.runId];
  const runStart = root?.startedAt ?? 0;
  const runEnd = root?.endedAt ?? now;
  const total = Math.max(1, runEnd - runStart);

  const bars: DurationBar[] = [];
  for (const node of Object.values(tree.nodes)) {
    if (node.id === tree.runId || node.startedAt === undefined) continue;

    const start = node.startedAt - runStart;
    const end = (node.endedAt ?? now) - runStart;
    const durationMs = Math.max(0, end - start);
    const offsetPct = Math.min(100, (start / total) * 100);
    const widthPct = Math.max(1.5, Math.min(100 - offsetPct, (durationMs / total) * 100));

    bars.push({
      id: node.id,
      label: rowLabel(node),
      kind: node.kind,
      durationMs,
      offsetPct,
      widthPct,
      running: node.status === 'running'
    });
  }

  bars.sort((a, b) => a.offsetPct - b.offsetPct);
  return bars;
}
