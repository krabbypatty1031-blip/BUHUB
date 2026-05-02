import { useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../api/services/notification.service';
import type {
  NotificationSettings,
  LikeNotification,
  FollowerNotification,
  CommentNotification,
} from '../types';

const PAGE_LIMIT = 20;
const MAX_PAGES = 10; // safety cap: 10 pages × 20 = 200 items per category

type Page<T> = { items: T[]; page: number; hasMore: boolean };

export function useLikeNotifications() {
  const query = useInfiniteQuery<Page<LikeNotification>, Error, LikeNotification[], string[], number>({
    queryKey: ['notifications', 'likes'],
    queryFn: async ({ pageParam }) => {
      const items = await notificationService.getLikes({ page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.page < MAX_PAGES ? lastPage.page + 1 : undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return query;
}

export function useFollowerNotifications() {
  const query = useInfiniteQuery<Page<FollowerNotification>, Error, FollowerNotification[], string[], number>({
    queryKey: ['notifications', 'followers'],
    queryFn: async ({ pageParam }) => {
      const items = await notificationService.getFollowers({ page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.page < MAX_PAGES ? lastPage.page + 1 : undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return query;
}

export function useCommentNotifications() {
  const query = useInfiniteQuery<Page<CommentNotification>, Error, CommentNotification[], string[], number>({
    queryKey: ['notifications', 'comments'],
    queryFn: async ({ pageParam }) => {
      const items = await notificationService.getComments({ page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.page < MAX_PAGES ? lastPage.page + 1 : undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return query;
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
