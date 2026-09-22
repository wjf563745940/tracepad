import type { TraceEvent, TraceNode, TraceTree } from './types.js';

function nextTree(tree: TraceTree): TraceTree {
  return {
    runId: tree.runId,
    status: tree.status,
    nodes: { ...tree.nodes },
    rootIds: [...tree.rootIds],
    usage: { ...tree.usage },
    version: tree.version + 1
  };
}

function ensureNode(next: TraceTree, id: string, init: Pick<TraceNode, 'kind'> & Partial<TraceNode>): TraceNode {
  const existing = next.nodes[id];
  const node: TraceNode = existing
    ? { ...existing }
    : {
        id,
        parentId: init.parentId ?? next.runId,
        kind: init.kind,
        ...(init.label !== undefined ? { label: init.label } : {}),
        status: 'running',
        // Carried over explicitly: without this a fresh node loses its start
        // time, and every duration view (timeline, cards, gantt) stays empty.
        ...(init.startedAt !== undefined ? { startedAt: init.startedAt } : {}),
        ...(init.endedAt !== undefined ? { endedAt: init.endedAt } : {}),
        ...(init.usage !== undefined ? { usage: init.usage } : {}),
        ...(init.media !== undefined ? { media: init.media } : {}),
        content: '',
        reasoning: '',
        childIds: [],
        ...(init.tool ? { tool: init.tool } : {})
      };
  next.nodes[id] = node;
  const parentId = node.parentId;
  if (parentId && parentId !== id && next.nodes[parentId]) {
    const parent = next.nodes[parentId];
    if (parent && !parent.childIds.includes(id)) {
      next.nodes[parentId] = { ...parent, childIds: [...parent.childIds, id] };
    }
  } else if (!existing) {
    next.rootIds = next.rootIds.includes(id) ? next.rootIds : [...next.rootIds, id];
  }
  return next.nodes[id] as TraceNode;
}

function appendChannel(node: TraceNode, channel: string, text: string): TraceNode {
  if (channel === 'content') return { ...node, content: node.content + text };
  if (channel === 'reasoning') return { ...node, reasoning: node.reasoning + text };
  if (channel === 'tool_args') {
    const tool = node.tool ?? { name: '' };
    return { ...node, tool: { ...tool, args: (tool.args ?? '') + text } };
  }
  if (channel === 'tool_result') {
    const tool = node.tool ?? { name: '' };
    return { ...node, tool: { ...tool, result: (tool.result ?? '') + text } };
  }
  return node;
}

export function applyEvent(tree: TraceTree, event: TraceEvent): TraceTree {
  const next = nextTree(tree);
  const ts = 'ts' in event && typeof event.ts === 'number' ? event.ts : Date.now();

  switch (event.type) {
    case 'run.start': {
      next.runId = event.id;
      next.status = 'running';
      ensureNode(next, event.id, { kind: 'run', parentId: null, label: event.label, startedAt: ts });
      return next;
    }
    case 'step.start': {
      ensureNode(next, event.id, {
        kind: event.kind,
        parentId: event.parentId ?? next.runId,
        label: event.label,
        startedAt: ts
      });
      return next;
    }
    case 'step.delta': {
      const existing = next.nodes[event.id];
      const base = existing
        ? existing
        : ensureNode(next, event.id, { kind: 'custom', parentId: next.runId, startedAt: ts });
      next.nodes[event.id] = appendChannel(base, event.channel, event.text);
      return next;
    }
    case 'tool.call': {
      ensureNode(next, event.id, {
        kind: 'tool',
        parentId: event.parentId ?? next.runId,
        label: event.name,
        startedAt: ts,
        tool: { name: event.name, ...(event.args !== undefined ? { args: event.args } : {}) }
      });
      return next;
    }
    case 'tool.result': {
      const existing = next.nodes[event.id];
      const base = existing
        ? existing
        : ensureNode(next, event.id, { kind: 'tool', parentId: next.runId, startedAt: ts, tool: { name: '' } });
      const tool = base.tool ?? { name: '' };
      next.nodes[event.id] = {
        ...base,
        status: event.error ? 'error' : 'ok',
        endedAt: ts,
        tool: {
          ...tool,
          ...(event.output !== undefined ? { result: (tool.result ?? '') + event.output } : {}),
          ...(event.error !== undefined ? { error: event.error } : {})
        }
      };
      return next;
    }
    case 'media': {
      const existing = next.nodes[event.id];
      const base = existing
        ? existing
        : ensureNode(next, event.id, { kind: 'custom', parentId: next.runId, startedAt: ts });
      next.nodes[event.id] = { ...base, media: [...(base.media ?? []), event.media] };
      return next;
    }
    case 'step.end': {
      const existing = next.nodes[event.id];
      if (!existing) return next;
      next.nodes[event.id] = {
        ...existing,
        status: event.status ?? 'ok',
        endedAt: ts,
        ...(event.error !== undefined ? { label: event.error } : {})
      };
      return next;
    }
    case 'usage': {
      next.usage = {
        ...next.usage,
        inputTokens: (next.usage.inputTokens ?? 0) + (event.usage.inputTokens ?? 0),
        outputTokens: (next.usage.outputTokens ?? 0) + (event.usage.outputTokens ?? 0)
      };
      return next;
    }
    case 'run.end': {
      next.status = event.status ?? 'ok';
      const root = next.nodes[next.runId];
      if (root) next.nodes[next.runId] = { ...root, status: next.status, endedAt: ts };
      return next;
    }
    default:
      return next;
  }
}
