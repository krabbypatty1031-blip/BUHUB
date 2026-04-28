import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

const FILES = {
  authService: `${ROOT}/api/services/auth.service.ts`,
  notificationService: `${ROOT}/api/services/notification.service.ts`,
  pushHook: `${ROOT}/hooks/usePushRegistration.ts`,
  endpoints: `${ROOT}/api/endpoints.ts`,
} as const;

const cache = new Map<keyof typeof FILES, string>();
const read = (key: keyof typeof FILES): string => {
  const cached = cache.get(key);
  if (cached) return cached;
  const text = readFileSync(FILES[key], 'utf-8');
  cache.set(key, text);
  return text;
};

describe('PUSH-UNREGISTER-01 — notificationService exposes unregisterDevice using DELETE', () => {
  const src = () => read('notificationService');

  it('declares unregisterDevice(token)', () => {
    expect(src()).toMatch(/unregisterDevice\s*\(\s*pushToken\s*:\s*string\s*\)/);
  });

  it('calls apiClient.delete with REGISTER_DEVICE endpoint and { data: { token } } body', () => {
    expect(src()).toMatch(
      /apiClient\.delete\(\s*ENDPOINTS\.NOTIFICATION\.REGISTER_DEVICE\s*,\s*\{\s*data:\s*\{\s*token:\s*pushToken/
    );
  });
});

describe('PUSH-UNREGISTER-02 — register-token endpoint constant is shared', () => {
  it('REGISTER_DEVICE points at /notifications/register-token (same path as POST and DELETE)', () => {
    expect(read('endpoints')).toMatch(
      /REGISTER_DEVICE\s*:\s*['"]\/notifications\/register-token['"]/
    );
  });
});

describe('LOGOUT-PUSH-01 — authService.logout unregisters push before clearing token', () => {
  const src = () => read('authService');

  it('imports AsyncStorage and expo-notifications statically, notification.service lazily', () => {
    expect(src()).toMatch(/import\s+AsyncStorage\s+from\s+['"]@react-native-async-storage\/async-storage['"]/);
    expect(src()).toMatch(/import\s+\*\s+as\s+Notifications\s+from\s+['"]expo-notifications['"]/);
    // Lazy import keeps the module-load graph minimal so unrelated unit tests
    // (e.g. authPipeline) do not need to mock notification.service's transitive deps.
    expect(src()).toMatch(/await\s+import\(\s*['"]\.\/notification\.service['"]\s*\)/);
  });

  it('reads the same PUSH_REGISTRATION_CACHE_KEY that usePushRegistration writes', () => {
    expect(src()).toMatch(/PUSH_REGISTRATION_CACHE_KEY\s*=\s*['"]ulink-expo-push-registration['"]/);
    expect(read('pushHook')).toMatch(/PUSH_REGISTRATION_CACHE_KEY\s*=\s*['"]ulink-expo-push-registration['"]/);
  });

  it('defines unregisterCachedPushToken helper', () => {
    expect(src()).toMatch(/async function unregisterCachedPushToken\s*\(\s*\)\s*:\s*Promise<void>/);
  });

  it('calls notificationService.unregisterDevice with the cached pushToken', () => {
    expect(src()).toMatch(/notificationService\.unregisterDevice\(\s*cached\.pushToken\s*\)/);
  });

  it('calls Notifications.unregisterForNotificationsAsync (closes the offline-logout window)', () => {
    expect(src()).toMatch(/Notifications\.unregisterForNotificationsAsync\(\s*\)/);
  });

  it('removes PUSH_REGISTRATION_CACHE_KEY in the finally branch', () => {
    expect(src()).toMatch(
      /finally\s*\{\s*await\s+AsyncStorage\.removeItem\(\s*PUSH_REGISTRATION_CACHE_KEY/
    );
  });

  it('logout() invokes unregisterCachedPushToken before posting to AUTH.LOGOUT', () => {
    const text = src();
    const unregisterIdx = text.search(/await\s+unregisterCachedPushToken\(\s*\)/);
    const logoutPostIdx = text.search(/apiClient\.post\(\s*ENDPOINTS\.AUTH\.LOGOUT/);
    expect(unregisterIdx).toBeGreaterThan(-1);
    expect(logoutPostIdx).toBeGreaterThan(-1);
    expect(unregisterIdx).toBeLessThan(logoutPostIdx);
  });

  it('logout() still calls clearToken in the finally branch (cannot regress)', () => {
    expect(src()).toMatch(/finally\s*\{\s*await\s+clearToken\(\s*\)/);
  });

  it('swallows unregisterDevice failures so logout is not blocked offline', () => {
    expect(src()).toMatch(
      /await\s+notificationService\.unregisterDevice\([^)]+\);[\s\S]*?\}\s*catch\s*\{/
    );
  });

  it('swallows OS-level deregister failures (Expo Go / never-registered)', () => {
    expect(src()).toMatch(
      /await\s+Notifications\.unregisterForNotificationsAsync\(\s*\);[\s\S]*?\}\s*catch\s*\{/
    );
  });
});
