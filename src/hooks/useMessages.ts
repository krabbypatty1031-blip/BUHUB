import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => messageService.getContacts(),
  });
}

export function useChatHistory(userId: string) {
  return useQuery({
    queryKey: ['chat', userId],
    queryFn: () => messageService.getChatHistory(userId),
    enabled: userId.length > 0,
  });
}

export function useSendMessage(receiverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => messageService.sendMessage(receiverId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', receiverId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
