import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { PartnerPost, PartnerCategory, PaginationParams } from '../../types';

const USE_MOCK = false;

export const partnerService = {
  async getList(category?: PartnerCategory, params?: PaginationParams): Promise<PartnerPost[]> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const list = category ? mockPartnerPosts.filter((p) => p.category === category) : [...mockPartnerPosts];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.LIST, { params: { category, ...params } });
    return (Array.isArray(data) ? data : []).map((p: any) => ({
      ...p,
      user: p.author?.nickname ?? p.user ?? '?',
      avatar: p.author?.avatar ?? p.avatar ?? '',
      authorId: p.author?.id ?? p.authorId,
      desc: p.description ?? p.desc,
    }));
  },

  async getDetail(id: string): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      return mockPartnerPosts[Number(id)] || mockPartnerPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.DETAIL(id));
    return {
      ...data,
      user: data.author?.nickname ?? data.user ?? '?',
      avatar: data.author?.avatar ?? data.avatar ?? '',
      authorId: data.author?.id ?? data.authorId,
      desc: data.description ?? data.desc,
    };
  },

  async create(post: Omit<PartnerPost, 'user' | 'avatar' | 'gender' | 'bio' | 'expired' | 'joined'>): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const newPost: PartnerPost = { ...post, user: '我', avatar: '我', gender: 'male' as const, bio: '', expired: false };
      mockPartnerPosts.unshift(newPost);
      return newPost;
    }
    const { data } = await apiClient.post(ENDPOINTS.PARTNER.CREATE, post);
    return data;
  },

  async edit(id: string, post: Partial<PartnerPost>): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      const original = mockPartnerPosts[Number(id)] || mockPartnerPosts[0];
      return { ...original, ...post };
    }
    const { data } = await apiClient.put(ENDPOINTS.PARTNER.EDIT(id), post);
    return data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.PARTNER.DELETE(id));
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
