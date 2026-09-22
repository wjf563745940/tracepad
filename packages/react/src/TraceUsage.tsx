import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { durationBars, formatDuration, kindColor, usageBreakdown } from '@tracepad/headless';
import type { DurationBar, TraceLike, UsageBreakdown } from '@tracepad/headless';

export interface TraceUsageProps {
  trace: TraceLike;
}

interface Render {
  usage: UsageBreakdown;
  bars: DurationBar[];
}

/** React port of `tp-usage`: token totals plus per-step duration bars. */
export function TraceUsage({ trace }: TraceUsageProps): ReactElement {
  const [render, setRender] = useState<Render>(() => {
    const tree = trace.snapshot();
    return { usage: usageBreakdown(tree), bars: durationBars(tree) };
  });

  useEffect(() => {
    const sync = (): void => {
      const tree = trace.snapshot();
      setRender({ usage: usageBreakdown(tree), bars: durationBars(tree) });
    };
    sync();
    return trace.subscribe(sync);
  }, [trace]);

  const { usage, bars } = render;
  const metrics: Array<[string, string]> = [
    ['输入 token', String(usage.inputTokens)],
    ['输出 token', String(usage.outputTokens)],
    ['合计', String(usage.totalTokens)],
    ['步骤', String(usage.steps)]
  ];
  if (usage.cost !== null) metrics.push(['成本', `$${usage.cost.toFixed(4)}`]);

  const peak = Math.max(...usage.perStep.map((step) => step.tokens)) || 1;
  const slowest = Math.max(...bars.map((bar) => bar.durationMs)) || 1;

  return (
    <div className="tp-usage">
      <div className="tp-metrics">
        {metrics.map(([key, value]) => (
          <div key={key} className="tp-metric">
            <div className="tp-metric-k">{key}</div>
            <div className="tp-metric-v">{value}</div>
          </div>
        ))}
      </div>

      {usage.perStep.length > 0 && (
        <>
          <div className="tp-section">token 分布</div>
          <div className="tp-bars">
            {usage.perStep.map((step) => (
              <div key={step.id} className="tp-bar-row" data-id={step.id}>
                <span className="tp-bar-label">{step.label}</span>
                <div className="tp-bar-track">
                  <div
                    className="tp-bar-fill"
                    style={{
                      width: `${Math.max(2, (step.tokens / peak) * 100)}%`,
                      background: kindColor(step.kind)
                    }}
                  />
                </div>
                <span className="tp-bar-value">{step.tokens}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {bars.length > 0 && (
        <>
          <div className="tp-section">耗时</div>
          <div className="tp-bars">
            {bars.map((bar) => (
              <div key={bar.id} className="tp-bar-row" data-id={bar.id}>
                <span className="tp-bar-label">{bar.label}</span>
                <div className="tp-bar-track">
                  <div
                    className="tp-bar-fill"
                    style={{
                      width: `${Math.max(2, (bar.durationMs / slowest) * 100)}%`,
                      background: kindColor(bar.kind)
                    }}
                  />
                </div>
                <span className="tp-bar-value">{formatDuration(bar.durationMs)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
