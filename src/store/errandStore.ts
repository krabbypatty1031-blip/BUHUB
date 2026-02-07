import { create } from 'zustand';
import type { ErrandCategory } from '../types';

interface ErrandState {
  selectedCategory: ErrandCategory | null;
  acceptedErrands: Set<number>;

  setCategory: (category: ErrandCategory | null) => void;
  toggleAccept: (index: number) => void;
  hasAccepted: (index: number) => boolean;
}

export const useErrandStore = create<ErrandState>()((set, get) => ({
  selectedCategory: null,
  acceptedErrands: new Set<number>(),

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleAccept: (index) =>
    set((state) => {
      const next = new Set(state.acceptedErrands);
      next.add(index);
      return { acceptedErrands: next };
    }),

  hasAccepted: (index) => get().acceptedErrands.has(index),
}));
