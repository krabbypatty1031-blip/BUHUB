import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { setOnUnauthorized } from '../api/client';
import { normalizeLanguage, changeLanguage } from '../i18n';
import { useForumStore } from './forumStore';
import type { User, Language } from '../types';
import { normalizeAvatarUrl } from '../utils/imageUrl';

interface AuthState {
  user: User | null;
  language: Language;
  token: string | null;
  isLoggedIn: boolean;
  hasSelectedLanguage: boolean;
  hasCompletedRegistration: boolean;
  forceLanguageOnNextLaunch: boolean;
  _hasHydrated: boolean;

  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setLanguage: (lang: Language) => void;
  setToken: (token: string) => void;
  markPasswordSet: () => void;
  logout: () => void;
  deleteAccount: () => void;
}

function normalizeUserAvatar(avatar: string | null | undefined): string | null {
  if (typeof avatar === 'string' && avatar.startsWith('#')) return avatar;
  return normalizeAvatarUrl(avatar);
}

function sanitizeUser(user: User): User {
  return {
    ...user,
    avatar: normalizeUserAvatar(user.avatar),
  };
}

function sanitizeUserUpdates(updates: Partial<User>): Partial<User> {
  if (!Object.prototype.hasOwnProperty.call(updates, 'avatar')) {
    return updates;
  }
  return {
    ...updates,
    avatar: normalizeUserAvatar(updates.avatar),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      language: 'tc',
      token: null,
      isLoggedIn: false,
      hasSelectedLanguage: false,
      hasCompletedRegistration: false,
      forceLanguageOnNextLaunch: false,
      _hasHydrated: false,

      setUser: (user) =>
        set((state) => {
          const normalizedUserLanguage = normalizeLanguage(user.language);
          const normalizedUser = sanitizeUser(user);
          const sanitizedUser = normalizedUserLanguage
            ? { ...normalizedUser, language: normalizedUserLanguage }
            : normalizedUser;
          const nextLanguage = normalizedUserLanguage ?? state.language;
          if (nextLanguage !== state.language) {
            void changeLanguage(nextLanguage);
          }
          return {
            user: sanitizedUser,
            isLoggedIn: true,
            language: nextLanguage,
            hasSelectedLanguage: state.hasSelectedLanguage || Boolean(normalizedUserLanguage),
            hasCompletedRegistration: true,
            forceLanguageOnNextLaunch: false,
          };
        }),
      updateUser: (updates) =>
        set((state) => {
          const normalizedUpdateLanguage = normalizeLanguage(updates.language);
          const normalizedAvatarUpdates = sanitizeUserUpdates(updates);
          const normalizedUpdates = normalizedUpdateLanguage
            ? { ...normalizedAvatarUpdates, language: normalizedUpdateLanguage }
            : normalizedAvatarUpdates;
          const nextUser = state.user ? { ...state.user, ...normalizedUpdates } : null;
          if (normalizedUpdateLanguage) {
            if (normalizedUpdateLanguage !== state.language) {
              void changeLanguage(normalizedUpdateLanguage);
            }
            return {
              user: nextUser,
              language: normalizedUpdateLanguage,
              hasSelectedLanguage: true,
            };
          }
          return { user: nextUser };
        }),
      setLanguage: (language) => {
        const prev = useAuthStore.getState().language;
        set({ language, hasSelectedLanguage: true });
        if (prev !== language) {
          void changeLanguage(language);
        }
      },
      setToken: (token) => set({ token }),
      markPasswordSet: () =>
        set({
          hasCompletedRegistration: true,
          forceLanguageOnNextLaunch: false,
        }),
      logout: () => {
        useForumStore.getState().clearVotedPolls();
        set({ user: null, token: null, isLoggedIn: false });
      },
      deleteAccount: () =>
        {
          useForumStore.getState().clearVotedPolls();
          const prev = useAuthStore.getState().language;
          set({
            user: null,
            token: null,
            isLoggedIn: false,
            hasSelectedLanguage: false,
            hasCompletedRegistration: false,
            forceLanguageOnNextLaunch: true,
            language: 'tc',
          });
          if (prev !== 'tc') {
            void changeLanguage('tc');
          }
        },
    }),
    {
      name: 'ulink-auth',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => {
        const { _hasHydrated, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    }
  )
);

// Sync: when API client detects 401, also clear Zustand auth state
setOnUnauthorized(() => {
  useForumStore.getState().clearVotedPolls();
  useAuthStore.getState().logout();
});
