import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { SecondhandItem, SecondhandCategory } from '../../types';

const USE_MOCK = true;

export const secondhandService = {
  async getList(category?: SecondhandCategory): Promise<SecondhandItem[]> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const list = category ? mockSecondhandItems.filter((i) => i.category === category) : [...mockSecondhandItems];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { data } = await apiClient.get(ENDPOINTS.SECONDHAND.LIST, { params: { category } });
    return data;
  },

  async getDetail(id: string): Promise<SecondhandItem> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      return mockSecondhandItems[Number(id)] || mockSecondhandItems[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.SECONDHAND.DETAIL(id));
    return data;
  },

  async create(item: Omit<SecondhandItem, 'user' | 'avatar' | 'gender' | 'bio' | 'sold'>): Promise<SecondhandItem> {
    if (USE_MOCK) {
      return { ...item, user: '我', avatar: '我', gender: 'male', bio: '', sold: false };
    }
    const { data } = await apiClient.post(ENDPOINTS.SECONDHAND.CREATE, item);
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
