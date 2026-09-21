import type { StepKind } from '@tracepad/core';
import { createTraceView, rowLabel, statusLabel, statusTone } from '@tracepad/headless';
import type { TraceLike, TraceStats, TraceView, ViewFilter, VisibleRow } from '@tracepad/headless';
import { TraceElement } from './base.js';
import { timelineStyles, tokens } from './theme.js';

const INDENT_PX = 14;

export class TraceTimelineElement extends TraceElement {
  private viewRef: TraceView | null = null;
  private unsubscribeView: (() => void) | null = null;
  private followedId: string | null = null;

  constructor() {
    super(tokens + timelineStyles);
  }

  static get observedAttributes(): string[] {
    return ['default-expanded', 'follow', 'query', 'kinds', 'summary'];
  }

  override connectedCallback(): void {
    // Rebuild the view after a detach/attach cycle; expansion state resets.
    if (this.trace && !this.unsubscribeView) this.onTrace(this.trace);
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    this.unsubscribeView?.();
    this.unsubscribeView = null;
    super.disconnectedCallback();
  }

  attributeChangedCallback(): void {
    const view = this.viewRef;
    if (view) {
      view.setFilter(this.readFilter());
      view.setFollow(this.readBool('follow', true));
      if (this.readBool('default-expanded', true)) view.expandAll();
      else view.collapseAll();
    }
    this.render();
  }

  protected onTrace(trace: TraceLike | null): void {
    this.unsubscribeView?.();
    this.unsubscribeView = null;
    this.viewRef = null;
    this.followedId = null;
    this.hasTraceSubscription = false;
    if (!trace) return;

    const view = createTraceView(trace, {
      defaultExpanded: this.readBool('default-expanded', true),
      follow: this.readBool('follow', true)
    });
    this.viewRef = view;
    this.hasTraceSubscription = true;
    view.setFilter(this.readFilter());
    this.unsubscribeView = view.subscribe(() => this.render());
  }

  protected render(): void {
    this.clear();
    const view = this.viewRef;
    if (!view) {
      this.root.append(this.emptyNode('No trace attached — assign element.trace'));
      return;
    }
    if (this.hasAttribute('summary')) this.root.append(this.statsNode(view.stats()));

    const rows = view.rows();
    if (rows.length === 0) {
      this.root.append(this.emptyNode('No steps yet'));
      return;
    }

    const list = document.createElement('ul');
    list.className = 'timeline';
    list.setAttribute('role', 'tree');
    for (const row of rows) list.append(this.rowNode(row, view));
    this.root.append(list);
    this.followLatest(view);
  }

  private rowNode(row: VisibleRow, view: TraceView): HTMLElement {
    const node = row.node;
    const li = document.createElement('li');
    li.className = 'row';
    li.dataset['id'] = node.id;
    li.dataset['kind'] = node.kind;
    li.dataset['selected'] = String(row.selected);
    li.dataset['matched'] = String(row.matched);
    li.style.marginInlineStart = `${row.depth * INDENT_PX}px`;
    li.setAttribute('role', 'treeitem');
    li.setAttribute('aria-level', String(row.depth + 1));
    li.setAttribute('aria-expanded', String(row.expanded));
    li.tabIndex = 0;

    const toggle = document.createElement('span');
    toggle.className = 'toggle';
    toggle.dataset['empty'] = String(!row.hasChildren);
    toggle.textContent = row.expanded ? '▾' : '▸';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      view.toggle(node.id);
      this.emit('tp-toggle', { id: node.id, expanded: !row.expanded });
    });

    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = node.kind;

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = rowLabel(node);

    const status = document.createElement('span');
    status.className = 'status';
    status.dataset['status'] = statusTone(node);
    status.textContent = statusLabel(node);

    li.addEventListener('click', () => {
      view.select(node.id);
      this.emit('tp-select', { id: node.id, node });
    });
    li.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter') {
        view.select(node.id);
        this.emit('tp-select', { id: node.id, node });
      } else if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        view.toggle(node.id);
        this.emit('tp-toggle', { id: node.id, expanded: !row.expanded });
      }
    });

    li.append(toggle, kind, label, status);
    return li;
  }

  private statsNode(stats: TraceStats): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'stats';
    const parts: Array<[string, string]> = [
      ['steps', String(stats.totalSteps)],
      ['errors', String(stats.errors)],
      ['running', String(stats.running)]
    ];
    if (stats.durationMs !== null) parts.push(['duration', `${stats.durationMs}ms`]);
    if (stats.inputTokens !== undefined) parts.push(['in', String(stats.inputTokens)]);
    if (stats.outputTokens !== undefined) parts.push(['out', String(stats.outputTokens)]);

    for (const [name, value] of parts) {
      const item = document.createElement('span');
      const strong = document.createElement('b');
      strong.textContent = value;
      item.append(`${name} `, strong);
      bar.append(item);
    }
    return bar;
  }

  private emptyNode(text: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = text;
    return div;
  }

  private followLatest(view: TraceView): void {
    if (!this.readBool('follow', true)) return;
    const latest = view.latestNodeId();
    if (!latest || latest === this.followedId) return;
    this.followedId = latest;
    const rows = Array.from(this.root.querySelectorAll<HTMLElement>('.row'));
    const target = rows.find((el) => el.dataset['id'] === latest);
    const scroll = target?.scrollIntoView;
    if (target && typeof scroll === 'function') scroll.call(target, { block: 'nearest' });
  }

  private readFilter(): ViewFilter {
    const query = this.getAttribute('query') ?? '';
    const raw = this.getAttribute('kinds');
    const kinds = raw
      ? (raw
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean) as StepKind[])
      : undefined;
    return { query, kinds, keepAncestors: true };
  }

  private readBool(name: string, fallback: boolean): boolean {
    if (!this.hasAttribute(name)) return fallback;
    return this.getAttribute(name) !== 'false';
  }
}
