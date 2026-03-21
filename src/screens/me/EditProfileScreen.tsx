import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { User } from '../../types';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { useImagePicker } from '../../hooks/useImagePicker';
import { uploadService } from '../../api/services/upload.service';
import { HKBU_MAJOR_KEYS, getLocalizedMajorLabel } from '../../data/hkbuMajors';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, getLocalizedFontStyle } from '../../theme/typography';
import { normalizeAvatarUrl } from '../../utils/imageUrl';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  CameraIcon,
  ChevronRightIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const bioMaxLength = i18n.language === 'en' ? 80 : 20;
  const { data: profile } = useProfile();
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const updateProfile = useUpdateProfile();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Use same data source as MeScreen: profile query > authStore
  const currentUser = profile || user;

  const { images: avatarImages, pickImages: pickAvatar } = useImagePicker();
  const pickedAvatar = avatarImages[0] || null;
  const persistedAvatarUri = normalizeAvatarUrl(currentUser?.avatar);
  const avatarUri = pickedAvatar || persistedAvatarUri;
  const showAvatarImage = Boolean(
    avatarUri &&
      (avatarUri.startsWith('http') ||
        avatarUri.startsWith('file://') ||
        avatarUri.startsWith('data:'))
  );
  const imageAvatarUri: string | undefined =
    showAvatarImage && typeof avatarUri === 'string' ? avatarUri : undefined;
  const [nickname, setNickname] = useState(currentUser?.nickname || currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [grade, setGrade] = useState(currentUser?.grade || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [isSaving, setIsSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'grade' | 'major'>('grade');
  const getMajorLabel = useCallback((value: string) => getLocalizedMajorLabel(value, t), [t]);

  const GRADE_KEYS = ['gradeUndergradY1', 'gradeUndergradY2', 'gradeUndergradY3', 'gradeUndergradY4', 'gradePostgrad', 'gradePhD'];

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Upload new avatar if user picked one
      let finalAvatarUrl: string | undefined;
      if (pickedAvatar) {
        try {
          const result = await uploadService.uploadAvatar({
            uri: pickedAvatar,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
          finalAvatarUrl = result.url;
        } catch {
          finalAvatarUrl = pickedAvatar;
        }
      }

      const updates: Partial<User> = { nickname, bio, grade, major };
      if (finalAvatarUrl) {
        updates.avatar = finalAvatarUrl;
      }

      updateUserStore(updates);
      updateProfile.mutate(updates, {
        onSuccess: () => {
          showSnackbar({ message: t('saveSuccess'), type: 'success' });
          navigation.goBack();
        },
        onError: () => {
          showSnackbar({ message: t('saveError'), type: 'error' });
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [pickedAvatar, nickname, bio, grade, major, updateUserStore, updateProfile, showSnackbar, navigation, t]);

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
        <Text style={[styles.topBarTitle, getLocalizedFontStyle(i18n.language, 'bold')]}>
          {t('editProfile')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={isSaving || updateProfile.isPending}
          activeOpacity={0.7}
        >
          {isSaving || updateProfile.isPending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text
              style={[styles.saveBtnText, getLocalizedFontStyle(i18n.language, 'medium')]}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
            >
              {t('save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar Section ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {showAvatarImage ? (
                <Image source={{ uri: imageAvatarUri }} style={styles.avatarImage} />
              ) : (
                <Avatar
                  text={nickname || currentUser?.name || '?'}
                  uri={avatarUri}
                  size="xl"
                  gender={currentUser?.gender}
                />
              )}
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
            <Text style={[styles.changeAvatarText, getLocalizedFontStyle(i18n.language, 'medium')]}>
              {t('changeAvatar')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form Section ── */}
        <View style={styles.formSection}>
          {/* Nickname */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, getLocalizedFontStyle(i18n.language, 'medium')]}>{t('labelNickname')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.fieldInput, getLocalizedFontStyle(i18n.language, 'regular')]}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('placeholderNickname')}
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, getLocalizedFontStyle(i18n.language, 'medium')]}>{t('labelBio')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.fieldInput, getLocalizedFontStyle(i18n.language, 'regular')]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('placeholderBio')}
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
                maxLength={bioMaxLength}
              />
            </View>
            <Text style={[styles.charCount, getLocalizedFontStyle(i18n.language, 'regular')]}>{bio.length}/{bioMaxLength}</Text>
          </View>

          {/* Major */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, getLocalizedFontStyle(i18n.language, 'medium')]}>{t('labelMajor')}</Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              onPress={() => { setPickerType('major'); setPickerVisible(true); }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.selectText, getLocalizedFontStyle(i18n.language, 'regular'), !major && styles.selectPlaceholder]}
                numberOfLines={2}
              >
                {major ? getMajorLabel(major) : t('major')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Grade */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, getLocalizedFontStyle(i18n.language, 'medium')]}>{t('labelGrade')}</Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              onPress={() => { setPickerType('grade'); setPickerVisible(true); }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.selectText, getLocalizedFontStyle(i18n.language, 'regular'), !grade && styles.selectPlaceholder]}
                numberOfLines={2}
              >
                {grade ? t(grade) : t('grade')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

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
              <Text style={[styles.pickerTitle, getLocalizedFontStyle(i18n.language, 'medium')]}>
                {pickerType === 'grade' ? t('labelGrade') : t('labelMajor')}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={[styles.pickerCancel, getLocalizedFontStyle(i18n.language, 'medium')]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
                data={pickerType === 'grade' ? GRADE_KEYS : HKBU_MAJOR_KEYS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const currentVal = pickerType === 'grade' ? grade : major;
                const isSelected = currentVal === item;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      if (pickerType === 'grade') setGrade(item);
                      else setMajor(item);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, getLocalizedFontStyle(i18n.language, 'regular'), isSelected && styles.pickerItemTextSelected]}>
                      {pickerType === 'major' ? getMajorLabel(item) : t(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
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
    backgroundColor: colors.surface,
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    color: '#0C1015',
    pointerEvents: 'none',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    minWidth: 72,
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

  /* ── Avatar Section ── */
  avatarSection: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
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
    borderWidth: 2,
    borderColor: colors.surface,
  },
  changeAvatarText: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },

  /* ── Form Section ── */
  formSection: {
    paddingHorizontal: spacing.xl,
  },
  fieldGroup: {
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  charCount: {
    ...typography.bodySmall,
    color: colors.onSurface,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  selectWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    paddingRight: spacing.md,
  },
  selectPlaceholder: {
    color: colors.outline,
  },
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
    backgroundColor: colors.surface3,
  },
  pickerItemText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  pickerItemTextSelected: {
    color: colors.onSurface,
    fontWeight: '700',
  },

});
