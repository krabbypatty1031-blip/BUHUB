import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Errand, ErrandCategory, PaginationParams } from '../../types';

const USE_MOCK = false;

export const errandService = {
  async getList(category?: ErrandCategory, params?: PaginationParams): Promise<Errand[]> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const list = category ? mockErrands.filter((e) => e.category === category) : [...mockErrands];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { data } = await apiClient.get(ENDPOINTS.ERRAND.LIST, { params: { category, ...params } });
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
      const { mockErrands } = await import('../../data/mock/errands');
      const newErrand: Errand = { ...errand, user: '我', avatar: '我', gender: 'male' as const, bio: '', expired: false };
      mockErrands.unshift(newErrand);
      return newErrand;
    }
    const { data } = await apiClient.post(ENDPOINTS.ERRAND.CREATE, errand);
    return data;
  },

  async edit(id: string, errand: Partial<Errand>): Promise<Errand> {
    if (USE_MOCK) {
      const { mockErrands } = await import('../../data/mock/errands');
      const original = mockErrands[Number(id)] || mockErrands[0];
      return { ...original, ...errand };
    }
    const { data } = await apiClient.put(ENDPOINTS.ERRAND.EDIT(id), errand);
    return data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.ERRAND.DELETE(id));
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
