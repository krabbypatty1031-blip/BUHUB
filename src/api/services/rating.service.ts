import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { RatingCategory, RatingItem, RatingSortMode, ScoreDimension, MyRating } from '../../types';
import { mockRatings, mockScoreDimensions, mockTagOptions } from '../../data/mock/ratings';

const USE_MOCK = false;
type ApiScoreRecord = {
  key?: string;
  dimension?: string;
  value?: number;
  label?: string;
};
type ApiLocalizedLabel = {
  tc?: string;
  sc?: string;
  en?: string;
  left?: string;
  right?: string;
  min?: string;
  max?: string;
};
type ApiDimensionRecord = {
  name?: string;
  label?: string | ApiLocalizedLabel;
};
type ApiRatingItemRecord = {
  id?: string;
  name?: string;
  department?: string;
  code?: string;
  email?: string;
  location?: string;
  avatar?: string;
  scores?: ApiScoreRecord[];
  tags?: string[];
  tagCounts?: Record<string, number>;
  ratingCount?: number;
  recentCount?: number;
  scoreVariance?: number;
} & Record<string, unknown>;

const toApiCategory = (category: RatingCategory) => category.toUpperCase();

const clampToFive = (value: number) => Math.max(0, Math.min(5, value));

const normalizeScoreForSubmit = (value: number) => {
  if (value > 5) {
    return clampToFive(Number((value / 20).toFixed(2)));
  }
  return clampToFive(Number(value.toFixed(2)));
};

const mapScore = (score: ApiScoreRecord) => {
  const key = score?.key ?? score?.dimension ?? '';
  const rawValue = typeof score?.value === 'number' ? score.value : 0;
  const value = rawValue <= 5 ? Math.round(rawValue * 20) : Math.round(rawValue);
  const rawLabel = typeof score?.label === 'string' ? score.label : key;
  return {
    key,
    label: rawLabel || key,
    value,
  };
};

const mapRatingItem = (item: ApiRatingItemRecord): RatingItem => ({
  ...item,
  id: item.id ?? '',
  name: typeof item?.name === 'string' && item.name.trim()
    ? item.name.trim()
    : (typeof item?.code === 'string' && item.code.trim()
      ? item.code.trim()
      : (typeof item?.email === 'string' && item.email.trim()
        ? item.email.trim()
        : 'Untitled')),
  department: typeof item?.department === 'string' && item.department.trim()
    ? item.department.trim()
    : (typeof item?.location === 'string' && item.location.trim()
      ? item.location.trim()
      : 'Unknown'),
  code: typeof item?.code === 'string' ? item.code : '',
  email: typeof item?.email === 'string' ? item.email : '',
  location: typeof item?.location === 'string' ? item.location : '',
  avatar: typeof item?.avatar === 'string' ? item.avatar : '',
  scores: Array.isArray(item?.scores) ? item.scores.map(mapScore) : [],
  tags: Array.isArray(item?.tags) ? item.tags : [],
  tagCounts: item?.tagCounts ?? {},
  ratingCount: item?.ratingCount ?? 0,
  recentCount: item?.recentCount ?? 0,
  scoreVariance: item?.scoreVariance ?? 0,
});

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
    const { data } = await apiClient.get(ENDPOINTS.RATING.LIST(toApiCategory(category)), { params: { sortMode } });
    const mapped = (Array.isArray(data) ? data : []).map(mapRatingItem);
    if (category === 'canteen' && mapped.length === 0) {
      return [...mockRatings.canteen];
    }
    return mapped;
  },

  async getDetail(category: RatingCategory, id: string): Promise<RatingItem> {
    if (USE_MOCK) {
      const { mockRatings } = await import('../../data/mock/ratings');
      const items = mockRatings[category] || [];
      const item = items.find((i) => i.id === id);
      if (!item) throw new Error('Not found');
      return item;
    }
    try {
      const { data } = await apiClient.get(ENDPOINTS.RATING.DETAIL(toApiCategory(category), id));
      return mapRatingItem(data);
    } catch (error) {
      if (category === 'canteen') {
        const fallback = mockRatings.canteen.find((item) => item.id === id);
        if (fallback) return fallback;
      }
      throw error;
    }
  },

  async submitRating(
    category: RatingCategory,
    id: string,
    rating: { scores: Record<string, number>; tags: string[]; comment?: string }
  ): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const normalizedScores = Object.entries(rating.scores).reduce<Record<string, number>>((acc, [key, value]) => {
      acc[key] = normalizeScoreForSubmit(value);
      return acc;
    }, {});
    const { data } = await apiClient.post(ENDPOINTS.RATING.SUBMIT(toApiCategory(category), id), {
      ...rating,
      scores: normalizedScores,
    });
    return data;
  },

  async getDimensions(category: RatingCategory): Promise<ScoreDimension[]> {
    if (USE_MOCK) {
      const { mockScoreDimensions } = await import('../../data/mock/ratings');
      return mockScoreDimensions[category] || [];
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.DIMENSIONS(toApiCategory(category)));
    const mapped = (Array.isArray(data) ? data : []).map((dimension: ApiDimensionRecord) => {
      const rawLabel = dimension?.label;
      const label = typeof rawLabel === 'string'
        ? rawLabel
        : (rawLabel?.tc ?? rawLabel?.sc ?? rawLabel?.en ?? dimension?.name ?? '');
      const left = typeof rawLabel === 'object' ? (rawLabel?.left ?? rawLabel?.min ?? '') : '';
      const right = typeof rawLabel === 'object' ? (rawLabel?.right ?? rawLabel?.max ?? '') : '';
      return {
        key: dimension?.name ?? '',
        label,
        left,
        right,
      };
    });
    if (category === 'canteen' && mapped.length === 0) {
      return mockScoreDimensions.canteen;
    }
    return mapped;
  },

  async getMyRating(category: RatingCategory, id: string): Promise<MyRating | null> {
    if (USE_MOCK) return null;
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.RATING.MY_RATING(toApiCategory(category), id)
      );
      // After response interceptor unwrap, data is already the inner value (MyRating | null)
      return (data as MyRating | null) ?? null;
    } catch {
      // 401 (not logged in) or any error — treat as "no rating"
      return null;
    }
  },

  async getTagOptions(category: RatingCategory): Promise<string[]> {
    if (USE_MOCK) {
      const { mockTagOptions } = await import('../../data/mock/ratings');
      return mockTagOptions[category] || [];
    }
    const { data } = await apiClient.get(ENDPOINTS.RATING.TAGS(toApiCategory(category)));
    const options = Array.isArray(data)
      ? data.filter((item): item is string => typeof item === 'string')
      : [];
    if (category === 'canteen' && options.length === 0) {
      return mockTagOptions.canteen;
    }
    return options;
  },
};
