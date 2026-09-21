import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import type { StepKind, TraceNode } from '@tracepad/core';
import {
  createTraceView,
  rowLabel,
  statusLabel,
  statusTone,
  traceStats,
  visibleRows
} from '@tracepad/headless';
import type { TraceLike, TraceStats, TraceView, ViewState, VisibleRow } from '@tracepad/headless';

const INDENT_PX = 14;

export interface TraceTimelineProps {
  trace: TraceLike;
  query?: string;
  kinds?: StepKind[];
  defaultExpanded?: boolean;
  summary?: boolean;
  onSelect?: (payload: { id: string; node: TraceNode }) => void;
  onToggle?: (payload: { id: string; expanded: boolean }) => void;
}

interface Render {
  rows: VisibleRow[];
  stats: TraceStats;
}

/**
 * React port of `tp-timeline`. No logic of its own — it renders the rows produced
 * by `@tracepad/headless` and forwards interaction back to the view.
 *
 * The initial render is computed synchronously from pure helpers, so it also works
 * under `renderToString`; the stateful view is created in an effect.
 */
export function TraceTimeline({
  trace,
  query = '',
  kinds,
  defaultExpanded = true,
  summary = false,
  onSelect,
  onToggle
}: TraceTimelineProps): ReactElement {
  const [render, setRender] = useState<Render>(() => {
    const tree = trace.snapshot();
    const state: ViewState = {
      expanded: {},
      defaultExpanded,
      selectedId: null,
      filter: { query, kinds, keepAncestors: true },
      follow: true
    };
    return { rows: visibleRows(tree, state), stats: traceStats(tree) };
  });

  const viewRef = useRef<TraceView | null>(null);
  const kindsKey = kinds?.join(',') ?? '';

  useEffect(() => {
    const view = createTraceView(trace, { defaultExpanded });
    view.setFilter({ query, kinds, keepAncestors: true });
    const unsubscribe = view.subscribe(() => {
      setRender({ rows: view.rows(), stats: view.stats() });
    });
    viewRef.current = view;
    return () => {
      unsubscribe();
      view.dispose();
      viewRef.current = null;
    };
    // `query` / `kinds` are applied by the effect below; re-creating the view on
    // every keystroke would throw away the user's expansion state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace, defaultExpanded]);

  useEffect(() => {
    viewRef.current?.setFilter({ query, kinds, keepAncestors: true });
  }, [query, kindsKey]);

  const handleToggle = (row: VisibleRow) => (event: ReactMouseEvent): void => {
    event.stopPropagation();
    viewRef.current?.toggle(row.node.id);
    onToggle?.({ id: row.node.id, expanded: !row.expanded });
  };

  const handleSelect = (row: VisibleRow) => (): void => {
    viewRef.current?.select(row.node.id);
    onSelect?.({ id: row.node.id, node: row.node });
  };

  const stats = render.stats;
  const statParts: Array<[string, string]> = [
    ['steps', String(stats.totalSteps)],
    ['errors', String(stats.errors)],
    ['running', String(stats.running)]
  ];
  if (stats.durationMs !== null) statParts.push(['duration', `${stats.durationMs}ms`]);
  if (stats.inputTokens !== undefined) statParts.push(['in', String(stats.inputTokens)]);
  if (stats.outputTokens !== undefined) statParts.push(['out', String(stats.outputTokens)]);

  return (
    <div className="tp-timeline-root">
      {summary && (
        <div className="tp-stats">
          {statParts.map(([name, value]) => (
            <span key={name}>
              {name} <b>{value}</b>
            </span>
          ))}
        </div>
      )}
      {render.rows.length === 0 ? (
        <div className="tp-empty">No steps yet</div>
      ) : (
        <ul className="tp-timeline" role="tree">
          {render.rows.map((row) => {
            const node = row.node;
            return (
              <li
                key={node.id}
                className="tp-row"
                role="treeitem"
                data-id={node.id}
                data-kind={node.kind}
                data-selected={String(row.selected)}
                data-matched={String(row.matched)}
                style={{ marginInlineStart: row.depth * INDENT_PX }}
                onClick={handleSelect(row)}
              >
                <span
                  className="tp-toggle"
                  data-empty={String(!row.hasChildren)}
                  onClick={handleToggle(row)}
                >
                  {row.expanded ? '▾' : '▸'}
                </span>
                <span className="tp-kind">{node.kind}</span>
                <span className="tp-label">{rowLabel(node)}</span>
                <span className="tp-status" data-status={statusTone(node)}>
                  {statusLabel(node)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
