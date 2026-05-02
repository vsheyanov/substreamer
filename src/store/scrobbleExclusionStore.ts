import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from './persistence';

export interface ScrobbleExclusion {
  id: string;
  name: string;
}

export type ScrobbleExclusionType = 'album' | 'artist' | 'playlist';

interface ScrobbleExclusionState {
  excludedAlbums: Record<string, ScrobbleExclusion>;
  excludedArtists: Record<string, ScrobbleExclusion>;
  excludedPlaylists: Record<string, ScrobbleExclusion>;
  addExclusion: (type: ScrobbleExclusionType, id: string, name: string) => void;
  removeExclusion: (type: ScrobbleExclusionType, id: string) => void;
  /**
   * Merge the given exclusions into the existing set: union of all three
   * dicts, existing-wins on key conflict (consistent with mbidOverrideStore).
   * Used by merge-mode backup restore. Returns counts across all three types.
   */
  mergeExclusions: (incoming: {
    excludedAlbums?: Record<string, ScrobbleExclusion>;
    excludedArtists?: Record<string, ScrobbleExclusion>;
    excludedPlaylists?: Record<string, ScrobbleExclusion>;
  }) => { added: number; skipped: number };
}

const PERSIST_KEY = 'substreamer-scrobble-exclusions';

function fieldForType(type: ScrobbleExclusionType): keyof Pick<ScrobbleExclusionState, 'excludedAlbums' | 'excludedArtists' | 'excludedPlaylists'> {
  switch (type) {
    case 'album': return 'excludedAlbums';
    case 'artist': return 'excludedArtists';
    case 'playlist': return 'excludedPlaylists';
  }
}

export const scrobbleExclusionStore = create<ScrobbleExclusionState>()(
  persist(
    (set, get) => ({
      excludedAlbums: {},
      excludedArtists: {},
      excludedPlaylists: {},

      addExclusion: (type, id, name) => {
        const field = fieldForType(type);
        set((state) => ({
          [field]: { ...state[field], [id]: { id, name } },
        }));
      },

      removeExclusion: (type, id) => {
        const field = fieldForType(type);
        set((state) => {
          const { [id]: _, ...rest } = state[field];
          return { [field]: rest };
        });
      },

      mergeExclusions: (incoming) => {
        const state = get();
        let added = 0;
        let skipped = 0;
        const next = {
          excludedAlbums: { ...state.excludedAlbums },
          excludedArtists: { ...state.excludedArtists },
          excludedPlaylists: { ...state.excludedPlaylists },
        };
        const tryMerge = (
          target: Record<string, ScrobbleExclusion>,
          source: Record<string, ScrobbleExclusion> | undefined,
        ) => {
          if (!source) return;
          for (const [id, value] of Object.entries(source)) {
            if (!value || typeof value !== 'object' || !value.id) { skipped++; continue; }
            if (id in target) { skipped++; continue; }
            target[id] = value;
            added++;
          }
        };
        tryMerge(next.excludedAlbums, incoming.excludedAlbums);
        tryMerge(next.excludedArtists, incoming.excludedArtists);
        tryMerge(next.excludedPlaylists, incoming.excludedPlaylists);
        if (added > 0) set(next);
        return { added, skipped };
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => kvStorage),
      partialize: (state) => ({
        excludedAlbums: state.excludedAlbums,
        excludedArtists: state.excludedArtists,
        excludedPlaylists: state.excludedPlaylists,
      }),
    },
  ),
);
