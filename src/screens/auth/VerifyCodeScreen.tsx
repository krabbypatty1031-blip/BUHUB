import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useUIStore } from '../../store/uiStore';
import { BackIcon, CheckIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

const CODE_LENGTH = 6;
const INITIAL_COUNTDOWN = 60;

export default function VerifyCodeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { email } = route.params;
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const [isVerifying, setIsVerifying] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const codeComplete = code.every((c) => c !== '');

  const startCountdown = useCallback(() => {
    setCountdown(INITIAL_COUNTDOWN);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startCountdown]);

  const handleResend = useCallback(() => {
    if (countdown > 0) return;
    showSnackbar({ message: t('codeSent'), type: 'success' });
    startCountdown();
    setCode(Array(CODE_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }, [countdown, showSnackbar, t, startCountdown]);

  const handleContinue = useCallback(async () => {
    if (!codeComplete || !agreed) return;
    setIsVerifying(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsVerifying(false);
    showSnackbar({ message: t('captchaSuccess'), type: 'success' });
    setTimeout(() => {
      navigation.navigate('ProfileSetup');
    }, 500);
  }, [codeComplete, agreed, navigation, showSnackbar, t]);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('verifyTitle')}</Text>
          <Text style={styles.desc}>{t('verifyDesc', { email })}</Text>
        </View>

        <View style={styles.form}>
          {/* Code Inputs */}
          <View style={styles.codeInputs}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={[
                  styles.codeInput,
                  code[i] !== '' && styles.codeInputFilled,
                ]}
                maxLength={1}
                keyboardType="number-pad"
                value={code[i]}
                onChangeText={(text) => handleCodeChange(text, i)}
                onKeyPress={({ nativeEvent }) =>
                  handleCodeKeyPress(nativeEvent.key, i)
                }
                editable={!isVerifying}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.resendText}>
                {t('resendAfter', { seconds: countdown })}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={styles.resendLink}>{t('resendCode')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Agreement Checkbox */}
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

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!codeComplete || !agreed) && styles.continueBtnDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={!codeComplete || !agreed || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text
                style={[
                  styles.continueBtnText,
                  (!codeComplete || !agreed) && styles.continueBtnTextDisabled,
                ]}
              >
                {t('continueBtn')}
              </Text>
            )}
          </TouchableOpacity>
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
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.xl,
  },

  /* Code */
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer + '20',
  },

  /* Resend */
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

  /* Agreement */
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreementText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },

  /* Continue */
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
