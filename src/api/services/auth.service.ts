import apiClient, { setToken, clearToken } from '../client';
import ENDPOINTS from '../endpoints';
import type { User } from '../../types';

const USE_MOCK = false;

export const authService = {
  async sendCode(email: string, captchaToken: string) {
    if (USE_MOCK) {
      return { success: true };
    }
    // send-code may take longer (email delivery); use 25s timeout
    const { data } = await apiClient.post(
      ENDPOINTS.AUTH.SEND_CODE,
      { email, captchaToken },
      { timeout: 25000 }
    );
    return data;
  },

  async verifyInviteCode(code: string): Promise<{ valid: boolean; code?: string }> {
    if (USE_MOCK) {
      return { valid: true, code: code.trim().toUpperCase() };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.VERIFY_INVITE_CODE, { code });
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

  async completeRegistration(
    email: string,
    registrationToken: string,
    password: string,
    inviteCode: string,
    agreedToTerms: boolean
  ) {
    if (USE_MOCK) {
      return { success: true, token: 'mock-token-123' };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.COMPLETE_REGISTRATION, {
      email,
      registrationToken,
      password,
      inviteCode,
      agreedToTerms,
    });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    if (USE_MOCK) {
      return { valid: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.VERIFY_TOKEN);
    return data;
  },

  async login(email: string, password: string) {
    if (USE_MOCK) {
      return { success: true, token: 'mock-token-123' };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  async setPassword(password: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.SET_PASSWORD, { password });
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, { oldPassword, newPassword });
    return data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
    return data;
  },

  async setupProfile(profile: {
    nickname: string;
    grade: string;
    major: string;
    gender: string;
    bio?: string;
    avatar?: string;
    language?: 'tc' | 'sc' | 'en';
  }) {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.PROFILE_SETUP, profile);
    return data;
  },

  async deleteAccount(): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      await clearToken();
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.AUTH.DELETE_ACCOUNT);
    await clearToken();
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
