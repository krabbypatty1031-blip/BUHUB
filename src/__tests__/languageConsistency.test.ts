/**
 * Language consistency tests
 *
 * Locks in the four invariants from bug-2 verification:
 *   1. setLanguage propagates to i18n.changeLanguage (and therefore AsyncStorage 'ulink-language').
 *   2. setUser with a language different from the store's also propagates to i18n.
 *   3. updateUser with a new language propagates to i18n.
 *   4. deleteAccount resets language to 'tc' AND propagates that reset to i18n.
 *
 * Plus boundary cases:
 *   - normalizeLanguage handles all expected aliases.
 *   - No redundant changeLanguage call when value did not change.
 *   - setUser without a user.language preserves the existing language and
 *     does not trigger a change.
 */

jest.mock('../i18n', () => {
  const changeLanguage = jest.fn(() => Promise.resolve());
  const normalizeLanguage = (lang: string | null | undefined) => {
    if (!lang) return null;
    if (lang === 'tc' || lang === 'zh-TW') return 'tc';
    if (lang === 'sc' || lang === 'zh-CN') return 'sc';
    if (lang === 'en') return 'en';
    return null;
  };
  return {
    __esModule: true,
    default: { language: 'tc' },
    normalizeLanguage,
    changeLanguage,
    i18nReady: Promise.resolve(),
  };
});

const i18nMock = jest.requireMock('../i18n') as { changeLanguage: jest.Mock };
const mockChangeLanguage = i18nMock.changeLanguage;

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

// api/client.setOnUnauthorized is called on store init; stub it.
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {},
  API_BASE: 'https://test.api/api',
  setOnUnauthorized: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  uploadClient: { post: jest.fn() },
}));

// forumStore.clearVotedPolls is called by logout/deleteAccount.
jest.mock('../store/forumStore', () => ({
  useForumStore: {
    getState: () => ({ clearVotedPolls: jest.fn() }),
  },
}));

import type { User } from '../types';
import { useAuthStore } from '../store/authStore';

beforeEach(() => {
  mockChangeLanguage.mockClear();
  // Reset store to fresh defaults.
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

const baseUser: User = {
  name: 'Bob',
  nickname: 'Bob',
  email: 'bob@example.com',
  avatar: null,
  defaultAvatar: null,
  grade: 'gradeUndergradY1',
  major: 'majorCS',
  bio: '',
  gender: 'male',
  language: 'tc',
  isLoggedIn: true,
};

describe('authStore.setLanguage propagates to i18n', () => {
  it('calls changeLanguage when value changes', () => {
    useAuthStore.getState().setLanguage('en');
    expect(useAuthStore.getState().language).toBe('en');
    expect(useAuthStore.getState().hasSelectedLanguage).toBe(true);
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    expect(mockChangeLanguage).toHaveBeenCalledTimes(1);
  });

  it('does not call changeLanguage when value is unchanged', () => {
    // store starts at 'tc'
    useAuthStore.getState().setLanguage('tc');
    expect(mockChangeLanguage).not.toHaveBeenCalled();
    expect(useAuthStore.getState().hasSelectedLanguage).toBe(true);
  });

  it('handles all three supported languages', () => {
    useAuthStore.getState().setLanguage('sc');
    expect(mockChangeLanguage).toHaveBeenLastCalledWith('sc');
    useAuthStore.getState().setLanguage('en');
    expect(mockChangeLanguage).toHaveBeenLastCalledWith('en');
    useAuthStore.getState().setLanguage('tc');
    expect(mockChangeLanguage).toHaveBeenLastCalledWith('tc');
    expect(mockChangeLanguage).toHaveBeenCalledTimes(3);
  });
});

describe('authStore.setUser propagates language to i18n', () => {
  it('propagates when user.language differs from store', () => {
    useAuthStore.getState().setUser({ ...baseUser, language: 'en' });
    expect(useAuthStore.getState().language).toBe('en');
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('does not propagate when user.language matches store', () => {
    useAuthStore.setState({ language: 'en' });
    useAuthStore.getState().setUser({ ...baseUser, language: 'en' });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('preserves existing language when user.language is missing', () => {
    useAuthStore.setState({ language: 'sc' });
    const userWithoutLanguage = { ...baseUser } as Partial<User> as User;
    delete (userWithoutLanguage as { language?: string }).language;
    useAuthStore.getState().setUser(userWithoutLanguage);
    expect(useAuthStore.getState().language).toBe('sc');
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('normalizes legacy zh-TW / zh-CN language codes', () => {
    useAuthStore.getState().setUser({ ...baseUser, language: 'zh-TW' as User['language'] });
    expect(useAuthStore.getState().language).toBe('tc');
    // tc === default state.language so no propagation expected
    expect(mockChangeLanguage).not.toHaveBeenCalled();

    useAuthStore.getState().setUser({ ...baseUser, language: 'zh-CN' as User['language'] });
    expect(useAuthStore.getState().language).toBe('sc');
    expect(mockChangeLanguage).toHaveBeenCalledWith('sc');
  });

  it('marks hasSelectedLanguage and hasCompletedRegistration true', () => {
    useAuthStore.getState().setUser({ ...baseUser, language: 'en' });
    const state = useAuthStore.getState();
    expect(state.hasSelectedLanguage).toBe(true);
    expect(state.hasCompletedRegistration).toBe(true);
    expect(state.forceLanguageOnNextLaunch).toBe(false);
  });
});

describe('authStore.updateUser propagates language to i18n', () => {
  it('propagates when updates.language differs from store', () => {
    useAuthStore.setState({ user: baseUser, isLoggedIn: true, language: 'tc' });
    useAuthStore.getState().updateUser({ language: 'en' });
    expect(useAuthStore.getState().language).toBe('en');
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('does not propagate when updates.language equals store', () => {
    useAuthStore.setState({ user: baseUser, isLoggedIn: true, language: 'en' });
    useAuthStore.getState().updateUser({ language: 'en' });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it('does not propagate when updates omit language', () => {
    useAuthStore.setState({ user: baseUser, isLoggedIn: true, language: 'tc' });
    useAuthStore.getState().updateUser({ nickname: 'Robert' });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.nickname).toBe('Robert');
  });
});

describe('authStore.deleteAccount resets language to tc and propagates', () => {
  it('clears state and calls changeLanguage("tc") when language was different', () => {
    useAuthStore.setState({
      user: baseUser,
      isLoggedIn: true,
      language: 'en',
      hasSelectedLanguage: true,
      hasCompletedRegistration: true,
    });
    useAuthStore.getState().deleteAccount();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.language).toBe('tc');
    expect(state.hasSelectedLanguage).toBe(false);
    expect(state.hasCompletedRegistration).toBe(false);
    expect(state.forceLanguageOnNextLaunch).toBe(true);
    expect(mockChangeLanguage).toHaveBeenCalledWith('tc');
  });

  it('skips changeLanguage when already on tc', () => {
    useAuthStore.setState({
      user: baseUser,
      isLoggedIn: true,
      language: 'tc',
    });
    useAuthStore.getState().deleteAccount();
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});

describe('authStore.logout does not touch language', () => {
  it('clears user/token but keeps language and AsyncStorage intact', () => {
    useAuthStore.setState({ user: baseUser, isLoggedIn: true, language: 'en' });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.language).toBe('en');
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});
