import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Feedback, FeedbackDetail } from '../../types/feedback';

export const feedbackService = {
  async getList(page = 1, limit = 20): Promise<Feedback[]> {
    const { data } = await apiClient.get(ENDPOINTS.FEEDBACK.LIST, {
      params: { page, limit },
    });
    return Array.isArray(data) ? data : [];
  },

  async getDetail(id: string): Promise<FeedbackDetail> {
    const { data } = await apiClient.get(ENDPOINTS.FEEDBACK.DETAIL(id));
    return data;
  },

  async submit(payload: {
    category: string;
    description: string;
    imageUrls: string[];
  }): Promise<{ id: string }> {
    const { data } = await apiClient.post(ENDPOINTS.FEEDBACK.SUBMIT, payload);
    return data;
  },

  async submitReply(id: string, content: string): Promise<any> {
    const { data } = await apiClient.post(ENDPOINTS.FEEDBACK.REPLY(id), { content });
    return data;
  },
};
