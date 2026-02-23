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
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../api/services/auth.service';
import { usePasswordInput } from '../../hooks/usePasswordInput';
import { EyeIcon, EyeOffIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    value: password,
    isVisible: isPasswordVisible,
    onChangeText: onPasswordChange,
    toggleVisibility: togglePasswordVisibility,
  } = usePasswordInput();

  const canLogin = email.trim().length > 0 && password.length > 0;

  const handleLogin = useCallback(async () => {
    if (!canLogin || isLoading) return;

    setIsLoading(true);
    try {
      const loginResult = await authService.login(email.trim(), password);
      if (loginResult.token) {
        setToken(loginResult.token);
      }

      const { user } = await authService.verifyToken();
      if (user) {
        setUser(user);
      }
    } catch (error: any) {
      const msg: string = error?.message || '';
      if (msg.includes('verify your email') || msg.includes('EMAIL_NOT_VERIFIED')) {
        showSnackbar({ message: t('emailNotVerified'), type: 'error' });
      } else if (msg.includes('disabled') || msg.includes('ACCOUNT_DISABLED')) {
        showSnackbar({ message: t('accountDisabled'), type: 'error' });
      } else {
        showSnackbar({ message: t('invalidCredentials'), type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [canLogin, isLoading, email, password, setUser, setToken, showSnackbar, t]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>UHUB</Text>
          <Text style={styles.subtitle}>{t('loginDesc')}</Text>
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
              editable={!isLoading}
            />
          </View>

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
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={togglePasswordVisibility}
              activeOpacity={0.7}
            >
              {isPasswordVisible ? (
                <EyeOffIcon size={20} color={colors.onSurfaceVariant} />
              ) : (
                <EyeIcon size={20} color={colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, !canLogin && styles.loginBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={!canLogin || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.loginBtnText, !canLogin && styles.loginBtnTextDisabled]}>
                {t('loginBtn')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>{t('noAccount')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EmailInput')}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLink}>{t('registerNow')}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 48,
  },
  logoText: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
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
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  loginBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  loginBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  loginBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.xs,
  },
  registerText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  registerLink: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
