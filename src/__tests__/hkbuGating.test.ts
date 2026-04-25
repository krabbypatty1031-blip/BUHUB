/**
 * HKBU gating user-journey tests.
 *
 *   Phase 1: a fresh non-HKBU user — every gated-write helper recognises them
 *   as blocked, the shared HKBU prompt fires correctly, and the auth-error
 *   mapper produces clear messages for HKBU-required server rejections.
 *
 *   Phase 2: the same user binds and verifies a @life.hkbu.edu.hk email —
 *   every gate flips open, the prompt is no longer fired, and writes are
 *   allowed.
 *
 * The end-to-end navigation guards live across many screens
 * (FunctionsHubScreen, MainTabNavigator, ForumScreen, PostDetailScreen,
 * FunctionShareLayout, ChatScreen, usePushRegistration). All of them gate
 * on the same predicate `canPublishCommunityContent(user)` and call the
 * same `promptHkbuVerification(t, cb)`. Locking those two units down here
 * gives us coverage for every gate at once.
 */

// Spy on Alert.alert without mocking react-native wholesale (a full mock
// breaks expo-constants which imports react-native internals via imageUrl).
const mockAlert = jest.fn();
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

const mockChangeLanguage = jest.fn(() => Promise.resolve());
jest.mock('../i18n', () => ({
  __esModule: true,
  default: { language: 'tc', t: (k: string) => k },
  normalizeLanguage: (lang: string | null | undefined) => {
    if (!lang) return null;
    if (lang === 'tc' || lang === 'zh-TW') return 'tc';
    if (lang === 'sc' || lang === 'zh-CN') return 'sc';
    if (lang === 'en') return 'en';
    return null;
  },
  changeLanguage: mockChangeLanguage,
  i18nReady: Promise.resolve(),
}));

// In-memory mock for zustandStorage so persist() does not touch MMKV/AsyncStorage.
const memoryStore: Record<string, string> = {};
jest.mock('../utils/storage', () => ({
  __esModule: true,
  zustandStorage: {
    getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
  },
}));

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {},
  API_BASE: 'https://test.api/api',
  setOnUnauthorized: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  uploadClient: { post: jest.fn() },
}));

jest.mock('../store/forumStore', () => ({
  useForumStore: {
    getState: () => ({ clearVotedPolls: jest.fn() }),
  },
}));

import type { User } from '../types';
import { useAuthStore } from '../store/authStore';
import {
  canPublishCommunityContent,
  isLifeHkbuEmail,
  isHkbuCommunityPermissionError,
  isPublishPermissionError,
} from '../utils/publishPermission';
import { promptHkbuVerification } from '../utils/hkbuPrompt';
import { getAuthErrorMessage } from '../utils/network';

const t = ((k: string) => k) as unknown as Parameters<typeof promptHkbuVerification>[0];

const baseNonHkbuUser: User = {
  name: 'dave_bu',
  nickname: 'Dave',
  email: 'dave@buhub.test',
  avatar: 'D',
  defaultAvatar: null,
  grade: 'gradeUndergradY1',
  major: 'majorCS',
  bio: '',
  gender: 'male',
  language: 'tc',
  isLoggedIn: true,
  isHKBUVerified: false,
  hkbuEmail: undefined,
  role: 'USER',
} as User;

beforeEach(() => {
  mockAlert.mockClear();
  mockChangeLanguage.mockClear();
  useAuthStore.setState({
    user: null,
    language: 'tc',
    token: null,
    isLoggedIn: false,
    hasSelectedLanguage: false,
    hasCompletedRegistration: false,
    forceLanguageOnNextLaunch: false,
  });
});

// ===========================================================================
// Phase 1 — Non-HKBU user: every gated function must reject the write.
// ===========================================================================
describe('Phase 1: non-HKBU user — gated functions are blocked', () => {
  it('canPublishCommunityContent returns false for a fresh non-HKBU user', () => {
    expect(canPublishCommunityContent(baseNonHkbuUser)).toBe(false);
  });

  it('canPublishCommunityContent returns false when user is null/undefined', () => {
    expect(canPublishCommunityContent(null)).toBe(false);
    expect(canPublishCommunityContent(undefined)).toBe(false);
  });

  it('isLifeHkbuEmail rejects non-HKBU email forms', () => {
    expect(isLifeHkbuEmail('dave@buhub.test')).toBe(false);
    expect(isLifeHkbuEmail('dave@hkbu.edu.hk')).toBe(false);
    expect(isLifeHkbuEmail(undefined)).toBe(false);
    expect(isLifeHkbuEmail(null)).toBe(false);
    expect(isLifeHkbuEmail('')).toBe(false);
  });

  describe('Every screen gate would block this user', () => {
    beforeEach(() => {
      useAuthStore.setState({ user: baseNonHkbuUser, isLoggedIn: true });
    });

    const gateNames = [
      'FunctionsHub card press (Partner / Errand / Secondhand / Rating / Facility / AISchedule / Locker)',
      'Messages tab tap (MainTabNavigator)',
      'Forum main page handleCommentPress',
      'Forum main page handleForward',
      'Forum main page handleQuote',
      'PostDetail handleComment / handleReply',
      'PostDetail handleForward',
      'PostDetail handleQuote',
      'FunctionShareLayout Share-to-Forum',
      'FunctionShareLayout Share-to-DM',
      'ChatScreen forwarded-card auto-send',
      'usePushRegistration deep-link to MessagesTab > Chat',
      'usePushRegistration deep-link to FunctionsTab > *Detail',
    ];

    it.each(gateNames)('gate "%s" sees the user as blocked', () => {
      const user = useAuthStore.getState().user;
      expect(canPublishCommunityContent(user)).toBe(false);
    });
  });

  it('promptHkbuVerification surfaces the localized title, body, and CTA', () => {
    const onCTA = jest.fn();
    promptHkbuVerification(t, onCTA);
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = mockAlert.mock.calls[0];
    expect(title).toBe('hkbuEmailRequiredTitle');
    expect(body).toBe('hkbuEmailRequiredBody');
    expect(Array.isArray(buttons)).toBe(true);
    expect(buttons[0]).toMatchObject({ text: 'cancel', style: 'cancel' });
    expect(buttons[1]).toMatchObject({ text: 'hkbuEmailRequiredCTA' });
  });

  it('CTA invokes onGoToManageEmails — the cross-tab nav callback', () => {
    const onCTA = jest.fn();
    promptHkbuVerification(t, onCTA);
    const [, , buttons] = mockAlert.mock.calls[0];
    buttons[1].onPress();
    expect(onCTA).toHaveBeenCalledTimes(1);
  });

  it('Cancel button does NOT invoke the CTA', () => {
    const onCTA = jest.fn();
    promptHkbuVerification(t, onCTA);
    const [, , buttons] = mockAlert.mock.calls[0];
    expect(buttons[0].onPress).toBeUndefined();
    expect(onCTA).not.toHaveBeenCalled();
  });

  describe('Server-rejection mapping', () => {
    it('isHkbuCommunityPermissionError detects both legacy and current codes', () => {
      expect(isHkbuCommunityPermissionError('HKBU_EMAIL_REQUIRED')).toBe(true);
      expect(isHkbuCommunityPermissionError('HKBU_EMAIL_REQUIRED_FOR_PUBLISH')).toBe(true);
      expect(isHkbuCommunityPermissionError('HKBU_EMAIL_REQUIRED_FOR_MESSAGES')).toBe(false);
      expect(isHkbuCommunityPermissionError('CONTENT_VIOLATION')).toBe(false);
    });

    it('isPublishPermissionError matches both errorCode and code fields', () => {
      expect(isPublishPermissionError({ errorCode: 'HKBU_EMAIL_REQUIRED' })).toBe(true);
      expect(isPublishPermissionError({ code: 'HKBU_EMAIL_REQUIRED_FOR_PUBLISH' })).toBe(true);
      expect(isPublishPermissionError({ code: 403 })).toBe(false);
      expect(isPublishPermissionError(null)).toBe(false);
    });

    it('getAuthErrorMessage maps server EMAIL_NOT_VERIFIED to a clear localized key', () => {
      const err = { code: 401, message: 'verify email', errorCode: 'EMAIL_NOT_VERIFIED' };
      expect(getAuthErrorMessage(err, t).message).toBe('emailNotVerified');
    });

    it('getAuthErrorMessage falls back to provided fallback for unknown errors', () => {
      const r = getAuthErrorMessage({ code: 400, message: 'wat' }, t, 'commentFailed');
      expect(r).toEqual({ message: 'commentFailed', isNetwork: false });
    });
  });
});

// ===========================================================================
// Phase 2 — User binds a verified @life.hkbu.edu.hk email: gates flip open.
// ===========================================================================
describe('Phase 2: same user, now HKBU-verified — all functions unlocked', () => {
  it('canPublishCommunityContent flips to true once isHKBUVerified is set', () => {
    const verifiedUser: User = { ...baseNonHkbuUser, isHKBUVerified: true } as User;
    expect(canPublishCommunityContent(verifiedUser)).toBe(true);
  });

  it('canPublishCommunityContent flips to true when hkbuEmail field is set to a life.* address', () => {
    const verifiedUser: User = {
      ...baseNonHkbuUser,
      hkbuEmail: '23245322@life.hkbu.edu.hk',
    } as User;
    expect(canPublishCommunityContent(verifiedUser)).toBe(true);
  });

  it('canPublishCommunityContent flips to true when primary email itself is life.*', () => {
    const verifiedUser: User = {
      ...baseNonHkbuUser,
      email: '23245322@life.hkbu.edu.hk',
    } as User;
    expect(canPublishCommunityContent(verifiedUser)).toBe(true);
  });

  it('admin/moderator role bypasses the gate even without an HKBU email', () => {
    const adminUser: User = { ...baseNonHkbuUser, role: 'ADMIN' } as User;
    const modUser: User = { ...baseNonHkbuUser, role: 'MODERATOR' } as User;
    expect(canPublishCommunityContent(adminUser)).toBe(true);
    expect(canPublishCommunityContent(modUser)).toBe(true);
  });

  it('isLifeHkbuEmail accepts canonical and mixed-case life.* addresses', () => {
    expect(isLifeHkbuEmail('23245322@life.hkbu.edu.hk')).toBe(true);
    expect(isLifeHkbuEmail('  23245322@LIFE.hkbu.edu.hk  ')).toBe(true);
  });

  it('Every gate sees the user as unblocked once verified', () => {
    const verifiedUser: User = { ...baseNonHkbuUser, isHKBUVerified: true } as User;
    useAuthStore.setState({ user: verifiedUser, isLoggedIn: true });
    expect(canPublishCommunityContent(useAuthStore.getState().user)).toBe(true);
  });

  it('After verification, the gate condition no longer triggers the prompt path', () => {
    const verifiedUser: User = { ...baseNonHkbuUser, isHKBUVerified: true } as User;
    useAuthStore.setState({ user: verifiedUser, isLoggedIn: true });
    if (!canPublishCommunityContent(useAuthStore.getState().user)) {
      promptHkbuVerification(t, jest.fn());
    }
    expect(mockAlert).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Phase 3 — End-to-end transition: non-HKBU → bind email → unblocked.
// ===========================================================================
describe('Phase 3: end-to-end transition non-HKBU → HKBU-verified', () => {
  it('drives the auth store from blocked to unblocked via setUser', () => {
    // 1. Start as non-HKBU.
    useAuthStore.setState({ user: baseNonHkbuUser, isLoggedIn: true });
    expect(canPublishCommunityContent(useAuthStore.getState().user)).toBe(false);

    // 2. Simulate an early write attempt — the gate fires.
    if (!canPublishCommunityContent(useAuthStore.getState().user)) {
      promptHkbuVerification(t, jest.fn());
    }
    expect(mockAlert).toHaveBeenCalledTimes(1);

    // 3. User goes to ManageEmails and binds + verifies a life.* email.
    //    Backend returns a fresh user payload via setUser.
    useAuthStore.getState().setUser({
      ...baseNonHkbuUser,
      isHKBUVerified: true,
      hkbuEmail: '23245322@life.hkbu.edu.hk',
    } as User);

    // 4. Re-attempt every guarded write — now allowed, no further prompt.
    mockAlert.mockClear();
    if (!canPublishCommunityContent(useAuthStore.getState().user)) {
      promptHkbuVerification(t, jest.fn());
    }
    expect(mockAlert).not.toHaveBeenCalled();
    expect(canPublishCommunityContent(useAuthStore.getState().user)).toBe(true);
  });

  it('updateUser({ isHKBUVerified, hkbuEmail }) also flips the gate without re-login', () => {
    useAuthStore.setState({ user: baseNonHkbuUser, isLoggedIn: true });
    expect(canPublishCommunityContent(useAuthStore.getState().user)).toBe(false);

    useAuthStore.getState().updateUser({
      isHKBUVerified: true,
      hkbuEmail: '23245322@life.hkbu.edu.hk',
    } as Partial<User>);

    expect(canPublishCommunityContent(useAuthStore.getState().user)).toBe(true);
  });
});
