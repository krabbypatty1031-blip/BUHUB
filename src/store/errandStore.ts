import { create } from 'zustand';
import type { ErrandCategory } from '../types';

interface ErrandState {
  selectedCategory: ErrandCategory | null;
  acceptedErrands: Set<number>;
  closedPosts: Set<number>;
  expiredNotified: boolean;

  setCategory: (category: ErrandCategory | null) => void;
  toggleAccept: (index: number) => void;
  hasAccepted: (index: number) => boolean;
  closePost: (index: number) => void;
  isClosed: (index: number) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const useErrandStore = create<ErrandState>()((set, get) => ({
  selectedCategory: null,
  acceptedErrands: new Set<number>(),
  closedPosts: new Set<number>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleAccept: (index) =>
    set((state) => {
      const next = new Set(state.acceptedErrands);
      next.add(index);
      return { acceptedErrands: next };
    }),

  hasAccepted: (index) => get().acceptedErrands.has(index),
  closePost: (index) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(index);
      return { closedPosts: next };
    }),
  isClosed: (index) => get().closedPosts.has(index),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
