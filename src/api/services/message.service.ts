import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Contact, ChatHistory } from '../../types';
import i18n from '../../i18n';

const USE_MOCK = false;
const MESSAGE_CARD_PREFIX = '[BUHUB_CARD]';

type FunctionCardType = 'partner' | 'errand' | 'secondhand' | 'post';

type FunctionCardPayload = {
  type: FunctionCardType;
  id?: string;
  title: string;
  posterName: string;
  postId?: string;
};

export type SendMessagePayload =
  | string
  | {
      text?: string;
      functionCard?: FunctionCardPayload;
    };

type MessageLanguage = 'tc' | 'sc' | 'en';

const CARD_TYPE_LABEL_KEYS: Record<FunctionCardType, string> = {
  partner: 'findPartner',
  errand: 'errands',
  secondhand: 'secondhand',
  post: 'forum',
};

function getCurrentLanguage(): MessageLanguage {
  const lang = i18n.language;
  if (lang === 'tc' || lang === 'sc' || lang === 'en') return lang;
  if (lang.toLowerCase().startsWith('en')) return 'en';
  if (lang.toLowerCase().includes('hans') || lang.toLowerCase().includes('cn')) return 'sc';
  return 'tc';
}

function formatMonthDay(date: Date, language: MessageLanguage): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return language === 'en' ? `${month}/${day}` : `${month}月${day}日`;
}

function tMessage(key: string, options?: Record<string, unknown>): string {
  return String(i18n.t(key, options));
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const language = getCurrentLanguage();
  const diff = now.getTime() - d.getTime();
  if (Number.isNaN(d.getTime()) || diff < 0) return formatMonthDay(now, language);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return tMessage('messageTimeJustNow');
  if (mins < 60) return tMessage('messageTimeMinutesAgo', { count: mins });
  if (hours < 24) return tMessage('messageTimeHoursAgo', { count: hours });
  if (days === 1) return tMessage('messageTimeYesterday');
  if (days < 7) return tMessage('messageTimeDaysAgo', { count: days });
  return formatMonthDay(d, language);
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildCardPreview(card: FunctionCardPayload): string {
  const typeLabel = String(i18n.t(CARD_TYPE_LABEL_KEYS[card.type]));
  return tMessage('messageSharedCardPreview', {
    type: typeLabel,
    title: card.title,
    defaultValue: `[分享${typeLabel}] ${card.title}`,
  });
}

function encodeFunctionCard(card: FunctionCardPayload): string {
  return `${MESSAGE_CARD_PREFIX}${JSON.stringify(card)}`;
}

function parseMessageContent(raw: string): {
  text: string;
  functionCard?: {
    type: FunctionCardType;
    id?: string;
    title: string;
    posterName: string;
    postId?: string;
  };
} {
  if (!raw.startsWith(MESSAGE_CARD_PREFIX)) {
    return { text: raw };
  }

  try {
    const payload = JSON.parse(raw.slice(MESSAGE_CARD_PREFIX.length)) as FunctionCardPayload;
    if (!payload?.type || !payload?.title || !payload?.posterName) {
      return { text: raw };
    }
    return {
      text: '',
      functionCard: {
        type: payload.type,
        id: payload.id,
        title: payload.title,
        posterName: payload.posterName,
        postId: payload.postId,
      },
    };
  } catch {
    return { text: raw };
  }
}

function groupMessagesByDate(
  messages: Array<{ content?: string; text?: string; createdAt?: string; time?: string; isMine: boolean; id: string }>
): ChatHistory[] {
  const groups = new Map<string, ChatHistory>();
  const now = new Date();
  const language = getCurrentLanguage();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (const m of messages) {
    const timestamp = m.createdAt ?? m.time ?? new Date().toISOString();
    const d = new Date(timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateLabel = dateKey === todayKey ? tMessage('messageTimeToday') : formatMonthDay(d, language);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateLabel, messages: [] });
    }

    const rawText = m.content ?? m.text ?? '';
    const parsed = parseMessageContent(rawText);
    groups.get(dateKey)!.messages.push({
      type: m.isMine ? 'sent' : 'received',
      text: parsed.text,
      time: formatChatTime(timestamp),
      status: 'read',
      ...(parsed.functionCard ? { functionCard: parsed.functionCard } : {}),
    });
  }

  return Array.from(groups.values());
}

function normalizeSendContent(payload: SendMessagePayload): string {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (payload.functionCard) {
    return encodeFunctionCard(payload.functionCard);
  }

  return (payload.text ?? '').trim();
}

export const messageService = {
  async getContacts(): Promise<Contact[]> {
    if (USE_MOCK) {
      const { mockContacts } = await import('../../data/mock/messages');
      return mockContacts;
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CONVERSATIONS);
    return (Array.isArray(data) ? data : []).map((c: {
      userId: string;
      user: {
        nickname: string;
        avatar: string;
        gender?: string;
        grade?: string | null;
        major?: string | null;
      };
      latestMessage: { content: string; createdAt: string };
      unreadCount: number;
    }) => {
      const parsed = parseMessageContent(c.latestMessage?.content ?? '');
      const preview = parsed.functionCard ? buildCardPreview(parsed.functionCard) : parsed.text;
      return {
        id: c.userId,
        name: c.user?.nickname ?? '?',
        avatar: c.user?.avatar ?? '',
        grade: c.user?.grade ?? undefined,
        major: c.user?.major ?? undefined,
        message: preview || '',
        time: formatMessageTime(c.latestMessage?.createdAt ?? new Date().toISOString()),
        unread: c.unreadCount ?? 0,
        pinned: false,
        gender: (c.user?.gender as 'male' | 'female' | 'other') ?? undefined,
      };
    });
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

  async sendMessage(receiverId: string, payload: SendMessagePayload, images?: string[]): Promise<{ success: boolean }> {
    const content = normalizeSendContent(payload);
    if (!content) return { success: false };

    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const parsed = parseMessageContent(content);
      const newMsg = {
        type: 'sent' as const,
        text: parsed.text,
        time,
        status: 'sent' as const,
        ...(parsed.functionCard ? { functionCard: parsed.functionCard } : {}),
      };
      const history = mockChatHistory[receiverId];
      if (history && history.length > 0) {
        const lastGroup = history[history.length - 1];
        lastGroup.messages.push(newMsg);
      } else {
        mockChatHistory[receiverId] = [{ date: tMessage('messageTimeToday'), messages: [newMsg] }];
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
