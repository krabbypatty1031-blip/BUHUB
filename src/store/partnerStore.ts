import { create } from 'zustand';
import type { PartnerCategory } from '../types';

interface PartnerState {
  selectedCategory: PartnerCategory | null;
  joinedActivities: Set<number>;

  setCategory: (category: PartnerCategory | null) => void;
  toggleJoin: (index: number) => void;
  hasJoined: (index: number) => boolean;
}

export const usePartnerStore = create<PartnerState>()((set, get) => ({
  selectedCategory: null,
  joinedActivities: new Set<number>(),

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
}));
