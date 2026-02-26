import { create } from 'zustand';
import type { ErrandCategory } from '../types';

interface ErrandState {
  selectedCategory: ErrandCategory | null;
  acceptedErrands: Set<string>;
  closedPosts: Set<string>;
  expiredNotified: boolean;

  setCategory: (category: ErrandCategory | null) => void;
  toggleAccept: (id: string) => void;
  hasAccepted: (id: string) => boolean;
  closePost: (id: string) => void;
  isClosed: (id: string) => boolean;
  setExpiredNotified: (value: boolean) => void;
}

export const useErrandStore = create<ErrandState>()((set, get) => ({
  selectedCategory: null,
  acceptedErrands: new Set<string>(),
  closedPosts: new Set<string>(),
  expiredNotified: false,

  setCategory: (selectedCategory) => set({ selectedCategory }),

  toggleAccept: (id) =>
    set((state) => {
      const next = new Set(state.acceptedErrands);
      next.add(id);
      return { acceptedErrands: next };
    }),

  hasAccepted: (id) => get().acceptedErrands.has(id),
  closePost: (id) =>
    set((state) => {
      const next = new Set(state.closedPosts);
      next.add(id);
      return { closedPosts: next };
    }),
  isClosed: (id) => get().closedPosts.has(id),
  setExpiredNotified: (expiredNotified) => set({ expiredNotified }),
}));
