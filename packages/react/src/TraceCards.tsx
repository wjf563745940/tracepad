import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { formatDuration, kindColor, stepCards } from '@tracepad/headless';
import type { StepCard, TraceLike } from '@tracepad/headless';

export interface TraceCardsProps {
  trace: TraceLike;
  onToggle?: (payload: { id: string; expanded: boolean }) => void;
}

/**
 * React port of `tp-cards`. No logic of its own — the rows come from
 * `stepCards()`. The initial render is synchronous, so it works under
 * `renderToString` too.
 */
export function TraceCards({ trace, onToggle }: TraceCardsProps): ReactElement {
  const [cards, setCards] = useState<StepCard[]>(() => stepCards(trace.snapshot()));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCards(stepCards(trace.snapshot()));
    return trace.subscribe(() => setCards(stepCards(trace.snapshot())));
  }, [trace]);

  const toggle = (id: string): void => {
    const expanded = !open[id];
    setOpen((prev) => ({ ...prev, [id]: expanded }));
    onToggle?.({ id, expanded });
  };

  return (
    <div className="tp-cards">
      {cards.map((card) => {
        const isOpen = Boolean(open[card.id]);
        return (
          <div key={card.id} className="tp-card" data-id={card.id}>
            <div className="tp-card-head" onClick={() => toggle(card.id)}>
              <span className="tp-card-chev">{isOpen ? '▾' : '▸'}</span>
              <span className="tp-card-dot" data-status={card.status} />
              <span className="tp-card-title" style={{ color: kindColor(card.kind) }}>
                {card.title}
              </span>
              <span className="tp-card-dur">
                {card.durationMs === null ? '' : formatDuration(card.durationMs)}
              </span>
            </div>
            {isOpen && (
              <div className="tp-card-body">
                {card.reasoning.trim() ? <pre className="tp-code">{card.reasoning}</pre> : null}
                {card.args ? <pre className="tp-code">{card.args}</pre> : null}
                {card.result ? <pre className="tp-code">{card.result}</pre> : null}
                {card.error ? <pre className="tp-code">{card.error}</pre> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
