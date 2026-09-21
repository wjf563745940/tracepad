import type { TraceNode, TraceTree } from '@tracepad/core';
import type { TraceStats, ViewFilter, ViewState, VisibleRow } from './types.js';

function matches(node: TraceNode, filter: ViewFilter): boolean {
  if (filter.kinds && filter.kinds.length > 0 && !filter.kinds.includes(node.kind)) return false;
  const query = filter.query?.trim().toLowerCase();
  if (query) {
    const haystack = [node.label ?? '', node.content, node.reasoning, node.tool?.name ?? '']
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function isFiltering(filter: ViewFilter): boolean {
  return Boolean(filter.query?.trim()) || Boolean(filter.kinds && filter.kinds.length > 0);
}

function ancestorSet(tree: TraceTree, matchedIds: Set<string>): Set<string> {
  const ancestors = new Set<string>();
  for (const id of matchedIds) {
    let cursor = tree.nodes[id]?.parentId ?? null;
    while (cursor) {
      if (ancestors.has(cursor)) break;
      ancestors.add(cursor);
      cursor = tree.nodes[cursor]?.parentId ?? null;
    }
  }
  return ancestors;
}

export function isExpanded(state: ViewState, id: string): boolean {
  return state.expanded[id] ?? state.defaultExpanded;
}

export function visibleRows(tree: TraceTree, state: ViewState): VisibleRow[] {
  const rows: VisibleRow[] = [];
  const filtering = isFiltering(state.filter);
  const matched = new Set<string>();
  if (filtering) {
    for (const node of Object.values(tree.nodes)) {
      if (matches(node, state.filter)) matched.add(node.id);
    }
  }
  const ancestors = state.filter.keepAncestors === false ? new Set<string>() : ancestorSet(tree, matched);

  const walk = (id: string, depth: number): void => {
    const node = tree.nodes[id];
    if (!node) return;
    const hit = !filtering || matched.has(id);
    if (filtering && !hit && !ancestors.has(id)) return;

    const expanded = isExpanded(state, id);
    rows.push({
      node,
      depth,
      hasChildren: node.childIds.length > 0,
      expanded,
      selected: state.selectedId === id,
      matched: hit,
      isAncestorOfMatch: filtering && !hit
    });

    if (!expanded) return;
    for (const childId of node.childIds) walk(childId, depth + 1);
  };

  for (const rootId of tree.rootIds) walk(rootId, 0);
  return rows;
}

export function traceStats(tree: TraceTree): TraceStats {
  const byKind: Record<string, number> = {};
  let errors = 0;
  let running = 0;

  for (const node of Object.values(tree.nodes)) {
    byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
    if (node.status === 'error') errors += 1;
    if (node.status === 'running') running += 1;
  }

  const root = tree.nodes[tree.runId];
  const durationMs =
    root && root.startedAt !== undefined && root.endedAt !== undefined
      ? root.endedAt - root.startedAt
      : null;

  return {
    totalSteps: Object.keys(tree.nodes).length,
    byKind,
    errors,
    running,
    durationMs,
    inputTokens: tree.usage.inputTokens,
    outputTokens: tree.usage.outputTokens
  };
}
