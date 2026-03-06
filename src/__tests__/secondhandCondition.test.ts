import {
  getLocalizedSecondhandCondition,
  normalizeSecondhandCondition,
} from '../utils/secondhandCondition';

describe('secondhand condition helpers', () => {
  const t = (key: string) =>
    ({
      conditionNew: '全新',
      conditionLikeNew: '95成新',
      conditionGood: '8成新',
      conditionFair: '7成新',
    }[key] ?? key);

  it('normalizes canonical keys', () => {
    expect(normalizeSecondhandCondition('new')).toBe('new');
    expect(normalizeSecondhandCondition('likeNew')).toBe('likeNew');
    expect(normalizeSecondhandCondition('good')).toBe('good');
    expect(normalizeSecondhandCondition('fair')).toBe('fair');
  });

  it('normalizes localized legacy labels', () => {
    expect(normalizeSecondhandCondition('全新')).toBe('new');
    expect(normalizeSecondhandCondition('95成新')).toBe('likeNew');
    expect(normalizeSecondhandCondition('9成新')).toBe('likeNew');
    expect(normalizeSecondhandCondition('8成新')).toBe('good');
    expect(normalizeSecondhandCondition('7成新')).toBe('fair');
  });

  it('normalizes english labels', () => {
    expect(normalizeSecondhandCondition('Like New')).toBe('likeNew');
    expect(normalizeSecondhandCondition('Good')).toBe('good');
    expect(normalizeSecondhandCondition('Fair')).toBe('fair');
  });

  it('localizes recognized values', () => {
    expect(getLocalizedSecondhandCondition('likeNew', t)).toBe('95成新');
    expect(getLocalizedSecondhandCondition('Like New', t)).toBe('95成新');
    expect(getLocalizedSecondhandCondition('9成新', t)).toBe('95成新');
  });

  it('falls back to the original value for unknown labels', () => {
    expect(getLocalizedSecondhandCondition('保存完好', t)).toBe('保存完好');
  });
});
