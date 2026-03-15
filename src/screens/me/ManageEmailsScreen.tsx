import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { MeStackParamList } from '../../types/navigation';
import { useProfile } from '../../hooks/useUser';
import { authService } from '../../api/services/auth.service';
import { userService } from '../../api/services/user.service';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon } from '../../components/common/icons';
import type { LinkedEmail, User } from '../../types';

type Props = NativeStackScreenProps<MeStackParamList, 'ManageEmails'>;

function formatGenericProviderLabel(provider: string, language: string) {
  if (!provider) {
    if (language.startsWith('en')) return 'Email';
    if (language.startsWith('sc')) return '邮箱';
    return '郵箱';
  }

  if (language.startsWith('en')) return `${provider} Email`;
  if (language.startsWith('sc')) return `${provider}邮箱`;
  return `${provider}郵箱`;
}

function getEmailTypeLabel(email: LinkedEmail, language: string, t: (key: string) => string) {
  const normalizedEmail = email.email.toLowerCase();
  const domain = normalizedEmail.split('@')[1] ?? '';

  if (domain === 'life.hkbu.edu.hk') return t('hkbuEmailTag');
  if (['qq.com', 'vip.qq.com', 'foxmail.com'].includes(domain)) {
    return formatGenericProviderLabel('QQ', language);
  }
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'Gmail';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'Outlook';
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return 'iCloud';
  if (['yahoo.com', 'yahoo.com.hk', 'yahoo.com.cn'].includes(domain)) return 'Yahoo';
  if (['163.com', '126.com', 'yeah.net'].includes(domain)) {
    return language.startsWith('en') ? 'NetEase Mail' : language.startsWith('sc') ? '网易邮箱' : '網易郵箱';
  }
  if (['proton.me', 'protonmail.com'].includes(domain)) return 'Proton';

  const root = domain.split('.').filter(Boolean).at(-2) ?? '';
  const provider = root.length <= 4 ? root.toUpperCase() : `${root.slice(0, 1).toUpperCase()}${root.slice(1)}`;
  return formatGenericProviderLabel(provider, language);
}

function getCurrentLoginEmailLabel(language: string) {
  if (language.startsWith('en')) return 'Current login email';
  if (language.startsWith('sc')) return '当前登录邮箱';
  return '當前登入郵箱';
}

function getLongPressUnlinkHint(language: string) {
  if (language.startsWith('en')) return 'Long press an email to unlink it';
  if (language.startsWith('sc')) return '长按邮箱即可解除绑定';
  return '長按郵箱即可解除綁定';
}

export default function ManageEmailsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlinkingEmailId, setUnlinkingEmailId] = useState<string | null>(null);

  const linkedEmails = profile?.linkedEmails ?? [];
  const canBindAnotherEmail = linkedEmails.length < 2;
  const canLongPressToUnlink = linkedEmails.length === 2;
  const isBindingHkbuEmail = !profile?.isHKBUVerified;
  const currentLoginEmailLabel = getCurrentLoginEmailLabel(i18n.language);
  const longPressUnlinkHint = getLongPressUnlinkHint(i18n.language);

  const applyEmailState = useCallback(
    (nextState: {
      linkedEmails: LinkedEmail[];
      isHKBUVerified: boolean;
      hkbuEmail?: string;
      currentLoginEmail?: string;
    }) => {
      queryClient.setQueryData<User | undefined>(['profile'], (current) => {
        if (!current) return current;
        const primaryEmail =
          nextState.linkedEmails.find((item) => item.isPrimary)?.email ?? current.email;
        return {
          ...current,
          email: primaryEmail,
          linkedEmails: nextState.linkedEmails,
          isHKBUVerified: nextState.isHKBUVerified,
          hkbuEmail: nextState.hkbuEmail,
          currentLoginEmail: nextState.currentLoginEmail ?? current.currentLoginEmail,
        };
      });

      const primaryEmail =
        nextState.linkedEmails.find((item) => item.isPrimary)?.email ?? profile?.email ?? '';
      updateUser({
        email: primaryEmail,
        linkedEmails: nextState.linkedEmails,
        isHKBUVerified: nextState.isHKBUVerified,
        hkbuEmail: nextState.hkbuEmail,
        currentLoginEmail: nextState.currentLoginEmail,
      });
    },
    [profile?.email, queryClient, updateUser]
  );

  const handleSendCode = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;
    setIsSendingCode(true);
    try {
      await authService.bindHkbuSendCode(trimmedEmail);
      setCodeSent(true);
      showSnackbar({ message: t('codeSent'), type: 'success' });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: string }).message ?? '')
          : '';
      showSnackbar({ message: message || t('sendCodeFailed'), type: 'error' });
    } finally {
      setIsSendingCode(false);
    }
  }, [email, showSnackbar, t]);

  const handleVerify = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (!trimmedEmail || trimmedCode.length !== 6) return;
    setIsVerifying(true);
    try {
      const nextState = await authService.bindHkbuVerify(trimmedEmail, trimmedCode);
      applyEmailState(nextState);
      setEmail('');
      setCode('');
      setCodeSent(false);
      showSnackbar({ message: t('verifySuccess'), type: 'success' });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: string }).message ?? '')
          : '';
      showSnackbar({ message: message || t('verifyFailed'), type: 'error' });
    } finally {
      setIsVerifying(false);
    }
  }, [applyEmailState, code, email, showSnackbar, t]);

  const handleUnlink = useCallback(
    (linkedEmail: LinkedEmail) => {
      Alert.alert(t('unlinkEmail'), t('unlinkEmailConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          style: 'destructive',
          onPress: async () => {
            setUnlinkingEmailId(linkedEmail.id);
            try {
              const nextState = await userService.unlinkEmail(linkedEmail.id);
              if (nextState.requiresRelogin) {
                try {
                  await authService.logout();
                } catch {
                  // Session may already be revoked on the server.
                }
                queryClient.clear();
                logout();
                return;
              }
              applyEmailState(nextState);
              showSnackbar({ message: t('unlinkEmailSuccess'), type: 'success' });
            } catch (error: unknown) {
              const message =
                typeof error === 'object' && error && 'message' in error
                  ? String((error as { message?: string }).message ?? '')
                  : '';
              showSnackbar({ message: message || t('saveFailed'), type: 'error' });
            } finally {
              setUnlinkingEmailId(null);
            }
          },
        },
      ]);
    },
    [applyEmailState, logout, queryClient, showSnackbar, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('manageEmails')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('linkedEmail')}</Text>
          <View style={styles.card}>
            {canLongPressToUnlink ? (
              <Text style={styles.sectionHint}>{longPressUnlinkHint}</Text>
            ) : null}
            {linkedEmails.length === 0 ? (
              <Text style={styles.sectionHint}>{t('noLinkedEmails')}</Text>
            ) : (
              <View style={styles.emailList}>
                {linkedEmails.map((item) => (
                  <View key={item.id} style={styles.emailListItem}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      delayLongPress={250}
                      disabled={!canLongPressToUnlink || unlinkingEmailId === item.id}
                      onLongPress={() => handleUnlink(item)}
                      style={[
                        styles.emailCard,
                        canLongPressToUnlink ? styles.emailCardInteractive : null,
                        unlinkingEmailId === item.id ? styles.emailCardDisabled : null,
                      ]}
                    >
                      <View style={styles.emailCardHeader}>
                        <Text style={styles.emailValue}>{item.email}</Text>
                        <View style={styles.emailBadge}>
                          <Text style={styles.emailBadgeText}>
                            {getEmailTypeLabel(item, i18n.language, t)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.emailMetaText}>
                        {item.email === profile?.currentLoginEmail
                          ? currentLoginEmailLabel
                          : item.canLogin
                            ? t('linkedEmail')
                            : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {canBindAnotherEmail ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              {isBindingHkbuEmail ? t('bindHkbuEmail') : t('linkedEmail')}
            </Text>
            <View style={styles.card}>
              {isBindingHkbuEmail ? (
                <Text style={styles.sectionHint}>{t('bindHkbuEmailHint')}</Text>
              ) : null}
              <View style={styles.inputField}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder={isBindingHkbuEmail ? 'name@life.hkbu.edu.hk' : t('emailPlaceholder')}
                  placeholderTextColor={colors.onSurfaceVariant}
                  editable={!isSendingCode && !isVerifying}
                />
              </View>
              {codeSent ? (
                <>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder={t('verificationCode')}
                      placeholderTextColor={colors.onSurfaceVariant}
                      editable={!isVerifying}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleVerify}
                    disabled={isVerifying || code.trim().length !== 6}
                  >
                    <Text style={styles.primaryButtonText}>{t('verify')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSendCode}
                  disabled={isSendingCode || !email.trim()}
                >
                  <Text style={styles.primaryButtonText}>{t('sendCode')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}
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
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    ...typography.labelLarge,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  emailList: {
    gap: spacing.md,
  },
  emailListItem: {
    gap: 0,
  },
  emailCard: {
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  emailCardInteractive: {
    backgroundColor: colors.surface2,
  },
  emailCardDisabled: {
    opacity: 0.6,
  },
  emailCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  emailValue: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 22,
  },
  emailBadge: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  emailBadgeText: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  emailMetaText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  inputField: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    height: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
