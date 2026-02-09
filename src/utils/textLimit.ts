/**
 * Text input limit utility.
 * For Function posts (Partner/Errand/Secondhand):
 * - Title: 10 CJK chars / 20 English words
 * - Content: 20 CJK chars / 80 English words
 */

import i18n from '../i18n';

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u2e80-\u2eff\u3000-\u303f\uff00-\uffef]/;

/**
 * Check if current language is Chinese
 */
function isCurrentLanguageCJK(): boolean {
  const lang = i18n.language;
  return lang === 'tc' || lang === 'sc' || lang === 'zh';
}

/**
 * Check if text is primarily CJK (>50% CJK characters)
 * If text is empty, use current i18n language to decide
 */
function isCJKPrimary(text: string): boolean {
  if (text.length === 0) return isCurrentLanguageCJK();
  const cjkCount = [...text].filter((c) => CJK_REGEX.test(c)).length;
  return cjkCount / text.length > 0.5;
}

/**
 * Count English words (split by whitespace)
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Count CJK characters
 */
function countCJK(text: string): number {
  return [...text].filter((c) => CJK_REGEX.test(c)).length;
}

/* ── Title Limits (10 CJK / 20 words) ── */

/**
 * Check if title exceeds limit (10 CJK / 20 words)
 */
export function isTitleOverLimit(text: string): boolean {
  if (isCJKPrimary(text)) {
    return countCJK(text) > 10;
  }
  return countWords(text) > 20;
}

/**
 * Enforce title limit on input change.
 * Returns truncated text if over limit.
 */
export function enforceTitleLimit(text: string): string {
  if (!isTitleOverLimit(text)) return text;

  if (isCJKPrimary(text)) {
    // Limit to 10 CJK characters
    let count = 0;
    let result = '';
    for (const char of text) {
      if (CJK_REGEX.test(char)) {
        if (count >= 10) break;
        count++;
      }
      result += char;
    }
    return result;
  } else {
    // Limit to 20 words
    const words = text.trim().split(/\s+/);
    return words.slice(0, 20).join(' ');
  }
}

/**
 * Display label: "N/10" for CJK, "N/20" for English words
 */
export function getTitleCountLabel(text: string): string {
  if (isCJKPrimary(text)) {
    return `${countCJK(text)}/10`;
  }
  return `${countWords(text)}/20`;
}

/* ── Content Limits (20 CJK / 80 words) ── */

/**
 * Check if content exceeds limit (20 CJK / 80 words)
 */
export function isContentOverLimit(text: string): boolean {
  if (isCJKPrimary(text)) {
    return countCJK(text) > 20;
  }
  return countWords(text) > 80;
}

/**
 * Enforce content limit on input change.
 * Returns truncated text if over limit.
 */
export function enforceContentLimit(text: string): string {
  if (!isContentOverLimit(text)) return text;

  if (isCJKPrimary(text)) {
    // Limit to 20 CJK characters
    let count = 0;
    let result = '';
    for (const char of text) {
      if (CJK_REGEX.test(char)) {
        if (count >= 20) break;
        count++;
      }
      result += char;
    }
    return result;
  } else {
    // Limit to 80 words
    const words = text.trim().split(/\s+/);
    return words.slice(0, 80).join(' ');
  }
}

/**
 * Display label: "N/20" for CJK, "N/80" for English words
 */
export function getContentCountLabel(text: string): string {
  if (isCJKPrimary(text)) {
    return `${countCJK(text)}/20`;
  }
  return `${countWords(text)}/80`;
}
