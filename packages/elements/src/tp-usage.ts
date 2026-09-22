import { durationBars, formatDuration, kindColor, usageBreakdown } from '@tracepad/headless';
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
    const bars = durationBars(tree);

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

    if (bars.length === 0 && usage.perStep.length === 0) {
      this.root.append(this.empty('No timing data yet'));
      return;
    }

    // Where did the tokens go? Only rendered when the adapter reports per-step usage.
    if (usage.perStep.length > 0) {
      this.root.append(this.section('token 分布'));
      const peak = Math.max(...usage.perStep.map((step) => step.tokens)) || 1;
      const wrap = document.createElement('div');
      wrap.className = 'bars';
      for (const step of usage.perStep) {
        wrap.append(
          this.barRow(
            step.id,
            step.label,
            (step.tokens / peak) * 100,
            String(step.tokens),
            kindColor(step.kind)
          )
        );
      }
      this.root.append(wrap);
    }

    if (bars.length === 0) return;
    this.root.append(this.section('耗时'));
    const slowest = Math.max(...bars.map((bar) => bar.durationMs)) || 1;
    const wrap = document.createElement('div');
    wrap.className = 'bars';
    for (const bar of bars) {
      wrap.append(
        this.barRow(bar.id, bar.label, (bar.durationMs / slowest) * 100, formatDuration(bar.durationMs), kindColor(bar.kind))
      );
    }
    this.root.append(wrap);
  }

  private section(title: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'section';
    el.textContent = title;
    return el;
  }

  private barRow(
    id: string,
    label: string,
    percent: number,
    value: string,
    color: string
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.dataset['id'] = id;

    const labelEl = document.createElement('span');
    labelEl.className = 'bar-label';
    labelEl.textContent = label;

    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = `${Math.max(2, percent)}%`;
    fill.style.background = color;
    track.append(fill);

    const valueEl = document.createElement('span');
    valueEl.className = 'bar-value';
    valueEl.textContent = value;

    row.append(labelEl, track, valueEl);
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
