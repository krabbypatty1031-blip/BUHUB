import Constants from 'expo-constants';
import { DEFAULT_AVATAR_IDS } from './defaultAvatars';

const normalizePublicBaseUrl = (value: string): string => value.replace(/\/api\/?$/, '').replace(/\/$/, '');
const WORKER_BASE_URL = 'https://ulink-api.krabbypatty1031.workers.dev';
const KNOWN_UPLOAD_HOSTS = new Set([
  'www.uhub.help',
  'uhub.help',
  'ulink-api.krabbypatty1031.workers.dev',
]);

const getExpoExtraString = (key: 'apiUrl' | 'appUrl'): string | undefined => {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

/**
 * Get the base URL for images (without /api path).
 * Mirrors the fallback chain in client.ts so image URLs always resolve
 * even when process.env vars are unavailable in production EAS builds.
 */
const getImageBaseUrl = (): string => {
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (appUrl) return normalizePublicBaseUrl(appUrl);
  const extraAppUrl = getExpoExtraString('appUrl');
  if (extraAppUrl) return normalizePublicBaseUrl(extraAppUrl);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return normalizePublicBaseUrl(apiUrl);
  const extraApiUrl = getExpoExtraString('apiUrl');
  if (extraApiUrl) return normalizePublicBaseUrl(extraApiUrl);

  const devUrl = process.env.EXPO_PUBLIC_DEV_API_URL;
  if (__DEV__ && devUrl) return normalizePublicBaseUrl(devUrl);

  return WORKER_BASE_URL;
};

const isIpv4Host = (hostname: string): boolean => {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
};

const isLocalHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower === '0.0.0.0' || isIpv4Host(lower);
};

const isKnownUploadHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return KNOWN_UPLOAD_HOSTS.has(lower) || isLocalHost(lower);
};

const rebaseLegacyAbsoluteUploadUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!isKnownUploadHost(parsed.hostname)) return null;
    if (!parsed.pathname.startsWith('/uploads/') && !parsed.pathname.startsWith('/api/uploads/')) return null;
    return `${getImageBaseUrl()}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
};

/**
 * Normalize an image URL to a full URL
 * - If already a full URL (http/https/file/data), return as-is
 * - If relative path (starts with /), prepend base URL
 * - If null/undefined/empty, return null
 */
export const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return rebaseLegacyAbsoluteUploadUrl(url) ?? url;
  }
  if (url.startsWith('file://') || url.startsWith('data:')) {
    return url;
  }

  // Relative path - prepend base URL
  if (url.startsWith('/')) {
    return `${getImageBaseUrl()}${url}`;
  }

  // Assume it's a relative path without leading slash
  return `${getImageBaseUrl()}/${url}`;
};

const PLACEHOLDER_AVATARS = new Set(['avatar1.png', 'avatar2.png', 'avatar3.png']);

/**
 * Normalize avatar URL
 * - Color (#xxx): return as-is
 * - Default avatar ID (Luna, Felix, etc.): return as-is (don't turn into URL)
 * - Placeholder (avatar1.png, single letter "A"): return null (don't fetch)
 * - Otherwise: same as normalizeImageUrl
 */
export const normalizeAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  if (typeof avatar === 'string' && avatar.startsWith('#')) {
    return avatar;
  }
  if (typeof avatar === 'string' && avatar.startsWith('badge:')) {
    return avatar;
  }
  if (DEFAULT_AVATAR_IDS.has(avatar)) {
    return avatar;
  }
  if (PLACEHOLDER_AVATARS.has(avatar) || (avatar.length <= 2 && !avatar.includes('/'))) {
    return null;
  }
  return normalizeImageUrl(avatar);
};
