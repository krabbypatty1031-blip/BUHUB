export type Gender = 'male' | 'female' | 'other' | 'secret';

export type Language = 'tc' | 'sc' | 'en';

export interface Translated {
  sc: string;
  en: string;
}

export interface PollOption {
  text: string;
  percent: number;
}

export interface ScoreDimension {
  key: string;
  label: string;
  left: string;
  right: string;
}

export interface ScoreItem {
  key: string;
  label: string;
  value: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API Error
export interface ApiError {
  code: number;
  message: string;
  details?: string;
}

// Notification settings
export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  system: boolean;
}

export interface UnreadCount {
  likes: number;
  followers: number;
  comments: number;
  messages: number;
  total: number;
}
