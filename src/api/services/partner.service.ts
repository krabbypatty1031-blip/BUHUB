import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { PartnerPost, PartnerCategory } from '../../types';

const USE_MOCK = true;

export const partnerService = {
  async getList(category?: PartnerCategory): Promise<PartnerPost[]> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      if (category) return mockPartnerPosts.filter((p) => p.category === category);
      return mockPartnerPosts;
    }
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.LIST, { params: { category } });
    return data;
  },

  async getDetail(id: string): Promise<PartnerPost> {
    if (USE_MOCK) {
      const { mockPartnerPosts } = await import('../../data/mock/partner');
      return mockPartnerPosts[Number(id)] || mockPartnerPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.PARTNER.DETAIL(id));
    return data;
  },

  async create(post: Omit<PartnerPost, 'user' | 'avatar' | 'gender' | 'bio' | 'expired' | 'joined'>): Promise<PartnerPost> {
    if (USE_MOCK) {
      return { ...post, user: '我', avatar: '我', gender: 'male', bio: '', expired: false, joined: 0 };
    }
    const { data } = await apiClient.post(ENDPOINTS.PARTNER.CREATE, post);
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
