import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Errand, ErrandCategory } from '../../types';

const USE_MOCK = true;

export const errandService = {
  async getList(category?: ErrandCategory): Promise<Errand[]> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      if (category) return mockErrands.filter((e) => e.category === category);
      return mockErrands;
    }
    const { data } = await apiClient.get(ENDPOINTS.ERRAND.LIST, { params: { category } });
    return data;
  },

  async getDetail(id: string): Promise<Errand> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      return mockErrands[Number(id)] || mockErrands[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.ERRAND.DETAIL(id));
    return data;
  },

  async create(errand: Omit<Errand, 'user' | 'avatar' | 'gender' | 'bio' | 'expired'>): Promise<Errand> {
    if (USE_MOCK) {
      return { ...errand, user: '我', avatar: '我', gender: 'male', bio: '', expired: false };
    }
    const { data } = await apiClient.post(ENDPOINTS.ERRAND.CREATE, errand);
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
