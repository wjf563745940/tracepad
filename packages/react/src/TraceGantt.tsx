import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { durationBars, formatDuration, kindColor, traceStats } from '@tracepad/headless';
import type { DurationBar, TraceLike } from '@tracepad/headless';

export interface TraceGanttProps {
  trace: TraceLike;
}

interface Render {
  bars: DurationBar[];
  totalMs: number | null;
}

/** React port of `tp-gantt`: steps positioned on the run's real timeline. */
export function TraceGantt({ trace }: TraceGanttProps): ReactElement {
  const [render, setRender] = useState<Render>(() => {
    const tree = trace.snapshot();
    return { bars: durationBars(tree), totalMs: traceStats(tree).durationMs };
  });

  useEffect(() => {
    const sync = (): void => {
      const tree = trace.snapshot();
      setRender({ bars: durationBars(tree), totalMs: traceStats(tree).durationMs });
    };
    sync();
    return trace.subscribe(sync);
  }, [trace]);

  const { bars, totalMs } = render;
  const slowest = bars.reduce<DurationBar | null>(
    (acc, bar) => (acc === null || bar.durationMs > acc.durationMs ? bar : acc),
    null
  );

  return (
    <div className="tp-gantt">
      {bars.map((bar) => (
        <div key={bar.id} className="tp-gantt-row" data-id={bar.id}>
          <span className="tp-gantt-label">{bar.label}</span>
          <div className="tp-gantt-track">
            <div
              className="tp-gantt-fill"
              data-running={String(bar.running)}
              style={{
                left: `${bar.offsetPct}%`,
                width: `${bar.widthPct}%`,
                background: kindColor(bar.kind)
              }}
            />
          </div>
        </div>
      ))}
      <div className="tp-gantt-foot">
        {totalMs === null ? '运行中' : formatDuration(totalMs)}
        {slowest ? ` · 最长一步 ${slowest.label}` : ''}
      </div>
    </div>
  );
}
