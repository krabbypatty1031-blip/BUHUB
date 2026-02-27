import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { PartnerPost, PartnerCategory, PaginationParams } from '../../types';
import { normalizeAvatarUrl } from '../../utils/imageUrl';

const USE_MOCK = false;

type ApiPartnerCategory = 'TRAVEL' | 'FOOD' | 'COURSE' | 'SPORTS' | 'OTHER';

const toApiCategory = (category?: PartnerCategory): ApiPartnerCategory | undefined => {
  if (!category) return undefined;
  return category.toUpperCase() as ApiPartnerCategory;
};

const fromApiCategory = (category?: string): PartnerCategory => {
  const normalized = (category ?? '').toLowerCase();
  if (normalized === 'travel' || normalized === 'food' || normalized === 'course' || normalized === 'sports') {
    return normalized;
  }
  return 'other';
};

const mapPartner = (p: any): PartnerPost => ({
  ...p,
  id: p.id,
  category: fromApiCategory(p.category),
  user: p.author?.nickname ?? p.author?.userName ?? p.user ?? '?',
  avatar: normalizeAvatarUrl(p.author?.avatar ?? p.avatar) ?? '',
  gender: p.author?.gender ?? p.gender ?? 'other',
  bio: p.author?.bio ?? p.bio ?? '',
  gradeKey: p.author?.grade ?? p.gradeKey ?? undefined,
  majorKey: p.author?.major ?? p.majorKey ?? undefined,
  authorId: p.author?.id ?? p.authorId,
  desc: p.description ?? p.desc,
});

export const partnerService = {
  async getList(category?: PartnerCategory, options?: { includeExpired?: boolean } & PaginationParams): Promise<PartnerPost[]> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const list = category ? mockPartnerPosts.filter((p) => p.category === category) : [...mockPartnerPosts];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { includeExpired, ...paginationParams } = options || {};
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.LIST, {
      params: {
        category: toApiCategory(category),
        ...(includeExpired !== undefined && { includeExpired: String(includeExpired) }),
        ...paginationParams,
      },
    });
    return (Array.isArray(data) ? data : []).map(mapPartner);
  },

  async getDetail(id: string): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      return mockPartnerPosts[Number(id)] || mockPartnerPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.DETAIL(id));
    return mapPartner(data);
  },

  async create(post: Omit<PartnerPost, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'expired'>): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const newPost: PartnerPost = {
        ...post,
        id: `partner-${Date.now()}`,
        user: '我',
        avatar: '我',
        gender: 'male' as const,
        bio: '',
        expired: false,
      };
      mockPartnerPosts.unshift(newPost);
      return newPost;
    }
    const payload = {
      ...post,
      category: toApiCategory(post.category),
      description: post.desc,
    };
    const { data } = await apiClient.post(ENDPOINTS.PARTNER.CREATE, payload);
    return mapPartner(data);
  },

  async edit(id: string, post: Partial<PartnerPost>): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const original = mockPartnerPosts[Number(id)] || mockPartnerPosts[0];
      return { ...original, ...post };
    }
    const payload: Record<string, unknown> = { ...post };
    if (post.category) payload.category = toApiCategory(post.category);
    if (post.desc !== undefined) payload.description = post.desc;
    delete payload.desc;
    const { data } = await apiClient.put(ENDPOINTS.PARTNER.EDIT(id), payload);
    return mapPartner(data);
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.PARTNER.DELETE(id));
    return data;
  },

  async close(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.PARTNER.EDIT(id), { expired: true });
    return data;
  },

  async join(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.PARTNER.JOIN(id));
    return data;
  },
};
