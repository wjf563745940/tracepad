import type { MediaKind, TraceTree } from '@tracepad/core';
import { rowLabel } from './format.js';

/** A binary artefact flattened out of the tree, ready for a gallery. */
export interface MediaItem {
  key: string;
  nodeId: string;
  stepLabel: string;
  kind: MediaKind;
  url: string;
  alt?: string;
  label?: string;
  width?: number;
  height?: number;
}

export function mediaItems(tree: TraceTree): MediaItem[] {
  const items: MediaItem[] = [];

  for (const node of Object.values(tree.nodes)) {
    const media = node.media;
    if (!media) continue;

    media.forEach((entry, index) => {
      const item: MediaItem = {
        key: `${node.id}:${index}`,
        nodeId: node.id,
        stepLabel: rowLabel(node),
        kind: entry.kind,
        url: entry.url
      };
      if (entry.alt !== undefined) item.alt = entry.alt;
      if (entry.label !== undefined) item.label = entry.label;
      if (entry.width !== undefined) item.width = entry.width;
      if (entry.height !== undefined) item.height = entry.height;
      items.push(item);
    });
  }

  return items;
}
