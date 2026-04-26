import { readFileSync } from 'fs';
import { resolve } from 'path';

// Static-analysis tests for the Settings notification toggles + the underlying
// service / hook wiring. Verifies that:
//   - The "task reminder" button writes through to the system preference.
//   - The "DM notification" button writes through to messages/likes/...
//   - The push-registration hook actually registers tokens.
//   - i18n keys exist in all three locales.

const ROOT = resolve(__dirname, '..');

const FILES = {
  settingsScreen: `${ROOT}/screens/me/SettingsScreen.tsx`,
  useNotificationsHook: `${ROOT}/hooks/useNotifications.ts`,
  usePushRegistrationHook: `${ROOT}/hooks/usePushRegistration.ts`,
  notificationService: `${ROOT}/api/services/notification.service.ts`,
  enLocale: `${ROOT}/i18n/locales/en.json`,
  scLocale: `${ROOT}/i18n/locales/sc.json`,
  tcLocale: `${ROOT}/i18n/locales/tc.json`,
} as const;

const cache = new Map<keyof typeof FILES, string>();
const read = (key: keyof typeof FILES): string => {
  const cached = cache.get(key);
  if (cached) return cached;
  const text = readFileSync(FILES[key], 'utf-8');
  cache.set(key, text);
  return text;
};

// ---------------------------------------------------------------------------
// PART 1 — Task reminder toggle on Settings screen
// ---------------------------------------------------------------------------

describe('SETTINGS-TASK-REMINDER — button is wired to NotificationPreference.system', () => {
  const src = () => read('settingsScreen');

  it('renders a row labeled t("taskReminder")', () => {
    expect(src()).toMatch(/t\(['"]taskReminder['"]\)/);
  });

  it('declares a taskReminder useState toggle', () => {
    expect(src()).toMatch(/setTaskReminder/);
  });

  it('hydrates taskReminder from notificationSettings.system', () => {
    expect(src()).toMatch(/notificationSettings\.system/);
  });

  it('persists changes via updateNotificationSettings.mutate({ system: value })', () => {
    expect(src()).toMatch(
      /updateNotificationSettings\.mutate\(\s*\{\s*system:\s*value/
    );
  });

  it('reverts UI on save failure', () => {
    expect(src()).toMatch(/setTaskReminder\(previousValue\)/);
    expect(src()).toMatch(/saveFailed/);
  });
});

// ---------------------------------------------------------------------------
// PART 2 — DM notification toggle on Settings screen
// ---------------------------------------------------------------------------

describe('SETTINGS-DM-NOTIFICATION — button is wired to messages/likes/comments/followers', () => {
  const src = () => read('settingsScreen');

  it('declares a dmNotification useState toggle', () => {
    expect(src()).toMatch(/setDmNotification/);
  });

  it('hydrates dmNotification from notificationSettings (likes/comments/followers/messages)', () => {
    expect(src()).toMatch(/notificationSettings\.likes/);
    expect(src()).toMatch(/notificationSettings\.comments/);
    expect(src()).toMatch(/notificationSettings\.followers/);
    expect(src()).toMatch(/notificationSettings\.messages/);
  });

  it('persists ALL four message-related fields via the bulk PUT', () => {
    expect(src()).toMatch(/likes:\s*value/);
    expect(src()).toMatch(/comments:\s*value/);
    expect(src()).toMatch(/followers:\s*value/);
    expect(src()).toMatch(/messages:\s*value/);
  });

  it('reverts UI on save failure', () => {
    expect(src()).toMatch(/setDmNotification\(previousValue\)/);
  });
});

// ---------------------------------------------------------------------------
// PART 3 — Underlying hook + service contract
// ---------------------------------------------------------------------------

describe('HOOK-CONTRACT — useNotificationSettings / useUpdateNotificationSettings', () => {
  const src = () => read('useNotificationsHook');

  it('exposes useNotificationSettings as a React Query useQuery', () => {
    expect(src()).toMatch(/export function useNotificationSettings/);
    expect(src()).toMatch(/queryKey:\s*\[['"]notificationSettings['"]\]/);
    expect(src()).toMatch(/notificationService\.getSettings/);
  });

  it('exposes useUpdateNotificationSettings as a React Query useMutation', () => {
    expect(src()).toMatch(/export function useUpdateNotificationSettings/);
    expect(src()).toMatch(/notificationService\.updateSettings/);
  });

  it('invalidates the notificationSettings cache after a successful update', () => {
    expect(src()).toMatch(
      /invalidateQueries\(\s*\{\s*queryKey:\s*\[['"]notificationSettings['"]\]/
    );
  });
});

describe('SERVICE-CONTRACT — notificationService GET / PUT to /notifications/settings', () => {
  const src = () => read('notificationService');

  it('getSettings GETs ENDPOINTS.NOTIFICATION.SETTINGS', () => {
    expect(src()).toMatch(/getSettings/);
    expect(src()).toMatch(/apiClient\.get\(\s*ENDPOINTS\.NOTIFICATION\.SETTINGS/);
  });

  it('updateSettings PUTs ENDPOINTS.NOTIFICATION.SETTINGS', () => {
    expect(src()).toMatch(/updateSettings/);
    expect(src()).toMatch(/apiClient\.put\(\s*ENDPOINTS\.NOTIFICATION\.SETTINGS/);
  });

  it('mock mode returns all-true defaults so dev does not need a server', () => {
    expect(src()).toMatch(
      /likes:\s*true,\s*comments:\s*true,\s*followers:\s*true,\s*messages:\s*true,\s*system:\s*true/
    );
  });
});

// ---------------------------------------------------------------------------
// PART 4 — Push token registration must run for pushes to ever arrive
// ---------------------------------------------------------------------------

describe('PUSH-REGISTRATION — the device-token hook is implemented', () => {
  const src = () => read('usePushRegistrationHook');

  it('exists and exports a hook', () => {
    expect(src()).toMatch(/export\s+function\s+usePushRegistration/);
  });

  it('uses expo-notifications to obtain a token', () => {
    expect(src()).toMatch(/expo-notifications/);
  });

  it('uploads the token to the backend via notificationService', () => {
    expect(src()).toMatch(/registerToken|register-token|pushToken/i);
  });
});

// ---------------------------------------------------------------------------
// PART 5 — i18n keys required by the toggles must exist in all three locales
// ---------------------------------------------------------------------------

describe('I18N — toggle labels present in every locale', () => {
  const KEYS = [
    'taskReminder',
    'taskReminderDesc',
    'dmNotification',
    'notificationSettings',
    'saveFailed',
  ];

  it.each(KEYS)('en.json has key %s', (key) => {
    const obj = JSON.parse(read('enLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('sc.json has key %s', (key) => {
    const obj = JSON.parse(read('scLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('tc.json has key %s', (key) => {
    const obj = JSON.parse(read('tcLocale'));
    expect(obj[key]).toBeTruthy();
  });
});
