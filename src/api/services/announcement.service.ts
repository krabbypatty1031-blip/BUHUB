import apiClient from '../client';
import ENDPOINTS from '../endpoints';

export type GlobalAnnouncement = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  publishedAt: string | null;
};

export const announcementService = {
  async fetchLatest(): Promise<GlobalAnnouncement | null> {
    const { data } = await apiClient.get(ENDPOINTS.ANNOUNCEMENT.LATEST);
    return data ?? null;
  },
};
