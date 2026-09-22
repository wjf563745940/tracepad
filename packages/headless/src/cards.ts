import type { RunStatus, StepKind, TraceTree } from '@tracepad/core';
import { firstLine, rowLabel } from './format.js';

/**
 * Card-shaped view of a run: one card per step, carrying everything an
 * expandable detail panel needs. Pure — safe to call during SSR first paint.
 */
export interface StepCard {
  id: string;
  kind: StepKind;
  title: string;
  status: RunStatus;
  durationMs: number | null;
  summary: string;
  reasoning: string;
  mediaCount: number;
  depth: number;
  startedAt?: number;
  args?: string;
  result?: string;
  error?: string;
}

function depthOf(tree: TraceTree, id: string): number {
  let depth = 0;
  let cursor = tree.nodes[id]?.parentId ?? null;
  while (cursor) {
    depth += 1;
    cursor = tree.nodes[cursor]?.parentId ?? null;
    if (depth > 64) break;
  }
  return depth;
}

export function stepCards(tree: TraceTree, now: number = Date.now()): StepCard[] {
  const cards: StepCard[] = [];

  for (const node of Object.values(tree.nodes)) {
    if (node.id === tree.runId) continue;

    const durationMs =
      node.startedAt === undefined ? null : Math.max(0, (node.endedAt ?? now) - node.startedAt);
    const summary =
      node.kind === 'tool'
        ? firstLine(node.tool?.result ?? node.tool?.error ?? '')
        : firstLine(node.content || node.reasoning);

    const card: StepCard = {
      id: node.id,
      kind: node.kind,
      title: rowLabel(node),
      status: node.status,
      durationMs,
      summary,
      reasoning: node.reasoning,
      mediaCount: node.media?.length ?? 0,
      depth: depthOf(tree, node.id)
    };
    if (node.startedAt !== undefined) card.startedAt = node.startedAt;
    if (node.tool?.args) card.args = node.tool.args;
    if (node.tool?.result) card.result = node.tool.result;
    if (node.tool?.error) card.error = node.tool.error;

    cards.push(card);
  }

  // Execution order first; steps without a timestamp fall to the end.
  cards.sort((a, b) => (a.startedAt ?? Number.MAX_SAFE_INTEGER) - (b.startedAt ?? Number.MAX_SAFE_INTEGER));
  return cards;
}
