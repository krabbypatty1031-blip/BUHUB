import { create } from 'zustand';
import type { PartnerCategory } from '../types';

interface PartnerState {
  selectedCategory: PartnerCategory | null;
  joinedActivities: Set<number>;
  closedPosts: Set<number>;
  expiredNotified: boolean;

  setCategory: (category: PartnerCategory | null) => void;
  toggleJoin: (index: number) => void;
  hasJoined: (index: number) => boolean;
  closePost: (index: number) => void;
  isClosed: (index: number) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const usePartnerStore = create<PartnerState>()((set, get) => ({
  selectedCategory: null,
  joinedActivities: new Set<number>(),
  closedPosts: new Set<number>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleJoin: (index) =>
    set((state) => {
      const next = new Set(state.joinedActivities);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return { joinedActivities: next };
    }),

  hasJoined: (index) => get().joinedActivities.has(index),
  closePost: (index) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(index);
      return { closedPosts: next };
    }),
  isClosed: (index) => get().closedPosts.has(index),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
