import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useUIStore } from '../../store/uiStore';
import { authService } from '../../api/services/auth.service';
import { ensureOnlineOrAlert, getAuthErrorMessage } from '../../utils/network';
import { usePasswordInput } from '../../hooks/usePasswordInput';
import { getPasswordValidationReason } from '../../utils/validators';
import { BackIcon, EyeIcon, EyeOffIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const CODE_LENGTH = 6;
  const { t } = useTranslation();
  const { email } = route.params;
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const {
    value: password,
    isVisible: isPasswordVisible,
    onChangeText: onPasswordChange,
    toggleVisibility: togglePasswordVisibility,
  } = usePasswordInput();

  const {
    value: confirmPassword,
    isVisible: isConfirmVisible,
    onChangeText: onConfirmChange,
    toggleVisibility: toggleConfirmVisibility,
  } = usePasswordInput();

  const codeComplete = code.every((c) => c !== '');
  const canSubmit = codeComplete && password.length > 0 && confirmPassword.length > 0;

  const getPasswordErrorMessage = useCallback(
    (value: string): string | null => {
      const reason = getPasswordValidationReason(value);
      if (reason === 'too_short') return t('passwordTooShort');
      if (reason === 'missing_letter') return t('passwordNeedLetter');
      if (reason === 'missing_number') return t('passwordNeedNumber');
      return null;
    },
    [t]
  );

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

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    const validationError = getPasswordErrorMessage(password);
    if (validationError) {
      showSnackbar({ message: validationError, type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar({ message: t('passwordMismatch'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const online = await ensureOnlineOrAlert(t);
    if (!online) {
      setIsSubmitting(false);
      return;
    }
    try {
      await authService.resetPassword(code.join(''), password);
      showSnackbar({ message: t('resetPasswordSuccess'), type: 'success' });
      navigation.navigate('Login');
    } catch (error: unknown) {
      const { message, isNetwork } = getAuthErrorMessage(error, t, 'resetPasswordFailed');
      if (isNetwork) {
        Alert.alert(message);
      } else {
        showSnackbar({ message, type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, code, isSubmitting, password, confirmPassword, getPasswordErrorMessage, navigation, showSnackbar, t]);

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.contentInner}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('resetPasswordTitle')}</Text>
              <Text style={styles.desc}>{t('resetPasswordDesc')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('setPasswordEmailLabel')}</Text>
                <View style={styles.emailField}>
                  <Text style={styles.emailValue}>{email}</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('resetCodeLabel')}</Text>
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
                      editable={!isSubmitting}
                      selectTextOnFocus
                    />
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('newPasswordLabel')}</Text>
                <View style={styles.inputField}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={t('passwordPlaceholder')}
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={togglePasswordVisibility}
                    activeOpacity={0.7}
                  >
                    {isPasswordVisible ? (
                      <EyeIcon size={20} color={colors.onSurfaceVariant} />
                    ) : (
                      <EyeOffIcon size={20} color={colors.onSurfaceVariant} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('confirmNewPasswordLabel')}</Text>
                <View style={styles.inputField}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={t('confirmPassword')}
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={confirmPassword}
                    onChangeText={onConfirmChange}
                    secureTextEntry={!isConfirmVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={toggleConfirmVisibility}
                    activeOpacity={0.7}
                  >
                    {isConfirmVisible ? (
                      <EyeIcon size={20} color={colors.onSurfaceVariant} />
                    ) : (
                      <EyeOffIcon size={20} color={colors.onSurfaceVariant} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.hint}>{t('passwordHint')}</Text>

              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                    {t('resetPasswordSubmit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  contentInner: {
    flex: 1,
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
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  emailField: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    height: 56,
    justifyContent: 'center',
    backgroundColor: colors.surface1,
  },
  emailValue: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
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
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: 22,
    fontWeight: '600',
    color: colors.onSurface,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  codeInputFilled: {
    borderColor: colors.primary,
  },
  input: {
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    color: colors.onSurface,
    flex: 1,
    paddingVertical: 14,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  submitBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  submitBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  submitBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
