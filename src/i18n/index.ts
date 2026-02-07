import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tc from './locales/tc.json';
import sc from './locales/sc.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'buhub-language';

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

// Restore saved language preference
AsyncStorage.getItem(LANGUAGE_KEY).then((lang) => {
  if (lang && (lang === 'tc' || lang === 'sc' || lang === 'en')) {
    i18n.changeLanguage(lang);
  }
});

export const changeLanguage = async (lang: 'tc' | 'sc' | 'en') => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export type Language = 'tc' | 'sc' | 'en';

export default i18n;
