import { create } from 'zustand';
import type { SecondhandCategory } from '../types';

interface SecondhandState {
  selectedCategory: SecondhandCategory | null;
  wantedItems: Set<string>;
  closedPosts: Set<string>;
  expiredNotified: boolean;

  setCategory: (category: SecondhandCategory | null) => void;
  toggleWant: (id: string) => void;
  hasWanted: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const useSecondhandStore = create<SecondhandState>()((set, get) => ({
  selectedCategory: null,
  wantedItems: new Set<string>(),
  closedPosts: new Set<string>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleWant: (id) =>
    set((state) => {
      const next = new Set(state.wantedItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { wantedItems: next };
    }),

  hasWanted: (id) => get().wantedItems.has(id),
  closePost: (id) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(id);
      return { closedPosts: next };
    }),
  isClosed: (id) => get().closedPosts.has(id),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
