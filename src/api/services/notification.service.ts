import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { LikeNotification, FollowerNotification, CommentNotification } from '../../types';

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
};
