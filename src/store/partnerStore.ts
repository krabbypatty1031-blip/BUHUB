import { create } from 'zustand';
import type { PartnerCategory } from '../types';

interface PartnerState {
  selectedCategory: PartnerCategory | null;
  joinedActivities: Set<string>;
  closedPosts: Set<string>;
  expiredNotified: boolean;

  setCategory: (category: PartnerCategory | null) => void;
  toggleJoin: (id: string) => void;
  hasJoined: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const usePartnerStore = create<PartnerState>()((set, get) => ({
  selectedCategory: null,
  joinedActivities: new Set<string>(),
  closedPosts: new Set<string>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleJoin: (id) =>
    set((state) => {
      const next = new Set(state.joinedActivities);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { joinedActivities: next };
    }),

  hasJoined: (id) => get().joinedActivities.has(id),
  closePost: (id) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(id);
      return { closedPosts: next };
    }),
  isClosed: (id) => get().closedPosts.has(id),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
