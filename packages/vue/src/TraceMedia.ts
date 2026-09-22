import type { PropType } from 'vue';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { mediaItems } from '@tracepad/headless';
import type { MediaItem, TraceLike } from '@tracepad/headless';

/**
 * Vue port of `tp-media`. Opening a lightbox is the host app's job, so the
 * component only reports which item was picked.
 */
export const TraceMedia = defineComponent({
  name: 'TraceMedia',
  props: {
    trace: { type: Object as PropType<TraceLike>, required: true }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const items = shallowRef<MediaItem[]>([]);
    let unsubscribe: (() => void) | null = null;
    let mounted = false;

    const sync = (): void => {
      items.value = mediaItems(props.trace.snapshot());
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

    return () =>
      h(
        'div',
        { class: 'tp-media' },
        items.value.map((item) =>
          h(
            'div',
            {
              class: 'tp-media-item',
              'data-key': item.key,
              onClick: () => emit('select', { key: item.key, item })
            },
            [
              item.kind === 'image'
                ? h('img', { class: 'tp-media-thumb', src: item.url, alt: item.alt ?? '' })
                : h('div', { class: 'tp-media-fallback' }, item.kind),
              h('div', { class: 'tp-media-cap' }, item.label ?? item.stepLabel)
            ]
          )
        )
      );
  }
});
