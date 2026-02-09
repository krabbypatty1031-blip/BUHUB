/**
 * Text input limit utility.
 * Chinese characters count as ~2.67x an English character for limit purposes.
 * Effectively: 30 Chinese chars ≈ 80 English chars.
 */

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u2e80-\u2eff\u3000-\u303f\uff00-\uffef]/;

/**
 * Calculate the "weighted length" of text.
 * Each CJK character counts as 2.67, each other character counts as 1.
 * Max budget = 80 (i.e. 30 CJK chars or 80 ASCII chars).
 */
export function getWeightedLength(text: string): number {
  let total = 0;
  for (const char of text) {
    total += CJK_REGEX.test(char) ? 2.67 : 1;
  }
  return Math.round(total);
}

/**
 * Check if text exceeds the title limit (30 CJK / 80 ASCII).
 */
export function isTitleOverLimit(text: string): boolean {
  return getWeightedLength(text) > 80;
}

/**
 * Enforce title limit on input change.
 * Returns the truncated text if over limit, otherwise the original.
 */
export function enforceTitleLimit(text: string): string {
  if (!isTitleOverLimit(text)) return text;
  let total = 0;
  let i = 0;
  for (const char of text) {
    const w = CJK_REGEX.test(char) ? 2.67 : 1;
    if (total + w > 80) break;
    total += w;
    i++;
  }
  return [...text].slice(0, i).join('');
}

/** Display label: "N/30" for CJK-heavy, "N/80" for ASCII-heavy */
export function getTitleCountLabel(text: string): string {
  const cjkCount = [...text].filter((c) => CJK_REGEX.test(c)).length;
  const ratio = text.length > 0 ? cjkCount / text.length : 0;
  if (ratio > 0.5) {
    return `${cjkCount}/30`;
  }
  return `${text.length}/80`;
}
