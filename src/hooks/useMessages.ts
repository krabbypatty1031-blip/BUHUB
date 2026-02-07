import { useQuery, useMutation } from '@tanstack/react-query';
import { messageService } from '../api/services/message.service';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => messageService.getContacts(),
  });
}

export function useChatHistory(contactName: string) {
  return useQuery({
    queryKey: ['chat', contactName],
    queryFn: () => messageService.getChatHistory(contactName),
    enabled: contactName.length > 0,
  });
}

export function useSendMessage(contactName: string) {
  return useMutation({
    mutationFn: (text: string) => messageService.sendMessage(contactName, text),
  });
}
