type Listener = (query: string) => void;

const listeners = new Set<Listener>();
let query = '';

/** Minimal bridge so one search box drives all three render layers. */
export const store = {
  get query(): string {
    return query;
  },
  set(next: string): void {
    query = next;
    for (const listener of listeners) listener(next);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(query);
    return () => {
      listeners.delete(listener);
    };
  }
};
