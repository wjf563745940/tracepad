import { applyEvent } from './applyEvent.js';
import { emptyTree } from './types.js';
import type { TraceAdapter, TraceEvent, TraceTree } from './types.js';

export interface TraceOptions<TChunk> {
  adapter?: TraceAdapter<TChunk>;
  runId?: string;
}

export interface Trace<TChunk> {
  push(event: TraceEvent): void;
  consume(source: AsyncIterable<TChunk> | Iterable<TChunk>): Promise<void>;
  subscribe(listener: (tree: TraceTree) => void): () => void;
  snapshot(): TraceTree;
  reset(): void;
}

export function createTrace<TChunk = TraceEvent>(options: TraceOptions<TChunk> = {}): Trace<TChunk> {
  const { adapter, runId = 'run' } = options;
  let tree = emptyTree(runId);
  const listeners = new Set<(tree: TraceTree) => void>();

  const emit = (): void => {
    for (const listener of listeners) listener(tree);
  };

  return {
    push(event) {
      tree = applyEvent(tree, event);
      emit();
    },
    async consume(source) {
      const events: AsyncIterable<TraceEvent> | Iterable<TraceEvent> = adapter
        ? (adapter.toEvents(source) as AsyncIterable<TraceEvent>)
        : (source as unknown as AsyncIterable<TraceEvent>);
      for await (const event of events) {
        tree = applyEvent(tree, event);
        emit();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(tree);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot() {
      return tree;
    },
    reset() {
      tree = emptyTree(runId);
      emit();
    }
  };
}
