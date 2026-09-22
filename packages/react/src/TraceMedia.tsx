import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { mediaItems } from '@tracepad/headless';
import type { MediaItem, TraceLike } from '@tracepad/headless';

export interface TraceMediaProps {
  trace: TraceLike;
  onSelect?: (payload: { key: string; item: MediaItem }) => void;
}

/**
 * React port of `tp-media`. Opening a lightbox is the host app's job, so the
 * component only reports which item was picked.
 */
export function TraceMedia({ trace, onSelect }: TraceMediaProps): ReactElement {
  const [items, setItems] = useState<MediaItem[]>(() => mediaItems(trace.snapshot()));

  useEffect(() => {
    setItems(mediaItems(trace.snapshot()));
    return trace.subscribe(() => setItems(mediaItems(trace.snapshot())));
  }, [trace]);

  return (
    <div className="tp-media">
      {items.map((item) => (
        <div
          key={item.key}
          className="tp-media-item"
          data-key={item.key}
          onClick={() => onSelect?.({ key: item.key, item })}
        >
          {item.kind === 'image' ? (
            <img className="tp-media-thumb" src={item.url} alt={item.alt ?? ''} />
          ) : (
            <div className="tp-media-fallback">{item.kind}</div>
          )}
          <div className="tp-media-cap">{item.label ?? item.stepLabel}</div>
        </div>
      ))}
    </div>
  );
}
