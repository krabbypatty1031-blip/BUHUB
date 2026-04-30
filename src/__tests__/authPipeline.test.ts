/**
 * Auth pipeline + error-handling tests
 *
 * Covers:
 *   1. Registration + login pipeline — every auth.service method calls the
 *      correct endpoint with the correct payload and stores the returned token.
 *   2. Error handling — every auth.service method propagates the ApiError
 *      shape produced by api/client.ts so the registration/login screens
 *      (EmailInputScreen, SetPasswordScreen, ProfileSetupScreen,
 *      LoginScreen, ForgotPasswordScreen, ResetPasswordScreen) can branch on
 *      it. Also covers the new utils/network.ts gating utility used by
 *      every registration screen.
 */

// jest hoists jest.mock(...) above all consts, so we define mock objects INSIDE
// each factory and re-acquire them below via jest.requireMock to avoid the
// Temporal Dead Zone hoisting trap.
jest.mock('../api/client', () => {
  const apiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const uploadClient = { post: jest.fn() };
  const setToken = jest.fn();
  const clearToken = jest.fn();
  return {
    __esModule: true,
    default: apiClient,
    API_BASE: 'https://test.api/api',
    setToken,
    clearToken,
    uploadClient,
  };
});

jest.mock('react-native', () => {
  const alert = jest.fn();
  return {
    Alert: { alert },
    Platform: { OS: 'ios' },
  };
});

const apiClientMock = jest.requireMock('../api/client') as {
  default: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
  setToken: jest.Mock;
  clearToken: jest.Mock;
  uploadClient: { post: jest.Mock };
};
const reactNativeMock = jest.requireMock('react-native') as {
  Alert: { alert: jest.Mock };
};
const mockApiClient = apiClientMock.default;
const mockSetToken = apiClientMock.setToken;
const mockClearToken = apiClientMock.clearToken;
const mockAlert = reactNativeMock.Alert.alert;

import { authService } from '../api/services/auth.service';
import {
  checkNetworkReachable,
  ensureOnlineOrAlert,
  isApiNetworkError,
  getAuthErrorMessage,
} from '../utils/network';

type ApiError = { code: number; message: string; errorCode?: string };

const networkApiError: ApiError = {
  code: 0,
  message: 'Network error: no response received',
};
const captchaApiError: ApiError = {
  code: 400,
  message: 'Captcha verification failed',
  errorCode: 'CAPTCHA_FAILED',
};
const emailAlreadyRegistered: ApiError = {
  code: 409,
  message: 'Email already registered',
  errorCode: 'EMAIL_ALREADY_REGISTERED',
};
const invalidCodeError: ApiError = {
  code: 400,
  message: 'Invalid verification code',
  errorCode: 'INVALID_CODE',
};
const invalidCredsError: ApiError = {
  code: 401,
  message: 'Invalid credentials',
  errorCode: 'INVALID_CREDENTIALS',
};
const passwordTooWeakError: ApiError = {
  code: 400,
  message: 'Password too weak',
  errorCode: 'PASSWORD_TOO_WEAK',
};
const tokenExpiredError: ApiError = {
  code: 401,
  message: 'Token expired',
  errorCode: 'TOKEN_EXPIRED',
};
const serverError: ApiError = {
  code: 500,
  message: 'Internal server error',
};
const rateLimitedError: ApiError = {
  code: 429,
  message: 'Too many requests',
  errorCode: 'RATE_LIMITED',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. PIPELINE — happy paths
// ---------------------------------------------------------------------------
describe('Auth pipeline (happy path)', () => {
  it('sendCode posts to /auth/send-code with email + captchaToken and 25s timeout', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await authService.sendCode('user@example.com', 'captcha-token-xyz');
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/auth/send-code',
      { email: 'user@example.com', captchaToken: 'captcha-token-xyz' },
      { timeout: 25000 }
    );
  });

  it('verify posts code, persists returned token via setToken', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { token: 'jwt-abc', registrationToken: 'reg-1' },
    });
    const result = await authService.verify('user@example.com', '123456');
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/verify', {
      email: 'user@example.com',
      code: '123456',
    });
    expect(mockSetToken).toHaveBeenCalledWith('jwt-abc');
    expect(result.registrationToken).toBe('reg-1');
  });

  it('verify does NOT call setToken when no token is returned (registration flow)', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { registrationToken: 'reg-2' } });
    await authService.verify('user@example.com', '123456');
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it('completeRegistration posts the full payload and stores token', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { token: 'jwt-final' } });
    await authService.completeRegistration(
      'user@example.com',
      'reg-1',
      'StrongPass1',
      true
    );
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/complete-registration', {
      email: 'user@example.com',
      registrationToken: 'reg-1',
      password: 'StrongPass1',
      agreedToTerms: true,
    });
    expect(mockSetToken).toHaveBeenCalledWith('jwt-final');
  });

  it('setPassword (post-verify HKBU flow) posts to /auth/set-password without token storage', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await authService.setPassword('NewPass1234');
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/set-password', {
      password: 'NewPass1234',
    });
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it('setupProfile posts profile fields', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { nickname: 'Bob', avatar: 'Harbour', grade: 'gradeUndergradY1', major: 'majorCS', gender: 'male' },
    });
    const profile = await authService.setupProfile({
      nickname: 'Bob',
      grade: 'gradeUndergradY1',
      major: 'majorCS',
      gender: 'male',
      language: 'en',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/profile-setup', expect.objectContaining({
      nickname: 'Bob',
      grade: 'gradeUndergradY1',
      major: 'majorCS',
      gender: 'male',
      language: 'en',
    }));
    expect(profile.nickname).toBe('Bob');
  });

  it('setupProfile (auto-generate / skip flow) sends autoGenerate=true', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      data: { nickname: 'Auto', avatar: 'Library' },
    });
    await authService.setupProfile({ autoGenerate: true, language: 'tc' });
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/profile-setup', {
      autoGenerate: true,
      language: 'tc',
    });
  });

  it('login posts credentials and stores token', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { token: 'login-jwt' } });
    await authService.login('user@example.com', 'StrongPass1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'StrongPass1',
    });
    expect(mockSetToken).toHaveBeenCalledWith('login-jwt');
  });

  it('verifyToken posts to /auth/verify-token with 5s timeout', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { valid: true } });
    await authService.verifyToken();
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/auth/verify-token',
      null,
      { timeout: 5000 }
    );
  });

  it('forgotPassword posts email', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await authService.forgotPassword('user@example.com');
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'user@example.com',
    });
  });

  it('resetPassword posts email + token + newPassword', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await authService.resetPassword('user@example.com', 'reset-token', 'NewStrongPass1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'user@example.com',
      token: 'reset-token',
      newPassword: 'NewStrongPass1',
    });
  });

  it('changePassword puts old + new password', async () => {
    mockApiClient.put.mockResolvedValueOnce({ data: { success: true } });
    await authService.changePassword('OldPass1', 'NewPass2');
    expect(mockApiClient.put).toHaveBeenCalledWith('/auth/password', {
      oldPassword: 'OldPass1',
      newPassword: 'NewPass2',
    });
  });

  it('logout posts and always clears token (even if API call fails)', async () => {
    mockApiClient.post.mockRejectedValueOnce(networkApiError);
    // logout rethrows the network error but the finally block still clears the token.
    await expect(authService.logout()).rejects.toMatchObject({ code: 0 });
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(mockClearToken).toHaveBeenCalled();
  });

  it('logout (happy path) posts and clears token', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await authService.logout();
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(mockClearToken).toHaveBeenCalled();
  });

  it('deleteAccount calls DELETE then clears token', async () => {
    mockApiClient.delete.mockResolvedValueOnce({ data: { success: true } });
    await authService.deleteAccount();
    expect(mockApiClient.delete).toHaveBeenCalledWith('/auth/account');
    expect(mockClearToken).toHaveBeenCalled();
  });

  it('full registration pipeline executes end-to-end', async () => {
    mockApiClient.post
      .mockResolvedValueOnce({ data: { success: true } })                                    // sendCode
      .mockResolvedValueOnce({ data: { registrationToken: 'reg-99' } })                       // verify
      .mockResolvedValueOnce({ data: { token: 'jwt-final' } })                                // completeRegistration
      .mockResolvedValueOnce({ data: { nickname: 'Bob', avatar: 'Harbour' } });               // setupProfile

    await authService.sendCode('user@example.com', 'cap');
    const verifyResult = await authService.verify('user@example.com', '123456');
    expect(verifyResult.registrationToken).toBe('reg-99');
    await authService.completeRegistration('user@example.com', 'reg-99', 'StrongPass1', true);
    const profile = await authService.setupProfile({
      nickname: 'Bob',
      grade: 'gradeUndergradY1',
      major: 'majorCS',
      gender: 'male',
      language: 'en',
    });
    expect(profile.nickname).toBe('Bob');
    expect(mockSetToken).toHaveBeenCalledWith('jwt-final');
  });

  it('full login pipeline executes end-to-end', async () => {
    mockApiClient.post
      .mockResolvedValueOnce({ data: { token: 'login-jwt' } })                                // login
      .mockResolvedValueOnce({ data: { valid: true } });                                      // verifyToken

    await authService.login('user@example.com', 'StrongPass1');
    const v = await authService.verifyToken();
    expect(v.valid).toBe(true);
    expect(mockSetToken).toHaveBeenCalledWith('login-jwt');
  });
});

// ---------------------------------------------------------------------------
// 2. ERROR HANDLING — every screen-relevant ApiError shape propagates correctly
// ---------------------------------------------------------------------------
describe('Auth error handling', () => {
  describe('sendCode (EmailInputScreen)', () => {
    it('propagates network error (code 0) — screen alerts user', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(authService.sendCode('u@e.com', 'c')).rejects.toMatchObject({ code: 0 });
    });

    it('propagates EMAIL_ALREADY_REGISTERED — screen shows localized message', async () => {
      mockApiClient.post.mockRejectedValueOnce(emailAlreadyRegistered);
      await expect(authService.sendCode('u@e.com', 'c')).rejects.toMatchObject({
        errorCode: 'EMAIL_ALREADY_REGISTERED',
      });
    });

    it('propagates CAPTCHA_FAILED — screen shows captchaFailed', async () => {
      mockApiClient.post.mockRejectedValueOnce(captchaApiError);
      await expect(authService.sendCode('u@e.com', 'c')).rejects.toMatchObject({
        errorCode: 'CAPTCHA_FAILED',
      });
    });

    it('propagates rate-limit (429) — screen falls back to generic sendCodeFailed', async () => {
      mockApiClient.post.mockRejectedValueOnce(rateLimitedError);
      await expect(authService.sendCode('u@e.com', 'c')).rejects.toMatchObject({ code: 429 });
    });

    it('propagates 5xx server error', async () => {
      mockApiClient.post.mockRejectedValueOnce(serverError);
      await expect(authService.sendCode('u@e.com', 'c')).rejects.toMatchObject({ code: 500 });
    });
  });

  describe('verify (EmailInputScreen)', () => {
    it('propagates invalid 6-digit code', async () => {
      mockApiClient.post.mockRejectedValueOnce(invalidCodeError);
      await expect(authService.verify('u@e.com', '000000')).rejects.toMatchObject({
        errorCode: 'INVALID_CODE',
      });
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('propagates network error mid-verify', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(authService.verify('u@e.com', '111111')).rejects.toMatchObject({ code: 0 });
    });
  });

  describe('completeRegistration / setPassword (SetPasswordScreen)', () => {
    it('completeRegistration propagates network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(
        authService.completeRegistration('u@e.com', 'r', 'p', true)
      ).rejects.toMatchObject({ code: 0 });
    });

    it('completeRegistration propagates weak-password error', async () => {
      mockApiClient.post.mockRejectedValueOnce(passwordTooWeakError);
      await expect(
        authService.completeRegistration('u@e.com', 'r', 'p', true)
      ).rejects.toMatchObject({ errorCode: 'PASSWORD_TOO_WEAK' });
    });

    it('setPassword propagates token-expired (401)', async () => {
      mockApiClient.post.mockRejectedValueOnce(tokenExpiredError);
      await expect(authService.setPassword('NewPass1')).rejects.toMatchObject({ code: 401 });
    });
  });

  describe('setupProfile (ProfileSetupScreen)', () => {
    it('propagates network error during done flow', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(
        authService.setupProfile({ nickname: 'A', language: 'en' })
      ).rejects.toMatchObject({ code: 0 });
    });

    it('propagates network error during skip flow (autoGenerate)', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(
        authService.setupProfile({ autoGenerate: true, language: 'en' })
      ).rejects.toMatchObject({ code: 0 });
    });

    it('propagates server 500 — screen shows setupFailed', async () => {
      mockApiClient.post.mockRejectedValueOnce(serverError);
      await expect(
        authService.setupProfile({ nickname: 'A', language: 'en' })
      ).rejects.toMatchObject({ code: 500 });
    });
  });

  describe('login (LoginScreen)', () => {
    it('propagates 401 invalid credentials', async () => {
      mockApiClient.post.mockRejectedValueOnce(invalidCredsError);
      await expect(authService.login('u@e.com', 'wrong')).rejects.toMatchObject({
        errorCode: 'INVALID_CREDENTIALS',
      });
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('propagates network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(authService.login('u@e.com', 'p')).rejects.toMatchObject({ code: 0 });
    });

    it('propagates rate-limit', async () => {
      mockApiClient.post.mockRejectedValueOnce(rateLimitedError);
      await expect(authService.login('u@e.com', 'p')).rejects.toMatchObject({ code: 429 });
    });

    it('propagates 500', async () => {
      mockApiClient.post.mockRejectedValueOnce(serverError);
      await expect(authService.login('u@e.com', 'p')).rejects.toMatchObject({ code: 500 });
    });
  });

  describe('forgotPassword / resetPassword (Forgot/Reset screens)', () => {
    it('forgotPassword 200 success path is valid', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { success: true } });
      const r = await authService.forgotPassword('u@e.com');
      expect(r.success).toBe(true);
    });

    it('forgotPassword propagates network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(authService.forgotPassword('u@e.com')).rejects.toMatchObject({ code: 0 });
    });

    it('resetPassword propagates expired/invalid reset token', async () => {
      const tokenInvalid = { code: 400, message: 'Invalid reset token', errorCode: 'INVALID_RESET_TOKEN' };
      mockApiClient.post.mockRejectedValueOnce(tokenInvalid);
      await expect(authService.resetPassword('u@e.com', 'bad', 'New1234a')).rejects.toMatchObject({
        errorCode: 'INVALID_RESET_TOKEN',
      });
    });

    it('resetPassword propagates network error', async () => {
      mockApiClient.post.mockRejectedValueOnce(networkApiError);
      await expect(authService.resetPassword('u@e.com', 't', 'New1234a')).rejects.toMatchObject({ code: 0 });
    });
  });
});

// ---------------------------------------------------------------------------
// 3. NETWORK GATING UTILITY (used by every registration screen)
// ---------------------------------------------------------------------------
describe('utils/network', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  describe('checkNetworkReachable', () => {
    it('returns true on 200 OK', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200 }) as unknown as typeof fetch;
      await expect(checkNetworkReachable()).resolves.toBe(true);
    });

    it('returns false when fetch throws (e.g. WiFi off, DNS failure)', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed')) as unknown as typeof fetch;
      await expect(checkNetworkReachable()).resolves.toBe(false);
    });

    it('returns false when probe times out (AbortController)', async () => {
      global.fetch = jest.fn().mockImplementationOnce((_url, init: RequestInit | undefined) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        });
      }) as unknown as typeof fetch;
      await expect(checkNetworkReachable()).resolves.toBe(false);
    }, 6000);

    it('returns false when server responds with 5xx', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 502 }) as unknown as typeof fetch;
      await expect(checkNetworkReachable()).resolves.toBe(false);
    });
  });

  describe('ensureOnlineOrAlert', () => {
    const t = ((key: string) => key) as unknown as Parameters<typeof ensureOnlineOrAlert>[0];

    it('returns true and does not show Alert when online', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200 }) as unknown as typeof fetch;
      await expect(ensureOnlineOrAlert(t)).resolves.toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('returns false and shows Alert when offline', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline')) as unknown as typeof fetch;
      await expect(ensureOnlineOrAlert(t)).resolves.toBe(false);
      expect(mockAlert).toHaveBeenCalledWith('networkError');
    });
  });

  describe('getAuthErrorMessage (clear messages for every error)', () => {
    const t = ((key: string) => key) as unknown as Parameters<typeof getAuthErrorMessage>[1];

    it('maps network error (code 0) to networkError + isNetwork=true', () => {
      const r = getAuthErrorMessage(networkApiError, t);
      expect(r).toEqual({ message: 'networkError', isNetwork: true });
    });

    it('maps message containing "network" to networkError', () => {
      const r = getAuthErrorMessage({ code: -1, message: 'Network request failed' }, t);
      expect(r).toEqual({ message: 'networkError', isNetwork: true });
    });

    it('maps EMAIL_ALREADY_REGISTERED to emailAlreadyRegistered', () => {
      expect(getAuthErrorMessage(emailAlreadyRegistered, t)).toEqual({
        message: 'emailAlreadyRegistered',
        isNetwork: false,
      });
    });

    it('maps CAPTCHA_FAILED to captchaFailed', () => {
      expect(getAuthErrorMessage(captchaApiError, t).message).toBe('captchaFailed');
    });

    it('maps INVALID_CODE to invalidVerificationCode', () => {
      expect(getAuthErrorMessage(invalidCodeError, t).message).toBe('invalidVerificationCode');
    });

    it('maps CODE_EXPIRED to verificationCodeExpired', () => {
      expect(
        getAuthErrorMessage({ code: 400, message: 'expired', errorCode: 'CODE_EXPIRED' }, t).message
      ).toBe('verificationCodeExpired');
    });

    it('maps INVALID_CREDENTIALS to invalidCredentials', () => {
      expect(getAuthErrorMessage(invalidCredsError, t).message).toBe('invalidCredentials');
    });

    it('maps EMAIL_NOT_VERIFIED to emailNotVerified', () => {
      expect(
        getAuthErrorMessage({ code: 401, message: 'verify email', errorCode: 'EMAIL_NOT_VERIFIED' }, t).message
      ).toBe('emailNotVerified');
    });

    it('maps ACCOUNT_DISABLED to accountDisabled', () => {
      expect(
        getAuthErrorMessage({ code: 403, message: 'disabled', errorCode: 'ACCOUNT_DISABLED' }, t).message
      ).toBe('accountDisabled');
    });

    it('maps PASSWORD_TOO_WEAK to passwordTooWeak', () => {
      expect(getAuthErrorMessage(passwordTooWeakError, t).message).toBe('passwordTooWeak');
    });

    it('maps TOKEN_EXPIRED to sessionExpired', () => {
      expect(getAuthErrorMessage(tokenExpiredError, t).message).toBe('sessionExpired');
    });

    it('maps INVALID_RESET_TOKEN to invalidResetCode', () => {
      expect(
        getAuthErrorMessage({ code: 400, message: 'bad', errorCode: 'INVALID_RESET_TOKEN' }, t).message
      ).toBe('invalidResetCode');
    });

    it('maps RESET_TOKEN_EXPIRED to resetCodeExpired', () => {
      expect(
        getAuthErrorMessage({ code: 400, message: 'expired', errorCode: 'RESET_TOKEN_EXPIRED' }, t).message
      ).toBe('resetCodeExpired');
    });

    it('maps RATE_LIMITED errorCode to rateLimited', () => {
      expect(getAuthErrorMessage(rateLimitedError, t).message).toBe('rateLimited');
    });

    it('maps HTTP 429 (no errorCode) to rateLimited', () => {
      expect(getAuthErrorMessage({ code: 429, message: 'too many' }, t).message).toBe('rateLimited');
    });

    it('maps HTTP 503 to serviceUnavailable', () => {
      expect(getAuthErrorMessage({ code: 503, message: 'down' }, t).message).toBe('serviceUnavailable');
    });

    it('maps HTTP 500 to serverError', () => {
      expect(getAuthErrorMessage(serverError, t).message).toBe('serverError');
    });

    it('falls back to provided fallback key for unknown business errors', () => {
      const r = getAuthErrorMessage({ code: 400, message: 'something else' }, t, 'sendCodeFailed');
      expect(r).toEqual({ message: 'sendCodeFailed', isNetwork: false });
    });

    it('falls back to unknownError when no fallback is provided', () => {
      const r = getAuthErrorMessage({ code: 418, message: 'teapot' }, t);
      expect(r.message).toBe('unknownError');
    });

    it('handles null / undefined / non-object input safely', () => {
      expect(getAuthErrorMessage(null, t).message).toBe('unknownError');
      expect(getAuthErrorMessage(undefined, t).message).toBe('unknownError');
      expect(getAuthErrorMessage('boom', t).message).toBe('unknownError');
    });
  });

  describe('isApiNetworkError', () => {
    it('detects ApiError with code 0', () => {
      expect(isApiNetworkError({ code: 0, message: 'Network error' })).toBe(true);
    });

    it('detects message containing "network"', () => {
      expect(isApiNetworkError({ code: -1, message: 'Network request failed' })).toBe(true);
    });

    it('returns false for known business errors', () => {
      expect(isApiNetworkError(emailAlreadyRegistered)).toBe(false);
      expect(isApiNetworkError(invalidCredsError)).toBe(false);
      expect(isApiNetworkError(captchaApiError)).toBe(false);
      expect(isApiNetworkError(serverError)).toBe(false);
    });

    it('returns false for null / undefined / non-object', () => {
      expect(isApiNetworkError(null)).toBe(false);
      expect(isApiNetworkError(undefined)).toBe(false);
      expect(isApiNetworkError('network')).toBe(false);
      expect(isApiNetworkError(0)).toBe(false);
    });
  });
});
