import { create } from 'zustand';
import type { SecondhandCategory } from '../types';

interface SecondhandState {
  selectedCategory: SecondhandCategory | null;
  wantedItems: Set<number>;
  closedPosts: Set<number>;
  expiredNotified: boolean;

  setCategory: (category: SecondhandCategory | null) => void;
  toggleWant: (index: number) => void;
  hasWanted: (index: number) => boolean;
  closePost: (index: number) => void;
  isClosed: (index: number) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const useSecondhandStore = create<SecondhandState>()((set, get) => ({
  selectedCategory: null,
  wantedItems: new Set<number>(),
  closedPosts: new Set<number>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleWant: (index) =>
    set((state) => {
      const next = new Set(state.wantedItems);
      next.add(index);
      return { wantedItems: next };
    }),

  hasWanted: (index) => get().wantedItems.has(index),
  closePost: (index) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(index);
      return { closedPosts: next };
    }),
  isClosed: (index) => get().closedPosts.has(index),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
