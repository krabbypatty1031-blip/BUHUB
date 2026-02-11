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
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  CameraIcon,
  CheckIcon,
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
  const avatarUri = avatarImages[0] || currentUser?.avatar;
  const [nickname, setNickname] = useState(currentUser?.nickname || currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [grade, setGrade] = useState(currentUser?.grade || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'grade' | 'major'>('grade');

  const GRADE_KEYS = ['gradeUndergradY1', 'gradeUndergradY2', 'gradeUndergradY3', 'gradeUndergradY4', 'gradePostgrad', 'gradePhD'];
  const MAJOR_KEYS = ['majorCS', 'majorComm', 'majorMusic', 'majorJournalism', 'majorBCDA', 'majorAI', 'majorSE', 'majorIDS'];

  const handleSave = useCallback(() => {
    const updates = { nickname, bio, grade, major };
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
  }, [nickname, bio, grade, major, updateUserStore, updateProfile, showSnackbar, navigation, t]);

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
        {/* ── Avatar Section ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Avatar
                  text={nickname || currentUser?.name || '?'}
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
            <Text style={styles.changeAvatarText}>
              {t('changeAvatar') || 'Change Avatar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form Section ── */}
        <View style={styles.formSection}>
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
                maxLength={bioMaxLength}
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/{bioMaxLength}</Text>
          </View>

          {/* Major */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelMajor')}</Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              onPress={() => { setPickerType('major'); setPickerVisible(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, !major && styles.selectPlaceholder]}>
                {major ? t(major) : t('major')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Grade */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('labelGrade')}</Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              onPress={() => { setPickerType('grade'); setPickerVisible(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, !grade && styles.selectPlaceholder]}>
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
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {pickerType === 'grade' ? t('labelGrade') : t('labelMajor')}
              </Text>
              <View style={{ width: 60 }} />
            </View>
            <FlatList
              data={pickerType === 'grade' ? GRADE_KEYS : MAJOR_KEYS}
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
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {t(item)}
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
  bioInputWrapper: {
    minHeight: 96,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
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
  pickerCancel: {
    ...typography.labelLarge,
    color: colors.onSurface,
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
