import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TraceTimeline } from '@tracepad/react';
import type { TraceLike } from '@tracepad/headless';
import { store } from './store.js';

export function mountReactPanel(host: HTMLElement, trace: TraceLike): void {
  function Panel(): JSX.Element {
    const [query, setQuery] = useState(store.query);
    useEffect(() => {
      const stop = store.subscribe(setQuery);
      return () => {
        stop();
      };
    }, []);
    return <TraceTimeline trace={trace} query={query} summary />;
  }

  createRoot(host).render(<Panel />);
}
