import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Contact, ChatHistory, ChatFunctionCard, ChatMessage, FunctionCardType } from '../../types';
import i18n, { normalizeLanguage } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { normalizeAvatarUrl, normalizeImageUrl as normalizeMediaUrl } from '../../utils/imageUrl';

const USE_MOCK = false;
const MESSAGE_CARD_PREFIX = '[BUHUB_CARD]';
const MESSAGE_REPLY_PREFIX = '[BUHUB_REPLY]';
const MESSAGE_AUDIO_PREFIX = '[BUHUB_AUDIO]';
const MESSAGE_REACTION_PREFIX = '[BUHUB_REACTION]';
const MESSAGE_ALBUM_PREFIX = '[BUHUB_ALBUM]';
const CARD_TITLE_MAX_LEN = 240;
const CARD_POSTER_MAX_LEN = 80;

type FunctionCardPayload = Pick<ChatFunctionCard, 'type' | 'id' | 'title' | 'posterName' | 'postId' | 'ratingCategory'>;

type ReplyPayload = {
  text: string;
  replyTo: NonNullable<ChatMessage['replyTo']>;
};

type AudioPayload = {
  url: string;
  durationMs?: number;
  replyTo?: NonNullable<ChatMessage['replyTo']>;
};

type ReactionPayload = {
  messageId: string;
  emoji?: string | null;
};

type ImageAlbumPayload = {
  count: number;
  replyTo?: NonNullable<ChatMessage['replyTo']>;
};

export type SendMessagePayload =
  | string
  | {
      text?: string;
      functionCard?: FunctionCardPayload;
      replyTo?: ReplyPayload['replyTo'];
      audio?: AudioPayload;
      reaction?: ReactionPayload;
      imageAlbum?: {
        count: number;
      };
    };

export type PersistedDirectMessage = {
  id: string;
  content?: string;
  text?: string;
  images?: string[];
  isDeleted?: boolean;
  isRead?: boolean;
  createdAt?: string | Date;
  time?: string | Date;
  senderId?: string;
  receiverId?: string;
  isMine?: boolean;
};

type MessageLanguage = 'tc' | 'sc' | 'en';
export type UserPresence = {
  isOnline: boolean;
  lastSeen: number | null;
};

export type CanSendMessageResult = {
  canSendMessage: boolean;
  reason?: 'SELF' | 'BLOCKED' | 'WAITING_FOR_REPLY' | 'HKBU_BIND_REQUIRED';
};

export type SendMessageResult = {
  success: boolean;
  message?: ChatMessage;
};

export type ChatHistoryChunk = {
  history: ChatHistory[];
  page: number;
  limit: number;
  messageCount: number;
  hasMore: boolean;
  total?: number;
};

export type ConversationSummary = {
  userId: string;
  user: {
    userName?: string | null;
    nickname: string;
    avatar: string;
    gender?: string;
    grade?: string | null;
    major?: string | null;
  };
  latestMessage: {
    content: string;
    images?: string[];
    createdAt: string | Date;
    isDeleted?: boolean;
    isRead?: boolean;
    senderId: string;
  };
  unreadCount: number;
};

const CARD_TYPE_LABEL_KEYS: Record<FunctionCardType, string> = {
  partner: 'findPartner',
  errand: 'errands',
  secondhand: 'secondhand',
  rating: 'ratings',
  post: 'forum',
};

function getCurrentLanguage(): MessageLanguage {
  const storeLang = normalizeLanguage(useAuthStore.getState().language);
  if (storeLang) return storeLang;
  const lang = i18n.language;
  const normalized = normalizeLanguage(lang);
  if (normalized) return normalized;
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

export function buildMessagePreviewText(
  content: string,
  images?: string[],
  isDeleted?: boolean
): string {
  if (isDeleted) {
    return tMessage('messageRecalledPreview');
  }
  const parsed = parseMessageContent(content ?? '');
  return parsed.functionCard
    ? buildCardPreview(parsed.functionCard)
    : parsed.audio
      ? tMessage('messageAudioPreview')
      : parsed.imageAlbum
        ? tMessage('messageAlbumPreview', { count: parsed.imageAlbum.count })
        : parsed.reaction
          ? parsed.reaction.emoji
            ? tMessage('messageReactionPreview', {
                emoji: parsed.reaction.emoji,
                defaultValue: `[Reacted] ${parsed.reaction.emoji}`,
              })
            : ''
          : (parsed.text || ((images?.length ?? 0) > 0 ? tMessage('messageImagePreview') : ''));
}

function buildCardPreview(card: FunctionCardPayload): string {
  const typeLabel = String(i18n.t(CARD_TYPE_LABEL_KEYS[card.type]));
  const fallbackPrefix = getCurrentLanguage() === 'en' ? 'Shared' : '分享';
  return tMessage('messageSharedCardPreview', {
    type: typeLabel,
    title: card.title,
    defaultValue: `[${fallbackPrefix}${typeLabel}] ${card.title}`,
  });
}

function sanitizeCardText(value: string | undefined, maxLen: number, fallback: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function encodeFunctionCard(card: FunctionCardPayload): string {
  const safeCard: FunctionCardPayload = {
    ...card,
    title: sanitizeCardText(card.title, CARD_TITLE_MAX_LEN, '-'),
    posterName: sanitizeCardText(card.posterName, CARD_POSTER_MAX_LEN, '-'),
  };
  return `${MESSAGE_CARD_PREFIX}${JSON.stringify(safeCard)}`;
}

function encodeReplyPayload(payload: ReplyPayload): string {
  return `${MESSAGE_REPLY_PREFIX}${JSON.stringify(payload)}`;
}

function encodeAudioPayload(payload: AudioPayload): string {
  return `${MESSAGE_AUDIO_PREFIX}${JSON.stringify(payload)}`;
}

function encodeReactionPayload(payload: ReactionPayload): string {
  return `${MESSAGE_REACTION_PREFIX}${JSON.stringify(payload)}`;
}

function encodeImageAlbumPayload(payload: ImageAlbumPayload): string {
  return `${MESSAGE_ALBUM_PREFIX}${JSON.stringify(payload)}`;
}

function normalizeReplyReference(replyTo: unknown): ChatMessage['replyTo'] | undefined {
  if (!replyTo || typeof replyTo !== 'object') return undefined;
  const raw = replyTo as Record<string, unknown>;
  const from =
    raw.from === 'me' || raw.from === 'them'
      ? raw.from
      : typeof raw.isMine === 'boolean'
        ? raw.isMine
          ? 'me'
          : 'them'
        : null;
  if (!from) {
    return undefined;
  }
  const normalizedText =
    typeof raw.text === 'string'
      ? raw.text
      : typeof raw.title === 'string'
        ? raw.title
        : '';

  return {
    text: normalizedText,
    from,
    ...(typeof raw.fromName === 'string' && raw.fromName.trim().length > 0
      ? { fromName: raw.fromName.trim() }
      : {}),
    ...(typeof raw.messageId === 'string' && raw.messageId.length > 0 ? { messageId: raw.messageId } : {}),
    ...(typeof raw.clientKey === 'string' && raw.clientKey.length > 0 ? { clientKey: raw.clientKey } : {}),
    ...(raw.type === 'text' ||
    raw.type === 'image' ||
    raw.type === 'audio' ||
    raw.type === 'card' ||
    raw.type === 'album' ||
    raw.type === 'recalled' ||
    raw.type === 'deleted'
      ? { type: raw.type }
      : {}),
    ...(typeof raw.title === 'string' && raw.title.length > 0 ? { title: raw.title } : {}),
    ...(typeof raw.thumbnailUri === 'string' && raw.thumbnailUri.length > 0
      ? { thumbnailUri: raw.thumbnailUri }
      : {}),
    ...(typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs)
      ? { durationMs: raw.durationMs }
      : {}),
    ...(raw.cardType === 'partner' ||
    raw.cardType === 'errand' ||
    raw.cardType === 'secondhand' ||
    raw.cardType === 'rating' ||
    raw.cardType === 'post'
      ? { cardType: raw.cardType }
      : {}),
  };
}

function parseMessageContent(raw: string): {
  text: string;
  functionCard?: {
    type: FunctionCardType;
    id?: string;
    title: string;
    posterName: string;
    postId?: string;
    ratingCategory?: ChatFunctionCard['ratingCategory'];
  };
  replyTo?: ReplyPayload['replyTo'];
  audio?: AudioPayload;
  reaction?: ReactionPayload;
  imageAlbum?: ImageAlbumPayload;
} {
  if (raw.startsWith(MESSAGE_ALBUM_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(MESSAGE_ALBUM_PREFIX.length)) as ImageAlbumPayload;
      if (!payload?.count || payload.count < 1) {
        return { text: raw };
      }
      return {
        text: '',
        imageAlbum: {
          count: payload.count,
          ...(normalizeReplyReference(payload.replyTo)
            ? { replyTo: normalizeReplyReference(payload.replyTo) }
            : {}),
        },
        ...(normalizeReplyReference(payload.replyTo)
          ? { replyTo: normalizeReplyReference(payload.replyTo) }
          : {}),
      };
    } catch {
      return { text: raw };
    }
  }

  if (raw.startsWith(MESSAGE_REACTION_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(MESSAGE_REACTION_PREFIX.length)) as ReactionPayload;
      if (!payload?.messageId) return { text: raw };
      return {
        text: '',
        reaction: {
          messageId: payload.messageId,
          emoji: typeof payload.emoji === 'string' ? payload.emoji : '',
        },
      };
    } catch {
      return { text: raw };
    }
  }

  if (raw.startsWith(MESSAGE_AUDIO_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(MESSAGE_AUDIO_PREFIX.length)) as AudioPayload;
      if (!payload?.url) return { text: raw };
      return {
        text: '',
        audio: {
          url: payload.url,
          ...(typeof payload.durationMs === 'number' ? { durationMs: payload.durationMs } : {}),
        },
        ...(normalizeReplyReference(payload.replyTo)
          ? { replyTo: normalizeReplyReference(payload.replyTo) }
          : {}),
      };
    } catch {
      return { text: raw };
    }
  }

  if (raw.startsWith(MESSAGE_REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(MESSAGE_REPLY_PREFIX.length)) as ReplyPayload;
      if (
        !normalizeReplyReference(payload?.replyTo)
      ) {
        return { text: raw };
      }
      const replyTo = normalizeReplyReference(payload.replyTo)!;
      return {
        text: payload.text ?? '',
        replyTo,
      };
    } catch {
      return { text: raw };
    }
  }

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
        ratingCategory: payload.ratingCategory,
      },
    };
  } catch {
    return { text: raw };
  }
}

function resolveMessageTimestamp(value?: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return new Date().toISOString();
}

export function buildSentChatMessage(message: PersistedDirectMessage): ChatMessage | null {
  const timestamp = resolveMessageTimestamp(message.createdAt ?? message.time);

  if (message.isDeleted) {
    return {
      id: message.id,
      createdAt: timestamp,
      type: 'sent',
      text: tMessage('messageYouRecalled'),
      images: [],
      isRecalled: true,
      time: formatChatTime(timestamp),
      status: message.isRead ? 'read' : 'delivered',
    };
  }

  const rawText = message.content ?? message.text ?? '';
  const parsed = parseMessageContent(rawText);
  if (parsed.reaction) return null;

  return {
    id: message.id,
    createdAt: timestamp,
    type: 'sent',
    text: parsed.text,
    images: Array.isArray(message.images)
      ? message.images
          .map((img) => normalizeMediaUrl(img))
          .filter((img): img is string => typeof img === 'string' && img.length > 0)
      : [],
    ...(parsed.audio
      ? (() => {
          const audioUrl = normalizeMediaUrl(parsed.audio.url);
          return audioUrl ? { audio: { ...parsed.audio, url: audioUrl } } : {};
        })()
      : {}),
    ...(parsed.imageAlbum ? { imageAlbum: { count: parsed.imageAlbum.count } } : {}),
    ...(parsed.replyTo ? { replyTo: parsed.replyTo } : {}),
    time: formatChatTime(timestamp),
    status: message.isRead ? 'read' : 'delivered',
    ...(parsed.functionCard ? { functionCard: parsed.functionCard } : {}),
  };
}

export function buildChatMessageFromPersistedMessage(
  message: PersistedDirectMessage,
  currentUserId?: string
): ChatMessage | null {
  const timestamp = resolveMessageTimestamp(message.createdAt ?? message.time);
  const isMine =
    typeof message.isMine === 'boolean'
      ? message.isMine
      : Boolean(currentUserId && message.senderId && message.senderId === currentUserId);

  if (message.isDeleted) {
    return {
      id: message.id,
      createdAt: timestamp,
      type: isMine ? 'sent' : 'received',
      text: isMine ? tMessage('messageYouRecalled') : tMessage('messagePeerRecalled'),
      images: [],
      isRecalled: true,
      time: formatChatTime(timestamp),
      ...(isMine ? { status: (message.isRead ? 'read' : 'delivered') as 'read' | 'delivered' } : {}),
    };
  }

  const rawText = message.content ?? message.text ?? '';
  const parsed = parseMessageContent(rawText);
  if (parsed.reaction) return null;

  return {
    id: message.id,
    createdAt: timestamp,
    type: isMine ? 'sent' : 'received',
    text: parsed.text,
    images: Array.isArray(message.images)
      ? message.images
          .map((img) => normalizeMediaUrl(img))
          .filter((img): img is string => typeof img === 'string' && img.length > 0)
      : [],
    ...(parsed.audio
      ? (() => {
          const audioUrl = normalizeMediaUrl(parsed.audio.url);
          return audioUrl ? { audio: { ...parsed.audio, url: audioUrl } } : {};
        })()
      : {}),
    ...(parsed.imageAlbum ? { imageAlbum: { count: parsed.imageAlbum.count } } : {}),
    ...(parsed.replyTo ? { replyTo: parsed.replyTo } : {}),
    time: formatChatTime(timestamp),
    ...(isMine ? { status: (message.isRead ? 'read' : 'delivered') as 'read' | 'delivered' } : {}),
    ...(parsed.functionCard ? { functionCard: parsed.functionCard } : {}),
  };
}

export function mapConversationSummaryToContact(summary: ConversationSummary): Contact {
  const latestMessageAt = resolveMessageTimestamp(summary.latestMessage?.createdAt);
  return {
    id: summary.userId,
    userName: summary.user?.userName ?? undefined,
    name: summary.user?.nickname ?? '?',
    avatar: normalizeAvatarUrl(summary.user?.avatar) ?? '',
    grade: summary.user?.grade ?? undefined,
    major: summary.user?.major ?? undefined,
    message: buildMessagePreviewText(
      summary.latestMessage?.content ?? '',
      summary.latestMessage?.images,
      summary.latestMessage?.isDeleted
    ),
    time: formatMessageTime(latestMessageAt),
    lastMessageAt: latestMessageAt,
    unread: summary.unreadCount ?? 0,
    pinned: false,
    gender: (summary.user?.gender as Contact['gender']) ?? undefined,
  };
}

function groupMessagesByDate(
  messages: Array<{
    content?: string;
    text?: string;
    createdAt?: string;
    time?: string;
    images?: string[];
    isDeleted?: boolean;
    isRead?: boolean;
    isMine: boolean;
    id: string;
  }>
): ChatHistory[] {
  const groups = new Map<string, ChatHistory>();
  const renderedMessageById = new Map<string, NonNullable<ChatHistory['messages'][number]>>();
  const actorReactionByTarget = new Map<string, { me?: string; them?: string }>();
  const now = new Date();
  const language = getCurrentLanguage();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const applyReactions = (targetId: string) => {
    const target = renderedMessageById.get(targetId);
    if (!target) return;
    const actorState = actorReactionByTarget.get(targetId);
    if (!actorState) {
      target.reactions = [];
      return;
    }

    const entries = new Map<string, { emoji: string; count: number; reactedByMe?: boolean }>();
    if (actorState.me) {
      const current = entries.get(actorState.me) ?? { emoji: actorState.me, count: 0 };
      current.count += 1;
      current.reactedByMe = true;
      entries.set(actorState.me, current);
    }
    if (actorState.them) {
      const current = entries.get(actorState.them) ?? { emoji: actorState.them, count: 0 };
      current.count += 1;
      entries.set(actorState.them, current);
    }
    target.reactions = Array.from(entries.values());
  };

  for (const m of messages) {
    const timestamp = m.createdAt ?? m.time ?? new Date().toISOString();
    const d = new Date(timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateLabel = dateKey === todayKey ? tMessage('messageTimeToday') : formatMonthDay(d, language);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: dateLabel, messages: [] });
    }

    if (m.isDeleted) {
      groups.get(dateKey)!.messages.push({
        id: m.id,
        createdAt: timestamp,
        type: m.isMine ? 'sent' : 'received',
        text: m.isMine
          ? tMessage('messageYouRecalled')
          : tMessage('messagePeerRecalled'),
        images: [],
        isRecalled: true,
        time: formatChatTime(timestamp),
      });
      continue;
    }

    const rawText = m.content ?? m.text ?? '';
    const parsed = parseMessageContent(rawText);
    if (parsed.reaction) {
      const actor = m.isMine ? 'me' : 'them';
      const current = actorReactionByTarget.get(parsed.reaction.messageId) ?? {};
      if (parsed.reaction.emoji) {
        current[actor] = parsed.reaction.emoji;
        actorReactionByTarget.set(parsed.reaction.messageId, current);
      } else {
        delete current[actor];
        if (current.me || current.them) {
          actorReactionByTarget.set(parsed.reaction.messageId, current);
        } else {
          actorReactionByTarget.delete(parsed.reaction.messageId);
        }
      }
      applyReactions(parsed.reaction.messageId);
      continue;
    }

    const nextMessage: NonNullable<ChatHistory['messages'][number]> = {
      id: m.id,
      createdAt: timestamp,
      type: m.isMine ? 'sent' : 'received',
      text: parsed.text,
      images: Array.isArray(m.images)
        ? m.images
            .map((img) => normalizeMediaUrl(img))
            .filter((img): img is string => typeof img === 'string' && img.length > 0)
        : [],
      ...(parsed.audio
        ? (() => {
            const audioUrl = normalizeMediaUrl(parsed.audio.url);
            return audioUrl ? { audio: { ...parsed.audio, url: audioUrl } } : {};
          })()
        : {}),
      ...(parsed.imageAlbum ? { imageAlbum: { count: parsed.imageAlbum.count } } : {}),
      ...(parsed.replyTo ? { replyTo: parsed.replyTo } : {}),
      time: formatChatTime(timestamp),
      ...(m.isMine ? { status: (m.isRead ? 'read' : 'delivered') as 'read' | 'delivered' } : {}),
      ...(parsed.functionCard ? { functionCard: parsed.functionCard } : {}),
    };
    groups.get(dateKey)!.messages.push(nextMessage);
    renderedMessageById.set(m.id, nextMessage);
    applyReactions(m.id);
  }

  return Array.from(groups.values());
}

function normalizeSendContent(payload: SendMessagePayload): string {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (payload.reaction) {
    return encodeReactionPayload(payload.reaction);
  }

  if (payload.audio) {
    return encodeAudioPayload({
      ...payload.audio,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    });
  }

  if (payload.imageAlbum) {
    return encodeImageAlbumPayload({
      count: payload.imageAlbum.count,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    });
  }

  if (payload.functionCard) {
    return encodeFunctionCard(payload.functionCard);
  }

  if (payload.replyTo) {
    return encodeReplyPayload({
      text: (payload.text ?? '').trim(),
      replyTo: payload.replyTo,
    });
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
    return (Array.isArray(data) ? data : []).map((c) =>
      mapConversationSummaryToContact(c as ConversationSummary)
    );
  },

  async searchContacts(query: string, limit = 20): Promise<Contact[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }
    if (USE_MOCK) {
      const { mockContacts } = await import('../../data/mock/messages');
      const lowered = trimmedQuery.toLowerCase();
      return mockContacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(lowered) ||
          (contact.userName ?? '').toLowerCase().includes(lowered) ||
          contact.message.toLowerCase().includes(lowered)
      );
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.SEARCH, {
      params: { q: trimmedQuery, limit },
    });
    return (Array.isArray(data) ? data : []).map((item) =>
      mapConversationSummaryToContact(item as ConversationSummary)
    );
  },

  async getChatHistoryChunk(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<ChatHistoryChunk> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(Math.max(1, options?.limit ?? 50), 100);
    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const history = mockChatHistory[userId] || [];
      const flattenedMessages = history.flatMap((group) => group.messages ?? []);
      const totalMessages = flattenedMessages.length;
      const end = Math.max(0, totalMessages - (page - 1) * limit);
      const start = Math.max(0, end - limit);
      const pageMessages = flattenedMessages.slice(start, end);
      const normalizedPageMessages = pageMessages.map((message) => ({
        id: message.id ?? '',
        text: message.text,
        content: message.text,
        images: message.images,
        isDeleted: message.isRecalled,
        isRead: message.status === 'read',
        createdAt: message.createdAt,
        time: message.createdAt,
        isMine: message.type === 'sent',
      }));
      const pageHistory = groupMessagesByDate(normalizedPageMessages);
      return {
        history: JSON.parse(JSON.stringify(pageHistory)),
        page,
        limit,
        messageCount: pageMessages.length,
        hasMore: start > 0,
      };
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CHAT(userId), {
      params: { page, limit },
    });
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as {
            messages?: unknown[];
            pagination?: {
              page?: number;
              limit?: number;
              total?: number;
              hasMore?: boolean;
            };
          })
        : null;
    const messages = Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(data)
        ? data
        : [];
    const pagination = payload?.pagination;
    return {
      history: groupMessagesByDate(messages),
      page: typeof pagination?.page === 'number' ? pagination.page : page,
      limit: typeof pagination?.limit === 'number' ? pagination.limit : limit,
      messageCount: messages.length,
      hasMore:
        typeof pagination?.hasMore === 'boolean'
          ? pagination.hasMore
          : messages.length === limit,
      total: typeof pagination?.total === 'number' ? pagination.total : undefined,
    };
  },

  async getChatHistory(userId: string): Promise<ChatHistory[]> {
    const chunk = await this.getChatHistoryChunk(userId);
    return chunk.history;
  },

  async canSendMessage(userId: string): Promise<CanSendMessageResult> {
    if (USE_MOCK) return { canSendMessage: true };
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.CAN_SEND(userId));
    return {
      canSendMessage: Boolean((data as { canSendMessage?: boolean })?.canSendMessage),
      reason: (data as { reason?: CanSendMessageResult['reason'] })?.reason,
    };
  },

  async sendTyping(toUserId: string, isTyping: boolean): Promise<void> {
    if (USE_MOCK) return;
    await apiClient.post(ENDPOINTS.MESSAGE.TYPING, { toUserId, isTyping });
  },

  async heartbeatPresence(): Promise<UserPresence> {
    if (USE_MOCK) {
      return { isOnline: true, lastSeen: Date.now() };
    }
    const { data } = await apiClient.post(ENDPOINTS.MESSAGE.PRESENCE_HEARTBEAT);
    const payload = data as { isOnline?: boolean; lastSeen?: number | null };
    return {
      isOnline: Boolean(payload?.isOnline),
      lastSeen: typeof payload?.lastSeen === 'number' ? payload.lastSeen : null,
    };
  },

  async goOffline(): Promise<void> {
    if (USE_MOCK) return;
    await apiClient.delete(ENDPOINTS.MESSAGE.PRESENCE_HEARTBEAT);
  },

  async getPresence(userId: string): Promise<UserPresence> {
    if (USE_MOCK) {
      return { isOnline: false, lastSeen: null };
    }
    const { data } = await apiClient.get(ENDPOINTS.MESSAGE.PRESENCE(userId));
    const payload = data as { isOnline?: boolean; lastSeen?: number | null };
    return {
      isOnline: Boolean(payload?.isOnline),
      lastSeen: typeof payload?.lastSeen === 'number' ? payload.lastSeen : null,
    };
  },

  async sendMessage(receiverId: string, payload: SendMessagePayload, images?: string[], clientKey?: string): Promise<SendMessageResult> {
    const content = normalizeSendContent(payload);
    if (!content && (!images || images.length === 0)) return { success: false };

    if (USE_MOCK) {
      const { mockChatHistory } = await import('../../data/mock/messages');
      const now = new Date();
      const parsed = parseMessageContent(content);
      const createdAt = now.toISOString();
      const newMsg = {
        id: `mock-msg-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        clientKey: clientKey,
        createdAt,
        type: 'sent' as const,
        text: parsed.text,
        images: images ?? [],
        ...(parsed.imageAlbum ? { imageAlbum: { count: parsed.imageAlbum.count } } : {}),
        ...(parsed.audio ? { audio: parsed.audio } : {}),
        ...(parsed.replyTo ? { replyTo: parsed.replyTo } : {}),
        time: formatChatTime(createdAt),
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
      return { success: true, message: newMsg };
    }
    const body: Record<string, unknown> = { receiverId, content, images: images ?? [] };
    if (clientKey) body.clientKey = clientKey;
    const { data } = await apiClient.post(ENDPOINTS.MESSAGE.SEND, body);
    const message = buildSentChatMessage(data as PersistedDirectMessage) ?? undefined;
    // If server did not echo back clientKey, preserve it so client can reconcile
    if (message && clientKey && !message.clientKey) {
      message.clientKey = clientKey;
    }
    return { success: true, ...(message ? { message } : {}) };
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
