import { translateRating } from '../i18n/ratingTranslations';
import type { Language } from '../types';

export function translateLabel(str: string, language: Language): string {
  if (!str || language === 'tc') return str;
  return translateRating(str, language);
}
