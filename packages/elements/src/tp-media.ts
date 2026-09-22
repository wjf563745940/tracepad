import { mediaItems } from '@tracepad/headless';
import type { MediaItem } from '@tracepad/headless';
import { TraceElement } from './base.js';
import { mediaStyles, tokens } from './theme.js';

/**
 * `<tp-media>` — gallery of the binary artefacts a run produced.
 * Clicking emits `tp-select`; opening a lightbox is the host app's call.
 */
export class TraceMediaElement extends TraceElement {
  constructor() {
    super(tokens + mediaStyles);
  }

  protected render(): void {
    this.clear();
    const trace = this.trace;
    if (!trace) {
      this.root.append(this.empty('No trace attached — assign element.trace'));
      return;
    }

    const items = mediaItems(trace.snapshot());
    if (items.length === 0) {
      this.root.append(this.empty('没有媒体产物'));
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const item of items) grid.append(this.itemNode(item));
    this.root.append(grid);
  }

  private itemNode(item: MediaItem): HTMLElement {
    const el = document.createElement('div');
    el.className = 'item';
    el.dataset['key'] = item.key;
    el.dataset['kind'] = item.kind;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;

    if (item.kind === 'image') {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = item.url;
      img.alt = item.alt ?? item.label ?? '';
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'fallback';
        fallback.textContent = item.label ?? item.kind;
        img.replaceWith(fallback);
      });
      el.append(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'fallback';
      fallback.textContent = item.kind;
      el.append(fallback);
    }

    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = item.label ?? item.stepLabel;
    el.append(cap);

    const activate = (): void => this.emit('tp-select', { key: item.key, item });
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        activate();
      }
    });

    return el;
  }

  private empty(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = text;
    return el;
  }
}
