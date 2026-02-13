import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { RatingCategory, RatingItem, RatingSortMode, ScoreDimension } from '../../types';

const USE_MOCK = false;

export const ratingService = {
  async getList(category: RatingCategory, sortMode: RatingSortMode = 'recent'): Promise<RatingItem[]> {
    if (USE_MOCK) {
      const { mockRatings } = await import('../../data/mock/ratings');
      const items = [...mockRatings[category]];
      if (sortMode === 'recent') {
        items.sort((a, b) => b.recentCount - a.recentCount);
      } else {
        items.sort((a, b) => b.scoreVariance - a.scoreVariance);
      }
      return items;
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.LIST(category));
    return data;
  },

  async getDetail(category: RatingCategory, id: string): Promise<RatingItem> {
    if (USE_MOCK) {
      const { mockRatings } = await import('../../data/mock/ratings');
      return mockRatings[category][Number(id)] || mockRatings[category][0];
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.DETAIL(category, id));
    return data;
  },

  async submitRating(
    category: RatingCategory,
    id: string,
    rating: { scores: Record<string, number>; tags: string[]; comment?: string }
  ): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.RATING.SUBMIT(category, id), rating);
    return data;
  },

  async getDimensions(category: RatingCategory): Promise<ScoreDimension[]> {
    if (USE_MOCK) {
      const { mockScoreDimensions } = await import('../../data/mock/ratings');
      return mockScoreDimensions[category] || [];
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.DIMENSIONS(category));
    return data;
  },

  async getTagOptions(category: RatingCategory): Promise<string[]> {
    if (USE_MOCK) {
      const { mockTagOptions } = await import('../../data/mock/ratings');
      return mockTagOptions[category] || [];
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.TAGS(category));
    return data;
  },
};
