import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { changeLanguage } from '../../i18n';
import { authService } from '../../api/services/auth.service';
import { userService } from '../../api/services/user.service';
import { notificationService } from '../../api/services/notification.service';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, ChevronRightIcon } from '../../components/common/icons';
import IOSSwitch from '../../components/common/IOSSwitch';
import ScrollPickerSheet from '../../components/common/ScrollPickerSheet';
import { PRIVACY_URL, TERMS_URL } from '../../config/legal';
import type { MyInviteCode } from '../../types';

type Props = NativeStackScreenProps<MeStackParamList, 'Settings'>;

type Visibility = 'public' | 'mutual' | 'hidden';
type PickerType = 'visibility' | 'language';

const LANGUAGE_OPTIONS = [
  { value: 'tc' as const, labelKey: 'traditionalChinese' },
  { value: 'sc' as const, labelKey: 'simplifiedChinese' },
  { value: 'en' as const, labelKey: 'english' },
];

const APP_VERSION = '0.1.5';

export default function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const language = useAuthStore((s) => s.language);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const queryClient = useQueryClient();

  // Local state
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [taskReminder, setTaskReminder] = useState(true);
  const [dmNotification, setDmNotification] = useState(true);
  const [inviteCodes, setInviteCodes] = useState<MyInviteCode[]>([]);
  const [inviteCodesLoading, setInviteCodesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setInviteCodesLoading(true);
    userService
      .getMyInviteCodes()
      .then((list) => {
        if (mounted) setInviteCodes(list);
      })
      .catch(() => {
        if (mounted) showSnackbar({ message: t('saveFailed'), type: 'error' });
      })
      .finally(() => {
        if (mounted) setInviteCodesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showSnackbar, t]);

  const handleTaskReminderChange = useCallback((value: boolean) => {
    setTaskReminder(value);
    notificationService.updateSettings({ system: value }).catch(() => {
      showSnackbar({ message: t('saveFailed'), type: 'error' });
    });
  }, [showSnackbar, t]);

  const handleDmNotificationChange = useCallback((value: boolean) => {
    setDmNotification(value);
    notificationService.updateSettings({ messages: value }).catch(() => {
      showSnackbar({ message: t('saveFailed'), type: 'error' });
    });
  }, [showSnackbar, t]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('visibility');

  const getLanguageLabel = useCallback(
    (langValue: (typeof LANGUAGE_OPTIONS)[number]['value']) => {
      const option = LANGUAGE_OPTIONS.find((l) => l.value === langValue);
      if (!option) return '';
      return t(option.labelKey);
    },
    [t]
  );

  const languagePickerOptions = LANGUAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  // Visibility options
  const visibilityLabels: Record<Visibility, string> = {
    public: t('visibilityPublic'),
    mutual: t('visibilityMutualOnly'),
    hidden: t('visibilityHidden'),
  };

  // Picker data
  const getPickerData = useCallback(
    (): string[] => [t('visibilityPublic'), t('visibilityMutualOnly'), t('visibilityHidden')],
    [t]
  );

  const getPickerTitle = useCallback((): string => t('profileVisibility'), [t]);

  const getCurrentPickerValue = useCallback((): string => visibilityLabels[visibility], [visibility, visibilityLabels]);

  const showPicker = useCallback((type: PickerType) => {
    setPickerType(type);
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string) => {
      if (pickerType === 'visibility') {
        const visibilityMap: Record<string, Visibility> = {
          [t('visibilityPublic')]: 'public',
          [t('visibilityMutualOnly')]: 'mutual',
          [t('visibilityHidden')]: 'hidden',
        };
        setVisibility(visibilityMap[value] || 'public');
      }
      setPickerVisible(false);
    },
    [pickerType, t]
  );

  const handleLanguageSelect = useCallback(
    (value: string) => {
      const langOption = LANGUAGE_OPTIONS.find((option) => option.value === value);
      if (!langOption) {
        setPickerVisible(false);
        return;
      }

      setLanguage(langOption.value);
      changeLanguage(langOption.value);
      userService.updateLanguage(langOption.value).catch(() => {
        showSnackbar({ message: t('saveFailed'), type: 'error' });
      });
      setPickerVisible(false);
    },
    [setLanguage, showSnackbar, t]
  );

  const handleLogout = useCallback(() => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } catch {
            // Still logout locally even if API fails
          }
          queryClient.clear();
          logout();
        },
      },
    ]);
  }, [t, logout, queryClient]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.deleteAccount();
            queryClient.clear();
            deleteAccount();
          } catch {
            showSnackbar({ message: t('deleteFailed'), type: 'error' });
          }
        },
      },
    ]);
  }, [t, deleteAccount, showSnackbar, queryClient]);

  const handleBlocklist = useCallback(() => {
    navigation.navigate('Blocklist');
  }, [navigation]);

  const handleExportData = useCallback(async () => {
    try {
      showSnackbar({ message: t('exportDataStarted'), type: 'info' });
      const result = await userService.requestDataExport();
      if (!result?.jobId) {
        showSnackbar({ message: t('exportDataFailed'), type: 'error' });
        return;
      }
      const pollResult = await userService.pollExportJob(result.jobId);
      if (!pollResult?.downloadUrl) {
        showSnackbar({ message: t('exportDataFailed'), type: 'error' });
        return;
      }
      showSnackbar({ message: t('exportDataReady'), type: 'success' });
      try {
        const canOpen = await Linking.canOpenURL(pollResult.downloadUrl);
        if (canOpen) {
          await Linking.openURL(pollResult.downloadUrl);
        }
      } catch (_openErr) {
        // Fallback: offer to share the link
        try {
          await Share.share({
            url: pollResult.downloadUrl,
            title: t('exportMyData'),
            message: t('exportDataReady'),
          });
        } catch (_shareErr) {
          // User cancelled or share not available
        }
      }
    } catch (err) {
      console.warn('[Export]', err);
      showSnackbar({ message: t('exportDataFailed'), type: 'error' });
    }
  }, [t, showSnackbar]);

  const currentLangLabel = getLanguageLabel(language);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('settings')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Section 1: Account & Security ── */}
        <Text style={styles.sectionHeader}>{t('accountSecurity')}</Text>
        <View style={styles.sectionCard}>
          {/* Linked Email (read-only) */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('linkedEmail')}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email || '---'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Delete Account */}
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <Text style={styles.rowLabelWarning}>{t('delete')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={styles.rowLabelError}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>{t('myInviteCodes')}</Text>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHintBlock}>
            <Text style={styles.sectionHint}>{t('inviteCodesHint')}</Text>
          </View>
          <View style={styles.divider} />
          {inviteCodesLoading ? (
            <View style={styles.row}>
              <Text style={styles.rowValueMuted}>...</Text>
            </View>
          ) : inviteCodes.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowValueMuted}>---</Text>
            </View>
          ) : (
            inviteCodes.map((item) => (
              <View key={item.id}>
                <View style={styles.row}>
                  <View style={styles.inviteCodeLeft}>
                    <Text style={styles.inviteCodeText}>{item.code}</Text>
                    <Text style={styles.inviteCodeMeta}>
                      {item.status === 'used'
                        ? `${t('inviteCodeStatusUsed')} · ${t('inviteCodeUsedBy')}: ${item.usedBy?.nickname || item.usedBy?.userName || '---'}`
                        : t('inviteCodeStatusUnused')}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </View>
            ))
          )}
        </View>

        {/* ── Section 2: Privacy ── */}
        <Text style={styles.sectionHeader}>{t('privacySettings')}</Text>
        <View style={styles.sectionCard}>
          {/* Profile Visibility */}
          <TouchableOpacity style={styles.row} onPress={() => showPicker('visibility')}>
            <Text style={styles.rowLabel}>{t('profileVisibility')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{visibilityLabels[visibility]}</Text>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <Text style={styles.rowHint}>{t('profileVisibilityHint')}</Text>

          <View style={styles.divider} />

          {/* Blocklist */}
          <TouchableOpacity style={styles.row} onPress={handleBlocklist}>
            <Text style={styles.rowLabel}>{t('blocklist')}</Text>
            <View style={styles.rowRight}>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Export Data */}
          <TouchableOpacity style={styles.row} onPress={handleExportData}>
            <Text style={styles.rowLabel}>{t('exportMyData')}</Text>
            <View style={styles.rowRight}>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <Text style={styles.rowHint}>{t('exportDataHint')}</Text>

        </View>

        {/* ── Section 3: General ── */}
        <Text style={styles.sectionHeader}>{t('generalSettings')}</Text>
        <View style={styles.sectionCard}>
          {/* System Language */}
          <TouchableOpacity style={styles.row} onPress={() => showPicker('language')}>
            <Text style={styles.rowLabel}>{t('systemLanguage')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{currentLangLabel}</Text>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <Text style={styles.rowHint}>{t('languageHint')}</Text>
        </View>

        {/* ── Section 4: Notifications ── */}
        <Text style={styles.sectionHeader}>{t('notificationSettings')}</Text>
        <View style={styles.sectionCard}>
          {/* Task Reminder */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.rowLabel}>{t('taskReminder')}</Text>
              <Text style={styles.toggleDesc}>{t('taskReminderDesc')}</Text>
            </View>
            <IOSSwitch
              value={taskReminder}
              onValueChange={handleTaskReminderChange}
              activeColor={colors.onSurface}
            />
          </View>

          <View style={styles.divider} />

          {/* DM Notification */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.rowLabel}>{t('dmNotification')}</Text>
              <Text style={styles.toggleDesc}>{t('dmNotificationDesc')}</Text>
            </View>
            <IOSSwitch
              value={dmNotification}
              onValueChange={handleDmNotificationChange}
              activeColor={colors.onSurface}
            />
          </View>

          <View style={styles.divider} />
        </View>

        {/* ── Section 5: About & Legal ── */}
        <Text style={styles.sectionHeader}>{t('aboutLegal')}</Text>
        <View style={styles.sectionCard}>
          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL).catch(() => {})}
            disabled={!PRIVACY_URL}
          >
            <Text style={styles.rowLabel}>{t('privacyPolicy')}</Text>
            {PRIVACY_URL && (
              <View style={styles.rowRight}>
                <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Terms of Service */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => TERMS_URL && Linking.openURL(TERMS_URL).catch(() => {})}
            disabled={!TERMS_URL}
          >
            <Text style={styles.rowLabel}>{t('termsOfService')}</Text>
            {TERMS_URL && (
              <View style={styles.rowRight}>
                <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Version Info */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('versionInfo')}</Text>
            <Text style={styles.rowValueMuted}>{`v${APP_VERSION}`}</Text>
          </View>
        </View>
      </ScrollView>

      {pickerType === 'visibility' ? (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          >
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderSide} />
                <Text style={styles.pickerTitle}>{getPickerTitle()}</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.pickerCancel}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={getPickerData()}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      getCurrentPickerValue() === item && styles.pickerItemSelected,
                    ]}
                    onPress={() => handlePickerSelect(item)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        getCurrentPickerValue() === item && styles.pickerItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        <ScrollPickerSheet
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onConfirm={handleLanguageSelect}
          options={languagePickerOptions}
          initialValue={language}
          title={t('systemLanguage')}
        />
      )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Section */
  sectionHeader: {
    ...typography.labelLarge,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },
  rowLabelWarning: {
    ...typography.bodyMedium,
    color: colors.warning,
  },
  rowLabelError: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
    maxWidth: '60%',
  },
  rowValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  rowValueMuted: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  inviteCodeLeft: {
    flex: 1,
    gap: spacing.xxs,
  },
  inviteCodeText: {
    ...typography.titleMedium,
    color: colors.onSurface,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  inviteCodeMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  rowHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  sectionHintBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: spacing.lg,
  },

  /* Toggle row */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  toggleLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },

  /* Picker Modal (reused from ProfileSetupScreen) */
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: 360,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  pickerHeaderSide: {
    width: 48,
  },
  pickerCancel: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  pickerTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: colors.primaryContainer + '40',
  },
  pickerItemText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});

