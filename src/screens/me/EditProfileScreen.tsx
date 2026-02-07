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
import { useUpdateProfile } from '../../hooks/useUser';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, CameraIcon, CheckIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'EditProfile'>;

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'male' },
  { key: 'female', label: 'female' },
  { key: 'other', label: 'other' },
  { key: 'secret', label: 'secret' },
];

export default function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const updateProfile = useUpdateProfile();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const { images: avatarImages, pickImages: pickAvatar } = useImagePicker();
  const avatarUri = avatarImages[0] || user?.avatar;
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [major, setMajor] = useState(user?.major || '');
  const [gender, setGender] = useState<Gender>(user?.gender || 'secret');

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
          style={styles.iconBtn}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <CheckIcon size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Avatar
                text={nickname || user?.name || '?'}
                size="xl"
                gender={gender}
              />
            )}
            <TouchableOpacity style={styles.cameraBtn} onPress={pickAvatar}>
              <CameraIcon size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changeAvatarText}>
            {t('changeAvatar') || 'Change Avatar'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('nickname') || 'Nickname'}</Text>
            <TextInput
              style={styles.fieldInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('enterNickname') || 'Enter nickname'}
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('bio') || 'Bio'}</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('enterBio') || 'Enter bio'}
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('grade') || 'Grade'}</Text>
            <TextInput
              style={styles.fieldInput}
              value={grade}
              onChangeText={setGrade}
              placeholder={t('enterGrade') || 'Enter grade'}
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('major') || 'Major'}</Text>
            <TextInput
              style={styles.fieldInput}
              value={major}
              onChangeText={setMajor}
              placeholder={t('enterMajor') || 'Enter major'}
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>

          {/* Gender Selection */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('gender') || 'Gender'}</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[
                    styles.genderOption,
                    gender === g.key && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(g.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === g.key && styles.genderTextSelected,
                    ]}
                  >
                    {t(g.label) || g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  changeAvatarText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  // Form
  formSection: {
    padding: spacing.lg,
  },
  fieldRow: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.labelLarge,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 44,
  },
  bioInput: {
    height: 80,
    paddingTop: spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
  },
  genderOptionSelected: {
    backgroundColor: colors.primaryContainer,
  },
  genderText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  genderTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
});
