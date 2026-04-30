import React, { useState, useCallback, useMemo } from 'react';
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
  Alert,
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
import { ensureOnlineOrAlert, getAuthErrorMessage } from '../../utils/network';
import { HKBU_MAJOR_KEYS, getLocalizedMajorLabel } from '../../data/hkbuMajors';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import ScreenHeader from '../../components/common/ScreenHeader';
import { ChevronRightIcon, CameraIcon } from '../../components/common/icons';
import DefaultAvatarPicker, { DefaultAvatarSvg, InitialAvatar } from '../../components/common/DefaultAvatarPicker';
import type { Gender } from '../../types/common';
import { getDefaultAvatarDef } from '../../utils/defaultAvatars';

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
  const [gender, setGender] = useState<Gender | ''>('');
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('grade');

  const GRADE_KEYS = ['gradeUndergradY1', 'gradeUndergradY2', 'gradeUndergradY3', 'gradeUndergradY4', 'gradePostgrad', 'gradePhD'];
  const GENDER_KEYS: Gender[] = ['male', 'female', 'other', 'secret'];

  // Sort majors A→Z by their localized display label so the picker is
  // alphabetical in whichever language the user is currently in.
  const sortedMajorKeys = useMemo(
    () =>
      [...HKBU_MAJOR_KEYS].sort((a, b) =>
        getLocalizedMajorLabel(a, t).localeCompare(getLocalizedMajorLabel(b, t))
      ),
    [t]
  );

  const pickerData: Record<PickerType, string[]> = {
    grade: GRADE_KEYS,
    major: sortedMajorKeys,
    gender: GENDER_KEYS,
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
          setGender(value as Gender);
          break;
      }
      setPickerVisible(false);
    },
    [pickerType]
  );

  const hasAvatar = !!(avatarUri || selectedDefaultAvatar);
  const isFormComplete = !!(nickname.trim() && grade && major && gender && hasAvatar);

  const getGenderLabel = useCallback((value: Gender | '') => {
    switch (value) {
      case 'male':
        return t('genderMale');
      case 'female':
        return t('genderFemale');
      case 'other':
        return t('genderOther');
      case 'secret':
        return t('genderSecret');
      default:
        return '';
    }
  }, [t]);

  const getMajorLabel = useCallback((value: string) => getLocalizedMajorLabel(value, t), [t]);

  const handleDone = useCallback(async () => {
    const resolvedGender: Gender = gender || 'other';
    setIsSaving(true);
    const online = await ensureOnlineOrAlert(t);
    if (!online) {
      setIsSaving(false);
      return;
    }
    try {
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
          finalAvatarUrl = avatarUri;
        }
      }

      const savedProfile = await authService.setupProfile({
        nickname,
        grade,
        major,
        gender: resolvedGender,
        avatar: finalAvatarUrl || selectedDefaultAvatar || undefined,
        language,
      });
      await changeLanguage(language);

      const savedAvatar = savedProfile.avatar ?? finalAvatarUrl ?? selectedDefaultAvatar ?? null;
      const savedDefaultAvatar = typeof savedAvatar === 'string' && getDefaultAvatarDef(savedAvatar) ? savedAvatar : null;

      setUser({
        name: savedProfile.nickname,
        nickname: savedProfile.nickname,
        email,
        avatar: savedAvatar,
        defaultAvatar: savedDefaultAvatar,
        grade: savedProfile.grade ?? grade,
        major: savedProfile.major ?? major,
        bio: savedProfile.bio ?? '',
        gender: (savedProfile.gender as Gender | undefined) ?? resolvedGender,
        language,
        isLoggedIn: true,
      });
    } catch (error: unknown) {
      const { message, isNetwork } = getAuthErrorMessage(error, t, 'setupFailed');
      if (isNetwork) {
        Alert.alert(message);
      } else {
        showSnackbar({ message, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  }, [nickname, grade, major, gender, avatarUri, selectedDefaultAvatar, email, language, setUser, showSnackbar, t]);

  const handleSkip = useCallback(async () => {
    setIsSaving(true);
    const online = await ensureOnlineOrAlert(t);
    if (!online) {
      setIsSaving(false);
      return;
    }
    try {
      const generatedProfile = await authService.setupProfile({
        autoGenerate: true,
        language,
      });
      await changeLanguage(language);

      const generatedAvatar = generatedProfile.avatar ?? null;
      const generatedDefaultAvatar =
        typeof generatedAvatar === 'string' && getDefaultAvatarDef(generatedAvatar)
          ? generatedAvatar
          : null;

      setUser({
        name: generatedProfile.nickname,
        nickname: generatedProfile.nickname,
        email,
        avatar: generatedAvatar,
        defaultAvatar: generatedDefaultAvatar,
        grade: generatedProfile.grade ?? '',
        major: generatedProfile.major ?? '',
        bio: generatedProfile.bio ?? '',
        gender: (generatedProfile.gender as Gender | undefined) ?? 'other',
        language,
        isLoggedIn: true,
      });
    } catch (error: unknown) {
      const { message, isNetwork } = getAuthErrorMessage(error, t, 'setupFailed');
      if (isNetwork) {
        Alert.alert(message);
      } else {
        showSnackbar({ message, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  }, [email, language, setUser, showSnackbar, t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('profileSetup')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
        showBottomBorder={false}
        rightAction={
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
                  gender={gender === 'male' || gender === 'female' ? gender : undefined}
                />
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <CameraIcon size={16} color={colors.onPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t('uploadAvatar')}</Text>
        </View>

        {!avatarUri && (
          <View style={styles.defaultAvatarSection}>
            <DefaultAvatarPicker
              selected={selectedDefaultAvatar}
              onSelect={setSelectedDefaultAvatar}
              label={t('chooseDefaultAvatar')}
            />
          </View>
        )}

        <View style={styles.formCard}>
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

          <TouchableOpacity style={styles.field} onPress={() => showPicker('major')}>
            <Text style={styles.fieldLabel}>{t('major')}</Text>
            <View style={styles.fieldSelect}>
              {major ? (
                <Text style={styles.fieldValue}>{getMajorLabel(major)}</Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.field} onPress={() => showPicker('gender')}>
            <Text style={styles.fieldLabel}>{t('gender')}</Text>
            <View style={styles.fieldSelect}>
              {gender ? (
                <Text style={styles.fieldValue}>{getGenderLabel(gender)}</Text>
              ) : null}
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

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
                    {pickerType === 'gender'
                      ? getGenderLabel(item as Gender)
                      : pickerType === 'major'
                        ? getMajorLabel(item)
                        : t(item)}
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
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: typography.bodyLarge.fontSize,
    color: colors.onSurface,
    textAlign: 'right',
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    textAlignVertical: 'center',
    includeFontPadding: false,
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
