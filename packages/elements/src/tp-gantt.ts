import { durationBars, formatDuration, kindColor, traceStats } from '@tracepad/headless';
import type { DurationBar } from '@tracepad/headless';
import { TraceElement } from './base.js';
import { ganttStyles, tokens } from './theme.js';

/**
 * `<tp-gantt>` — every step positioned on the run's real timeline, so
 * sequential vs. overlapping execution is visible.
 */
export class TraceGanttElement extends TraceElement {
  constructor() {
    super(tokens + ganttStyles);
  }

  protected render(): void {
    this.clear();
    const trace = this.trace;
    if (!trace) {
      this.root.append(this.empty('No trace attached — assign element.trace'));
      return;
    }

    const tree = trace.snapshot();
    const bars = durationBars(tree);
    if (bars.length === 0) {
      this.root.append(this.empty('No steps yet'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'gantt';
    for (const bar of bars) wrap.append(this.rowNode(bar));
    this.root.append(wrap);

    const total = traceStats(tree).durationMs;
    const slowest = bars.reduce((acc, bar) => (bar.durationMs > acc.durationMs ? bar : acc), bars[0] as DurationBar);
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.textContent = `${total === null ? '运行中' : formatDuration(total)} · 最长一步 ${slowest.label}`;
    this.root.append(foot);
  }

  private rowNode(bar: DurationBar): HTMLElement {
    const row = document.createElement('div');
    row.className = 'gantt-row';
    row.dataset['id'] = bar.id;

    const label = document.createElement('span');
    label.className = 'gantt-label';
    label.textContent = bar.label;

    const track = document.createElement('div');
    track.className = 'gantt-track';
    const fill = document.createElement('div');
    fill.className = 'gantt-fill';
    fill.dataset['running'] = String(bar.running);
    fill.style.left = `${bar.offsetPct}%`;
    fill.style.width = `${bar.widthPct}%`;
    fill.style.background = kindColor(bar.kind);
    track.append(fill);

    row.append(label, track);
    row.title = `${bar.label} · ${formatDuration(bar.durationMs)}`;
    return row;
  }

  private empty(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = text;
    return el;
  }
}
