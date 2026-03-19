import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import { normalizeLanguage } from '../i18n';
import type { ChatHistory, ChatMessage, Contact } from '../types';
import { useAuthStore } from '../store/authStore';
import { normalizeImageUrl as normalizeMediaUrl } from '../utils/imageUrl';
import {
  appendMessageToHistory,
  buildPreviewFromChatMessage,
  formatConversationTime,
  getCurrentMessageLanguage,
  hydrateChatCache,
  hydrateContactsCache,
  markMessageAsReadInHistory,
  markMessageAsRecalledInHistory,
  patchChatQueries,
  patchContactsQueries,
  peekCachedChatHistory,
  peekCachedContacts,
  persistChatCache,
  persistContactsCache,
  replaceMessageInHistory,
  upsertContact,
  writeChatSnapshot,
  writeContactsSnapshot,
} from '../utils/messageCache';
import { recordMessageMetric, recordTimedMessageMetric } from '../utils/messageMetrics';

type SendMessageRequest = {
  payload: SendMessagePayload;
  images?: string[];
};

type ChatHistoryQueryOptions = {
  enabled?: boolean;
  polling?: boolean;
};

type ContactsQueryOptions = {
  polling?: boolean;
};

type SendMessageContactSeed = {
  name: string;
  avatar?: string | null;
  userName?: string;
  grade?: string;
  major?: string;
  gender?: Contact['gender'];
};

type MessageSearchOptions = {
  enabled?: boolean;
};

type SendMutationContext = {
  previousChats: Array<[readonly unknown[], ChatHistory[] | undefined]>;
  optimisticMessageId?: string;
  optimisticMessage?: ChatMessage | null;
  optimisticApplied: boolean;
  isReaction: boolean;
};

type RecallMutationContext = {
  previousChats: Array<[readonly unknown[], ChatHistory[] | undefined]>;
};

function formatMessageTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function buildOptimisticMessage(
  payload: SendMessagePayload,
  images?: string[]
): ChatMessage | null {
  const now = new Date();
  const createdAt = now.toISOString();
  const optimisticId = `optimistic-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
  const baseMessage: ChatMessage = {
    id: optimisticId,
    clientKey: optimisticId,
    createdAt,
    type: 'sent',
    text: '',
    images: Array.isArray(images) ? images : [],
    time: formatMessageTime(now),
    status: 'sent',
  };

  if (typeof payload === 'string') {
    const text = payload.trim();
    if (!text && baseMessage.images?.length === 0) return null;
    return { ...baseMessage, text };
  }

  if (payload.reaction) {
    return null;
  }

  if (payload.functionCard) {
    return {
      ...baseMessage,
      functionCard: payload.functionCard,
      text: '',
    };
  }

  if (payload.audio?.url) {
    const normalizedAudioUrl = normalizeMediaUrl(payload.audio.url);
    return {
      ...baseMessage,
      audio: {
        ...payload.audio,
        url: normalizedAudioUrl ?? payload.audio.url,
      },
      text: '',
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    };
  }

  if (payload.imageAlbum?.count) {
    return {
      ...baseMessage,
      text: (payload.text ?? '').trim(),
      imageAlbum: { count: payload.imageAlbum.count },
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    };
  }

  const text = (payload.text ?? '').trim();
  if (!text && baseMessage.images?.length === 0) return null;
  return {
    ...baseMessage,
    text,
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
  };
}

function getLatestMessageFromHistory(history: ChatHistory[] | undefined): ChatMessage | null {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let groupIndex = history.length - 1; groupIndex >= 0; groupIndex -= 1) {
    const group = history[groupIndex];
    for (let messageIndex = group.messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const message = group.messages[messageIndex];
      if (message) {
        return message;
      }
    }
  }
  return null;
}

function buildConversationContact(
  receiverId: string,
  message: ChatMessage,
  existing: Contact | undefined,
  seed?: SendMessageContactSeed
): Contact {
  const createdAt = message.createdAt ?? new Date().toISOString();
  const seededName = seed?.name?.trim();
  const resolvedName =
    existing?.name ??
    (seededName && seededName.length > 0 ? seededName : undefined) ??
    seed?.userName ??
    receiverId;
  return {
    id: receiverId,
    userName: existing?.userName ?? seed?.userName,
    name: resolvedName,
    avatar: existing?.avatar ?? seed?.avatar ?? '',
    grade: existing?.grade ?? seed?.grade,
    major: existing?.major ?? seed?.major,
    message: buildPreviewFromChatMessage(message),
    time: formatConversationTime(createdAt),
    lastMessageAt: createdAt,
    unread: 0,
    pinned: existing?.pinned ?? false,
    gender: existing?.gender ?? seed?.gender,
    muted: existing?.muted,
  };
}


export function useContacts(options: ContactsQueryOptions = {}) {
  const { polling = false } = options;
  const language = useAuthStore((s) => s.language);
  const normalizedLanguage = normalizeLanguage(language) ?? 'tc';
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void hydrateContactsCache(userId, normalizedLanguage).then((cached) => {
      if (cancelled || !cached) return;
      if (!queryClient.getQueryData(['contacts', normalizedLanguage])) {
        writeContactsSnapshot(queryClient, userId, normalizedLanguage, cached);
        recordMessageMetric('contacts_cache_hydrated', {
          count: cached.length,
          language: normalizedLanguage,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedLanguage, queryClient, userId]);

  return useQuery({
    queryKey: ['contacts', normalizedLanguage],
    queryFn: async () => {
      const startedAt = Date.now();
      const contacts = await messageService.getContacts();
      if (userId) {
        await persistContactsCache(userId, normalizedLanguage, contacts);
      }
      recordTimedMessageMetric('contacts_fetch_duration', startedAt, {
        count: contacts.length,
      });
      return contacts;
    },
    staleTime: polling ? 5 * 1000 : 30 * 1000,
    refetchInterval: polling ? 8 * 1000 : false,
    refetchOnWindowFocus: polling,
    refetchOnReconnect: true,
    initialData: userId ? peekCachedContacts(userId, normalizedLanguage) : undefined,
  });
}

export function useMessageSearch(query: string, options: MessageSearchOptions = {}) {
  const language = useAuthStore((s) => s.language);
  const normalizedLanguage = normalizeLanguage(language) ?? 'tc';
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: ['message-search', normalizedLanguage, trimmedQuery],
    queryFn: () => messageService.searchContacts(trimmedQuery),
    enabled: (options.enabled ?? true) && trimmedQuery.length > 0,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useChatHistory(userId: string, options: ChatHistoryQueryOptions = {}) {
  const { enabled = true, polling = true } = options;
  const language = useAuthStore((s) => s.language);
  const normalizedLanguage = normalizeLanguage(language) ?? 'tc';
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId || !userId) return;
    let cancelled = false;
    void hydrateChatCache(currentUserId, normalizedLanguage, userId).then((cached) => {
      if (cancelled || !cached) return;
      if (!queryClient.getQueryData(['chat', userId, normalizedLanguage])) {
        writeChatSnapshot(queryClient, currentUserId, normalizedLanguage, userId, cached);
        recordMessageMetric('chat_cache_hydrated', {
          contactId: userId,
          groups: cached.length,
          language: normalizedLanguage,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, normalizedLanguage, queryClient, userId]);

  return useQuery({
    queryKey: ['chat', userId, normalizedLanguage],
    queryFn: async () => {
      const startedAt = Date.now();
      const history = await messageService.getChatHistory(userId);
      if (currentUserId) {
        await persistChatCache(currentUserId, normalizedLanguage, userId, history);
      }
      recordTimedMessageMetric('chat_fetch_duration', startedAt, {
        contactId: userId,
        groups: history.length,
      });
      return history;
    },
    enabled: enabled && userId.length > 0,
    staleTime: polling ? 5 * 1000 : 30 * 1000,
    refetchInterval: polling ? 8 * 1000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    initialData:
      currentUserId && userId
        ? peekCachedChatHistory(currentUserId, normalizedLanguage, userId)
        : undefined,
  });
}

export function useCanSendMessage(userId: string) {
  return useQuery({
    queryKey: ['chat-can-send', userId],
    queryFn: () => messageService.canSendMessage(userId),
    enabled: userId.length > 0,
    staleTime: 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

export function usePresence(userId: string) {
  return useQuery({
    queryKey: ['presence', userId],
    queryFn: () => messageService.getPresence(userId),
    enabled: userId.length > 0,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSendMessage(receiverId: string, contactSeed?: SendMessageContactSeed) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ payload, images }: SendMessageRequest) =>
      messageService.sendMessage(receiverId, payload, images),
    onMutate: async ({ payload, images }): Promise<SendMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['chat', receiverId] });
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', receiverId],
      });
      const isReaction = typeof payload !== 'string' && Boolean(payload.reaction);
      const optimisticMessage = buildOptimisticMessage(payload, images);
      const optimisticApplied = !isReaction && Boolean(optimisticMessage);

      if (optimisticApplied && optimisticMessage) {
        patchChatQueries(queryClient, currentUserId, receiverId, (old, language) =>
          appendMessageToHistory(old, optimisticMessage, language)
        );
        patchContactsQueries(queryClient, currentUserId, (current) => {
          if (!optimisticMessage) return current;
          const existing = current?.find((contact) => contact.id === receiverId);
          return upsertContact(
            current,
            buildConversationContact(receiverId, optimisticMessage, existing, contactSeed)
          );
        });
      }

      return {
        previousChats,
        optimisticMessageId: optimisticMessage?.id,
        optimisticMessage,
        optimisticApplied,
        isReaction,
      };
    },
    onError: (_error, _variables, context) => {
      context?.previousChats.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (result, _variables, context) => {
      const sentMessage = result.message;
      if (sentMessage && context?.optimisticMessageId) {
        patchChatQueries(queryClient, currentUserId, receiverId, (old) =>
          replaceMessageInHistory(old, context.optimisticMessageId!, sentMessage) ??
          appendMessageToHistory(old, sentMessage)
        );
      } else if (sentMessage && !context?.isReaction) {
        patchChatQueries(queryClient, currentUserId, receiverId, (old, language) =>
          appendMessageToHistory(old, sentMessage, language)
        );
      } else if (!sentMessage && context?.optimisticApplied) {
        queryClient.invalidateQueries({ queryKey: ['chat', receiverId], refetchType: 'inactive' });
      }

      if (sentMessage) {
        patchContactsQueries(queryClient, currentUserId, (current) => {
          const existing = current?.find((contact) => contact.id === receiverId);
          return upsertContact(
            current,
            buildConversationContact(receiverId, sentMessage, existing, contactSeed)
          );
        });
      }
      // Delay background refetch to avoid race with optimistic replace
      // The replace above already put the correct message in cache;
      // refetch too early can cause a brief duplicate flash.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['chat', receiverId], refetchType: 'inactive' });
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['chat-can-send', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}

export function useRecallMessage(contactId: string) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (messageId: string) => messageService.deleteMessage(messageId),
    onMutate: async (messageId): Promise<RecallMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['chat', contactId] });
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', contactId],
      });
      patchChatQueries(queryClient, currentUserId, contactId, (old) =>
        markMessageAsRecalledInHistory(old, messageId)
      );
      patchContactsQueries(queryClient, currentUserId, (current, language) => {
        const existing = current?.find((contact) => contact.id === contactId);
        if (!existing) return current;
        const nextHistory = queryClient.getQueryData<ChatHistory[]>([
          'chat',
          contactId,
          language,
        ]);
        const latestMessage = getLatestMessageFromHistory(nextHistory);
        if (!latestMessage) return current;
        return upsertContact(current, {
          ...existing,
          message: buildPreviewFromChatMessage(latestMessage),
          time: latestMessage.createdAt
            ? formatConversationTime(latestMessage.createdAt)
            : existing.time,
        });
      });
      return { previousChats };
    },
    onError: (_error, _variables, context) => {
      context?.previousChats.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
