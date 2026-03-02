import Constants from 'expo-constants';

/**
 * Legal URLs for App Store compliance.
 * Primary source: .env (EXPO_PUBLIC_TERMS_URL / EXPO_PUBLIC_PRIVACY_URL)
 * Fallback: app.json -> expo.extra.termsUrl / privacyUrl
 */
const getEnv = (key: string) =>
  typeof process !== 'undefined' ? process.env?.[key] : undefined;

const extra = Constants.expoConfig?.extra as
  | { termsUrl?: string; privacyUrl?: string }
  | undefined;

export const TERMS_URL =
  getEnv('EXPO_PUBLIC_TERMS_URL') || extra?.termsUrl || '';
export const PRIVACY_URL =
  getEnv('EXPO_PUBLIC_PRIVACY_URL') || extra?.privacyUrl || '';
