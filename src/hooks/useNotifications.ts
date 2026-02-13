import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../api/services/notification.service';
import type { NotificationSettings } from '../types';

export function useLikeNotifications() {
  return useQuery({
    queryKey: ['notifications', 'likes'],
    queryFn: () => notificationService.getLikes(),
  });
}

export function useFollowerNotifications() {
  return useQuery({
    queryKey: ['notifications', 'followers'],
    queryFn: () => notificationService.getFollowers(),
  });
}

export function useCommentNotifications() {
  return useQuery({
    queryKey: ['notifications', 'comments'],
    queryFn: () => notificationService.getComments(),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: 'likes' | 'followers' | 'comments' | 'all') =>
      notificationService.markAsRead(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: ({ pushToken, platform }: { pushToken: string; platform: 'ios' | 'android' }) =>
      notificationService.registerDevice(pushToken, platform),
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => notificationService.getSettings(),
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<NotificationSettings>) =>
      notificationService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
  });
}
