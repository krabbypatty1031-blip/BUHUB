import { normalizeLanguage } from '../i18n';
import type { Language } from '../types';

const SIMPLIFIED_HINTS = new Set(
  '边变并从点东对发该个关过还后欢会机几见将进经开来里两吗么们难让认说听图网为问无现线样应于与则这专总车书'
);
const TRADITIONAL_HINTS = new Set(
  '邊變並從點東對發該個關過還後歡會機幾見將進經開來裡兩嗎麼們難讓認說聽圖網為問無現線樣應於與則這專總車書'
);

function countMatches(text: string, charset: Set<string>) {
  let count = 0;
  for (const ch of text) {
    if (charset.has(ch)) count += 1;
  }
  return count;
}

export function detectTextLanguage(
  text?: string | null,
  fallback?: Language | null,
): Language | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return fallback ?? null;

  const latinCount = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  const cjkCount = (trimmed.match(/[\u3400-\u9FFF]/gu) ?? []).length;

  if (latinCount > 0 && (cjkCount === 0 || latinCount >= cjkCount * 2)) {
    return 'en';
  }

  const simplifiedCount = countMatches(trimmed, SIMPLIFIED_HINTS);
  const traditionalCount = countMatches(trimmed, TRADITIONAL_HINTS);

  if (simplifiedCount > traditionalCount) return 'sc';
  if (traditionalCount > simplifiedCount) return 'tc';

  return fallback ?? null;
}

export function resolveTranslationSourceLanguage(
  text?: string | null,
  sourceLanguage?: string | null,
): Language | null {
  return detectTextLanguage(text, normalizeLanguage(sourceLanguage));
}

export function shouldAllowContentTranslation(params: {
  text?: string | null;
  sourceLanguage?: string | null;
  targetLanguage: Language;
}) {
  const trimmed = params.text?.trim() ?? '';
  if (!trimmed) {
    return false;
  }

  const resolvedSourceLanguage = resolveTranslationSourceLanguage(trimmed, params.sourceLanguage);
  return resolvedSourceLanguage == null || resolvedSourceLanguage !== params.targetLanguage;
}
