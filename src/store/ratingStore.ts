import { create } from 'zustand';
import type { RatingCategory } from '../types';

interface RatingState {
  selectedCategory: RatingCategory;
  searchQuery: string;

  setCategory: (category: RatingCategory) => void;
  setSearchQuery: (query: string) => void;
}

export const useRatingStore = create<RatingState>()((set) => ({
  selectedCategory: 'teacher',
  searchQuery: '',

  setCategory: (selectedCategory) => set({ selectedCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
