import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../api/services/notification.service';

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
