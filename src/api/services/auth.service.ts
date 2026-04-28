import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import apiClient, { setToken, clearToken } from '../client';
import ENDPOINTS from '../endpoints';
import type { User } from '../../types';

const USE_MOCK = false;
const PUSH_REGISTRATION_CACHE_KEY = 'ulink-expo-push-registration';

async function unregisterCachedPushToken(): Promise<void> {
  try {
    const cachedRaw = await AsyncStorage.getItem(PUSH_REGISTRATION_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { pushToken?: string };
      if (typeof cached?.pushToken === 'string' && cached.pushToken.length > 0) {
        try {
          // Lazy-import to avoid pulling notification.service's transitive chain
          // (authStore → imageUrl → expo-constants) into auth.service module load.
          const { notificationService } = await import('./notification.service');
          await notificationService.unregisterDevice(cached.pushToken);
        } catch {
          // server-side delete may fail offline; OS-level deregister below still runs
        }
      }
    }
    try {
      await Notifications.unregisterForNotificationsAsync();
    } catch {
      // no-op when running in Expo Go or when push was never registered
    }
  } finally {
    await AsyncStorage.removeItem(PUSH_REGISTRATION_CACHE_KEY).catch(() => {});
  }
}

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
    agreedToTerms: boolean
  ) {
    if (USE_MOCK) {
      return { success: true, token: 'mock-token-123' };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.COMPLETE_REGISTRATION, {
      email,
      registrationToken,
      password,
      agreedToTerms,
    });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  async bindHkbuSendCode(email: string) {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.BIND_HKBU_SEND_CODE, { email });
    return data;
  },

  async bindHkbuVerify(email: string, code: string) {
    if (USE_MOCK) {
      return {
        linkedEmails: [],
        isHKBUVerified: true,
        hkbuEmail: email,
      };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.BIND_HKBU_VERIFY, { email, code });
    return data;
  },

  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    if (USE_MOCK) {
      return { valid: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.AUTH.VERIFY_TOKEN, null, {
      timeout: 5000,
    });
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
    autoGenerate?: boolean;
    nickname?: string;
    grade?: string;
    major?: string;
    gender?: string;
    bio?: string;
    avatar?: string;
    language?: 'tc' | 'sc' | 'en';
  }) {
    if (USE_MOCK) {
      return {
        nickname: profile.nickname ?? '浸園旅人28',
        avatar: profile.avatar ?? 'Harbour',
        grade: profile.grade ?? '',
        major: profile.major ?? '',
        bio: profile.bio ?? '',
        gender: profile.gender ?? 'other',
        language: profile.language ?? 'tc',
      };
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
    try {
      if (USE_MOCK) {
        return { success: true };
      }
      await unregisterCachedPushToken();
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      await clearToken();
    }
  },
};

