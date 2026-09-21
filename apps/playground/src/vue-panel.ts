import { createApp, defineComponent, h, onUnmounted, ref } from 'vue';
import { TraceTimeline } from '@tracepad/vue';
import type { TraceLike } from '@tracepad/headless';
import { store } from './store.js';

export function mountVuePanel(host: Element, trace: TraceLike): void {
  const Root = defineComponent({
    name: 'VuePanel',
    setup() {
      const query = ref(store.query);
      const stop = store.subscribe((next) => {
        query.value = next;
      });
      onUnmounted(() => {
        stop();
      });
      return () => h(TraceTimeline, { trace, query: query.value, summary: true });
    }
  });

  createApp(Root).mount(host);
}
