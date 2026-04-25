import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import { normalizeLanguage } from '../i18n';
import type { ChatHistory, ChatMessage, Contact } from '../types';
import { useAuthStore } from '../store/authStore';
import { useMessageRealtimeStore } from '../store/messageRealtimeStore';
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
  rememberRecentSentMessage,
  replaceMessageInHistory,
  sortGroupMessagesByCreatedAt,
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

const RECENT_CONFIRMED_MESSAGE_GRACE_MS = 5 * 60 * 1000;
const HISTORY_EDGE_TOLERANCE_MS = 15 * 1000;

function resolveMessageCreatedAtMs(message: ChatMessage): number | null {
  if (typeof message.createdAt !== 'string' || message.createdAt.length === 0) {
    return null;
  }
  const parsed = Date.parse(message.createdAt);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldPreserveMissingCachedMessage(
  message: ChatMessage,
  oldestFetchedTimestampMs: number | null
): boolean {
  if (!message.id) return false;
  if (
    message.id.startsWith('local-') ||
    message.status === 'sending' ||
    message.status === 'failed'
  ) {
    return true;
  }
  if (message.type !== 'sent' || !message.clientKey) return false;
  const createdAtMs = resolveMessageCreatedAtMs(message);
  if (createdAtMs == null) return false;
  if (Date.now() - createdAtMs > RECENT_CONFIRMED_MESSAGE_GRACE_MS) return false;
  if (oldestFetchedTimestampMs == null) return true;
  return createdAtMs >= oldestFetchedTimestampMs - HISTORY_EDGE_TOLERANCE_MS;
}

function withSortedMessageGroups(history: ChatHistory[]): ChatHistory[] {
  return history.map((group) => ({
    ...group,
    messages: sortGroupMessagesByCreatedAt(group.messages ?? []),
  }));
}

function reconcileFetchedChatHistory(
  currentHistory: ChatHistory[] | undefined,
  fetchedHistory: ChatHistory[]
): ChatHistory[] {
  if (!Array.isArray(fetchedHistory)) return [];
  if (!Array.isArray(currentHistory) || currentHistory.length === 0) {
    return withSortedMessageGroups(fetchedHistory);
  }

  const currentMessageById = new Map<string, ChatMessage>();
  const currentMessageByClientKey = new Map<string, ChatMessage>();
  const currentMessageClientKeys = new Set<string>();
  currentHistory.forEach((group) => {
    group.messages.forEach((message) => {
      if (!message.id) return;
      currentMessageById.set(message.id, message);
      if (message.clientKey) {
        currentMessageClientKeys.add(message.clientKey);
        currentMessageByClientKey.set(message.clientKey, message);
      }
    });
  });

  // Collect IDs present in fetched data
  const fetchedIds = new Set<string>();
  const fetchedClientKeys = new Set<string>();
  let oldestFetchedTimestampMs: number | null = null;
  let hasFetchedMessageNotInCurrent = false;
  fetchedHistory.forEach((group) => {
    group.messages.forEach((message) => {
      if (message.id) fetchedIds.add(message.id);
      if (message.clientKey) fetchedClientKeys.add(message.clientKey);
      const existsInCurrent =
        (message.id ? currentMessageById.has(message.id) : false) ||
        (message.clientKey ? currentMessageClientKeys.has(message.clientKey) : false);
      if (!existsInCurrent) {
        hasFetchedMessageNotInCurrent = true;
      }
      const createdAtMs = resolveMessageCreatedAtMs(message);
      if (createdAtMs == null) return;
      oldestFetchedTimestampMs =
        oldestFetchedTimestampMs == null
          ? createdAtMs
          : Math.min(oldestFetchedTimestampMs, createdAtMs);
    });
  });

  // Find optimistic/pending messages in cache that are absent from server response
  // or recently confirmed local sends that the server history has not surfaced yet.
  const missingCachedMessages: ChatMessage[] = [];
  currentHistory.forEach((group) => {
    group.messages.forEach((message) => {
      if (!message.id) return;
      if (fetchedIds.has(message.id)) return;
      if (message.clientKey && fetchedClientKeys.has(message.clientKey)) return;
      if (shouldPreserveMissingCachedMessage(message, oldestFetchedTimestampMs)) {
        missingCachedMessages.push(message);
      }
    });
  });

  let changed = false;
  const nextHistory = fetchedHistory.map((group) => {
    let groupChanged = false;
    const messages = group.messages.map((message) => {
      const currentMessage =
        (message.id ? currentMessageById.get(message.id) : undefined) ??
        (message.clientKey ? currentMessageByClientKey.get(message.clientKey) : undefined);
      if (!currentMessage) return message;

      const nextClientKey = message.clientKey ?? currentMessage.clientKey;
      const nextMediaMetas =
        message.mediaMetas && message.mediaMetas.length > 0
          ? message.mediaMetas
          : currentMessage.mediaMetas;
      const nextCreatedAt =
        message.type === 'sent' && currentMessage.createdAt
          ? currentMessage.createdAt
          : message.createdAt;
      const nextTime =
        message.type === 'sent' && currentMessage.time
          ? currentMessage.time
          : message.time;
      const idChanged = Boolean(
        currentMessage.id &&
        message.id &&
        currentMessage.id !== message.id
      );

      if (
        !idChanged &&
        nextClientKey === message.clientKey &&
        nextMediaMetas === message.mediaMetas &&
        nextCreatedAt === message.createdAt &&
        nextTime === message.time
      ) {
        return message;
      }

      changed = true;
      groupChanged = true;
      return {
        ...message,
        ...(nextClientKey ? { clientKey: nextClientKey } : {}),
        ...(nextMediaMetas ? { mediaMetas: nextMediaMetas } : {}),
        ...(nextCreatedAt ? { createdAt: nextCreatedAt } : {}),
        ...(nextTime ? { time: nextTime } : {}),
      };
    });
    return groupChanged ? { ...group, messages } : group;
  });

  // Keep transient local messages that should still belong to the latest page even if
  // the server briefly returns stale history after a send succeeds.
  if (missingCachedMessages.length > 0) {
    changed = true;
    const result = missingCachedMessages.reduce<ChatHistory[]>(
      (history, message) => appendMessageToHistory(history, message),
      nextHistory
    );
    return withSortedMessageGroups(result);
  }

  if (hasFetchedMessageNotInCurrent) {
    return withSortedMessageGroups(nextHistory);
  }

  // Return currentHistory (same reference) when unchanged — prevents React Query
  // from treating identical data as "new", which would re-render the entire FlashList
  return changed ? withSortedMessageGroups(nextHistory) : currentHistory;
}

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

  if (payload.imageMeta) {
    const metaMetas =
      Array.isArray(payload.imageMeta.mediaMetas) && payload.imageMeta.mediaMetas.length > 0
        ? payload.imageMeta.mediaMetas
        : undefined;
    return {
      ...baseMessage,
      text: typeof payload.imageMeta.text === 'string' ? payload.imageMeta.text.trim() : '',
      ...(metaMetas ? { mediaMetas: metaMetas } : {}),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    };
  }

  if (payload.imageAlbum?.count) {
    const albumMediaMetas =
      Array.isArray(payload.imageAlbum.mediaMetas) && payload.imageAlbum.mediaMetas.length > 0
        ? payload.imageAlbum.mediaMetas
        : undefined;
    return {
      ...baseMessage,
      text: (payload.text ?? '').trim(),
      imageAlbum: { count: payload.imageAlbum.count },
      ...(albumMediaMetas ? { mediaMetas: albumMediaMetas } : {}),
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
    staleTime: polling ? 10 * 1000 : 30 * 1000,
    refetchInterval: polling ? 20 * 1000 : false,
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
      const existing = queryClient.getQueryData<ChatHistory[]>(['chat', userId, normalizedLanguage]);
      // Count messages in each source to determine which has more data
      const existingCount = (existing ?? []).reduce((sum, g) => sum + g.messages.length, 0);
      const cachedCount = cached.reduce((sum, g) => sum + g.messages.length, 0);
      // Write cached snapshot if React Query has no data OR if the memory cache
      // has more messages (e.g., optimistic message persisted before navigation)
      if (!existing || cachedCount > existingCount) {
        writeChatSnapshot(queryClient, currentUserId, normalizedLanguage, userId, cached);
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
      const cachedHistory = queryClient.getQueryData<ChatHistory[]>(['chat', userId, normalizedLanguage]);
      const reconciledHistory = reconcileFetchedChatHistory(cachedHistory, history);
      // Only persist if data actually changed (same reference = unchanged)
      if (currentUserId && reconciledHistory !== cachedHistory) {
        await persistChatCache(currentUserId, normalizedLanguage, userId, reconciledHistory);
      }
      recordTimedMessageMetric('chat_fetch_duration', startedAt, {
        contactId: userId,
        groups: reconciledHistory.length,
      });
      return reconciledHistory;
    },
    enabled: enabled && userId.length > 0,
    staleTime: polling ? 8 * 1000 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: polling ? 15 * 1000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (prev) => prev,
    initialData:
      currentUserId && userId
        ? peekCachedChatHistory(currentUserId, normalizedLanguage, userId)
        : undefined,
    initialDataUpdatedAt: Date.now(),
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
    placeholderData: (prev) => prev,
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
  const sendMessageClientKeyRef = useRef<string | undefined>(undefined);
  return useMutation({
    mutationFn: ({ payload, images }: SendMessageRequest) =>
      messageService.sendMessage(
        receiverId,
        payload,
        images,
        sendMessageClientKeyRef.current
      ),
    onMutate: async ({ payload, images }): Promise<SendMutationContext> => {
      sendMessageClientKeyRef.current = undefined;
      await queryClient.cancelQueries({ queryKey: ['chat', receiverId] });
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', receiverId],
      });
      const isReaction = typeof payload !== 'string' && Boolean(payload.reaction);
      const optimisticMessage = buildOptimisticMessage(payload, images);
      const optimisticApplied = !isReaction && Boolean(optimisticMessage);

      if (optimisticApplied && optimisticMessage && optimisticMessage.id) {
        sendMessageClientKeyRef.current = optimisticMessage.id;
        useMessageRealtimeStore.getState().addPendingClientKey(receiverId, optimisticMessage.id);
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
        if (currentUserId) {
          rememberRecentSentMessage(currentUserId, receiverId, sentMessage);
        }
        patchContactsQueries(queryClient, currentUserId, (current) => {
          const existing = current?.find((contact) => contact.id === receiverId);
          return upsertContact(
            current,
            buildConversationContact(receiverId, sentMessage, existing, contactSeed)
          );
        });
      }
      // Mark chat query stale so it refetches when next observed.
      // Using refetchType 'none' — the patched cache already has the correct message;
      // refetching inactive queries would overwrite it before AsyncStorage persists.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['chat', receiverId], refetchType: 'none' });
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['chat-can-send', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
    onSettled: (_data, _error, _variables, context) => {
      sendMessageClientKeyRef.current = undefined;
      if (context?.optimisticMessageId) {
        useMessageRealtimeStore.getState().removePendingClientKey(receiverId, context.optimisticMessageId);
      }
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

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (contactId: string) => messageService.deleteConversation(contactId),
    onMutate: async (contactId) => {
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      await queryClient.cancelQueries({ queryKey: ['chat', contactId] });

      const previousContacts = queryClient.getQueriesData<Contact[]>({
        queryKey: ['contacts'],
      });
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', contactId],
      });

      patchContactsQueries(queryClient, currentUserId, (current) =>
        current?.filter((contact) => contact.id !== contactId) ?? current
      );
      patchChatQueries(queryClient, currentUserId, contactId, () => []);

      return { previousContacts, previousChats, contactId };
    },
    onError: (_error, _contactId, context) => {
      context?.previousContacts?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousChats?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (_data, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['chat', contactId], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
