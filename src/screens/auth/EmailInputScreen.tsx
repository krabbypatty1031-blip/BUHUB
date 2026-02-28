import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../api/services/auth.service';
import { BackIcon, CheckIcon } from '../../components/common/icons';
import HCaptchaCaptcha, { type HCaptchaCaptchaRef } from '../../components/auth/HCaptchaCaptcha';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailInput'>;

const CODE_LENGTH = 6;
const INITIAL_COUNTDOWN = 60;

export default function EmailInputScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captchaRef = useRef<HCaptchaCaptchaRef>(null);
  const pendingCaptchaRef = useRef<'send' | 'resend'>('send');

  const emailRef = useRef(email);
  emailRef.current = email;

  const codeComplete = code.every((c) => c !== '');

  const siteKey =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_HCAPTCHA_SITE_KEY) || '';

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    clearTimer();
    setCountdown(INITIAL_COUNTDOWN);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const onCaptchaSuccess = useCallback(
    async (token: string) => {
      const currentEmail = emailRef.current.trim();
      if (!currentEmail) return;

      setIsSendingCode(true);
      try {
        await authService.sendCode(currentEmail, token);
        showSnackbar({ message: t('codeSent'), type: 'success' });
        startCountdown();

        if (pendingCaptchaRef.current === 'send') {
          setCodeSent(true);
          setTimeout(() => inputRefs.current[0]?.focus(), 120);
        } else {
          setCode(Array(CODE_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        }
      } catch (err: any) {
        let msg = err?.message || t('sendCodeFailed');
        if (err?.errorCode === 'EMAIL_ALREADY_REGISTERED') msg = t('emailAlreadyRegistered');
        else if (err?.errorCode === 'CAPTCHA_FAILED') msg = t('captchaFailed');
        showSnackbar({ message: msg, type: 'error' });
      } finally {
        setIsSendingCode(false);
      }
    },
    [showSnackbar, t, startCountdown]
  );

  const handleRequestCode = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      showSnackbar({ message: t('emailPlaceholder'), type: 'error' });
      return;
    }
    if (!siteKey) {
      showSnackbar({ message: t('captchaNotConfigured'), type: 'error' });
      return;
    }
    pendingCaptchaRef.current = 'send';
    captchaRef.current?.show();
  }, [email, showSnackbar, t, siteKey]);

  const handleResend = useCallback(() => {
    if (countdown > 0 || isSendingCode) return;
    const currentEmail = email.trim();
    if (!currentEmail) return;
    if (!siteKey) {
      showSnackbar({ message: t('captchaNotConfigured'), type: 'error' });
      return;
    }
    pendingCaptchaRef.current = 'resend';
    captchaRef.current?.show();
  }, [countdown, email, isSendingCode, showSnackbar, siteKey]);

  const handleContinue = useCallback(async () => {
    if (!codeComplete || !agreed || isVerifying) return;

    setIsVerifying(true);
    try {
      const result = await authService.verify(email.trim(), code.join(''));
      if (result.token) {
        setToken(result.token);
      }

      showSnackbar({ message: t('captchaSuccess'), type: 'success' });
      setTimeout(() => {
        navigation.navigate('SetPassword', {
          email: email.trim(),
          registrationToken: result.registrationToken,
          agreedToTerms: result.registrationToken ? agreed : undefined,
        });
      }, 300);
    } catch {
      showSnackbar({ message: t('verifyFailed'), type: 'error' });
    } finally {
      setIsVerifying(false);
    }
  }, [agreed, code, codeComplete, email, isVerifying, navigation, setToken, showSnackbar, t]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/[^0-9]/g, '');
      if (digit.length > 1) return;

      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit.length === 1 && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code]
  );

  const handleCodeKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && code[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{codeSent ? t('verifyTitle') : t('emailInputTitle')}</Text>
          <Text style={styles.desc}>
            {codeSent ? t('verifyDesc', { email }) : t('emailInputDesc')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputField, codeSent && styles.inputFieldLocked]}>
            <TextInput
              style={styles.emailInput}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!codeSent}
            />
          </View>

          {siteKey ? (
            <HCaptchaCaptcha
              ref={captchaRef}
              siteKey={siteKey}
              onSuccess={onCaptchaSuccess}
              onError={(err) => showSnackbar({ message: err || t('sendCodeFailed'), type: 'error' })}
            />
          ) : null}

          {!codeSent ? (
            <TouchableOpacity
              style={[styles.sendBtn, (!email.trim() || isSendingCode) && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleRequestCode}
              disabled={!email.trim() || isSendingCode}
            >
              {isSendingCode ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[styles.sendBtnText, !email.trim() && styles.sendBtnTextDisabled]}>
                  {t('sendCode')}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.verifyStage}>
              <View style={styles.codeInputs}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => {
                      inputRefs.current[i] = ref;
                    }}
                    style={[styles.codeInput, code[i] !== '' && styles.codeInputFilled]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={code[i]}
                    onChangeText={(text) => handleCodeChange(text, i)}
                    onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, i)}
                    editable={!isVerifying}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.resendText}>{t('resendAfter', { seconds: countdown })}</Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                    <Text style={styles.resendLink}>{t('resendCode')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.agreementRow}
                activeOpacity={0.7}
                onPress={() => setAgreed((v) => !v)}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <CheckIcon size={14} color={colors.onPrimary} />}
                </View>
                <Text style={styles.agreementText}>
                  {t('agreeTerms')}
                  <Text style={styles.termsLink}>{t('termsOfService')}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.continueBtn, (!codeComplete || !agreed || isVerifying) && styles.continueBtnDisabled]}
                activeOpacity={0.85}
                onPress={handleContinue}
                disabled={!codeComplete || !agreed || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.continueBtnText,
                      (!codeComplete || !agreed || isVerifying) && styles.continueBtnTextDisabled,
                    ]}
                  >
                    {t('continueBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  desc: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  inputFieldLocked: {
    borderColor: colors.outlineVariant,
  },
  emailInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    height: 48,
    flex: 1,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  sendBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  sendBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },

  verifyStage: {
    gap: spacing.md,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  codeInput: {
    width: 48,
    height: 52,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    textAlignVertical: 'center',
    ...typography.bodyLarge,
    fontSize: 22,
    fontWeight: '600',
    color: colors.onSurface,
    paddingVertical: 0,
  },
  codeInputFilled: {
    borderColor: colors.primary,
  },

  resendRow: {
    alignItems: 'center',
  },
  resendText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  resendLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },

  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreementText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },

  continueBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  continueBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  continueBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  continueBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
