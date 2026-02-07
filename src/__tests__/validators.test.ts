import { isValidEmail, isValidVerificationCode, isValidPrice, isNotEmpty } from '../utils/validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('accepts valid HKBU email', () => {
      expect(isValidEmail('student@life.hkbu.edu.hk')).toBe(true);
      expect(isValidEmail('john.doe123@life.hkbu.edu.hk')).toBe(true);
    });

    it('rejects non-HKBU emails', () => {
      expect(isValidEmail('user@gmail.com')).toBe(false);
      expect(isValidEmail('user@hkbu.edu.hk')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidVerificationCode', () => {
    it('accepts 6-digit codes', () => {
      expect(isValidVerificationCode('123456')).toBe(true);
      expect(isValidVerificationCode('000000')).toBe(true);
    });

    it('rejects invalid codes', () => {
      expect(isValidVerificationCode('12345')).toBe(false);
      expect(isValidVerificationCode('1234567')).toBe(false);
      expect(isValidVerificationCode('abcdef')).toBe(false);
      expect(isValidVerificationCode('')).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('accepts valid prices', () => {
      expect(isValidPrice('100')).toBe(true);
      expect(isValidPrice('9.99')).toBe(true);
      expect(isValidPrice('0.50')).toBe(true);
    });

    it('rejects invalid prices', () => {
      expect(isValidPrice('0')).toBe(false);
      expect(isValidPrice('-10')).toBe(false);
      expect(isValidPrice('abc')).toBe(false);
      expect(isValidPrice('')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('returns true for non-empty strings', () => {
      expect(isNotEmpty('hello')).toBe(true);
    });

    it('returns false for empty or whitespace strings', () => {
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });
  });
});
