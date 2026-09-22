export type StepKind =
  | 'run'
  | 'reasoning'
  | 'message'
  | 'tool'
  | 'subagent'
  | 'error'
  | 'custom';

export type RunStatus = 'running' | 'ok' | 'error' | 'aborted';

export type DeltaChannel = 'content' | 'reasoning' | 'tool_args' | 'tool_result';

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

export interface ToolState {
  name: string;
  args?: string;
  result?: string;
  error?: string;
}

/**
 * A binary artefact a step produced — a generated image, a screenshot, a file.
 * Kept separate from `ToolState.result` on purpose: a tool result is text the
 * model reads back, media is something a human looks at. Merging the two breaks
 * as soon as a step emits both.
 */
export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export interface TraceMedia {
  kind: MediaKind;
  url: string;
  alt?: string;
  mime?: string;
  width?: number;
  height?: number;
  label?: string;
}

export interface TraceNode {
  id: string;
  parentId: string | null;
  kind: StepKind;
  label?: string;
  status: RunStatus;
  startedAt?: number;
  endedAt?: number;
  content: string;
  reasoning: string;
  tool?: ToolState;
  media?: TraceMedia[];
  usage?: Usage;
  childIds: string[];
}

export interface TraceTree {
  runId: string;
  status: RunStatus;
  nodes: Record<string, TraceNode>;
  rootIds: string[];
  usage: Usage;
  version: number;
}

export type TraceEvent =
  | { type: 'run.start'; id: string; ts?: number; label?: string }
  | {
      type: 'step.start';
      id: string;
      ts?: number;
      kind: StepKind;
      parentId?: string | null;
      label?: string;
    }
  | { type: 'step.delta'; id: string; channel: DeltaChannel; text: string }
  | {
      type: 'step.end';
      id: string;
      ts?: number;
      status?: Exclude<RunStatus, 'running'>;
      error?: string;
    }
  | {
      type: 'tool.call';
      id: string;
      ts?: number;
      parentId?: string | null;
      name: string;
      args?: string;
    }
  | { type: 'tool.result'; id: string; output?: string; error?: string; ts?: number }
  | { type: 'media'; id: string; media: TraceMedia; ts?: number }
  /** With `id`, the tokens are attributed to that step as well as the run. */
  | { type: 'usage'; usage: Usage; id?: string; ts?: number }
  | { type: 'run.end'; ts?: number; status?: Exclude<RunStatus, 'running'> };

export interface TraceAdapter<TChunk = unknown> {
  name: string;
  toEvents(source: AsyncIterable<TChunk> | Iterable<TChunk>): AsyncIterable<TraceEvent>;
}

export function emptyTree(runId = 'run'): TraceTree {
  return { runId, status: 'running', nodes: {}, rootIds: [], usage: {}, version: 0 };
}
