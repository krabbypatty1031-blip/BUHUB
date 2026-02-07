import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { RatingCategory, RatingItem, RatingsData } from '../../types';

const USE_MOCK = true;

export const ratingService = {
  async getList(category: RatingCategory): Promise<RatingItem[]> {
    if (USE_MOCK) {
      const { mockRatings } = await import('../../data/mock/ratings');
      return mockRatings[category];
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
};
