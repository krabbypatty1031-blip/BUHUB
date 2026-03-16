import axios from 'axios';
import type { AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import type { ApiError } from '../types';

const TOKEN_KEY = 'buhub-token';

// In-memory token cache to avoid AsyncStorage reads on every request
let cachedToken: string | null = null;
let tokenCacheReady = false;

async function ensureTokenCache(): Promise<string | null> {
  if (!tokenCacheReady) {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    tokenCacheReady = true;
  }
  return cachedToken;
}

const getApiBaseUrl = () => {
  // 1) Prefer public env (dev / CI)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
  }

  // 2) Fallback to app.json extra.apiUrl (release-safe)
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (extraApiUrl) {
    return extraApiUrl.endsWith('/api')
      ? extraApiUrl
      : `${extraApiUrl.replace(/\/$/, '')}/api`;
  }

  // 3) Legacy APP_URL / DEV_API_URL fallback
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/api`;
  }
  const devUrl = process.env.EXPO_PUBLIC_DEV_API_URL;
  if (__DEV__ && devUrl) {
    return devUrl.endsWith('/api') ? devUrl : `${devUrl.replace(/\/$/, '')}/api`;
  }

  // 4) Last-resort hardcoded production URL
  return 'https://www.uhub.help/api';
};

const API_BASE = getApiBaseUrl();

console.log('[API] Base URL:', API_BASE, '| Platform:', Platform.OS, '| DEV:', __DEV__);

// Callback for handling unauthorized (401) responses
// Set by authStore to avoid circular dependency
let onUnauthorized: (() => void) | null = null;

type ErrorResponseData = {
  message?: string;
  details?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

function isAxiosError(error: unknown): error is AxiosError<ErrorResponseData> {
  return axios.isAxiosError(error);
}

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorized = callback;
};

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client for file uploads (multipart/form-data)
const uploadClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Request interceptor: attach Bearer token + language header + debug log
apiClient.interceptors.request.use(
  async (config) => {
    const token = await ensureTokenCache();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add language header for localized error messages
    const language = useAuthStore.getState().language || 'tc';
    config.headers['Accept-Language'] = language;
    if (__DEV__) {
      const url = (config.baseURL || '') + (config.url || '');
      console.log('[API] Request:', config.method?.toUpperCase(), url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Same interceptor for upload client
uploadClient.interceptors.request.use(
  async (config) => {
    const token = await ensureTokenCache();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add language header for localized error messages
    const language = useAuthStore.getState().language || 'tc';
    config.headers['Accept-Language'] = language;
    return config;
  },
  (error) => Promise.reject(error)
);

// Format error response into ApiError (backend uses { success: false, error: { code, message } })
const formatError = (error: unknown): ApiError => {
  if (isAxiosError(error) && error.response) {
    const data = error.response.data;
    const details = data?.error?.details ?? data?.details;
    const message =
      data?.error?.message || data?.message || error.message || 'Unknown error';
    return {
      code: error.response.status,
      message,
      errorCode: data?.error?.code,
      details: typeof details === 'string' ? details : undefined,
    };
  }
  if (isAxiosError(error) && error.request) {
    return { code: 0, message: 'Network error: no response received' };
  }
  if (error instanceof Error) {
    return { code: -1, message: error.message || 'Unknown error' };
  }
  return { code: -1, message: 'Unknown error' };
};

// Response interceptor: handle common errors
const responseErrorHandler = async (error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (__DEV__) {
    const url = isAxiosError(error) ? `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}` : undefined;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log('[API] Error:', status ?? 'no response', url, isAxiosError(error) ? error.response?.data ?? message : message);
  }

  if (status === 401) {
    // Token expired - clear token and notify authStore
    await AsyncStorage.removeItem(TOKEN_KEY);
    onUnauthorized?.();
  }

  return Promise.reject(formatError(error));
};

// Unwrap backend { success, data } so services receive the inner data directly
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body?.success === true && 'data' in body && body.data !== undefined) {
      response.data = body.data;
    }
    return response;
  },
  responseErrorHandler
);

uploadClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body?.success === true && 'data' in body && body.data !== undefined) {
      response.data = body.data;
    }
    return response;
  },
  responseErrorHandler
);

export const setToken = async (token: string) => {
  cachedToken = token;
  tokenCacheReady = true;
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = async () => {
  cachedToken = null;
  tokenCacheReady = true;
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export { API_BASE };
export { uploadClient };
export default apiClient;
