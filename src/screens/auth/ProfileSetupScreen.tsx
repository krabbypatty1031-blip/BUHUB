import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useImagePicker } from '../../hooks/useImagePicker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, ChevronRightIcon, CameraIcon } from '../../components/common/icons';
import type { Gender } from '../../types/common';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

type PickerType = 'grade' | 'major' | 'gender';

export default function ProfileSetupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);

  const { images, pickImages } = useImagePicker();
  const avatarUri = images[0] || null;

  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [gender, setGender] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('grade');

  const pickerData: Record<PickerType, string[]> = {
    grade: [t('gradeUndergradY1'), t('gradeUndergradY2'), t('gradeUndergradY3'), t('gradeUndergradY4'), t('gradePostgrad'), t('gradePhD')],
    major: [t('majorBCDA'), t('majorAI'), t('majorSE'), t('majorIDS')],
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

  const mapGender = (genderLabel: string): Gender => {
    const genderMap: Record<string, Gender> = {
      [t('genderMale')]: 'male',
      [t('genderFemale')]: 'female',
      [t('genderOther')]: 'other',
      [t('genderSecret')]: 'secret',
    };
    return genderMap[genderLabel] || 'other';
  };

  const handleDone = useCallback(() => {
    setUser({
      name: nickname || '張小明',
      nickname: nickname || '浸大小明',
      avatar: avatarUri,
      grade: grade || 'Year 2',
      major: major || 'Computer Science',
      bio: '',
      gender: mapGender(gender) || 'male',
      isLoggedIn: true,
    });
  }, [nickname, grade, major, gender, avatarUri, setUser]);

  const handleSkip = useCallback(() => {
    setUser({
      name: '張小明',
      nickname: '浸大小明',
      avatar: null,
      grade: 'Year 2',
      major: 'Computer Science',
      bio: '',
      gender: 'male',
      isLoggedIn: true,
    });
  }, [setUser]);

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarUpload} activeOpacity={0.7} onPress={pickImages}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {nickname ? nickname.charAt(0) : '?'}
                </Text>
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <CameraIcon size={16} color={colors.onPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t('uploadAvatar')}</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Nickname */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('nickname')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('nickname')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={nickname}
              onChangeText={setNickname}
            />
          </View>

          <View style={styles.divider} />

          {/* Grade */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('grade')}>
            <Text style={styles.fieldLabel}>{t('grade')}</Text>
            <View style={styles.fieldSelect}>
              <Text style={[styles.fieldValue, !grade && styles.fieldPlaceholder]}>
                {grade || t('grade')}
              </Text>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Major */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('major')}>
            <Text style={styles.fieldLabel}>{t('major')}</Text>
            <View style={styles.fieldSelect}>
              <Text style={[styles.fieldValue, !major && styles.fieldPlaceholder]}>
                {major || t('major')}
              </Text>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Gender */}
          <TouchableOpacity style={styles.field} onPress={() => showPicker('gender')}>
            <Text style={styles.fieldLabel}>{t('gender')}</Text>
            <View style={styles.fieldSelect}>
              <Text style={[styles.fieldValue, !gender && styles.fieldPlaceholder]}>
                {gender || t('gender')}
              </Text>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Done Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={handleDone}
          >
            <Text style={styles.doneBtnText}>{t('done')}</Text>
          </TouchableOpacity>
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
              <Text style={styles.pickerTitle}>{pickerTitles[pickerType]}</Text>
              <View style={{ width: 60 }} />
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
    marginBottom: spacing.xxxl,
  },
  avatarUpload: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryContainer,
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
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
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
    color: colors.onSurfaceVariant,
    width: 72,
  },
  fieldInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.onSurface,
    textAlign: 'right',
    padding: 0,
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
  doneBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  // Picker Modal
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
