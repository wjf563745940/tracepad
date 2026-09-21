import type { StepKind, TraceNode, TraceTree } from '@tracepad/core';

export interface ViewFilter {
  kinds?: StepKind[];
  query?: string;
  keepAncestors?: boolean;
}

export interface ViewState {
  expanded: Record<string, boolean>;
  defaultExpanded: boolean;
  selectedId: string | null;
  filter: ViewFilter;
  follow: boolean;
}

export interface VisibleRow {
  node: TraceNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  matched: boolean;
  isAncestorOfMatch: boolean;
}

export interface TraceStats {
  totalSteps: number;
  byKind: Record<string, number>;
  errors: number;
  running: number;
  durationMs: number | null;
  inputTokens?: number;
  outputTokens?: number;
}

export interface TraceLike {
  snapshot(): TraceTree;
  subscribe(listener: (tree: TraceTree) => void): () => void;
}
