import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { setOnUnauthorized } from '../api/client';
import type { User, Language } from '../types';

interface AuthState {
  user: User | null;
  language: Language;
  token: string | null;
  isLoggedIn: boolean;

  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setLanguage: (lang: Language) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      language: 'tc',
      token: null,
      isLoggedIn: false,

      setUser: (user) => set({ user, isLoggedIn: true }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setLanguage: (language) => set({ language }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isLoggedIn: false }),
    }),
    {
      name: 'buhub-auth',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

// Sync: when API client detects 401, also clear Zustand auth state
setOnUnauthorized(() => {
  useAuthStore.getState().logout();
});
