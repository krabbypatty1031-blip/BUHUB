import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type {
  LikeNotification,
  FollowerNotification,
  CommentNotification,
  NotificationSettings,
  UnreadCount,
  Language,
} from '../../types';
import { getRelativeTime } from '../../utils/formatTime';
import { useAuthStore } from '../../store/authStore';

const USE_MOCK = false;

type LikeAction = LikeNotification['action'];

type RawLikeNotification = {
  user?: string;
  name?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'secret';
  grade?: string | null;
  major?: string | null;
  action?: string;
  content?: string;
  postContent?: string;
  time?: string;
  hasImage?: boolean;
  postId?: string;
  commentId?: string;
};

function getCurrentLanguage(): Language {
  const lang = useAuthStore.getState().language;
  return lang === 'tc' || lang === 'sc' || lang === 'en' ? lang : 'tc';
}

function normalizeNotificationTime(time?: string): string {
  if (!time) return '';
  const parsed = Date.parse(time);
  if (Number.isNaN(parsed)) return time;
  return getRelativeTime(new Date(parsed).toISOString(), getCurrentLanguage());
}

function normalizeLikeAction(rawAction: string | undefined, hasCommentId: boolean): LikeAction {
  if (rawAction === 'likedYourPost' || rawAction === 'likedYourComment' || rawAction === 'likedYourReply') {
    return rawAction;
  }
  const normalized = (rawAction ?? '').toLowerCase();
  if (normalized.includes('reply')) return 'likedYourReply';
  if (normalized.includes('comment')) return 'likedYourComment';
  if (hasCommentId) return 'likedYourComment';
  return 'likedYourPost';
}

export const notificationService = {
  async getLikes(): Promise<LikeNotification[]> {
    if (USE_MOCK) {
      const { mockLikeNotifications } = await import('../../data/mock/notifications');
      return mockLikeNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.LIKES);
    const list = Array.isArray(data) ? (data as RawLikeNotification[]) : [];
    return list.map((item) => {
      const hasCommentId = !!item.commentId;
      return {
        user: item.user ?? item.name ?? '',
        avatar: item.avatar ?? '',
        gender: item.gender ?? 'other',
        grade: item.grade ?? undefined,
        major: item.major ?? undefined,
        action: normalizeLikeAction(item.action, hasCommentId),
        content: item.content ?? item.postContent ?? '',
        time: normalizeNotificationTime(item.time),
        hasImage: item.hasImage,
        postId: item.postId ?? '',
        commentId: item.commentId,
      };
    });
  },

  async getFollowers(): Promise<FollowerNotification[]> {
    if (USE_MOCK) {
      const { mockFollowerNotifications } = await import('../../data/mock/notifications');
      return mockFollowerNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.FOLLOWERS);
    return data;
  },

  async getComments(): Promise<CommentNotification[]> {
    if (USE_MOCK) {
      const { mockCommentNotifications } = await import('../../data/mock/notifications');
      return mockCommentNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.COMMENTS);
    return data;
  },

  async getUnreadCount(): Promise<UnreadCount> {
    if (USE_MOCK) {
      return { likes: 3, followers: 1, comments: 2, messages: 5, total: 11 };
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.UNREAD_COUNT);
    return data;
  },

  async markAsRead(type: 'likes' | 'followers' | 'comments' | 'all'): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    // Backend read-all marks all as read (PUT, no body)
    await apiClient.put(ENDPOINTS.NOTIFICATION.MARK_READ);
    return { success: true };
  },

  async registerDevice(pushToken: string, platform: 'ios' | 'android'): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    await apiClient.post(ENDPOINTS.NOTIFICATION.REGISTER_DEVICE, {
      token: pushToken,
      platform,
      provider: 'fcm',
    });
    return { success: true };
  },

  async getSettings(): Promise<NotificationSettings> {
    if (USE_MOCK) {
      return { likes: true, comments: true, followers: true, messages: true, system: true };
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.SETTINGS);
    return data;
  },

  async updateSettings(settings: Partial<NotificationSettings>): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.NOTIFICATION.SETTINGS, settings);
    return data;
  },
};
