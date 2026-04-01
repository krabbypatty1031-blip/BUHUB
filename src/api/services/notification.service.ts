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
import { normalizeAvatarUrl } from '../../utils/imageUrl';

const USE_MOCK = false;

type LikeAction = LikeNotification['action'];

type RawLikeNotification = {
  user?: string;
  userName?: string;
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

type RawFollowerNotification = {
  user?: string;
  userName?: string;
  name?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'secret';
  bio?: string;
  time?: string;
  isFollowed?: boolean;
};

type CommentAction = CommentNotification['action'];
type CommentType = CommentNotification['type'];

type RawCommentNotification = {
  id?: string;
  user?: string;
  userName?: string;
  isAnonymous?: boolean;
  name?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'secret';
  action?: string;
  type?: string;
  comment?: string;
  originalPost?: string;
  postContent?: string;
  postId?: string;
  commentId?: string;
  time?: string;
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

function normalizeCommentType(rawType: string | undefined): CommentType {
  if (rawType === 'comment' || rawType === 'reply' || rawType === 'mention') return rawType;
  const normalized = (rawType ?? '').toLowerCase();
  if (normalized.includes('reply')) return 'reply';
  if (normalized.includes('mention')) return 'mention';
  return 'comment';
}

function normalizeCommentAction(rawAction: string | undefined, type: CommentType): CommentAction {
  if (rawAction === 'commentedYourPost' || rawAction === 'repliedYourComment' || rawAction === 'mentionedYou') {
    return rawAction;
  }
  const normalized = (rawAction ?? '').toLowerCase();
  if (normalized.includes('reply')) return 'repliedYourComment';
  if (normalized.includes('mention')) return 'mentionedYou';
  if (type === 'reply') return 'repliedYourComment';
  if (type === 'mention') return 'mentionedYou';
  return 'commentedYourPost';
}

export const notificationService = {
  async getLikes(): Promise<LikeNotification[]> {
    if (USE_MOCK) {
      const { mockLikeNotifications } = await import('../../data/mock/notifications');
      return mockLikeNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.LIKES);
    const list = Array.isArray(data) ? (data as RawLikeNotification[]) : [];
    const seen = new Set<string>();
    return list.map((item) => {
      const hasCommentId = !!item.commentId;
      return {
        user: item.user ?? item.name ?? '',
        userName: item.userName ?? item.user ?? item.name ?? '',
        avatar: normalizeAvatarUrl(item.avatar) ?? '',
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
    }).filter((n) => {
      const key = `${n.userName}:${n.action}:${n.postId}:${n.commentId ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  async getFollowers(): Promise<FollowerNotification[]> {
    if (USE_MOCK) {
      const { mockFollowerNotifications } = await import('../../data/mock/notifications');
      return mockFollowerNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.FOLLOWERS);
    const list = Array.isArray(data) ? (data as RawFollowerNotification[]) : [];
    return list.map((item) => ({
      user: item.user ?? item.name ?? item.userName ?? '',
      userName: item.userName ?? item.user ?? item.name ?? '',
      avatar: normalizeAvatarUrl(item.avatar) ?? '',
      gender: item.gender ?? 'other',
      bio: item.bio ?? '',
      time: normalizeNotificationTime(item.time),
      isFollowed: !!item.isFollowed,
    }));
  },

  async getComments(): Promise<CommentNotification[]> {
    if (USE_MOCK) {
      const { mockCommentNotifications } = await import('../../data/mock/notifications');
      return mockCommentNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.COMMENTS);
    const list = Array.isArray(data) ? (data as RawCommentNotification[]) : [];
    const seen = new Set<string>();
    return list.map((item) => {
      const type = normalizeCommentType(item.type);
      return {
        id: item.id ?? `${item.postId ?? ''}:${item.commentId ?? ''}:${item.time ?? ''}`,
        user: item.user ?? item.name ?? item.userName ?? '',
        userName: item.userName ?? item.user ?? item.name ?? '',
        isAnonymous: !!item.isAnonymous,
        avatar: normalizeAvatarUrl(item.avatar) ?? '',
        gender: item.gender ?? 'other',
        action: normalizeCommentAction(item.action, type),
        comment: item.comment ?? '',
        originalPost: item.originalPost ?? item.postContent ?? '',
        time: normalizeNotificationTime(item.time),
        type,
        postId: item.postId ?? '',
        commentId: item.commentId ?? '',
      };
    }).filter((n) => {
      const key = `${n.userName}:${n.type}:${n.postId}:${n.commentId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
    await apiClient.put(ENDPOINTS.NOTIFICATION.MARK_READ, { type });
    return { success: true };
  },

  async registerDevice(pushToken: string, platform: 'ios' | 'android'): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    await apiClient.post(ENDPOINTS.NOTIFICATION.REGISTER_DEVICE, {
      token: pushToken,
      platform,
      provider: 'expo',
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

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    if (USE_MOCK) {
      return { likes: true, comments: true, followers: true, messages: true, system: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.NOTIFICATION.SETTINGS, settings);
    return data;
  },
};
