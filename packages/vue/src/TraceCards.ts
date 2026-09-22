import type { PropType } from 'vue';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { formatDuration, kindColor, stepCards } from '@tracepad/headless';
import type { StepCard, TraceLike } from '@tracepad/headless';

/**
 * Vue port of `tp-cards`. No logic of its own — renders what `stepCards()`
 * returns and reports interactions back. First paint is computed synchronously
 * from the pure helper, so it also works under `renderToString`.
 */
export const TraceCards = defineComponent({
  name: 'TraceCards',
  props: {
    trace: { type: Object as PropType<TraceLike>, required: true }
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    const cards = shallowRef<StepCard[]>([]);
    const open = shallowRef<Record<string, boolean>>({});
    let unsubscribe: (() => void) | null = null;
    let mounted = false;

    const sync = (): void => {
      cards.value = stepCards(props.trace.snapshot());
    };

    sync();
    onMounted(() => {
      mounted = true;
      unsubscribe = props.trace.subscribe(sync);
    });
    onBeforeUnmount(() => {
      unsubscribe?.();
      unsubscribe = null;
    });
    watch(
      () => props.trace,
      () => {
        sync();
        if (!mounted) return;
        unsubscribe?.();
        unsubscribe = props.trace.subscribe(sync);
      }
    );

    const toggle = (id: string): void => {
      const next = { ...open.value, [id]: !open.value[id] };
      open.value = next;
      emit('toggle', { id, expanded: Boolean(next[id]) });
    };

    return () =>
      h(
        'div',
        { class: 'tp-cards' },
        cards.value.map((card) => {
          const isOpen = Boolean(open.value[card.id]);
          const head = h(
            'div',
            { class: 'tp-card-head', onClick: () => toggle(card.id) },
            [
              h('span', { class: 'tp-card-chev' }, isOpen ? '▾' : '▸'),
              h('span', { class: 'tp-card-dot', 'data-status': card.status }),
              h(
                'span',
                { class: 'tp-card-title', style: { color: kindColor(card.kind) } },
                card.title
              ),
              h(
                'span',
                { class: 'tp-card-dur' },
                card.durationMs === null ? '' : formatDuration(card.durationMs)
              )
            ]
          );
          if (!isOpen) return h('div', { class: 'tp-card', 'data-id': card.id }, [head]);

          const body: Array<ReturnType<typeof h> | null> = [];
          if (card.reasoning.trim()) body.push(h('pre', { class: 'tp-code' }, card.reasoning));
          if (card.args) body.push(h('pre', { class: 'tp-code' }, card.args));
          if (card.result) body.push(h('pre', { class: 'tp-code' }, card.result));
          if (card.error) body.push(h('pre', { class: 'tp-code' }, card.error));
          return h('div', { class: 'tp-card', 'data-id': card.id }, [
            head,
            h('div', { class: 'tp-card-body' }, body)
          ]);
        })
      );
  }
});
