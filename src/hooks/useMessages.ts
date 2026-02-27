import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import { useAuthStore } from '../store/authStore';

type SendMessageRequest = {
  payload: SendMessagePayload;
  images?: string[];
};

export function useContacts() {
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['contacts', language],
    queryFn: () => messageService.getContacts(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useChatHistory(userId: string) {
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['chat', userId, language],
    queryFn: () => messageService.getChatHistory(userId),
    enabled: userId.length > 0,
    staleTime: 0,
    refetchInterval: 3 * 1000,
  });
}

export function useCanSendMessage(userId: string) {
  return useQuery({
    queryKey: ['chat-can-send', userId],
    queryFn: () => messageService.canSendMessage(userId),
    enabled: userId.length > 0,
    staleTime: 0,
    refetchInterval: 5 * 1000,
  });
}

export function usePresence(userId: string) {
  return useQuery({
    queryKey: ['presence', userId],
    queryFn: () => messageService.getPresence(userId),
    enabled: userId.length > 0,
    staleTime: 5 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useSendMessage(receiverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, images }: SendMessageRequest) =>
      messageService.sendMessage(receiverId, payload, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}

export function useRecallMessage(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messageService.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
