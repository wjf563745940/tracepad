import '@tracepad/elements';
import './theme.css';
import type { TraceLike } from '@tracepad/headless';
import { createReplay } from './replay.js';
import { mountReactPanel } from './react-panel.js';
import { mountVuePanel } from './vue-panel.js';
import { store } from './store.js';

function el<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`playground: missing ${selector}`);
  return found;
}

const replay = createReplay();
const trace: TraceLike = replay.trace;

// 1. Web Components — the element takes the trace as a plain property.
const native = el<HTMLElement>('tp-timeline') as unknown as { trace: TraceLike };
native.trace = trace;

// 2. Vue 3 and 3. React — same trace, framework-native components.
mountVuePanel(el('#panel-vue'), trace);
mountReactPanel(el<HTMLElement>('#panel-react'), trace);

const play = el<HTMLButtonElement>('#play');
const reset = el<HTMLButtonElement>('#reset');
const speed = el<HTMLSelectElement>('#speed');
const query = el<HTMLInputElement>('#query');
const status = el<HTMLElement>('#status');

let playing = false;
const syncPlayLabel = (): void => {
  play.textContent = playing ? '⏸ 暂停' : '▶ 播放';
};

play.addEventListener('click', () => {
  if (playing) {
    playing = false;
    replay.pause();
    syncPlayLabel();
    return;
  }
  playing = true;
  replay.resume();
  syncPlayLabel();
  void replay.play().finally(() => {
    playing = false;
    syncPlayLabel();
  });
});

reset.addEventListener('click', () => {
  replay.reset();
  playing = false;
  syncPlayLabel();
});

speed.addEventListener('change', () => {
  replay.setSpeed(Number(speed.value));
});

query.addEventListener('input', () => {
  store.set(query.value);
  el<HTMLElement>('tp-timeline').setAttribute('query', query.value);
});

trace.subscribe((tree) => {
  status.textContent = `steps ${Object.keys(tree.nodes).length} · ${tree.status}`;
});

playing = true;
syncPlayLabel();
void replay.play().then(() => {
  playing = false;
  syncPlayLabel();
});
