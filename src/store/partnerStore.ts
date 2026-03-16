import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PartnerCategory } from '../types';

interface PartnerState {
  selectedCategory: PartnerCategory | null;
  joinedActivities: Record<string, true>;
  closedPosts: Record<string, true>;
  expiredNotified: boolean;

  setCategory: (category: PartnerCategory | null) => void;
  toggleJoin: (id: string) => void;
  hasJoined: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

interface PersistedPartnerState {
  joinedActivityIds: string[];
  closedPostIds: string[];
  expiredNotified: boolean;
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      selectedCategory: null,
      joinedActivities: {} as Record<string, true>,
      closedPosts: {} as Record<string, true>,
      expiredNotified: false,

      setCategory: (selectedCategory) => set({ selectedCategory }),

      toggleJoin: (id) =>
        set((state) => {
          if (id in state.joinedActivities) {
            const { [id]: _, ...rest } = state.joinedActivities;
            return { joinedActivities: rest };
          }
          return { joinedActivities: { ...state.joinedActivities, [id]: true as const } };
        }),

      hasJoined: (id) => id in get().joinedActivities,

      closePost: (id) =>
        set((state) => ({
          closedPosts: { ...state.closedPosts, [id]: true as const },
        })),

      isClosed: (id) => id in get().closedPosts,
      setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
    }),
    {
      name: 'buhub-partner-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedPartnerState => ({
        joinedActivityIds: Object.keys(state.joinedActivities),
        closedPostIds: Object.keys(state.closedPosts),
        expiredNotified: state.expiredNotified,
      }),
      merge: (persisted, currentState) => {
        const saved = persisted as PersistedPartnerState | undefined;
        const joined: Record<string, true> = {};
        const closed: Record<string, true> = {};
        for (const id of saved?.joinedActivityIds ?? []) joined[id] = true;
        for (const id of saved?.closedPostIds ?? []) closed[id] = true;
        return {
          ...currentState,
          joinedActivities: joined,
          closedPosts: closed,
          expiredNotified: saved?.expiredNotified ?? false,
        };
      },
    }
  )
);
