import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { Gender } from '../../types';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  CameraIcon,
  CheckIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'EditProfile'>;

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'genderMale' },
  { key: 'female', label: 'genderFemale' },
  { key: 'other', label: 'genderOther' },
  { key: 'secret', label: 'genderSecret' },
];

const GENDER_COLORS: Record<Gender, string> = {
  male: colors.genderMale,
  female: colors.genderFemale,
  other: colors.genderOther,
  secret: colors.outline,
};

export default function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const updateProfile = useUpdateProfile();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Use same data source as MeScreen: profile query > authStore
  const currentUser = profile || user;

  const { images: avatarImages, pickImages: pickAvatar } = useImagePicker();
  const avatarUri = avatarImages[0] || currentUser?.avatar;
  const [nickname, setNickname] = useState(currentUser?.nickname || currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [grade, setGrade] = useState(currentUser?.grade || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [gender, setGender] = useState<Gender>(currentUser?.gender || 'secret');

  const handleSave = useCallback(() => {
    const updates = { nickname, bio, grade, major, gender };
    updateUserStore(updates);
    updateProfile.mutate(updates, {
      onSuccess: () => {
        showSnackbar({ message: t('saveSuccess') || 'Saved!', type: 'success' });
        navigation.goBack();
      },
      onError: () => {
        showSnackbar({ message: t('saveError') || 'Failed to save', type: 'error' });
      },
    });
  }, [nickname, bio, grade, major, gender, updateUserStore, updateProfile, showSnackbar, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {t('editProfile') || 'Edit Profile'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={updateProfile.isPending}
          activeOpacity={0.7}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <CheckIcon size={18} color={colors.onPrimary} />
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Avatar Section ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarGlow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarWrapper}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Avatar
                    text={nickname || currentUser?.name || '?'}
                    size="xl"
                    gender={gender}
                  />
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={pickAvatar}
              activeOpacity={0.8}
            >
              <CameraIcon size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.6}>
            <Text style={styles.changeAvatarText}>
              {t('changeAvatar') || 'Change Avatar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.formCard}>
          {/* Nickname */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelNickname')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('placeholderNickname')}
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelBio')}</Text>
            <View style={[styles.inputWrapper, styles.bioInputWrapper]}>
              <TextInput
                style={[styles.fieldInput, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('placeholderBio')}
                placeholderTextColor={colors.outline}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/120</Text>
          </View>

          <View style={styles.fieldDivider} />

          {/* Major */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelMajor')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                value={major}
                onChangeText={setMajor}
                placeholder={t('placeholderMajor')}
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Grade */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelGrade')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                value={grade}
                onChangeText={setGrade}
                placeholder={t('grade')}
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
              />
            </View>
          </View>
        </View>

        {/* ── Gender Card ── */}
        <View style={styles.genderCard}>
          <Text style={styles.genderCardLabel}>{t('gender')}</Text>
          <View style={styles.genderGrid}>
            {GENDERS.map((g) => {
              const isSelected = gender === g.key;
              const accentColor = GENDER_COLORS[g.key];

              return (
                <TouchableOpacity
                  key={g.key}
                  style={[
                    styles.genderOption,
                    isSelected && {
                      backgroundColor: accentColor + '18',
                      borderColor: accentColor,
                    },
                  ]}
                  onPress={() => setGender(g.key)}
                  activeOpacity={0.7}
                >
                  {g.key === 'male' && (
                    <MaleIcon
                      size={18}
                      color={isSelected ? accentColor : colors.onSurfaceVariant}
                    />
                  )}
                  {g.key === 'female' && (
                    <FemaleIcon
                      size={18}
                      color={isSelected ? accentColor : colors.onSurfaceVariant}
                    />
                  )}
                  <Text
                    style={[
                      styles.genderText,
                      isSelected && { color: accentColor, fontWeight: '600' },
                    ]}
                  >
                    {t(g.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface1,
  },

  /* ── Top Bar ── */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    minWidth: 48,
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* ── Avatar Hero Section ── */
  avatarSection: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...elevation[2],
  },
  avatarGlow: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    ...elevation[3],
  },
  changeAvatarText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },

  /* ── Form Card ── */
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...elevation[1],
  },
  fieldGroup: {
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  bioInputWrapper: {
    minHeight: 96,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.bodySmall,
    color: colors.outline,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.xs,
    opacity: 0.4,
  },

  /* ── Gender Card ── */
  genderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    ...elevation[1],
  },
  genderCardLabel: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.lg,
    letterSpacing: 0.3,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 44,
  },
  genderText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
});
