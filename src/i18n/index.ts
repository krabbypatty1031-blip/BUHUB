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

export const changeLanguage = async (lang: Language | string) => {
  const normalized = normalizeLanguage(lang);
  if (!normalized) return;
  await AsyncStorage.setItem(LANGUAGE_KEY, normalized);
  await i18n.changeLanguage(normalized);
};

export default i18n;
