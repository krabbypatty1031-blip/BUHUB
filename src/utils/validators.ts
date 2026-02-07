export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@life\.hkbu\.edu\.hk$/.test(email);
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
