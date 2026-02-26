import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';
import type { SendMessagePayload } from '../api/services/message.service';
import { useAuthStore } from '../store/authStore';

export function useContacts() {
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['contacts', language],
    queryFn: () => messageService.getContacts(),
  });
}

export function useChatHistory(userId: string) {
  const language = useAuthStore((s) => s.language);
  return useQuery({
    queryKey: ['chat', userId, language],
    queryFn: () => messageService.getChatHistory(userId),
    enabled: userId.length > 0,
  });
}

export function useSendMessage(receiverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) => messageService.sendMessage(receiverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
