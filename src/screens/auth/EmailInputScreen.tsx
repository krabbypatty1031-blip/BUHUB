import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailInput'>;

const SLIDER_WIDTH = 46;
const CODE_LENGTH = 6;
const INITIAL_COUNTDOWN = 60;

export default function EmailInputScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const setToken = useAuthStore((s) => s.setToken);
  const { width: screenWidth } = useWindowDimensions();

  const { trackWidth, successThreshold } = useMemo(() => {
    const tw = Math.min(screenWidth - 32 - 32, 340);
    return { trackWidth: tw, successThreshold: tw - SLIDER_WIDTH - 4 };
  }, [screenWidth]);

  const [email, setEmail] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailRef = useRef(email);
  emailRef.current = email;

  const codeComplete = code.every((c) => c !== '');

  const pan = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const onCaptchaSuccess = useCallback(async () => {
    const currentEmail = emailRef.current.trim();
    if (!currentEmail) return;

    setIsSendingCode(true);
    try {
      await authService.sendCode(currentEmail);
      showSnackbar({ message: t('codeSent'), type: 'success' });

      setCodeSent(true);
      setShowCaptcha(false);
      setCaptchaVerified(false);
      pan.setValue(0);
      startCountdown();

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 120);
    } catch (err: any) {
      const msg = err?.message || t('sendCodeFailed');
      showSnackbar({ message: msg, type: 'error' });
      pan.setValue(0);
      setCaptchaVerified(false);
    } finally {
      setIsSendingCode(false);
    }
  }, [showSnackbar, t, pan, startCountdown]);

  const onCaptchaSuccessRef = useRef(onCaptchaSuccess);
  onCaptchaSuccessRef.current = onCaptchaSuccess;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.max(0, Math.min(gestureState.dx, successThreshold));
        pan.setValue(dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= successThreshold) {
          Animated.spring(pan, {
            toValue: successThreshold,
            useNativeDriver: false,
          }).start(() => {
            setCaptchaVerified(true);
            setTimeout(() => {
              onCaptchaSuccessRef.current();
            }, 380);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const handleRequestCode = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      showSnackbar({ message: t('emailPlaceholder'), type: 'error' });
      return;
    }
    const localPart = trimmed.split('@')[0];
    if (!/^\d{8}$/.test(localPart)) {
      showSnackbar({ message: t('emailMustBe8Digits'), type: 'error' });
      return;
    }

    setShowCaptcha(true);
    pan.setValue(0);
    setCaptchaVerified(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [email, showSnackbar, t, pan, fadeAnim]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isSendingCode) return;
    const currentEmail = email.trim();
    if (!currentEmail) return;

    setIsSendingCode(true);
    try {
      await authService.sendCode(currentEmail);
      showSnackbar({ message: t('codeSent'), type: 'success' });
      startCountdown();
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      showSnackbar({ message: err?.message || t('sendCodeFailed'), type: 'error' });
    } finally {
      setIsSendingCode(false);
    }
  }, [countdown, email, isSendingCode, showSnackbar, startCountdown, t]);

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
        navigation.navigate('SetPassword', { email: email.trim() });
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
          <View style={[styles.inputField, (showCaptcha || codeSent) && styles.inputFieldLocked]}>
            <TextInput
              style={styles.emailInput}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!showCaptcha && !codeSent}
            />
          </View>

          {!codeSent && showCaptcha && (
            <Animated.View style={[styles.captchaInline, { opacity: fadeAnim }]}>
              <Text style={styles.captchaHint}>
                {captchaVerified ? t('captchaSuccess') : t('captchaDesc')}
              </Text>

              <View style={[styles.sliderTrackWrapper, { width: trackWidth }]}> 
                <View style={[styles.track, { width: trackWidth }]}> 
                  <Animated.View
                    style={[
                      styles.trackFill,
                      {
                        width: pan.interpolate({
                          inputRange: [0, successThreshold],
                          outputRange: [0, trackWidth],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  />
                  <Text style={styles.trackText}>
                    {captchaVerified ? t('captchaSuccess') : t('dragToVerify')}
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.slider,
                    captchaVerified && styles.sliderSuccess,
                    { transform: [{ translateX: pan }] },
                  ]}
                  {...panResponder.panHandlers}
                >
                  {captchaVerified ? (
                    <CheckIcon size={22} color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.sliderArrow}>{'>>'}</Text>
                  )}
                </Animated.View>
              </View>
            </Animated.View>
          )}

          {!codeSent ? (
            <TouchableOpacity
              style={[styles.sendBtn, (!email.trim() || showCaptcha || isSendingCode) && styles.sendBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleRequestCode}
              disabled={!email.trim() || showCaptcha || isSendingCode}
            >
              {isSendingCode ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[styles.sendBtnText, (!email.trim() || showCaptcha) && styles.sendBtnTextDisabled]}>
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

  captchaInline: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  captchaHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  sliderTrackWrapper: {
    height: SLIDER_WIDTH,
    alignSelf: 'center',
  },
  track: {
    height: SLIDER_WIDTH,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
  },
  trackText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  slider: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLIDER_WIDTH,
    height: SLIDER_WIDTH,
    backgroundColor: colors.primary,
    borderRadius: SLIDER_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderSuccess: {
    backgroundColor: colors.success,
  },
  sliderArrow: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -2,
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
