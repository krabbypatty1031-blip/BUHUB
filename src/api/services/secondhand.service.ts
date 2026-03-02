import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { SecondhandItem, SecondhandCategory, PaginationParams } from '../../types';
import { normalizeAvatarUrl, normalizeImageUrl } from '../../utils/imageUrl';

const USE_MOCK = false;

type ApiSecondhandCategory = 'ELECTRONICS' | 'BOOKS' | 'FURNITURE' | 'OTHER';

const toApiCategory = (category?: SecondhandCategory): ApiSecondhandCategory | undefined => {
  if (!category) return undefined;
  return category.toUpperCase() as ApiSecondhandCategory;
};

const fromApiCategory = (category?: string): SecondhandCategory => {
  const normalized = (category ?? '').toLowerCase();
  if (normalized === 'electronics' || normalized === 'books' || normalized === 'furniture') {
    return normalized;
  }
  return 'other';
};

const mapSecondhand = (i: any): SecondhandItem => ({
  ...i,
  id: i.id,
  category: fromApiCategory(i.category),
  images: Array.isArray(i.images)
    ? i.images
        .map((image: string) => normalizeImageUrl(image))
        .filter((image: string | null): image is string => Boolean(image))
    : [],
  user: i.author?.nickname ?? i.author?.userName ?? i.user ?? '?',
  avatar: normalizeAvatarUrl(i.author?.avatar ?? i.avatar) ?? '',
  gender: i.author?.gender ?? i.gender ?? 'other',
  bio: i.author?.bio ?? i.bio ?? '',
  gradeKey: i.author?.grade ?? i.gradeKey ?? undefined,
  majorKey: i.author?.major ?? i.majorKey ?? undefined,
  authorId: i.author?.id ?? i.authorId,
  desc: i.description ?? i.desc,
  isWanted: Boolean(i.isWanted ?? (Array.isArray(i.wants) && i.wants.length > 0)),
  sourceLanguage: i.sourceLanguage ?? 'tc',
});

export const secondhandService = {
  async getList(category?: SecondhandCategory, options?: { includeExpired?: boolean } & PaginationParams): Promise<SecondhandItem[]> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const list = category ? mockSecondhandItems.filter((i) => i.category === category) : [...mockSecondhandItems];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { includeExpired, ...paginationParams } = options || {};
    const { data } = await apiClient.get(ENDPOINTS.SECONDHAND.LIST, {
      params: {
        category: toApiCategory(category),
        ...(includeExpired !== undefined && { includeExpired: String(includeExpired) }),
        ...paginationParams,
      },
    });
    return (Array.isArray(data) ? data : []).map(mapSecondhand);
  },

  async getDetail(id: string): Promise<SecondhandItem> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const item = mockSecondhandItems.find((i) => i.id === id);
      if (!item) throw new Error('Not found');
      return item;
    }
    const { data } = await apiClient.get(ENDPOINTS.SECONDHAND.DETAIL(id));
    return mapSecondhand(data);
  },

  async create(item: Omit<SecondhandItem, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'sold'>): Promise<SecondhandItem> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const newItem: SecondhandItem = {
        ...item,
        id: `secondhand-${Date.now()}`,
        user: '我',
        avatar: '我',
        gender: 'male' as const,
        bio: '',
        sold: false,
      };
      mockSecondhandItems.unshift(newItem);
      return newItem;
    }
    const payload = {
      ...item,
      category: toApiCategory(item.category),
      description: item.desc,
    };
    const { data } = await apiClient.post(ENDPOINTS.SECONDHAND.CREATE, payload);
    return mapSecondhand(data);
  },

  async edit(id: string, item: Partial<SecondhandItem>): Promise<SecondhandItem> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const original = mockSecondhandItems.find((i) => i.id === id);
      if (!original) throw new Error('Not found');
      return { ...original, ...item };
    }
    const payload: Record<string, unknown> = { ...item };
    if (item.category) payload.category = toApiCategory(item.category);
    if (item.desc !== undefined) payload.description = item.desc;
    delete payload.desc;
    const { data } = await apiClient.put(ENDPOINTS.SECONDHAND.EDIT(id), payload);
    return mapSecondhand(data);
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.SECONDHAND.DELETE(id));
    return data;
  },

  async close(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.SECONDHAND.EDIT(id), { expired: true });
    return data;
  },

  async want(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.SECONDHAND.WANT(id));
    return data;
  },
};
