import '@tracepad/elements';
import './theme.css';
import type { TraceLike } from '@tracepad/headless';
import { createReplay } from './replay.js';
import { MULTIMODAL_SCRIPT } from './script-multimodal.js';
import { mountReactPanel } from './react-panel.js';
import { mountVuePanel } from './vue-panel.js';
import { store } from './store.js';

function el<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`playground: missing ${selector}`);
  return found;
}

/** Every component takes the same trace object — that is the whole point. */
function attach(selector: string, trace: TraceLike): void {
  const node = el<HTMLElement>(selector) as unknown as { trace: TraceLike };
  node.trace = trace;
}

const replay = createReplay(MULTIMODAL_SCRIPT);
const trace: TraceLike = replay.trace;

attach('#timeline', trace);
attach('#timeline-native', trace);
attach('#cards', trace);
attach('#usage', trace);
attach('#gantt', trace);
attach('#media', trace);

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
  for (const node of Array.from(document.querySelectorAll('tp-timeline'))) {
    node.setAttribute('query', query.value);
  }
});

// --- view switching -----------------------------------------------------------
const views: Record<string, HTMLElement> = { gallery: el('#gallery'), compare: el('#compare') };
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'));

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    const name = tab.dataset['view'] ?? 'gallery';
    for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
    for (const other of tabs) other.classList.toggle('active', other === tab);
  });
}

// --- media lightbox -----------------------------------------------------------
const lightbox = el<HTMLElement>('#lightbox');
const lightboxImg = el<HTMLImageElement>('#lightbox-img');

el<HTMLElement>('#media').addEventListener('tp-select', (event) => {
  const detail = (event as CustomEvent<{ item: { url: string; alt?: string } }>).detail;
  if (!detail?.item) return;
  lightboxImg.src = detail.item.url;
  lightboxImg.alt = detail.item.alt ?? '';
  lightbox.hidden = false;
});

lightbox.addEventListener('click', () => {
  lightbox.hidden = true;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') lightbox.hidden = true;
});

// --- status line --------------------------------------------------------------
trace.subscribe((tree) => {
  const media = Object.values(tree.nodes).reduce((sum, node) => sum + (node.media?.length ?? 0), 0);
  const parts = [`steps ${Object.keys(tree.nodes).length}`, tree.status];
  if (media > 0) parts.push(`media ${media}`);
  status.textContent = parts.join(' · ');
});

playing = true;
syncPlayLabel();
void replay.play().then(() => {
  playing = false;
  syncPlayLabel();
});
