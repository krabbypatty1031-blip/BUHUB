import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { changeLanguage } from '../../i18n';
import { useImagePicker } from '../../hooks/useImagePicker';
import { authService } from '../../api/services/auth.service';
import { uploadService } from '../../api/services/upload.service';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, ChevronRightIcon, CameraIcon } from '../../components/common/icons';
import DefaultAvatarPicker, { DEFAULT_AVATARS, DefaultAvatarSvg, InitialAvatar, getDiceBearUrl } from '../../components/common/DefaultAvatarPicker';
import type { Gender } from '../../types/common';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

type PickerType = 'grade' | 'major' | 'gender';

export default function ProfileSetupScreen({ navigation, route }: Props) {
  const email = route.params.email;
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const language = useAuthStore((s) => s.language);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const { images, pickImages } = useImagePicker();
  const [isSaving, setIsSaving] = useState(false);
  const avatarUri = images[0] || null;

  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [gender, setGender] = useState('');
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('grade');

  const GRADE_KEYS = ['gradeUndergradY1', 'gradeUndergradY2', 'gradeUndergradY3', 'gradeUndergradY4', 'gradePostgrad', 'gradePhD'];
  const MAJOR_KEYS = ['majorCS', 'majorComm', 'majorMusic', 'majorJournalism', 'majorBCDA', 'majorAI', 'majorSE', 'majorIDS'];

  const pickerData: Record<PickerType, string[]> = {
    grade: GRADE_KEYS,
    major: MAJOR_KEYS,
    gender: [t('genderMale'), t('genderFemale'), t('genderOther'), t('genderSecret')],
  };

  const pickerTitles: Record<PickerType, string> = {
    grade: t('grade'),
    major: t('major'),
    gender: t('gender'),
  };

  const currentValues: Record<PickerType, string> = {
    grade,
    major,
    gender,
  };

  const showPicker = useCallback((type: PickerType) => {
    setPickerType(type);
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string) => {
      switch (pickerType) {
        case 'grade':
          setGrade(value);
          break;
        case 'major':
          setMajor(value);
          break;
        case 'gender':
          setGender(value);
          break;
      }
      setPickerVisible(false);
    },
    [pickerType]
  );

  const hasAvatar = !!(avatarUri || selectedDefaultAvatar);
  const isFormComplete = !!(nickname.trim() && grade && major && gender && hasAvatar);

  const mapGender = (genderLabel: string): Gender => {
    const genderMap: Record<string, Gender> = {
      [t('genderMale')]: 'male',
      [t('genderFemale')]: 'female',
      [t('genderOther')]: 'other',
      [t('genderSecret')]: 'secret',
    };
    return genderMap[genderLabel] || 'other';
  };

  const handleDone = useCallback(async () => {
    const resolvedGender = mapGender(gender) || 'male';
    setIsSaving(true);
    try {
      // Upload avatar if selected
      let finalAvatarUrl: string | null = null;
      if (avatarUri) {
        try {
          const result = await uploadService.uploadAvatar({
            uri: avatarUri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
          finalAvatarUrl = result.url;
        } catch {
          // Upload failed, use local URI as fallback
          finalAvatarUrl = avatarUri;
        }
      }

      // Call API to set up profile
      await authService.setupProfile({
        nickname,
        grade,
        major,
        gender: resolvedGender,
        avatar: finalAvatarUrl || selectedDefaultAvatar || undefined,
        language,
      });
      await changeLanguage(language);

      // Update local auth state
      setUser({
        name: nickname,
        nickname,
        email,
        avatar: finalAvatarUrl,
        defaultAvatar: finalAvatarUrl ? null : selectedDefaultAvatar,
        grade,
        major,
        bio: '',
        gender: resolvedGender,
        language,
        isLoggedIn: true,
      });
    } catch {
      showSnackbar({ message: t('setupFailed'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [nickname, grade, major, gender, avatarUri, selectedDefaultAvatar, email, language, setUser, showSnackbar, t]);

  const handleSkip = useCallback(async () => {
    setIsSaving(true);
    try {
      const randomNum = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      const randomNickname = `浸大${randomNum}`;
      const randomAvatarDef = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
      const randomAvatarUrl = getDiceBearUrl(randomAvatarDef.id, 200, randomAvatarDef.bg);

      await authService.setupProfile({
        nickname: randomNickname,
        grade: '',
        major: '',
        gender: 'secret',
        avatar: randomAvatarUrl,
        language,
      });
      await changeLanguage(language);

      setUser({
        name: randomNickname,
        nickname: randomNickname,
        email,
        avatar: randomAvatarUrl,
        defaultAvatar: randomAvatarDef.id,
        grade: '',
        major: '',
        bio: '',
        gender: 'secret',
        language,
        isLoggedIn: true,
      });
    } catch {
      showSnackbar({ message: t('setupFailed'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [email, language, setUser, showSnackbar, t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('profileSetup')}</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarUpload} activeOpacity={0.7} onPress={pickImages}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : selectedDefaultAvatar ? (
                <DefaultAvatarSvg id={selectedDefaultAvatar} size={96} />
              ) : (
                <InitialAvatar
                  text={nickname || 'U'}
                  size={96}
                  gender={gender ? mapGender(gender) : undefined}
                />
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <CameraIcon size={16} color={colors.onPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t('uploadAvatar')}</Text>
        </View>

        {/* Default Avatar Picker */}
        {!avatarUri && (
          <View style={styles.defaultAvatarSection}>
            <DefaultAvatarPicker
              selected={selectedDefaultAvatar}
              onSelect={setSelectedDefaultAvatar}
              label={t('chooseDefaultAvatar')}
            />
          </View>
        )}

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Nickname */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('nickname')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('placeholderNickname')}
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={20}
            />
          </View>

          <View style={styles.divider} />

          {/* Grade */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('grade')}>
            <Text style={styles.fieldLabel}>{t('grade')}</Text>
            <View style={styles.fieldSelect}>
              {grade ? (
                <Text style={styles.fieldValue}>{t(grade)}</Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Major */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('major')}>
            <Text style={styles.fieldLabel}>{t('major')}</Text>
            <View style={styles.fieldSelect}>
              {major ? (
                <Text style={styles.fieldValue}>{t(major)}</Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Gender */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('gender')}>
            <Text style={styles.fieldLabel}>{t('gender')}</Text>
            <View style={styles.fieldSelect}>
              {gender ? (
                <Text style={styles.fieldValue}>{gender}</Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Done Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.doneBtn, !isFormComplete && styles.doneBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleDone}
            disabled={!isFormComplete || isSaving}
          >
            <Text style={[styles.doneBtnText, !isFormComplete && styles.doneBtnTextDisabled]}>{t('done')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picker Modal */}
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
              <Text style={styles.pickerTitle}>{pickerTitles[pickerType]}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerData[pickerType]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    currentValues[pickerType] === item && styles.pickerItemSelected,
                  ]}
                  onPress={() => handlePickerSelect(item)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      currentValues[pickerType] === item && styles.pickerItemTextSelected,
                    ]}
                  >
                    {pickerType === 'gender' ? item : t(item)}
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
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  avatarUpload: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.onPrimaryContainer,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarHint: {
    ...typography.bodySmall,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  defaultAvatarSection: {
    marginBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  fieldLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    width: 72,
  },
  fieldInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.onSurface,
    textAlign: 'right',
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  fieldSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fieldValue: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    marginRight: spacing.xs,
  },
  fieldPlaceholder: {
    color: colors.onSurfaceVariant,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: spacing.lg,
  },
  footer: {
    marginTop: spacing.xxxl,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  doneBtnDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  doneBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  doneBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  // Picker Modal
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
