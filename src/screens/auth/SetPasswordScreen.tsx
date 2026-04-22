import React, { useState, useCallback } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../api/services/auth.service';
import { usePasswordInput } from '../../hooks/usePasswordInput';
import { getPasswordValidationReason } from '../../utils/validators';
import { BackIcon, EyeIcon, EyeOffIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetPassword'>;

export default function SetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { email, registrationToken, agreedToTerms } = route.params;
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const markPasswordSet = useAuthStore((s) => s.markPasswordSet);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = password.length > 0 && confirmPassword.length > 0;

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

  const handleNext = useCallback(async () => {
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
    try {
      if (registrationToken && agreedToTerms) {
        await authService.completeRegistration(email, registrationToken, password, agreedToTerms);
      } else {
        await authService.setPassword(password);
      }
      markPasswordSet();
      navigation.navigate('ProfileSetup', { email });
    } catch {
      showSnackbar({ message: t('setPasswordFailed'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    confirmPassword,
    email,
    getPasswordErrorMessage,
    isSubmitting,
    navigation,
    password,
    markPasswordSet,
    showSnackbar,
    t,
    registrationToken,
    agreedToTerms,
  ]);

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
          <Text style={styles.title}>{t('setPasswordTitle')}</Text>
          <Text style={styles.desc}>{t('setPasswordDesc')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('setPasswordEmailLabel')}</Text>
            <View style={styles.emailField}>
              <Text style={styles.emailValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('setPasswordInputLabel')}</Text>
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
            <Text style={styles.fieldLabel}>{t('setPasswordConfirmInputLabel')}</Text>
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
            style={[styles.nextBtn, !canSubmit && styles.nextBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.nextBtnText, !canSubmit && styles.nextBtnTextDisabled]}>
                {t('continueBtn')}
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
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  nextBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  nextBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  nextBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
