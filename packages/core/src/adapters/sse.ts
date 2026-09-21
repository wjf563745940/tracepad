export type SseChunk = string | Uint8Array;

function toString(chunk: SseChunk, decoder: TextDecoder): string {
  return typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
}

export async function* parseSseChunks(
  source: AsyncIterable<SseChunk> | Iterable<SseChunk>
): AsyncGenerator<Record<string, unknown>> {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of source) {
    buffer += toString(chunk, decoder);
    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const payload = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (payload && payload !== '[DONE]') {
        try {
          yield JSON.parse(payload) as Record<string, unknown>;
        } catch {
          // 忽略无法解析的片段，保持流的健壮性
        }
      }
      separator = buffer.indexOf('\n\n');
    }
  }
}
