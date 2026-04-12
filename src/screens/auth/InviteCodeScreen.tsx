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

type Props = NativeStackScreenProps<AuthStackParamList, 'InviteCode'>;

export default function InviteCodeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const setPendingInviteCode = useAuthStore((s) => s.setPendingInviteCode);

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = code.trim().length > 0;

  const handleNext = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await authService.verifyInviteCode(code.trim());
      if (result.valid) {
        setPendingInviteCode(result.code || code.trim().toUpperCase());
        navigation.navigate('EmailInput');
      } else {
        showSnackbar({ message: t('inviteCodeInvalid'), type: 'error' });
      }
    } catch {
      showSnackbar({ message: t('inviteCodeFailed'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, code, navigation, showSnackbar, t, setPendingInviteCode]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centerContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('inviteCodeTitle')}</Text>
              <Text style={styles.desc}>{t('inviteCodeDesc')}</Text>
            </View>

            <View style={styles.form}>
            {/* Invite Code Input */}
            <View style={styles.inputField}>
              <TextInput
                style={styles.input}
                placeholder={t('inviteCodePlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>

            {/* Hint */}
            <Text style={styles.hint}>{t('inviteCodeHint')}</Text>

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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
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
    minHeight: 56,
  },
  input: {
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    color: colors.onSurface,
    flex: 1,
    paddingVertical: 14,
    letterSpacing: 2,
    textAlignVertical: 'center',
    includeFontPadding: false,
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
