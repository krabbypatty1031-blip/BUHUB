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
  TouchableWithoutFeedback,
  Keyboard,
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
import { BackIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email.trim());
      showSnackbar({ message: t('forgotPasswordSuccess'), type: 'success' });
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (error: unknown) {
      const err = error as { message?: string; errorCode?: string };
      const code = err?.errorCode ?? '';
      if (code === 'RATE_LIMITED' || (err?.message ?? '').includes('Too many attempts')) {
        showSnackbar({ message: t('rateLimited') || '请求过于频繁，请稍后再试', type: 'error' });
      } else {
        showSnackbar({ message: t('forgotPasswordFailed'), type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, email, navigation, showSnackbar, t]);

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
              <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>
              <Text style={styles.desc}>{t('forgotPasswordDesc')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

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
                    {t('forgotPasswordSubmit')}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>{t('checkEmailHint')}</Text>
            </View>

            <View style={styles.backToLoginRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.backToLoginLink}>{t('backToLogin')}</Text>
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
  hint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  backToLoginRow: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  backToLoginLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
