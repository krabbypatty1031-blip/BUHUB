import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { SecondhandItem, SecondhandCategory, PaginationParams } from '../../types';

const USE_MOCK = false;

export const secondhandService = {
  async getList(category?: SecondhandCategory, params?: PaginationParams): Promise<SecondhandItem[]> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const list = category ? mockSecondhandItems.filter((i) => i.category === category) : [...mockSecondhandItems];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const { data } = await apiClient.get(ENDPOINTS.SECONDHAND.LIST, { params: { category, ...params } });
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
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const newItem: SecondhandItem = { ...item, user: '我', avatar: '我', gender: 'male' as const, bio: '', sold: false };
      mockSecondhandItems.unshift(newItem);
      return newItem;
    }
    const { data } = await apiClient.post(ENDPOINTS.SECONDHAND.CREATE, item);
    return data;
  },

  async edit(id: string, item: Partial<SecondhandItem>): Promise<SecondhandItem> {
    if (USE_MOCK) {
      const { mockSecondhandItems } = await import('../../data/mock/secondhand');
      const original = mockSecondhandItems[Number(id)] || mockSecondhandItems[0];
      return { ...original, ...item };
    }
    const { data } = await apiClient.put(ENDPOINTS.SECONDHAND.EDIT(id), item);
    return data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.SECONDHAND.DELETE(id));
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
