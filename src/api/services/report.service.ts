import apiClient from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = false;

export type ReportTargetType = 'post' | 'comment';

export interface ReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}

export const reportService = {
  async submit(report: ReportPayload): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.REPORT.SUBMIT, report);
    return data;
  },
};
