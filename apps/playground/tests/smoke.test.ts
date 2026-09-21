// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import '@tracepad/elements';
import { mountReactPanel } from '../src/react-panel';
import { mountVuePanel } from '../src/vue-panel';
import { createReplay } from '../src/replay.js';
import { store } from '../src/store.js';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

function mountAll() {
  document.body.innerHTML = `
    <tp-timeline summary></tp-timeline>
    <div id="panel-vue"></div>
    <div id="panel-react"></div>
  `;
  const replay = createReplay();
  replay.setSpeed(20); // keep the suite fast; the script itself is unchanged
  const native = document.querySelector('tp-timeline') as HTMLElement & { trace: unknown };
  native.trace = replay.trace;
  mountVuePanel(document.querySelector('#panel-vue')!, replay.trace);
  mountReactPanel(document.querySelector('#panel-react') as HTMLElement, replay.trace);
  return { replay, native };
}

const idsOf = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[data-id]')).map((el) => el.getAttribute('data-id')!);

beforeEach(() => {
  store.set('');
  document.body.innerHTML = '';
});

describe('playground wiring', () => {
  it('renders the same steps in all three layers', async () => {
    const { replay } = mountAll();
    await replay.play();
    await settle();

    const nativeIds = idsOf(document.querySelector('tp-timeline')!.shadowRoot!);
    const vueIds = idsOf(document.querySelector('#panel-vue')!);
    const reactIds = idsOf(document.querySelector('#panel-react')!);

    expect(nativeIds.length).toBeGreaterThan(3);
    expect(vueIds).toEqual(nativeIds);
    expect(reactIds).toEqual(nativeIds);

    // the tool call produced by the OpenAI adapter is visible everywhere
    expect(nativeIds).toContain('call_weather_1');
  });

  it('drives all three layers from one query', async () => {
    const { replay, native } = mountAll();
    await replay.play();
    await settle();

    store.set('get_weather');
    native.setAttribute('query', 'get_weather');
    await settle();

    const nativeIds = idsOf(document.querySelector('tp-timeline')!.shadowRoot!);
    const vueIds = idsOf(document.querySelector('#panel-vue')!);
    const reactIds = idsOf(document.querySelector('#panel-react')!);

    expect(nativeIds.length).toBeLessThan(4);
    expect(vueIds).toEqual(nativeIds);
    expect(reactIds).toEqual(nativeIds);
  });
});
