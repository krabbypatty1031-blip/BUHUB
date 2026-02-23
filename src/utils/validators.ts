export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@life\.hkbu\.edu\.hk$/.test(email);
}

export type PasswordValidationReason = 'too_short' | 'missing_letter' | 'missing_number';

export function getPasswordValidationReason(password: string): PasswordValidationReason | null {
  if (password.length < 8) {
    return 'too_short';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'missing_letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'missing_number';
  }
  return null;
}

export function isValidPassword(password: string): boolean {
  return getPasswordValidationReason(password) === null;
}

export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function isValidPrice(price: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(price) && parseFloat(price) > 0;
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}
