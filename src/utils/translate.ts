import { translateRating } from '../i18n/ratingTranslations';
import { getLocalizedHkbuCanteenLabel } from '../data/hkbuCanteenTranslations';
import type { Language } from '../types';

export function translateLabel(str: string, language: Language): string {
  if (!str) return str;
  const localizedCanteenLabel = getLocalizedHkbuCanteenLabel(str, language);
  if (localizedCanteenLabel) {
    return localizedCanteenLabel;
  }
  return translateRating(str, language);
}
