import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from './persistence';

interface OfflineModeState {
  offlineMode: boolean;
  showInFilterBar: boolean;

  toggleOfflineMode: () => void;
  setOfflineMode: (value: boolean) => void;
  setShowInFilterBar: (show: boolean) => void;
}

const PERSIST_KEY = 'substreamer-offline-mode';

export const offlineModeStore = create<OfflineModeState>()(
  persist(
    (set) => ({
      offlineMode: false,
      showInFilterBar: true,

      toggleOfflineMode: () => set((s) => ({ offlineMode: !s.offlineMode })),
      setOfflineMode: (offlineMode) => set({ offlineMode }),
      setShowInFilterBar: (showInFilterBar) => set({ showInFilterBar }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => kvStorage),
      partialize: (state) => ({
        offlineMode: state.offlineMode,
        showInFilterBar: state.showInFilterBar,
      }),
    }
  )
);

import { filterBarStore } from './filterBarStore';

let _filterBarSyncUnsub: (() => void) | null = null;

/**
 * Wires the offline-mode → filterBar `downloadedOnly` sync and mirrors the
 * current offline-mode value into the filter bar so initial state is
 * consistent. Idempotent — repeat calls return the same teardown handle.
 *
 * Lives in a helper (not at module scope) so the side effect doesn't fire
 * during test imports — preserves test isolation. Called from
 * `runDeferredStartup` in `src/app/_layout.tsx` at post-login boot time.
 */
export function initializeOfflineFilterBarSync(): () => void {
  if (_filterBarSyncUnsub) return _filterBarSyncUnsub;

  const unsub = offlineModeStore.subscribe((state, prevState) => {
    if (state.offlineMode === prevState.offlineMode) return;
    filterBarStore.getState().setDownloadedOnly(state.offlineMode);
  });

  // Initial sync — kvStorage rehydration is synchronous during create(),
  // so by the time this helper runs the persisted offlineMode is loaded.
  if (offlineModeStore.getState().offlineMode) {
    filterBarStore.getState().setDownloadedOnly(true);
  }

  _filterBarSyncUnsub = () => {
    unsub();
    _filterBarSyncUnsub = null;
  };
  return _filterBarSyncUnsub;
}
