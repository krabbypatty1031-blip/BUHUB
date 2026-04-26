import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type {
  RatingCategory,
  RatingItem,
  RatingSortMode,
  ScoreDimension,
  MyRating,
  RatingCommentsPage,
  RatingComment,
  RatingsListPage,
} from '../../types';
import { mockRatings, mockScoreDimensions, mockTagOptions } from '../../data/mock/ratings';

const USE_MOCK = false;
type ApiScoreRecord = {
  key?: string;
  dimension?: string;
  value?: number;
  label?: string | { tc?: string; sc?: string; en?: string };
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
  comments?: { id?: string; comment?: string; createdAt?: string }[];
  commentCount?: number;
  commentsPageSize?: number;
  hasMoreComments?: boolean;
} & Record<string, unknown>;

const toApiCategory = (category: RatingCategory) => category.toUpperCase();

// API now accepts 0..100 directly (schema: z.number().min(0).max(100)).
// Backend converts to 0..5 storage at the ingest boundary.
const normalizeScoreForSubmit = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
};

const mapScore = (score: ApiScoreRecord) => {
  const key = score?.key ?? score?.dimension ?? '';
  const rawValue = typeof score?.value === 'number' ? score.value : 0;
  const value = rawValue <= 5 ? Math.round(rawValue * 20) : Math.round(rawValue);
  const rawLabel = score?.label;
  const label = typeof rawLabel === 'string'
    ? rawLabel
    : (rawLabel?.en ?? rawLabel?.tc ?? rawLabel?.sc ?? key);
  return {
    key,
    label: label || key,
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
  comments: Array.isArray(item?.comments)
    ? item.comments
      .filter((comment): comment is { id?: string; comment?: string; createdAt?: string } => Boolean(comment))
      .map((comment) => ({
        id: typeof comment.id === 'string' ? comment.id : undefined,
        comment: typeof comment.comment === 'string' ? comment.comment : '',
        createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : new Date(0).toISOString(),
      }))
      .filter((comment) => comment.comment.trim().length > 0)
    : [],
  commentCount: typeof item?.commentCount === 'number' ? item.commentCount : 0,
  commentsPageSize: typeof item?.commentsPageSize === 'number' ? item.commentsPageSize : undefined,
  hasMoreComments: typeof item?.hasMoreComments === 'boolean' ? item.hasMoreComments : false,
});

export const ratingService = {
  async getList(
    category: RatingCategory,
    sortMode: RatingSortMode = 'recent',
    options?: { page?: number; limit?: number; query?: string }
  ): Promise<RatingsListPage> {
    if (USE_MOCK) {
      const { mockRatings } = await import('../../data/mock/ratings');
      const items = [...mockRatings[category]];
      if (sortMode === 'recent') {
        items.sort((a, b) => b.recentCount - a.recentCount);
      } else {
        items.sort((a, b) => b.scoreVariance - a.scoreVariance);
      }
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 20;
      const start = (page - 1) * limit;
      const pagedItems = items.slice(start, start + limit);
      return {
        items: pagedItems,
        total: items.length,
        page,
        limit,
        hasMore: start + pagedItems.length < items.length,
      };
    }
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const query = options?.query?.trim() ?? '';
    const { data } = await apiClient.get(ENDPOINTS.RATING.LIST(toApiCategory(category)), {
      params: { sortMode, page, limit, query: query || undefined },
    });
    const mapped = Array.isArray(data?.items) ? data.items.map(mapRatingItem) : [];
    if (category === 'canteen' && mapped.length === 0) {
      const fallbackItems = [...mockRatings.canteen];
      return {
        items: fallbackItems,
        total: fallbackItems.length,
        page: 1,
        limit: fallbackItems.length,
        hasMore: false,
      };
    }
    return {
      items: mapped,
      total: typeof data?.total === 'number' ? data.total : mapped.length,
      page: typeof data?.page === 'number' ? data.page : page,
      limit: typeof data?.limit === 'number' ? data.limit : limit,
      hasMore: typeof data?.hasMore === 'boolean' ? data.hasMore : false,
    };
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

  async getComments(category: RatingCategory, id: string, page = 1, limit = 10): Promise<RatingCommentsPage> {
    const { data } = await apiClient.get(ENDPOINTS.RATING.COMMENTS(toApiCategory(category), id), {
      params: { page, limit },
    });
    const comments = Array.isArray(data?.data)
      ? data.data
        .filter((comment: RatingComment | null | undefined): comment is RatingComment => Boolean(comment))
        .map((comment: RatingComment) => ({
          id: typeof comment.id === 'string' ? comment.id : undefined,
          comment: typeof comment.comment === 'string' ? comment.comment : '',
          createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : new Date(0).toISOString(),
        }))
        .filter((comment: RatingComment) => comment.comment.trim().length > 0)
      : [];

    return {
      data: comments,
      total: typeof data?.total === 'number' ? data.total : comments.length,
      page: typeof data?.page === 'number' ? data.page : page,
      limit: typeof data?.limit === 'number' ? data.limit : limit,
      hasMore: typeof data?.hasMore === 'boolean' ? data.hasMore : false,
    };
  },
};
