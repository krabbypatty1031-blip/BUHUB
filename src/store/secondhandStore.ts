import { create } from 'zustand';
import type { SecondhandCategory } from '../types';

interface SecondhandState {
  selectedCategory: SecondhandCategory | null;
  wantedItems: Set<number>;

  setCategory: (category: SecondhandCategory | null) => void;
  toggleWant: (index: number) => void;
  hasWanted: (index: number) => boolean;
}

export const useSecondhandStore = create<SecondhandState>()((set, get) => ({
  selectedCategory: null,
  wantedItems: new Set<number>(),

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleWant: (index) =>
    set((state) => {
      const next = new Set(state.wantedItems);
      next.add(index);
      return { wantedItems: next };
    }),

  hasWanted: (index) => get().wantedItems.has(index),
}));
