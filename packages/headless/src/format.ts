import type { StepKind, TraceNode } from '@tracepad/core';

/** Display helpers shared by every render layer — pure, no DOM, no framework. */

export type StatusTone = 'ok' | 'error' | 'running' | 'idle';

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function nodeDuration(node: TraceNode, now: number = Date.now()): string {
  if (node.startedAt === undefined) return '';
  return formatDuration(Math.max(0, (node.endedAt ?? now) - node.startedAt));
}

export function statusTone(node: TraceNode): StatusTone {
  switch (node.status) {
    case 'error':
      return 'error';
    case 'running':
      return 'running';
    case 'ok':
      return 'ok';
    default:
      return 'idle';
  }
}

export function statusLabel(node: TraceNode, now: number = Date.now()): string {
  if (node.status === 'error') return 'error';
  if (node.status === 'aborted') return 'aborted';
  const duration = nodeDuration(node, now);
  if (node.status === 'running') return duration || 'running';
  return duration;
}

export function firstLine(text: string, max = 80): string {
  const line = text.trim().split(/\r?\n/, 1)[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * Colour per step kind. Lives here rather than in a render layer so the
 * Web Component, Vue and React skins stay in visual sync.
 */
export function kindColor(kind: StepKind): string {
  switch (kind) {
    case 'reasoning':
      return '#7F77DD';
    case 'tool':
      return '#378ADD';
    case 'message':
      return '#1D9E75';
    case 'subagent':
      return '#EF9F27';
    case 'error':
      return '#E24B4A';
    default:
      return '#888780';
  }
}

/** label > tool name > first line of content > "reasoning" > kind */
export function rowLabel(node: TraceNode): string {
  if (node.label) return node.label;
  if (node.tool?.name) return node.tool.name;
  const content = firstLine(node.content);
  if (content) return content;
  if (node.reasoning.trim()) return 'reasoning';
  return node.kind;
}
