import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { setOnUnauthorized } from '../api/client';
import { useForumStore } from './forumStore';
import type { User, Language } from '../types';

interface AuthState {
  user: User | null;
  language: Language;
  token: string | null;
  isLoggedIn: boolean;
  hasSelectedLanguage: boolean;
  _hasHydrated: boolean;

  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setLanguage: (lang: Language) => void;
  setToken: (token: string) => void;
  logout: () => void;
  deleteAccount: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      language: 'tc',
      token: null,
      isLoggedIn: false,
      hasSelectedLanguage: false,
      _hasHydrated: false,

      setUser: (user) => set({ user, isLoggedIn: true }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setLanguage: (language) => set({ language, hasSelectedLanguage: true }),
      setToken: (token) => set({ token }),
      logout: () => {
        useForumStore.getState().clearVotedPolls();
        set({ user: null, token: null, isLoggedIn: false });
      },
      deleteAccount: () =>
        {
          useForumStore.getState().clearVotedPolls();
          set({
            user: null,
            token: null,
            isLoggedIn: false,
            hasSelectedLanguage: false,
            language: 'tc',
          });
        },
    }),
    {
      name: 'buhub-auth',
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
