import { create } from 'zustand';
import type { RatingCategory, RatingSortMode } from '../types';

interface RatingState {
  selectedCategory: RatingCategory;
  searchQuery: string;
  sortMode: RatingSortMode;

  setCategory: (category: RatingCategory) => void;
  setSearchQuery: (query: string) => void;
  setSortMode: (mode: RatingSortMode) => void;
}

export const useRatingStore = create<RatingState>()((set) => ({
  selectedCategory: 'course',
  searchQuery: '',
  sortMode: 'recent',

  setCategory: (selectedCategory) => set({ selectedCategory, searchQuery: '' }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortMode: (sortMode) => set({ sortMode }),
}));
