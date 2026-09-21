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
