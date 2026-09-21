import type { TraceLike } from '@tracepad/headless';

/**
 * Import-safe in non-DOM runtimes (SSR, node tests): when `HTMLElement` does not
 * exist we extend a stub so that merely importing the package never throws.
 * Instances are only ever created in a browser, so the stub is never instantiated.
 */
const BaseElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined'
    ? (class {} as unknown as typeof HTMLElement)
    : HTMLElement;

export abstract class TraceElement extends BaseElement {
  protected readonly root: ShadowRoot;
  private readonly styleEl: HTMLStyleElement;
  private traceRef: TraceLike | null = null;
  private unsubscribeRef: (() => void) | null = null;
  /**
   * Set to `true` by subclasses that already listen to the trace themselves
   * (e.g. via a headless view) so the base class does not subscribe twice.
   */
  protected hasTraceSubscription = false;

  protected constructor(css: string) {
    super();
    this.root =
      typeof this.attachShadow === 'function'
        ? this.attachShadow({ mode: 'open' })
        : (this as unknown as ShadowRoot);
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = css;
    this.root.append(this.styleEl);
  }

  get trace(): TraceLike | null {
    return this.traceRef;
  }

  set trace(value: TraceLike | null) {
    this.traceRef = value;
    this.onTrace(value);
    this.resubscribe();
    this.render();
  }

  connectedCallback(): void {
    this.resubscribe();
    this.render();
  }

  disconnectedCallback(): void {
    this.unsubscribe();
  }

  /** Called whenever `.trace` is assigned (including assignment of `null`). */
  protected onTrace(_trace: TraceLike | null): void {}

  protected abstract render(): void;

  /** Removes everything from the shadow root except the stylesheet. */
  protected clear(): void {
    for (const node of Array.from(this.root.childNodes)) {
      if (node !== this.styleEl) this.root.removeChild(node);
    }
  }

  protected emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private resubscribe(): void {
    this.unsubscribe();
    if (this.hasTraceSubscription || !this.traceRef || !this.isConnected) return;
    this.unsubscribeRef = this.traceRef.subscribe(() => this.render());
  }

  private unsubscribe(): void {
    this.unsubscribeRef?.();
    this.unsubscribeRef = null;
  }
}
