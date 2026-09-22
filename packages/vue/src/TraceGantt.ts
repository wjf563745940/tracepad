import type { PropType } from 'vue';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { durationBars, formatDuration, kindColor, traceStats } from '@tracepad/headless';
import type { DurationBar, TraceLike } from '@tracepad/headless';

/** Vue port of `tp-gantt`: steps positioned on the run's real timeline. */
export const TraceGantt = defineComponent({
  name: 'TraceGantt',
  props: {
    trace: { type: Object as PropType<TraceLike>, required: true }
  },
  setup(props) {
    const bars = shallowRef<DurationBar[]>([]);
    const totalMs = shallowRef<number | null>(null);
    let unsubscribe: (() => void) | null = null;
    let mounted = false;

    const sync = (): void => {
      const tree = props.trace.snapshot();
      bars.value = durationBars(tree);
      totalMs.value = traceStats(tree).durationMs;
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

    return () => {
      const slowest = bars.value.reduce<DurationBar | null>(
        (acc, bar) => (acc === null || bar.durationMs > acc.durationMs ? bar : acc),
        null
      );
      const foot = `${totalMs.value === null ? '运行中' : formatDuration(totalMs.value)}${
        slowest ? ` · 最长一步 ${slowest.label}` : ''
      }`;

      return h('div', { class: 'tp-gantt' }, [
        ...bars.value.map((bar) =>
          h('div', { class: 'tp-gantt-row', 'data-id': bar.id }, [
            h('span', { class: 'tp-gantt-label' }, bar.label),
            h('div', { class: 'tp-gantt-track' }, [
              h('div', {
                class: 'tp-gantt-fill',
                'data-running': String(bar.running),
                style: {
                  left: `${bar.offsetPct}%`,
                  width: `${bar.widthPct}%`,
                  background: kindColor(bar.kind)
                }
              })
            ])
          ])
        ),
        h('div', { class: 'tp-gantt-foot' }, foot)
      ]);
    };
  }
});
