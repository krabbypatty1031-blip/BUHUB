import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { LikeNotification, FollowerNotification, CommentNotification, NotificationSettings, UnreadCount } from '../../types';

const USE_MOCK = true;

export const notificationService = {
  async getLikes(): Promise<LikeNotification[]> {
    if (USE_MOCK) {
      const { mockLikeNotifications } = await import('../../data/mock/notifications');
      return mockLikeNotifications;
    }
    const { data } = await apiClient.get(ENDPOINTS.NOTIFICATION.LIKES);
    return data;
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
    const { data } = await apiClient.post(ENDPOINTS.NOTIFICATION.MARK_READ, { type });
    return data;
  },

  async registerDevice(pushToken: string, platform: 'ios' | 'android'): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.NOTIFICATION.REGISTER_DEVICE, { pushToken, platform });
    return data;
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
