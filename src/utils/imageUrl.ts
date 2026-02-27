import { Platform } from 'react-native';

/**
 * Get the base URL for images (without /api path)
 * Images are typically served from the root path, not /api
 */
const getImageBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    // Remove '/api' suffix if present
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api$/, '');
  }
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';
  }
  return 'https://api.buhub.com';
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

const rebaseLegacyAbsoluteUploadUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!isLocalHost(parsed.hostname)) return null;
    if (!parsed.pathname.startsWith('/uploads/')) return null;
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

/**
 * Normalize avatar URL
 * Same as normalizeImageUrl but with avatar-specific handling if needed
 */
export const normalizeAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (typeof avatar === 'string' && avatar.startsWith('#')) {
    return avatar;
  }
  return normalizeImageUrl(avatar);
};
