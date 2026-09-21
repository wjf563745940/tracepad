import type { PropType } from 'vue';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { StepKind } from '@tracepad/core';
import {
  createTraceView,
  rowLabel,
  statusLabel,
  statusTone,
  traceStats,
  visibleRows
} from '@tracepad/headless';
import type {
  TraceLike,
  TraceStats,
  TraceView,
  ViewFilter,
  ViewState,
  VisibleRow
} from '@tracepad/headless';

const INDENT_PX = 14;

/**
 * Vue 3 port of `tp-timeline`. It contains no logic of its own — it renders the
 * rows produced by `@tracepad/headless` and forwards interaction back to the view.
 *
 * First paint (and SSR) is computed synchronously from pure helpers; the stateful
 * view is only created after mount, so server rendering never leaks a subscription.
 */
export const TraceTimeline = defineComponent({
  name: 'TraceTimeline',
  props: {
    trace: { type: Object as PropType<TraceLike>, required: true },
    query: { type: String, default: '' },
    kinds: { type: Array as PropType<StepKind[]>, default: undefined },
    defaultExpanded: { type: Boolean, default: true },
    summary: { type: Boolean, default: false }
  },
  emits: ['select', 'toggle'],
  setup(props, { emit }) {
    const rows = shallowRef<VisibleRow[]>([]);
    const stats = shallowRef<TraceStats>({
      totalSteps: 0,
      byKind: {},
      errors: 0,
      running: 0,
      durationMs: null
    });

    let view: TraceView | null = null;
    let unsubscribe: (() => void) | null = null;
    let mounted = false;

    const filter = (): ViewFilter => ({
      query: props.query,
      kinds: props.kinds,
      keepAncestors: true
    });

    const sync = (): void => {
      if (!view) return;
      rows.value = view.rows();
      stats.value = view.stats();
    };

    const dispose = (): void => {
      unsubscribe?.();
      unsubscribe = null;
      view?.dispose();
      view = null;
    };

    const build = (): void => {
      dispose();
      view = createTraceView(props.trace, { defaultExpanded: props.defaultExpanded });
      view.setFilter(filter());
      unsubscribe = view.subscribe(sync);
    };

    const seed = (): void => {
      const tree = props.trace.snapshot();
      const state: ViewState = {
        expanded: {},
        defaultExpanded: props.defaultExpanded,
        selectedId: null,
        filter: filter(),
        follow: true
      };
      rows.value = visibleRows(tree, state);
      stats.value = traceStats(tree);
    };

    seed();
    onMounted(() => {
      mounted = true;
      build();
    });
    watch(() => [props.trace, props.defaultExpanded], () => {
      if (mounted) build();
      else seed();
    });
    watch(() => [props.query, props.kinds], () => {
      view?.setFilter(filter());
    });
    onBeforeUnmount(dispose);

    const renderRow = (row: VisibleRow) => {
      const node = row.node;
      return h(
        'li',
        {
          class: 'tp-row',
          role: 'treeitem',
          'data-id': node.id,
          'data-kind': node.kind,
          'data-selected': String(row.selected),
          'data-matched': String(row.matched),
          style: { marginInlineStart: `${row.depth * INDENT_PX}px` },
          onClick: () => {
            view?.select(node.id);
            emit('select', { id: node.id, node });
          }
        },
        [
          h(
            'span',
            {
              class: 'tp-toggle',
              'data-empty': String(!row.hasChildren),
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                view?.toggle(node.id);
                emit('toggle', { id: node.id, expanded: !row.expanded });
              }
            },
            row.expanded ? '▾' : '▸'
          ),
          h('span', { class: 'tp-kind' }, node.kind),
          h('span', { class: 'tp-label' }, rowLabel(node)),
          h(
            'span',
            { class: 'tp-status', 'data-status': statusTone(node) },
            statusLabel(node)
          )
        ]
      );
    };

    return () => {
      const children = [];

      if (props.summary) {
        const parts: Array<[string, string]> = [
          ['steps', String(stats.value.totalSteps)],
          ['errors', String(stats.value.errors)],
          ['running', String(stats.value.running)]
        ];
        if (stats.value.durationMs !== null) parts.push(['duration', `${stats.value.durationMs}ms`]);
        if (stats.value.inputTokens !== undefined) parts.push(['in', String(stats.value.inputTokens)]);
        if (stats.value.outputTokens !== undefined) parts.push(['out', String(stats.value.outputTokens)]);
        children.push(
          h(
            'div',
            { class: 'tp-stats' },
            parts.map(([name, value]) => h('span', {}, [name, ' ', h('b', {}, value)]))
          )
        );
      }

      children.push(
        rows.value.length === 0
          ? h('div', { class: 'tp-empty' }, 'No steps yet')
          : h('ul', { class: 'tp-timeline', role: 'tree' }, rows.value.map(renderRow))
      );

      return h('div', { class: 'tp-timeline-root' }, children);
    };
  }
});
