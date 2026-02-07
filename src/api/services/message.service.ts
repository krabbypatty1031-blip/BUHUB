import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Contact, ChatHistory } from '../../types';

const USE_MOCK = true;

export const messageService = {
  async getContacts(): Promise<Contact[]> {
    if (USE_MOCK) {
      const { mockContacts } = await import('../../data/mock/messages');
      return mockContacts;
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CONTACTS);
    return data;
  },

  async getChatHistory(contactName: string): Promise<ChatHistory[]> {
    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      return mockChatHistory[contactName] || [];
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CHAT(contactName));
    return data;
  },

  async sendMessage(contactName: string, text: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.MESSAGE.SEND(contactName), { text });
    return data;
  },
};
