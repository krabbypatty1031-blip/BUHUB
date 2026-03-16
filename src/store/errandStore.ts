import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ErrandCategory } from '../types';

interface ErrandState {
  selectedCategory: ErrandCategory | null;
  acceptedErrands: Record<string, true>;
  closedPosts: Record<string, true>;
  expiredNotified: boolean;

  setCategory: (category: ErrandCategory | null) => void;
  toggleAccept: (id: string) => void;
  hasAccepted: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

interface PersistedErrandState {
  acceptedErrandIds: string[];
  closedPostIds: string[];
  expiredNotified: boolean;
}

export const useErrandStore = create<ErrandState>()(
  persist(
    (set, get) => ({
      selectedCategory: null,
      acceptedErrands: {} as Record<string, true>,
      closedPosts: {} as Record<string, true>,
      expiredNotified: false,

      setCategory: (selectedCategory) => set({ selectedCategory }),

      toggleAccept: (id) =>
        set((state) => ({
          acceptedErrands: { ...state.acceptedErrands, [id]: true as const },
        })),

      hasAccepted: (id) => id in get().acceptedErrands,

      closePost: (id) =>
        set((state) => ({
          closedPosts: { ...state.closedPosts, [id]: true as const },
        })),

      isClosed: (id) => id in get().closedPosts,
      setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
    }),
    {
      name: 'buhub-errand-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedErrandState => ({
        acceptedErrandIds: Object.keys(state.acceptedErrands),
        closedPostIds: Object.keys(state.closedPosts),
        expiredNotified: state.expiredNotified,
      }),
      merge: (persisted, currentState) => {
        const saved = persisted as PersistedErrandState | undefined;
        const accepted: Record<string, true> = {};
        const closed: Record<string, true> = {};
        for (const id of saved?.acceptedErrandIds ?? []) accepted[id] = true;
        for (const id of saved?.closedPostIds ?? []) closed[id] = true;
        return {
          ...currentState,
          acceptedErrands: accepted,
          closedPosts: closed,
          expiredNotified: saved?.expiredNotified ?? false,
        };
      },
    }
  )
);
