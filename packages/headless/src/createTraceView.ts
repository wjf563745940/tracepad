import type { TraceTree } from '@tracepad/core';
import { traceStats, visibleRows } from './rows.js';
import type { TraceLike, TraceStats, ViewFilter, ViewState, VisibleRow } from './types.js';

export interface TraceViewOptions {
  defaultExpanded?: boolean;
  follow?: boolean;
}

export interface TraceView {
  readonly state: ViewState;
  subscribe(listener: (state: ViewState) => void): () => void;
  toggle(id: string): void;
  setExpanded(id: string, expanded: boolean): void;
  expandAll(): void;
  collapseAll(): void;
  select(id: string | null): void;
  setFilter(filter: ViewFilter): void;
  setFollow(follow: boolean): void;
  rows(): VisibleRow[];
  stats(): TraceStats;
  tree(): TraceTree;
  latestNodeId(): string | null;
  dispose(): void;
}

export function createTraceView(trace: TraceLike, options: TraceViewOptions = {}): TraceView {
  let tree = trace.snapshot();
  const initialIds = Object.keys(tree.nodes);
  let latest: string | null = initialIds.length > 0 ? initialIds[initialIds.length - 1] ?? null : null;

  let state: ViewState = {
    expanded: {},
    defaultExpanded: options.defaultExpanded ?? true,
    selectedId: null,
    filter: {},
    follow: options.follow ?? true
  };

  const listeners = new Set<(state: ViewState) => void>();
  const emit = (): void => {
    for (const listener of listeners) listener(state);
  };

  const patch = (next: Partial<ViewState>): void => {
    state = { ...state, ...next };
    emit();
  };

  const unsubscribe = trace.subscribe((next) => {
    const known = new Set(Object.keys(tree.nodes));
    for (const id of Object.keys(next.nodes)) {
      if (!known.has(id)) latest = id;
    }
    tree = next;
    emit();
  });

  return {
    get state() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    toggle(id) {
      patch({ expanded: { ...state.expanded, [id]: !(state.expanded[id] ?? state.defaultExpanded) } });
    },
    setExpanded(id, expanded) {
      patch({ expanded: { ...state.expanded, [id]: expanded } });
    },
    expandAll() {
      patch({ expanded: {}, defaultExpanded: true });
    },
    collapseAll() {
      patch({ expanded: {}, defaultExpanded: false });
    },
    select(id) {
      patch({ selectedId: id });
    },
    setFilter(filter) {
      patch({ filter });
    },
    setFollow(follow) {
      patch({ follow });
    },
    rows() {
      return visibleRows(tree, state);
    },
    stats() {
      return traceStats(tree);
    },
    tree() {
      return tree;
    },
    latestNodeId() {
      return latest;
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    }
  };
}
