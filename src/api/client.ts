import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import type { ApiError } from '../types';

const TOKEN_KEY = 'buhub-token';

// API base URL: use EXPO_PUBLIC_API_URL, or localhost in dev (10.0.2.2 for Android emulator)
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    return url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  }
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000/api'
      : 'http://localhost:3000/api';
  }
  return 'https://api.buhub.com/api';
};

const API_BASE = getApiBaseUrl();

if (__DEV__) {
  console.log('[API] Base URL:', API_BASE, '| Platform:', Platform.OS);
}

// Callback for handling unauthorized (401) responses
// Set by authStore to avoid circular dependency
let onUnauthorized: (() => void) | null = null;

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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
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
    const token = await AsyncStorage.getItem(TOKEN_KEY);
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
const formatError = (error: any): ApiError => {
  if (error.response) {
    const data = error.response.data;
    const message =
      data?.error?.message || data?.message || error.message || 'Unknown error';
    return {
      code: error.response.status,
      message,
      details: data?.error?.details ?? data?.details,
    };
  }
  if (error.request) {
    return { code: 0, message: 'Network error: no response received' };
  }
  return { code: -1, message: error.message || 'Unknown error' };
};

// Response interceptor: handle common errors
const responseErrorHandler = async (error: any) => {
  const status = error.response?.status;
  if (__DEV__) {
    const url = error.config?.baseURL + error.config?.url;
    console.log('[API] Error:', status ?? 'no response', url, error.response?.data ?? error.message);
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
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export { API_BASE };
export { uploadClient };
export default apiClient;
