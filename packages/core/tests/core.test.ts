import { describe, expect, it } from 'vitest';
import { createTrace, openaiChat } from '../src/index.js';
import type { TraceNode } from '../src/index.js';

function sse(...payloads: unknown[]): string[] {
  return payloads.map((payload) => `data: ${JSON.stringify(payload)}\n\n`);
}

async function* stream(): AsyncGenerator<string> {
  yield* sse(
    { id: 'chatcmpl-1', choices: [{ index: 0, delta: { role: 'assistant', reasoning_content: '先查一下' } }] },
    { id: 'chatcmpl-1', choices: [{ index: 0, delta: { reasoning_content: '天气' } }] },
    { id: 'chatcmpl-1', choices: [{ index: 0, delta: { content: '你好' } }] },
    {
      id: 'chatcmpl-1',
      choices: [
        {
          index: 0,
          delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'search', arguments: '{"q":' } }] }
        }
      ]
    },
    { id: 'chatcmpl-1', choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"天气"}' } }] } }] },
    { id: 'chatcmpl-1', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    { id: 'chatcmpl-1', choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    '[DONE]'
  );
}

function find(nodes: Record<string, TraceNode>, kind: string): TraceNode | undefined {
  return Object.values(nodes).find((node) => node.kind === kind);
}

describe('tracepad core', () => {
  it('normalises a chat completions stream into a trace tree', async () => {
    const trace = createTrace({ adapter: openaiChat() });
    const seen: number[] = [];
    const unsubscribe = trace.subscribe((tree) => seen.push(tree.version));

    await trace.consume(stream());
    const tree = trace.snapshot();
    unsubscribe();

    expect(tree.runId).toBe('chatcmpl-1');
    expect(tree.status).toBe('ok');

    const reasoning = find(tree.nodes, 'reasoning');
    expect(reasoning?.reasoning).toBe('先查一下天气');

    const message = find(tree.nodes, 'message');
    expect(message?.content).toBe('你好');

    const tool = find(tree.nodes, 'tool');
    expect(tool?.tool?.name).toBe('search');
    expect(tool?.tool?.args).toBe('{"q":"天气"}');

    expect(tree.usage.inputTokens).toBe(10);
    expect(tree.usage.outputTokens).toBe(5);
    expect(seen.length).toBeGreaterThan(0);
    expect(tree.rootIds).toContain('chatcmpl-1');
  });

  it('keeps snapshots immutable', () => {
    const trace = createTrace();
    const before = trace.snapshot();
    trace.push({ type: 'run.start', id: 'run-1' });
    trace.push({ type: 'step.start', id: 'step-1', kind: 'message', parentId: 'run-1' });
    const after = trace.snapshot();

    expect(before.version).toBe(0);
    expect(after.version).toBe(2);
    expect(Object.keys(before.nodes)).toHaveLength(0);
    expect(after.nodes['step-1']?.parentId).toBe('run-1');
    expect(after.nodes['run-1']?.childIds).toContain('step-1');
  });
});
