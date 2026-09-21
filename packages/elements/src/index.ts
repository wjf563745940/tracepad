import { TraceReasoningElement } from './tp-reasoning.js';
import { TraceTimelineElement } from './tp-timeline.js';

export { TraceElement } from './base.js';
export { TraceReasoningElement } from './tp-reasoning.js';
export { TraceTimelineElement } from './tp-timeline.js';
export {
  firstLine,
  formatDuration,
  nodeDuration,
  rowLabel,
  statusLabel,
  statusTone
} from './format.js';
export type { StatusTone } from './format.js';
export { reasoningStyles, timelineStyles, tokens } from './theme.js';

export const TAGS = {
  timeline: 'tp-timeline',
  reasoning: 'tp-reasoning'
} as const;

/**
 * Registers the custom elements. Called automatically on import when a
 * `customElements` registry exists, so `<tp-timeline>` works as soon as the
 * package is loaded. Pass a prefix to register under different tag names.
 */
export function defineTraceElements(prefix = 'tp'): void {
  if (typeof customElements === 'undefined') return;
  const register = (tag: string, ctor: CustomElementConstructor): void => {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  };
  register(`${prefix}-timeline`, TraceTimelineElement);
  register(`${prefix}-reasoning`, TraceReasoningElement);
}

if (typeof customElements !== 'undefined') defineTraceElements();
