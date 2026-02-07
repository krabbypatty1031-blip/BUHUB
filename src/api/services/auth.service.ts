import apiClient, { setToken, clearToken } from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = true;

export const authService = {
  async sendCode(email: string) {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.SEND_CODE, { email });
    return data;
  },

  async verify(email: string, code: string) {
    if (USE_MOCK) {
      return { success: true, token: 'mock-token-123' };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.VERIFY, { email, code });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  async setupProfile(profile: { nickname: string; grade: string; major: string; gender: string; bio?: string }) {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.PROFILE_SETUP, profile);
    return data;
  },

  async logout() {
    if (USE_MOCK) {
      await clearToken();
      return { success: true };
    }
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    await clearToken();
  },
};
