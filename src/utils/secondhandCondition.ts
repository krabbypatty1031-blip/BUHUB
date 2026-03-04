export const SECONDHAND_CONDITION_LABEL_KEYS = {
  new: 'conditionNew',
  likeNew: 'conditionLikeNew',
  good: 'conditionGood',
  fair: 'conditionFair',
} as const;

export type SecondhandConditionKey = keyof typeof SECONDHAND_CONDITION_LABEL_KEYS;

const CONDITION_ALIASES: Record<SecondhandConditionKey, string[]> = {
  new: ['new', 'brandnew', 'brand new', '全新', '全新未拆'],
  likeNew: ['likenew', 'like new', '95成新', '9成新', '九成新'],
  good: ['good', '8成新', '八成新'],
  fair: ['fair', '7成新', '七成新'],
};

const normalizeToken = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');

export function normalizeSecondhandCondition(
  value?: string | null
): SecondhandConditionKey | null {
  if (!value) return null;
  const normalizedValue = normalizeToken(value);

  for (const [condition, aliases] of Object.entries(CONDITION_ALIASES) as Array<
    [SecondhandConditionKey, string[]]
  >) {
    if (aliases.some((alias) => normalizeToken(alias) === normalizedValue)) {
      return condition;
    }
  }

  return null;
}

export function getSecondhandConditionLabelKey(
  value?: string | null
): string | null {
  const condition = normalizeSecondhandCondition(value);
  return condition ? SECONDHAND_CONDITION_LABEL_KEYS[condition] : null;
}

export function getLocalizedSecondhandCondition(
  value: string | null | undefined,
  t: (key: string) => string
): string {
  const labelKey = getSecondhandConditionLabelKey(value);
  if (labelKey) {
    return String(t(labelKey));
  }
  return value?.trim() ?? '';
}
