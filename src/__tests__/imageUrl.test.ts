import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { normalizeAvatarUrl, normalizeImageUrl } from '../utils/imageUrl';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'https://ulink-api.krabbypatty1031.workers.dev/api',
        appUrl: 'https://ulink-api.krabbypatty1031.workers.dev',
      },
    },
  },
}));

describe('imageUrl helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_APP_URL;
    delete process.env.EXPO_PUBLIC_DEV_API_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses EXPO_PUBLIC_APP_URL for relative upload paths', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://ulink-api.krabbypatty1031.workers.dev';

    expect(normalizeImageUrl('/api/uploads/user/file.jpg')).toBe(
      'https://ulink-api.krabbypatty1031.workers.dev/api/uploads/user/file.jpg'
    );
  });

  it('rebases legacy www.uhub.help upload URLs onto the configured image base', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://ulink-api.krabbypatty1031.workers.dev';

    expect(
      normalizeImageUrl('https://www.uhub.help/api/uploads/user/file.jpg?token=1')
    ).toBe('https://ulink-api.krabbypatty1031.workers.dev/api/uploads/user/file.jpg?token=1');
  });

  it('leaves non-upload absolute URLs untouched', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://ulink-api.krabbypatty1031.workers.dev';

    expect(normalizeImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
  });

  it('normalizes uploaded avatar URLs and keeps placeholder avatars local', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://ulink-api.krabbypatty1031.workers.dev';

    expect(normalizeAvatarUrl('https://www.uhub.help/api/uploads/user/avatar.jpg')).toBe(
      'https://ulink-api.krabbypatty1031.workers.dev/api/uploads/user/avatar.jpg'
    );
    expect(normalizeAvatarUrl('avatar1.png')).toBeNull();
  });
});
