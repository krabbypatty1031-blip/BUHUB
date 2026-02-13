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
      const history = mockChatHistory[contactName] || [];
      // Return a deep copy so React Query detects changes after in-place mutations
      return JSON.parse(JSON.stringify(history));
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CHAT(contactName));
    return data;
  },

  async sendMessage(contactName: string, text: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const newMsg = { type: 'sent' as const, text, time, status: 'sent' as const };
      const history = mockChatHistory[contactName];
      if (history && history.length > 0) {
        const lastGroup = history[history.length - 1];
        lastGroup.messages.push(newMsg);
      } else {
        mockChatHistory[contactName] = [{ date: '今日', messages: [newMsg] }];
      }
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.MESSAGE.SEND(contactName), { text });
    return data;
  },
};
