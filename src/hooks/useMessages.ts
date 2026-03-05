import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import i18n, { normalizeLanguage } from '../i18n';
import type { ChatHistory, ChatMessage } from '../types';
import { useAuthStore } from '../store/authStore';
import { normalizeImageUrl as normalizeMediaUrl } from '../utils/imageUrl';

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
  optimisticApplied: boolean;
  isReaction: boolean;
};

type RecallMutationContext = {
  previousChats: Array<[readonly unknown[], ChatHistory[] | undefined]>;
};

function getCurrentMessageLanguage() {
  const storeLang = normalizeLanguage(useAuthStore.getState().language);
  if (storeLang) return storeLang;
  return normalizeLanguage(i18n.language) ?? 'tc';
}

function formatMessageTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function getTodayLabel() {
  const lang = getCurrentMessageLanguage();
  return String(i18n.t('messageTimeToday', { lng: lang }));
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

function appendOptimisticMessage(
  history: ChatHistory[] | undefined,
  message: ChatMessage
): ChatHistory[] {
  const next = Array.isArray(history)
    ? history.map((group) => ({ ...group, messages: [...group.messages] }))
    : [];

  const todayLabel = getTodayLabel();
  if (next.length === 0 || next[next.length - 1].date !== todayLabel) {
    next.push({ date: todayLabel, messages: [message] });
    return next;
  }

  next[next.length - 1].messages.push(message);
  return next;
}

function markMessageAsRecalled(
  history: ChatHistory[] | undefined,
  messageId: string
): ChatHistory[] | undefined {
  if (!Array.isArray(history) || history.length === 0) return history;
  const recalledText = String(i18n.t('messageYouRecalled', { lng: getCurrentMessageLanguage() }));
  let changed = false;

  const next = history.map((group) => {
    let groupChanged = false;
    const messages = group.messages.map((message) => {
      if (message.id !== messageId) return message;
      groupChanged = true;
      changed = true;
      return {
        ...message,
        text: recalledText,
        images: [],
        audio: undefined,
        functionCard: undefined,
        imageAlbum: undefined,
        replyTo: undefined,
        reactions: [],
        isRecalled: true,
      };
    });
    return groupChanged ? { ...group, messages } : group;
  });

  return changed ? next : history;
}

export function useContacts(options: ContactsQueryOptions = {}) {
  const { polling = false } = options;
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['contacts', language],
    queryFn: () => messageService.getContacts(),
    staleTime: polling ? 10 * 1000 : 60 * 1000,
    refetchInterval: polling ? 30 * 1000 : false,
    refetchOnWindowFocus: polling,
    refetchOnReconnect: true,
  });
}

export function useChatHistory(userId: string, options: ChatHistoryQueryOptions = {}) {
  const { enabled = true, polling = true } = options;
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['chat', userId, language],
    queryFn: () => messageService.getChatHistory(userId),
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
        queryClient.setQueriesData<ChatHistory[]>(
          { queryKey: ['chat', receiverId] },
          (old) => appendOptimisticMessage(old, optimisticMessage)
        );
      }

      return { previousChats, optimisticApplied, isReaction };
    },
    onError: (_error, _variables, context) => {
      context?.previousChats.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (_data, _variables, context) => {
      if (context?.isReaction) {
        queryClient.invalidateQueries({ queryKey: ['chat', receiverId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['chat', receiverId], refetchType: 'inactive' });
      }
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}

export function useRecallMessage(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messageService.deleteMessage(messageId),
    onMutate: async (messageId): Promise<RecallMutationContext> => {
      const previousChats = queryClient.getQueriesData<ChatHistory[]>({
        queryKey: ['chat', contactId],
      });
      queryClient.setQueriesData<ChatHistory[]>(
        { queryKey: ['chat', contactId] },
        (old) => markMessageAsRecalled(old, messageId)
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
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
