import React, { useState, useCallback } from 'react';
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
import { authService } from '../../api/services/auth.service';
import { BackIcon, EyeIcon, EyeOffIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetPassword'>;

export default function SetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { email } = route.params;
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = password.length >= 8 && confirmPassword.length > 0;

  const handleNext = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    if (password.length < 8) {
      showSnackbar({ message: t('passwordTooShort'), type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      showSnackbar({ message: t('passwordMismatch'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.setPassword(password);
      navigation.navigate('InviteCode', { email });
    } catch {
      showSnackbar({ message: t('setPasswordFailed'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, password, confirmPassword, navigation, email, showSnackbar, t]);

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
          <Text style={styles.title}>{t('setPasswordTitle')}</Text>
          <Text style={styles.desc}>{t('setPasswordDesc')}</Text>
        </View>

        <View style={styles.form}>
          {/* Password Input */}
          <View style={styles.inputField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOffIcon size={20} color={colors.onSurfaceVariant} />
              ) : (
                <EyeIcon size={20} color={colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputField}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('confirmPassword')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm((v) => !v)}
              activeOpacity={0.7}
            >
              {showConfirm ? (
                <EyeOffIcon size={20} color={colors.onSurfaceVariant} />
              ) : (
                <EyeIcon size={20} color={colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <Text style={styles.hint}>{t('passwordHint')}</Text>

          {/* Next Button */}
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
  input: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    height: 48,
    flex: 1,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    height: 48,
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
