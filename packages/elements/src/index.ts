import { TraceCardsElement } from './tp-cards.js';
import { TraceGanttElement } from './tp-gantt.js';
import { TraceMediaElement } from './tp-media.js';
import { TraceReasoningElement } from './tp-reasoning.js';
import { TraceTimelineElement } from './tp-timeline.js';
import { TraceUsageElement } from './tp-usage.js';

export { TraceElement } from './base.js';
export { TraceCardsElement } from './tp-cards.js';
export { TraceGanttElement } from './tp-gantt.js';
export { TraceMediaElement } from './tp-media.js';
export { TraceReasoningElement } from './tp-reasoning.js';
export { TraceTimelineElement } from './tp-timeline.js';
export { TraceUsageElement } from './tp-usage.js';
export {
  firstLine,
  formatDuration,
  kindColor,
  nodeDuration,
  rowLabel,
  statusLabel,
  statusTone
} from '@tracepad/headless';
export type { StatusTone } from '@tracepad/headless';
export {
  cardsStyles,
  ganttStyles,
  mediaStyles,
  reasoningStyles,
  timelineStyles,
  tokens,
  usageStyles
} from './theme.js';

export const TAGS = {
  timeline: 'tp-timeline',
  reasoning: 'tp-reasoning',
  cards: 'tp-cards',
  usage: 'tp-usage',
  gantt: 'tp-gantt',
  media: 'tp-media'
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
  register(`${prefix}-cards`, TraceCardsElement);
  register(`${prefix}-usage`, TraceUsageElement);
  register(`${prefix}-gantt`, TraceGanttElement);
  register(`${prefix}-media`, TraceMediaElement);
}

if (typeof customElements !== 'undefined') defineTraceElements();
