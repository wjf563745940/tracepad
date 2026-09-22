import { durationBars, formatDuration, kindColor, usageBreakdown } from '@tracepad/headless';
import type { DurationBar } from '@tracepad/headless';
import { TraceElement } from './base.js';
import { tokens, usageStyles } from './theme.js';

/**
 * `<tp-usage>` — token totals on top, per-step duration bars below.
 * Bars are scaled against the slowest step so the ranking reads at a glance.
 */
export class TraceUsageElement extends TraceElement {
  constructor() {
    super(tokens + usageStyles);
  }

  protected render(): void {
    this.clear();
    const trace = this.trace;
    if (!trace) {
      this.root.append(this.empty('No trace attached — assign element.trace'));
      return;
    }

    const tree = trace.snapshot();
    const usage = usageBreakdown(tree);

    const metrics = document.createElement('div');
    metrics.className = 'metrics';
    const parts: Array<[string, string]> = [
      ['输入 token', String(usage.inputTokens)],
      ['输出 token', String(usage.outputTokens)],
      ['合计', String(usage.totalTokens)],
      ['步骤', String(usage.steps)]
    ];
    if (usage.cost !== null) parts.push(['成本', `$${usage.cost.toFixed(4)}`]);
    for (const [key, value] of parts) metrics.append(this.metric(key, value));
    this.root.append(metrics);

    const bars = durationBars(tree);
    if (bars.length === 0) {
      this.root.append(this.empty('No timing data yet'));
      return;
    }

    const slowest = Math.max(...bars.map((bar) => bar.durationMs)) || 1;
    const wrap = document.createElement('div');
    wrap.className = 'bars';
    for (const bar of bars) wrap.append(this.barNode(bar, slowest));
    this.root.append(wrap);
  }

  private barNode(bar: DurationBar, slowest: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.dataset['id'] = bar.id;

    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = bar.label;

    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.left = '0';
    fill.style.width = `${Math.max(2, (bar.durationMs / slowest) * 100)}%`;
    fill.style.background = kindColor(bar.kind);
    track.append(fill);

    const value = document.createElement('span');
    value.className = 'bar-value';
    value.textContent = formatDuration(bar.durationMs);

    row.append(label, track, value);
    return row;
  }

  private metric(key: string, value: string): HTMLElement {
    const box = document.createElement('div');
    box.className = 'metric';
    const k = document.createElement('div');
    k.className = 'k';
    k.textContent = key;
    const v = document.createElement('div');
    v.className = 'v';
    v.textContent = value;
    box.append(k, v);
    return box;
  }

  private empty(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = text;
    return el;
  }
}
