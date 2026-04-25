import { Alert } from 'react-native';
import type { TFunction } from 'i18next';
import { API_BASE } from '../api/client';

const NETWORK_PROBE_TIMEOUT_MS = 4000;

export async function checkNetworkReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_PROBE_TIMEOUT_MS);
    const url = `${API_BASE.replace(/\/$/, '')}/health`;
    const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}

export async function ensureOnlineOrAlert(t: TFunction): Promise<boolean> {
  const ok = await checkNetworkReachable();
  if (!ok) Alert.alert(t('networkError'));
  return ok;
}

export function isApiNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; message?: string };
  if (e.code === 0) return true;
  return typeof e.message === 'string' && /network/i.test(e.message);
}

export type ApiErrorLike = {
  code?: number;
  message?: string;
  errorCode?: string;
};

/**
 * Maps any thrown auth-API error to a user-facing localized message.
 * Returns isNetwork=true for connectivity failures so callers can choose
 * a blocking Alert popup; everything else is a snackbar-friendly message.
 */
export function getAuthErrorMessage(
  err: unknown,
  t: TFunction,
  fallbackKey: string = 'unknownError'
): { message: string; isNetwork: boolean } {
  const e: ApiErrorLike = err && typeof err === 'object' ? (err as ApiErrorLike) : {};
  const errorCode = e.errorCode ?? '';
  const code = typeof e.code === 'number' ? e.code : -1;
  const lowerMsg = (e.message ?? '').toLowerCase();

  if (
    code === 0 ||
    /network|no response|failed to fetch|network request failed|timeout|econnrefused|enotfound/.test(
      lowerMsg
    )
  ) {
    return { message: t('networkError'), isNetwork: true };
  }

  switch (errorCode) {
    case 'EMAIL_ALREADY_REGISTERED':
      return { message: t('emailAlreadyRegistered'), isNetwork: false };
    case 'CAPTCHA_FAILED':
      return { message: t('captchaFailed'), isNetwork: false };
    case 'INVALID_CODE':
      return { message: t('invalidVerificationCode'), isNetwork: false };
    case 'CODE_EXPIRED':
    case 'VERIFICATION_CODE_EXPIRED':
      return { message: t('verificationCodeExpired'), isNetwork: false };
    case 'INVALID_CREDENTIALS':
      return { message: t('invalidCredentials'), isNetwork: false };
    case 'EMAIL_NOT_VERIFIED':
      return { message: t('emailNotVerified'), isNetwork: false };
    case 'ACCOUNT_DISABLED':
      return { message: t('accountDisabled'), isNetwork: false };
    case 'PASSWORD_TOO_WEAK':
      return { message: t('passwordTooWeak'), isNetwork: false };
    case 'TOKEN_EXPIRED':
    case 'SESSION_EXPIRED':
      return { message: t('sessionExpired'), isNetwork: false };
    case 'INVALID_RESET_TOKEN':
    case 'INVALID_TOKEN':
      return { message: t('invalidResetCode'), isNetwork: false };
    case 'RESET_TOKEN_EXPIRED':
      return { message: t('resetCodeExpired'), isNetwork: false };
    case 'RATE_LIMITED':
      return { message: t('rateLimited'), isNetwork: false };
    case 'SERVICE_UNAVAILABLE':
      return { message: t('serviceUnavailable'), isNetwork: false };
    default:
      break;
  }

  if (code === 429) return { message: t('rateLimited'), isNetwork: false };
  if (code === 503) return { message: t('serviceUnavailable'), isNetwork: false };
  if (code >= 500 && code < 600) return { message: t('serverError'), isNetwork: false };
  return { message: t(fallbackKey), isNetwork: false };
}
