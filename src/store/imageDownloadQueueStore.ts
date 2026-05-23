/**
 * Image download queue store — Zustand wrapper around the persistent SQL
 * queue introduced in Phase 1/2 of the image-cache rework. Mirror of
 * `musicCacheStore`'s queue exposure shape, scaled down for the simpler
 * image-cache needs (no per-row UI inspection — Settings only needs the
 * cycle summary).
 *
 * The full queue array is rebuilt from SQL on demand via
 * `hydrateFromDb()`. Cycle metadata (cycleId, scope, total, isPaused)
 * is owned by the service-layer kvStorage blob (`substreamer-image-queue-meta`)
 * and re-read on every subscription tick — the store is a thin reactive
 * mirror, not the source of truth.
 *
 * See plans/2026-05-23-image-cache-queue-rework.md.
 */
import { create } from 'zustand';

import {
  type ImageDownloadQueueRow,
  type ImageDownloadQueueScope,
  hydrateImageDownloadQueue,
} from './persistence/imageDownloadQueueTable';
import {
  getImageQueueCycle,
  getImageQueueCycleProgress,
  isImageQueuePaused,
  subscribeImageQueueChanges,
} from '../services/imageCacheService';

export interface ImageDownloadQueueState {
  queue: ImageDownloadQueueRow[];
  cycleId: string | null;
  cycleScope: ImageDownloadQueueScope | null;
  cycleTotal: number;
  cycleProcessed: number;
  cycleFailed: number;
  isPaused: boolean;

  /** Re-read the SQL queue + cycle meta into the store. Safe to call repeatedly. */
  hydrateFromDb: () => void;
  /** Update only the derived progress fields without re-querying the queue array. */
  refreshProgress: () => void;
}

export const imageDownloadQueueStore = create<ImageDownloadQueueState>()((set) => ({
  queue: [],
  cycleId: null,
  cycleScope: null,
  cycleTotal: 0,
  cycleProcessed: 0,
  cycleFailed: 0,
  isPaused: false,

  hydrateFromDb: () => {
    const queue = hydrateImageDownloadQueue();
    const cycle = getImageQueueCycle();
    const progress = getImageQueueCycleProgress();
    set({
      queue,
      cycleId: cycle.cycleId,
      cycleScope: cycle.cycleScope,
      cycleTotal: cycle.cycleTotal,
      cycleProcessed: progress.processed,
      cycleFailed: progress.failed,
      isPaused: isImageQueuePaused(),
    });
  },

  refreshProgress: () => {
    const cycle = getImageQueueCycle();
    const progress = getImageQueueCycleProgress();
    set({
      cycleId: cycle.cycleId,
      cycleScope: cycle.cycleScope,
      cycleTotal: cycle.cycleTotal,
      cycleProcessed: progress.processed,
      cycleFailed: progress.failed,
      isPaused: isImageQueuePaused(),
    });
  },
}));

// Wire the service-layer notifier so any queue mutation pushes a refresh
// into the store. Service is the source of truth; this is a one-way
// subscription so the store reactively mirrors the SQL/meta state.
subscribeImageQueueChanges(() => {
  imageDownloadQueueStore.getState().refreshProgress();
});
