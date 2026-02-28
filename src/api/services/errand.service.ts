import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Errand, ErrandCategory, PaginationParams } from '../../types';
import { normalizeAvatarUrl } from '../../utils/imageUrl';

const USE_MOCK = false;

type ApiErrandCategory = 'PICKUP' | 'BUY' | 'OTHER';

const toApiCategory = (category?: ErrandCategory): ApiErrandCategory | undefined => {
  if (!category) return undefined;
  return category.toUpperCase() as ApiErrandCategory;
};

const fromApiCategory = (category?: string): ErrandCategory => {
  const normalized = (category ?? '').toLowerCase();
  if (normalized === 'pickup' || normalized === 'buy') return normalized;
  return 'other';
};

const mapErrand = (e: any): Errand => ({
  ...e,
  id: e.id,
  category: fromApiCategory(e.category),
  user: e.author?.nickname ?? e.author?.userName ?? e.user ?? '?',
  avatar: normalizeAvatarUrl(e.author?.avatar ?? e.avatar) ?? '',
  gender: e.author?.gender ?? e.gender ?? 'other',
  bio: e.author?.bio ?? e.bio ?? '',
  gradeKey: e.author?.grade ?? e.gradeKey ?? undefined,
  majorKey: e.author?.major ?? e.majorKey ?? undefined,
  authorId: e.author?.id ?? e.authorId,
  desc: e.description ?? e.desc,
});

export const errandService = {
  async getList(category?: ErrandCategory, options?: { includeExpired?: boolean } & PaginationParams): Promise<Errand[]> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const list = category ? mockErrands.filter((e) => e.category === category) : [...mockErrands];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { includeExpired, ...paginationParams } = options || {};
    const { data } = await apiClient.get(ENDPOINTS.ERRAND.LIST, {
      params: {
        category: toApiCategory(category),
        ...(includeExpired !== undefined && { includeExpired: String(includeExpired) }),
        ...paginationParams,
      },
    });
    return (Array.isArray(data) ? data : []).map(mapErrand);
  },

  async getDetail(id: string): Promise<Errand> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const item = mockErrands.find((e) => e.id === id);
      if (!item) throw new Error('Not found');
      return item;
    }
    const { data } = await apiClient.get(ENDPOINTS.ERRAND.DETAIL(id));
    return mapErrand(data);
  },

  async create(errand: Omit<Errand, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'expired'>): Promise<Errand> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const newErrand: Errand = {
        ...errand,
        id: `errand-${Date.now()}`,
        user: '我',
        avatar: '我',
        gender: 'male' as const,
        bio: '',
        expired: false,
      };
      mockErrands.unshift(newErrand);
      return newErrand;
    }
    const payload = {
      ...errand,
      category: toApiCategory(errand.category),
      description: errand.desc,
    };
    const { data } = await apiClient.post(ENDPOINTS.ERRAND.CREATE, payload);
    return mapErrand(data);
  },

  async edit(id: string, errand: Partial<Errand>): Promise<Errand> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const original = mockErrands.find((e) => e.id === id);
      if (!original) throw new Error('Not found');
      return { ...original, ...errand };
    }
    const payload: Record<string, unknown> = { ...errand };
    if (errand.category) payload.category = toApiCategory(errand.category);
    if (errand.desc !== undefined) payload.description = errand.desc;
    delete payload.desc;
    const { data } = await apiClient.put(ENDPOINTS.ERRAND.EDIT(id), payload);
    return mapErrand(data);
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.ERRAND.DELETE(id));
    return data;
  },

  async close(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.ERRAND.EDIT(id), { expired: true });
    return data;
  },

  async accept(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.ERRAND.ACCEPT(id));
    return data;
  },
};
