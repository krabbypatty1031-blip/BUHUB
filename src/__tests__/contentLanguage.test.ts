import {
  detectTextLanguage,
  resolveTranslationSourceLanguage,
  shouldAllowContentTranslation,
} from '../utils/contentLanguage';

describe('contentLanguage', () => {
  it('detects dominant english text', () => {
    expect(detectTextLanguage('Meet at the Library at 5pm')).toBe('en');
  });

  it('detects simplified chinese hints', () => {
    expect(detectTextLanguage('图书馆见，这边排队')).toBe('sc');
  });

  it('detects traditional chinese hints', () => {
    expect(detectTextLanguage('圖書館見，這邊排隊')).toBe('tc');
  });

  it('prefers per-text detection over the stored entity language', () => {
    expect(resolveTranslationSourceLanguage('Library pickup', 'tc')).toBe('en');
  });

  it('allows translation when field text differs from the target language', () => {
    expect(
      shouldAllowContentTranslation({
        text: 'Library pickup',
        sourceLanguage: 'tc',
        targetLanguage: 'tc',
      }),
    ).toBe(true);
  });

  it('blocks translation when field text already matches the target language', () => {
    expect(
      shouldAllowContentTranslation({
        text: '圖書館見',
        sourceLanguage: 'tc',
        targetLanguage: 'tc',
      }),
    ).toBe(false);
  });
});
