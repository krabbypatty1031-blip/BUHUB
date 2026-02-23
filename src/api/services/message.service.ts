import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Contact, ChatHistory } from '../../types';

const USE_MOCK = false;

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins}分鐘前`;
  if (hours < 24) return `${hours}小時前`;
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function groupMessagesByDate(messages: { text: string; time: string; isMine: boolean; id: string }[]): ChatHistory[] {
  const groups: Record<string, ChatHistory> = {};
  for (const m of messages) {
    const d = new Date(m.time);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dateLabel = dateKey === new Date().toISOString().slice(0, 10) ? '今日' : `${d.getMonth() + 1}月${d.getDate()}日`;
    if (!groups[dateKey]) {
      groups[dateKey] = { date: dateLabel, messages: [] };
    }
    groups[dateKey].messages.push({
      type: m.isMine ? 'sent' : 'received',
      text: m.text,
      time: formatChatTime(m.time),
      status: 'read',
    });
  }
  return Object.values(groups);
}

export const messageService = {
  async getContacts(): Promise<Contact[]> {
    if (USE_MOCK) {
      const { mockContacts } = await import('../../data/mock/messages');
      return mockContacts;
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CONVERSATIONS);
    return (Array.isArray(data) ? data : []).map((c: { userId: string; user: { nickname: string; avatar: string; gender?: string }; latestMessage: { content: string; createdAt: string }; unreadCount: number }) => ({
      id: c.userId,
      name: c.user?.nickname ?? '?',
      avatar: c.user?.avatar ?? '',
      message: c.latestMessage?.content ?? '',
      time: formatMessageTime(c.latestMessage?.createdAt ?? new Date().toISOString()),
      unread: c.unreadCount ?? 0,
      pinned: false,
      gender: (c.user?.gender as 'male' | 'female' | 'other') ?? undefined,
    }));
  },

  async getChatHistory(userId: string): Promise<ChatHistory[]> {
    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const history = mockChatHistory[userId] || [];
      return JSON.parse(JSON.stringify(history));
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CHAT(userId));
    const messages = Array.isArray(data) ? data : [];
    return groupMessagesByDate(messages);
  },

  async sendMessage(receiverId: string, content: string, images?: string[]): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const newMsg = { type: 'sent' as const, text: content, time, status: 'sent' as const };
      const history = mockChatHistory[receiverId];
      if (history && history.length > 0) {
        const lastGroup = history[history.length - 1];
        lastGroup.messages.push(newMsg);
      } else {
        mockChatHistory[receiverId] = [{ date: '今日', messages: [newMsg] }];
      }
      return { success: true };
    }
    await apiClient.post(ENDPOINTS.MESSAGE.SEND, { receiverId, content, images: images ?? [] });
    return { success: true };
  },

  async markMessageRead(messageId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) return { success: true };
    await apiClient.put(ENDPOINTS.MESSAGE.MARK_READ(messageId));
    return { success: true };
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) return { success: true };
    await apiClient.delete(ENDPOINTS.MESSAGE.MESSAGE_DETAIL(messageId));
    return { success: true };
  },
};
