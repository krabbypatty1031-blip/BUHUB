import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tc from './locales/tc.json';
import sc from './locales/sc.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'ulink-language';
const SUPPORTED_LANGUAGES = ['tc', 'sc', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const normalizeLanguage = (lang?: string | null): Language | null => {
  if (!lang) return null;
  if (lang === 'tc' || lang === 'zh-TW') return 'tc';
  if (lang === 'sc' || lang === 'zh-CN') return 'sc';
  if (lang === 'en') return 'en';
  return null;
};

const resources = {
  tc: { translation: tc },
  sc: { translation: sc },
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'tc',
  fallbackLng: 'tc',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Resolves once the persisted language (if any) has been applied to i18n.
// App.tsx awaits this before rendering the navigator so the first paint is
// in the user's chosen language rather than the sync-init default.
export const i18nReady: Promise<void> = (async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    const normalized = normalizeLanguage(saved);
    if (normalized && normalized !== i18n.language) {
      await i18n.changeLanguage(normalized);
    }
  } catch {
    // AsyncStorage can fail on first launch or corrupted state; fall back
    // to the sync-init language silently.
  }
})();

export const changeLanguage = async (lang: Language | string) => {
  const normalized = normalizeLanguage(lang);
  if (!normalized) return;
  await AsyncStorage.setItem(LANGUAGE_KEY, normalized);
  await i18n.changeLanguage(normalized);
};

export default i18n;
