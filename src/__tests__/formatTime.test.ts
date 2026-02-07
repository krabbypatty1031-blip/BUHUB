import { translateTime, translateMeta } from '../utils/formatTime';

describe('translateTime', () => {
  it('returns original string for tc language', () => {
    expect(translateTime('5分鐘前', 'tc')).toBe('5分鐘前');
  });

  it('translates minutes ago to sc', () => {
    expect(translateTime('5分鐘前', 'sc')).toBe('5分钟前');
  });

  it('translates minutes ago to en', () => {
    expect(translateTime('5分鐘前', 'en')).toBe('5 min ago');
  });

  it('translates hours ago', () => {
    expect(translateTime('3小時前', 'sc')).toBe('3小时前');
    expect(translateTime('3小時前', 'en')).toBe('3h ago');
  });

  it('translates days ago', () => {
    expect(translateTime('2日前', 'sc')).toBe('2天前');
    expect(translateTime('2日前', 'en')).toBe('2d ago');
  });

  it('translates weeks ago', () => {
    expect(translateTime('1週前', 'sc')).toBe('1周前');
    expect(translateTime('1週前', 'en')).toBe('1w ago');
  });

  it('translates yesterday', () => {
    expect(translateTime('昨日', 'sc')).toBe('昨天');
    expect(translateTime('昨日', 'en')).toBe('Yesterday');
  });

  it('translates today time range', () => {
    expect(translateTime('今日 10:00-12:00', 'sc')).toBe('今天 10:00-12:00');
    expect(translateTime('今日 10:00-12:00', 'en')).toBe('Today 10:00-12:00');
  });

  it('translates weekday', () => {
    expect(translateTime('週一 14:00', 'sc')).toBe('周一 14:00');
    expect(translateTime('週一 14:00', 'en')).toBe('Mon 14:00');
  });

  it('returns original for unmatched patterns', () => {
    expect(translateTime('some text', 'en')).toBe('some text');
  });

  it('handles empty/null', () => {
    expect(translateTime('', 'en')).toBe('');
  });
});

describe('translateMeta', () => {
  it('returns original for tc', () => {
    expect(translateMeta('5分鐘前 · 樹洞', 'tc')).toBe('5分鐘前 · 樹洞');
  });

  it('translates time parts in meta', () => {
    expect(translateMeta('5分鐘前', 'en')).toBe('5 min ago');
  });

  it('handles empty meta', () => {
    expect(translateMeta('', 'en')).toBe('');
  });
});
