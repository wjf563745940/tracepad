import type { TraceTree } from '@tracepad/core';
import { TraceElement } from './base.js';
import { reasoningStyles, tokens } from './theme.js';

export class TraceReasoningElement extends TraceElement {
  private openState: boolean | null = null;

  constructor() {
    super(tokens + reasoningStyles);
  }

  static get observedAttributes(): string[] {
    return ['node-id', 'label', 'collapsed'];
  }

  attributeChangedCallback(): void {
    this.render();
  }

  protected render(): void {
    this.clear();
    const tree = this.trace?.snapshot();
    const node = tree ? this.pickNode(tree) : null;
    if (!node) {
      this.root.append(this.emptyNode('No reasoning yet'));
      return;
    }

    const open = this.isOpen();
    const panel = document.createElement('div');
    panel.className = 'panel';

    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', String(open));
    summary.tabIndex = 0;

    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = open ? '▾' : '▸';

    const title = document.createElement('span');
    title.textContent = this.getAttribute('label') ?? `Reasoning · ${node.kind}`;

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `${node.reasoning.length} chars`;

    summary.append(chev, title, meta);
    summary.addEventListener('click', () => this.setOpen(!open));
    summary.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        this.setOpen(!open);
      }
    });

    const body = document.createElement('div');
    body.className = 'body';
    body.dataset['open'] = String(open);
    body.textContent = node.reasoning;

    panel.append(summary, body);
    this.root.append(panel);
  }

  /** First node carrying reasoning text: the `node-id` target, else the first one found. */
  private pickNode(tree: TraceTree) {
    const id = this.getAttribute('node-id');
    if (id) return tree.nodes[id] ?? null;
    for (const node of Object.values(tree.nodes)) {
      if (node.reasoning.trim()) return node;
    }
    return null;
  }

  private isOpen(): boolean {
    return this.openState ?? !this.hasAttribute('collapsed');
  }

  private setOpen(open: boolean): void {
    this.openState = open;
    if (open) this.removeAttribute('collapsed');
    else this.setAttribute('collapsed', '');
    this.emit('tp-toggle', { open });
    this.render();
  }

  private emptyNode(text: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = text;
    return div;
  }
}
