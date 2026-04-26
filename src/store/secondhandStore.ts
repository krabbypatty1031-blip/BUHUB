import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SecondhandCategory } from '../types';

interface SecondhandState {
  selectedCategory: SecondhandCategory | null;
  wantedItems: Record<string, true>;
  closedPosts: Record<string, true>;
  expiredNotified: boolean;

  setCategory: (category: SecondhandCategory | null) => void;
  toggleWant: (id: string) => void;
  hasWanted: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

interface PersistedSecondhandState {
  wantedItemIds: string[];
  closedPostIds: string[];
}

export const useSecondhandStore = create<SecondhandState>()(
  persist(
    (set, get) => ({
      selectedCategory: null,
      wantedItems: {} as Record<string, true>,
      closedPosts: {} as Record<string, true>,
      expiredNotified: false,

      setCategory: (selectedCategory) => set({ selectedCategory }),

      toggleWant: (id) =>
        set((state) => {
          if (id in state.wantedItems) {
            const { [id]: _, ...rest } = state.wantedItems;
            return { wantedItems: rest };
          }
          return { wantedItems: { ...state.wantedItems, [id]: true as const } };
        }),

      hasWanted: (id) => id in get().wantedItems,

      closePost: (id) =>
        set((state) => ({
          closedPosts: { ...state.closedPosts, [id]: true as const },
        })),

      isClosed: (id) => id in get().closedPosts,
      setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
    }),
    {
      name: 'ulink-secondhand-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedSecondhandState => ({
        wantedItemIds: Object.keys(state.wantedItems),
        closedPostIds: Object.keys(state.closedPosts),
      }),
      merge: (persisted, currentState) => {
        const saved = persisted as PersistedSecondhandState | undefined;
        const wanted: Record<string, true> = {};
        const closed: Record<string, true> = {};
        for (const id of saved?.wantedItemIds ?? []) wanted[id] = true;
        for (const id of saved?.closedPostIds ?? []) closed[id] = true;
        // expiredNotified is intentionally NOT rehydrated — fires once per
        // cold start, not once per install.
        return {
          ...currentState,
          wantedItems: wanted,
          closedPosts: closed,
          expiredNotified: false,
        };
      },
    }
  )
);
