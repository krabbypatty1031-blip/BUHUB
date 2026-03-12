import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import { normalizeLanguage } from '../i18n';
import type { ChatHistory, ChatMessage } from '../types';
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
  const baseMessage: ChatMessage = {
    id: `optimistic-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
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
    staleTime: polling ? 10 * 1000 : 60 * 1000,
    refetchInterval: polling ? 30 * 1000 : false,
    refetchOnWindowFocus: polling,
    refetchOnReconnect: true,
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
    staleTime: polling ? 20 * 1000 : 60 * 1000,
    refetchInterval: polling ? 60 * 1000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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

export function useSendMessage(receiverId: string) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ payload, images }: SendMessageRequest) =>
      messageService.sendMessage(receiverId, payload, images),
    onMutate: async ({ payload, images }): Promise<SendMutationContext> => {
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
          if (!existing) return current;
          return upsertContact(current, {
            ...existing,
            message: buildPreviewFromChatMessage(optimisticMessage),
            time: formatConversationTime(optimisticMessage.createdAt ?? new Date().toISOString()),
            unread: 0,
          });
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
          if (!existing) return current;
          return upsertContact(current, {
            ...existing,
            message: buildPreviewFromChatMessage(sentMessage),
            time: formatConversationTime(sentMessage.createdAt ?? new Date().toISOString()),
            unread: 0,
          });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'inactive' });
      }
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
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', contactId],
      });
      patchChatQueries(queryClient, currentUserId, contactId, (old) =>
        markMessageAsRecalledInHistory(old, messageId)
      );
      return { previousChats };
    },
    onError: (_error, _variables, context) => {
      context?.previousChats.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', contactId], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
