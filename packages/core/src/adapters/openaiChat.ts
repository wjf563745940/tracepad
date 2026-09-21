import type { TraceAdapter, TraceEvent } from '../types.js';
import { parseSseChunks } from './sse.js';
import type { SseChunk } from './sse.js';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function openaiChat(): TraceAdapter<SseChunk> {
  return {
    name: 'openai-chat-completions',
    async *toEvents(source): AsyncIterable<TraceEvent> {
      let runId = 'run';
      let started = false;
      const reasoningIds = new Map<number, string>();
      const messageIds = new Map<number, string>();
      const toolIds = new Set<string>();
      const toolCallIndexToId = new Map<number, string>();

      for await (const chunk of parseSseChunks(source)) {
        if (!started) {
          started = true;
          runId = asString(chunk.id) ?? runId;
          yield { type: 'run.start', id: runId };
        }

        const choice = asRecord(asArray(chunk.choices)?.[0]);
        if (choice) {
          const index = asNumber(choice.index) ?? 0;
          const delta = asRecord(choice.delta) ?? {};

          const reasoning = asString(delta.reasoning_content) ?? asString(delta.reasoning);
          if (reasoning) {
            let stepId = reasoningIds.get(index);
            if (!stepId) {
              stepId = `${runId}:reasoning:${index}`;
              reasoningIds.set(index, stepId);
              yield { type: 'step.start', id: stepId, kind: 'reasoning', parentId: runId, label: 'thinking' };
            }
            yield { type: 'step.delta', id: stepId, channel: 'reasoning', text: reasoning };
          }

          const content = asString(delta.content);
          if (content) {
            let stepId = messageIds.get(index);
            if (!stepId) {
              stepId = `${runId}:message:${index}`;
              messageIds.set(index, stepId);
              yield { type: 'step.start', id: stepId, kind: 'message', parentId: runId };
            }
            yield { type: 'step.delta', id: stepId, channel: 'content', text: content };
          }

          const toolCalls = asArray(delta.tool_calls);
          if (toolCalls) {
            for (const call of toolCalls) {
              const entry = asRecord(call);
              if (!entry) continue;
              const fn = asRecord(entry.function) ?? {};
              const callIndex = asNumber(entry.index) ?? 0;
              const declaredId = asString(entry.id);
              let toolId: string;
              if (declaredId) {
                toolId = declaredId;
                toolCallIndexToId.set(callIndex, toolId);
              } else {
                toolId = toolCallIndexToId.get(callIndex) ?? `${runId}:tool:${index}:${callIndex}`;
              }
              if (!toolIds.has(toolId)) {
                toolIds.add(toolId);
                yield {
                  type: 'tool.call',
                  id: toolId,
                  parentId: runId,
                  name: asString(fn.name) ?? 'tool',
                  args: asString(fn.arguments) ?? ''
                };
              } else {
                const args = asString(fn.arguments);
                if (args) yield { type: 'step.delta', id: toolId, channel: 'tool_args', text: args };
              }
            }
          }

          const finish = asString(choice.finish_reason);
          if (finish) {
            const closing: string[] = [];
            const reasoningId = reasoningIds.get(index);
            if (reasoningId) {
              closing.push(reasoningId);
              reasoningIds.delete(index);
            }
            const messageId = messageIds.get(index);
            if (messageId) {
              closing.push(messageId);
              messageIds.delete(index);
            }
            for (const id of closing) yield { type: 'step.end', id, status: 'ok' };
          }
        }

        const usage = asRecord(chunk.usage);
        if (usage) {
          yield {
            type: 'usage',
            usage: {
              inputTokens: asNumber(usage.prompt_tokens),
              outputTokens: asNumber(usage.completion_tokens)
            }
          };
        }
      }

      yield { type: 'run.end', status: 'ok' };
    }
  };
}
