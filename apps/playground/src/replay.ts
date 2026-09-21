import { createTrace, openaiChat } from '@tracepad/core';
import type { SseChunk, Trace, TraceEvent } from '@tracepad/core';

export interface SsePhase {
  kind: 'sse';
  chunks: unknown[];
  gap?: number;
}

export interface PushPhase {
  kind: 'push';
  events: TraceEvent[];
  gap?: number;
}

export type Phase = SsePhase | PushPhase;

const RUN_ID = 'chatcmpl-tracepad-demo';
const TOOL_ID = 'call_weather_1';
const ABORT = Symbol('replay-aborted');

const chunkText = (text: string, size = 4): string[] => {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
};

const reasoning = (text: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: { reasoning_content: text } }]
});

const answer = (text: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: { content: text } }]
});

const toolCall = () => ({
  id: RUN_ID,
  choices: [
    {
      index: 0,
      delta: {
        tool_calls: [
          { index: 0, id: TOOL_ID, type: 'function', function: { name: 'get_weather', arguments: '' } }
        ]
      }
    }
  ]
});

const toolArgs = (text: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: text } }] } }]
});

const finish = (reason: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: {}, finish_reason: reason }]
});

const usage = (prompt: number, completion: number) => ({
  id: RUN_ID,
  choices: [],
  usage: { prompt_tokens: prompt, completion_tokens: completion }
});

/**
 * A scripted two-turn agent run, expressed as OpenAI Chat Completions chunks.
 * Everything the playground renders comes out of the real `openaiChat()` adapter —
 * nothing here touches the trace tree directly, except tool results, which no
 * chat-completions stream can carry.
 */
export const DEMO_SCRIPT: Phase[] = [
  {
    kind: 'sse',
    gap: 60,
    chunks: [
      ...chunkText('用户问杭州明天天气，还想知道适不适合骑行。先查天气，再看风力与降水。').map(reasoning),
      toolCall(),
      ...chunkText('{"city": "杭州", "date": "2026-09-22"}', 6).map(toolArgs),
      finish('tool_calls'),
      usage(128, 42)
    ]
  },
  {
    kind: 'push',
    gap: 380,
    events: [
      {
        type: 'tool.result',
        id: TOOL_ID,
        output: '{"temp": "24~30℃", "wind": "东南风 3 级", "rain": "20%"}'
      }
    ]
  },
  {
    kind: 'sse',
    gap: 60,
    chunks: [
      ...chunkText('温度 24~30 合适，风力 3 级不大，降水 20% 偏低。可以给结论了。').map(reasoning),
      ...chunkText('杭州明天 24~30℃，东南风 3 级，降水概率 20%。骑行总体合适，建议带件薄雨衣、避开午后时段。').map(answer),
      finish('stop'),
      usage(96, 58)
    ]
  }
];

export interface Replay {
  readonly trace: Trace<SseChunk>;
  play(): Promise<void>;
  pause(): void;
  resume(): void;
  reset(): void;
  setSpeed(speed: number): void;
  isPlaying(): boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function createReplay(script: Phase[] = DEMO_SCRIPT): Replay {
  const adapter = openaiChat();
  const trace = createTrace<SseChunk>({ adapter });

  let speed = 1;
  let generation = 0;
  let paused = false;
  let playing = false;

  /** Waits `ms` (scaled), staying responsive to pause / reset. */
  async function tick(gen: number, ms: number): Promise<void> {
    let remaining = ms / speed;
    while (remaining > 0) {
      if (gen !== generation) throw ABORT;
      if (paused) {
        await sleep(60);
        continue;
      }
      const step = Math.min(50, remaining);
      await sleep(step);
      remaining -= step;
    }
    if (gen !== generation) throw ABORT;
  }

  async function* stream(gen: number, phase: SsePhase): AsyncGenerator<SseChunk> {
    for (const chunk of phase.chunks) {
      await tick(gen, phase.gap ?? 80);
      yield `data: ${JSON.stringify(chunk)}\n\n`;
    }
  }

  async function run(gen: number, phases: Phase[]): Promise<void> {
    for (let i = 0; i < phases.length; i += 1) {
      const phase = phases[i];
      if (!phase) continue;
      const isLast = i === phases.length - 1;

      if (phase.kind === 'push') {
        for (const event of phase.events) {
          await tick(gen, phase.gap ?? 140);
          trace.push(event);
        }
        continue;
      }

      // `openaiChat()` closes the run at the end of every stream. For a multi-turn
      // replay we keep the run open until the last phase.
      for await (const event of adapter.toEvents(stream(gen, phase))) {
        if (gen !== generation) throw ABORT;
        if (event.type === 'run.end' && !isLast) continue;
        trace.push(event);
      }
    }
  }

  return {
    trace,
    async play() {
      const gen = (generation += 1);
      paused = false;
      playing = true;
      trace.reset();
      try {
        await run(gen, script);
      } catch (error) {
        if (error !== ABORT) throw error;
        return;
      }
      if (gen === generation) playing = false;
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    reset() {
      generation += 1;
      paused = false;
      playing = false;
      trace.reset();
    },
    setSpeed(next: number) {
      speed = next > 0 ? next : 1;
    },
    isPlaying() {
      return playing && !paused;
    }
  };
}
