export const tokens = `
:host {
  --tp-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --tp-font-size: 13px;
  --tp-radius: 8px;
  --tp-gap: 6px;
  --tp-color-text: #e6e6e6;
  --tp-color-muted: #9a9a9a;
  --tp-color-hover: rgba(140, 140, 140, 0.14);
  --tp-color-active: rgba(140, 140, 140, 0.24);
  --tp-color-surface: rgba(140, 140, 140, 0.1);
  --tp-color-error: #f09595;
  --tp-color-ok: #97c459;
  --tp-color-running: #85b7eb;
}
:host([theme="light"]) {
  --tp-color-text: #1a1a1a;
  --tp-color-muted: #6b6b6b;
  --tp-color-hover: rgba(0, 0, 0, 0.06);
  --tp-color-active: rgba(0, 0, 0, 0.1);
  --tp-color-surface: rgba(0, 0, 0, 0.04);
  --tp-color-error: #a32d2d;
  --tp-color-ok: #3b6d11;
  --tp-color-running: #185fa5;
}
:host {
  display: block;
  font-family: var(--tp-font);
  font-size: var(--tp-font-size);
  color: var(--tp-color-text);
  line-height: 1.6;
}
`;

export const timelineStyles = `
.timeline { list-style: none; margin: 0; padding: 0; }
.row {
  display: flex;
  align-items: center;
  gap: var(--tp-gap);
  padding: 4px 8px;
  border-radius: var(--tp-radius);
  cursor: pointer;
}
.row:hover { background: var(--tp-color-hover); }
.row[data-selected="true"] { background: var(--tp-color-active); }
.row[data-matched="false"] { opacity: 0.55; }
.toggle {
  all: unset;
  width: 14px;
  text-align: center;
  color: var(--tp-color-muted);
  cursor: pointer;
  user-select: none;
}
.toggle[data-empty="true"] { visibility: hidden; }
.kind {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--tp-color-surface);
  color: var(--tp-color-muted);
}
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { margin-left: auto; font-size: 11px; color: var(--tp-color-muted); font-variant-numeric: tabular-nums; }
.status[data-status="error"] { color: var(--tp-color-error); }
.status[data-status="running"] { color: var(--tp-color-running); }
.status[data-status="ok"] { color: var(--tp-color-ok); }
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 8px 8px;
  font-size: 11px;
  color: var(--tp-color-muted);
  font-variant-numeric: tabular-nums;
}
.stats b { color: var(--tp-color-text); font-weight: 600; }
.empty { padding: 8px; color: var(--tp-color-muted); }
`;

export const cardsStyles = `
.cards { display: flex; flex-direction: column; gap: 8px; }
.card { border-radius: var(--tp-radius); background: var(--tp-color-surface); overflow: hidden; }
.head {
  display: flex;
  align-items: center;
  gap: var(--tp-gap);
  padding: 7px 9px;
  cursor: pointer;
  user-select: none;
}
.head:hover { background: var(--tp-color-hover); }
.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.dot[data-status="ok"] { background: var(--tp-color-ok); }
.dot[data-status="error"] { background: var(--tp-color-error); }
.dot[data-status="running"] { background: var(--tp-color-running); }
.dot[data-status="aborted"] { background: var(--tp-color-muted); }
.title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kind {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--tp-color-hover);
  color: var(--tp-color-muted);
  flex: none;
}
.dur { margin-left: auto; font-size: 11px; color: var(--tp-color-muted); font-variant-numeric: tabular-nums; flex: none; }
.chev { width: 12px; text-align: center; color: var(--tp-color-muted); flex: none; }
.body { padding: 0 9px 9px; display: grid; gap: 6px; }
.body[data-open="false"] { display: none; }
.field { font-size: 11px; color: var(--tp-color-muted); }
.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--tp-color-hover);
  border-radius: 6px;
  padding: 6px 8px;
  margin: 0;
  max-height: 160px;
  overflow: auto;
}
.badge { font-size: 11px; color: var(--tp-color-muted); }
.empty { padding: 8px; color: var(--tp-color-muted); }
`;

export const usageStyles = `
.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 8px; margin-bottom: 12px; }
.metric { background: var(--tp-color-surface); border-radius: var(--tp-radius); padding: 8px 10px; }
.metric .k { font-size: 11px; color: var(--tp-color-muted); }
.metric .v { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.bars { display: grid; gap: 6px; }
.section { font-size: 11px; color: var(--tp-color-muted); margin: 10px 0 6px; }
.section:first-child { margin-top: 0; }
.bar-row { display: grid; grid-template-columns: minmax(0, 96px) 1fr 48px; align-items: center; gap: 8px; font-size: 11px; }
.bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tp-color-muted); }
.bar-track { height: 8px; border-radius: 999px; background: var(--tp-color-surface); position: relative; overflow: hidden; }
.bar-fill { position: absolute; top: 0; height: 100%; border-radius: 999px; }
.bar-value { text-align: right; color: var(--tp-color-muted); font-variant-numeric: tabular-nums; }
.empty { padding: 8px; color: var(--tp-color-muted); }
`;

export const ganttStyles = `
.gantt { display: grid; gap: 6px; }
.gantt-row { display: grid; grid-template-columns: minmax(0, 96px) 1fr; align-items: center; gap: 8px; font-size: 11px; }
.gantt-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tp-color-muted); }
.gantt-track { height: 10px; border-radius: 999px; background: var(--tp-color-surface); position: relative; overflow: hidden; }
.gantt-fill { position: absolute; top: 0; height: 100%; border-radius: 999px; }
.gantt-fill[data-running="true"] { opacity: 0.6; }
.foot { margin-top: 8px; font-size: 11px; color: var(--tp-color-muted); font-variant-numeric: tabular-nums; }
.empty { padding: 8px; color: var(--tp-color-muted); }
`;

export const mediaStyles = `
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.item {
  border-radius: var(--tp-radius);
  background: var(--tp-color-surface);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid transparent;
}
.item:hover { border-color: var(--tp-color-active); }
.item:focus-visible { outline: 2px solid var(--tp-color-running); outline-offset: 1px; }
.thumb { display: block; width: 100%; height: 92px; object-fit: cover; background: var(--tp-color-hover); }
.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92px;
  font-size: 11px;
  color: var(--tp-color-muted);
  background: var(--tp-color-hover);
}
.cap { font-size: 11px; color: var(--tp-color-muted); padding: 4px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 8px; color: var(--tp-color-muted); }
`;

export const reasoningStyles = `
.panel { border-radius: var(--tp-radius); background: var(--tp-color-surface); }
.summary {
  display: flex;
  align-items: center;
  gap: var(--tp-gap);
  padding: 6px 8px;
  cursor: pointer;
  color: var(--tp-color-muted);
  user-select: none;
}
.body { padding: 0 8px 8px; white-space: pre-wrap; }
.body[data-open="false"] { display: none; }
.chev { width: 14px; text-align: center; }
.meta { margin-left: auto; font-variant-numeric: tabular-nums; }
`;
