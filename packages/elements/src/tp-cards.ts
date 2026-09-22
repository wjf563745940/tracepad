import { formatDuration, kindColor, stepCards } from '@tracepad/headless';
import type { StepCard } from '@tracepad/headless';
import { TraceElement } from './base.js';
import { cardsStyles, tokens } from './theme.js';

/**
 * `<tp-cards>` — one expandable card per step. Uses the pure `stepCards()`
 * helper only; it owns nothing but which cards are open.
 */
export class TraceCardsElement extends TraceElement {
  private expanded = new Set<string>();

  constructor() {
    super(tokens + cardsStyles);
  }

  static get observedAttributes(): string[] {
    return ['default-open'];
  }

  attributeChangedCallback(): void {
    this.render();
  }

  protected render(): void {
    this.clear();
    const trace = this.trace;
    if (!trace) {
      this.root.append(this.empty('No trace attached — assign element.trace'));
      return;
    }

    const cards = stepCards(trace.snapshot());
    if (cards.length === 0) {
      this.root.append(this.empty('No steps yet'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'cards';
    for (const card of cards) wrap.append(this.cardNode(card));
    this.root.append(wrap);
  }

  private cardNode(card: StepCard): HTMLElement {
    const open = this.isOpen(card.id);

    const el = document.createElement('div');
    el.className = 'card';
    el.dataset['id'] = card.id;
    el.dataset['kind'] = card.kind;

    const head = document.createElement('div');
    head.className = 'head';
    head.setAttribute('role', 'button');
    head.setAttribute('aria-expanded', String(open));
    head.tabIndex = 0;

    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = open ? '▾' : '▸';

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.dataset['status'] = card.status;

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = card.title;
    title.style.color = kindColor(card.kind);

    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = card.kind;

    const dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = card.durationMs === null ? '' : formatDuration(card.durationMs);

    head.append(chev, dot, title, kind, dur);

    const body = document.createElement('div');
    body.className = 'body';
    body.dataset['open'] = String(open);

    if (open) {
      if (card.reasoning.trim()) body.append(this.field('思考', card.reasoning));
      if (card.args) body.append(this.field('入参', card.args));
      if (card.result) body.append(this.field('返回', card.result));
      if (card.error) body.append(this.field('错误', card.error));
      if (card.summary && !card.result && !card.error) body.append(this.field('内容', card.summary));
      if (card.mediaCount > 0) body.append(this.badge(`${card.mediaCount} 个产物`));
    }

    const toggle = (): void => {
      if (this.expanded.has(card.id)) this.expanded.delete(card.id);
      else this.expanded.add(card.id);
      this.emit('tp-toggle', { id: card.id, expanded: !open, card });
      this.render();
    };

    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        toggle();
      }
    });

    el.append(head, body);
    return el;
  }

  private field(label: string, value: string): HTMLElement {
    const wrap = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'field';
    name.textContent = label;
    const code = document.createElement('pre');
    code.className = 'code';
    code.textContent = value;
    wrap.append(name, code);
    return wrap;
  }

  private badge(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'badge';
    el.textContent = text;
    return el;
  }

  private empty(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = text;
    return el;
  }

  private isOpen(id: string): boolean {
    if (this.expanded.has(id)) return true;
    if (this.hasAttribute('default-open')) return this.getAttribute('default-open') !== 'false';
    return false;
  }
}
