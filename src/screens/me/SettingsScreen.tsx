import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { changeLanguage } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  BackIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '../../components/common/icons';
import type { Gender } from '../../types/common';

type Props = NativeStackScreenProps<MeStackParamList, 'Settings'>;

type Visibility = 'public' | 'mutual' | 'hidden';
type PickerType = 'visibility' | 'gender' | 'language';

const LANGUAGE_OPTIONS = [
  { value: 'tc' as const, label: '粵語 🇭🇰' },
  { value: 'sc' as const, label: '普通話 🇨🇳' },
  { value: 'en' as const, label: 'English 🇬🇧' },
];

export default function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const language = useAuthStore((s) => s.language);
  const logout = useAuthStore((s) => s.logout);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Local state
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [taskReminder, setTaskReminder] = useState(true);
  const [dmNotification, setDmNotification] = useState(true);
  const [dndMode, setDndMode] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('visibility');
  const [expandedLegal, setExpandedLegal] = useState(false);
  const [expandedAgreement, setExpandedAgreement] = useState(false);

  // Visibility options
  const visibilityLabels: Record<Visibility, string> = {
    public: t('visibilityPublic'),
    mutual: t('visibilityMutualOnly'),
    hidden: t('visibilityHidden'),
  };

  // Gender display mapping
  const genderLabels: Record<Gender, string> = {
    male: t('genderMale'),
    female: t('genderFemale'),
    other: t('genderOther'),
    secret: t('genderSecret'),
  };

  const genderOptions: Gender[] = ['male', 'female', 'other', 'secret'];

  // Picker data
  const getPickerData = useCallback((): string[] => {
    switch (pickerType) {
      case 'visibility':
        return [t('visibilityPublic'), t('visibilityMutualOnly'), t('visibilityHidden')];
      case 'gender':
        return genderOptions.map((g) => genderLabels[g]);
      case 'language':
        return LANGUAGE_OPTIONS.map((l) => l.label);
    }
  }, [pickerType, t]);

  const getPickerTitle = useCallback((): string => {
    switch (pickerType) {
      case 'visibility':
        return t('profileVisibility');
      case 'gender':
        return t('genderDisplay');
      case 'language':
        return t('systemLanguage');
    }
  }, [pickerType, t]);

  const getCurrentPickerValue = useCallback((): string => {
    switch (pickerType) {
      case 'visibility':
        return visibilityLabels[visibility];
      case 'gender':
        return genderLabels[user?.gender || 'male'];
      case 'language':
        return LANGUAGE_OPTIONS.find((l) => l.value === language)?.label || LANGUAGE_OPTIONS[0].label;
    }
  }, [pickerType, visibility, user?.gender, language, visibilityLabels, genderLabels]);

  const showPicker = useCallback((type: PickerType) => {
    setPickerType(type);
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string) => {
      switch (pickerType) {
        case 'visibility': {
          const visibilityMap: Record<string, Visibility> = {
            [t('visibilityPublic')]: 'public',
            [t('visibilityMutualOnly')]: 'mutual',
            [t('visibilityHidden')]: 'hidden',
          };
          setVisibility(visibilityMap[value] || 'public');
          break;
        }
        case 'gender': {
          const genderMap: Record<string, Gender> = {
            [t('genderMale')]: 'male',
            [t('genderFemale')]: 'female',
            [t('genderOther')]: 'other',
            [t('genderSecret')]: 'secret',
          };
          const mapped = genderMap[value] || 'other';
          updateUser({ gender: mapped });
          break;
        }
        case 'language': {
          const langOption = LANGUAGE_OPTIONS.find((l) => l.label === value);
          if (langOption) {
            setLanguage(langOption.value);
            changeLanguage(langOption.value);
          }
          break;
        }
      }
      setPickerVisible(false);
    },
    [pickerType, t, updateUser, setLanguage]
  );

  const handleLogout = useCallback(() => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirmBtn'), style: 'destructive', onPress: () => logout() },
    ]);
  }, [t, logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirmBtn'), style: 'destructive', onPress: () => logout() },
    ]);
  }, [t, logout]);

  const handleBlocklist = useCallback(() => {
    showSnackbar({ message: t('blocklistEmpty'), type: 'info' });
  }, [showSnackbar, t]);

  const currentLangLabel =
    LANGUAGE_OPTIONS.find((l) => l.value === language)?.label || LANGUAGE_OPTIONS[0].label;

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
          {/* Linked Email */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('linkedEmail')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue} numberOfLines={1}>
                {user?.name ? `s${user.name.slice(-8)}@hkbu.edu.hk` : '---'}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Linked Phone */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('linkedPhone')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValueMuted}>{t('bindPhone')}</Text>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={styles.rowLabelWarning}>{t('logout')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Delete Account */}
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <Text style={styles.rowLabelError}>{t('deleteAccount')}</Text>
          </TouchableOpacity>
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

          {/* Gender Display */}
          <TouchableOpacity style={styles.row} onPress={() => showPicker('gender')}>
            <Text style={styles.rowLabel}>{t('genderDisplay')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{genderLabels[user?.gender || 'male']}</Text>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Blocklist */}
          <TouchableOpacity style={styles.row} onPress={handleBlocklist}>
            <Text style={styles.rowLabel}>{t('blocklist')}</Text>
            <View style={styles.rowRight}>
              <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
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
            <Switch
              value={taskReminder}
              onValueChange={setTaskReminder}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={taskReminder ? colors.primary : colors.outline}
            />
          </View>

          <View style={styles.divider} />

          {/* DM Notification */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.rowLabel}>{t('dmNotification')}</Text>
              <Text style={styles.toggleDesc}>{t('dmNotificationDesc')}</Text>
            </View>
            <Switch
              value={dmNotification}
              onValueChange={setDmNotification}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={dmNotification ? colors.primary : colors.outline}
            />
          </View>

          <View style={styles.divider} />

          {/* DND Mode */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.rowLabel}>{t('dndMode')}</Text>
              <Text style={styles.toggleDesc}>{t('dndModeDesc')}</Text>
            </View>
            <Switch
              value={dndMode}
              onValueChange={setDndMode}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={dndMode ? colors.primary : colors.outline}
            />
          </View>
        </View>

        {/* ── Section 5: About & Legal ── */}
        <Text style={styles.sectionHeader}>{t('aboutLegal')}</Text>
        <View style={styles.sectionCard}>
          {/* Legal Disclaimer (expandable) */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setExpandedLegal((v) => !v)}
          >
            <Text style={styles.rowLabel}>{t('legalDisclaimer')}</Text>
            <View style={[styles.chevronWrap, expandedLegal && styles.chevronRotated]}>
              <ChevronDownIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          {expandedLegal && (
            <Text style={styles.expandedText}>{t('legalDisclaimerContent')}</Text>
          )}

          <View style={styles.divider} />

          {/* User Agreement (expandable) */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setExpandedAgreement((v) => !v)}
          >
            <Text style={styles.rowLabel}>{t('userAgreement')}</Text>
            <View style={[styles.chevronWrap, expandedAgreement && styles.chevronRotated]}>
              <ChevronDownIcon size={18} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          {expandedAgreement && (
            <Text style={styles.expandedText}>{t('userAgreementContent')}</Text>
          )}

          <View style={styles.divider} />

          {/* Version Info */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('versionInfo')}</Text>
            <Text style={styles.rowValueMuted}>v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{getPickerTitle()}</Text>
              <View style={{ width: 60 }} />
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
    color: colors.onSurfaceVariant,
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
  rowHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: -spacing.xs,
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

  /* Expandable */
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  expandedText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },

  /* Picker Modal (reused from ProfileSetupScreen) */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  pickerCancel: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  pickerTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
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
