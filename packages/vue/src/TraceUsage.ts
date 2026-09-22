import type { PropType } from 'vue';
import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { durationBars, formatDuration, kindColor, usageBreakdown } from '@tracepad/headless';
import type { DurationBar, TraceLike, UsageBreakdown } from '@tracepad/headless';

/** Vue port of `tp-usage`: token totals plus per-step duration bars. */
export const TraceUsage = defineComponent({
  name: 'TraceUsage',
  props: {
    trace: { type: Object as PropType<TraceLike>, required: true }
  },
  setup(props) {
    const usage = shallowRef<UsageBreakdown>({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: null,
      steps: 0,
      perStep: []
    });
    const bars = shallowRef<DurationBar[]>([]);
    let unsubscribe: (() => void) | null = null;
    let mounted = false;

    const sync = (): void => {
      const tree = props.trace.snapshot();
      usage.value = usageBreakdown(tree);
      bars.value = durationBars(tree);
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
      const u = usage.value;
      const metrics: Array<[string, string]> = [
        ['输入 token', String(u.inputTokens)],
        ['输出 token', String(u.outputTokens)],
        ['合计', String(u.totalTokens)],
        ['步骤', String(u.steps)]
      ];
      if (u.cost !== null) metrics.push(['成本', `$${u.cost.toFixed(4)}`]);

      const children: Array<ReturnType<typeof h>> = [
        h(
          'div',
          { class: 'tp-metrics' },
          metrics.map(([key, value]) =>
            h('div', { class: 'tp-metric' }, [
              h('div', { class: 'tp-metric-k' }, key),
              h('div', { class: 'tp-metric-v' }, value)
            ])
          )
        )
      ];

      // Per-step token attribution, when the adapter reports it.
      if (u.perStep.length > 0) {
        const peak = Math.max(...u.perStep.map((step) => step.tokens)) || 1;
        children.push(h('div', { class: 'tp-section' }, 'token 分布'));
        children.push(
          h(
            'div',
            { class: 'tp-bars' },
            u.perStep.map((step) =>
              h('div', { class: 'tp-bar-row', 'data-id': step.id }, [
                h('span', { class: 'tp-bar-label' }, step.label),
                h('div', { class: 'tp-bar-track' }, [
                  h('div', {
                    class: 'tp-bar-fill',
                    style: {
                      width: `${Math.max(2, (step.tokens / peak) * 100)}%`,
                      background: kindColor(step.kind)
                    }
                  })
                ]),
                h('span', { class: 'tp-bar-value' }, String(step.tokens))
              ])
            )
          )
        );
      }

      if (bars.value.length > 0) {
        const slowest = Math.max(...bars.value.map((bar) => bar.durationMs)) || 1;
        children.push(h('div', { class: 'tp-section' }, '耗时'));
        children.push(
          h(
            'div',
            { class: 'tp-bars' },
            bars.value.map((bar) =>
              h('div', { class: 'tp-bar-row', 'data-id': bar.id }, [
                h('span', { class: 'tp-bar-label' }, bar.label),
                h('div', { class: 'tp-bar-track' }, [
                  h('div', {
                    class: 'tp-bar-fill',
                    style: {
                      width: `${Math.max(2, (bar.durationMs / slowest) * 100)}%`,
                      background: kindColor(bar.kind)
                    }
                  })
                ]),
                h('span', { class: 'tp-bar-value' }, formatDuration(bar.durationMs))
              ])
            )
          )
        );
      }

      return h('div', { class: 'tp-usage' }, children);
    };
  }
});
