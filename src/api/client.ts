import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiError } from '../types';

const TOKEN_KEY = 'buhub-token';

// Callback for handling unauthorized (401) responses
// Set by authStore to avoid circular dependency
let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorized = callback;
};

const apiClient = axios.create({
  baseURL: 'https://api.buhub.com/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client for file uploads (multipart/form-data)
// Do NOT set Content-Type header — axios auto-generates the boundary for FormData
const uploadClient = axios.create({
  baseURL: 'https://api.buhub.com/api',
  timeout: 60000,
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Format error response into ApiError
const formatError = (error: any): ApiError => {
  if (error.response) {
    return {
      code: error.response.status,
      message: error.response.data?.message || error.message,
      details: error.response.data?.details,
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

  if (status === 401) {
    // Token expired - clear token and notify authStore
    await AsyncStorage.removeItem(TOKEN_KEY);
    onUnauthorized?.();
  }

  return Promise.reject(formatError(error));
};

apiClient.interceptors.response.use(
  (response) => response,
  responseErrorHandler
);

uploadClient.interceptors.response.use(
  (response) => response,
  responseErrorHandler
);

export const setToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export { uploadClient };
export default apiClient;
