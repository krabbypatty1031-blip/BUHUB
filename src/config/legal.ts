/**
 * Legal URLs for App Store compliance.
 * Set in .env: EXPO_PUBLIC_TERMS_URL, EXPO_PUBLIC_PRIVACY_URL
 */
const getEnv = (key: string) =>
  typeof process !== 'undefined' ? process.env?.[key] : undefined;

export const TERMS_URL = getEnv('EXPO_PUBLIC_TERMS_URL') || '';
export const PRIVACY_URL = getEnv('EXPO_PUBLIC_PRIVACY_URL') || '';
