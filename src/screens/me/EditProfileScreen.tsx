import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
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
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { User } from '../../types';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { uploadService } from '../../api/services/upload.service';
import { HKBU_MAJOR_KEYS, getLocalizedMajorLabel } from '../../data/hkbuMajors';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, getLocalizedFontStyle } from '../../theme/typography';
import { normalizeAvatarUrl } from '../../utils/imageUrl';
import Avatar from '../../components/common/Avatar';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  CameraIcon,
  ChevronRightIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const cropSize = Math.min(screenWidth - spacing.xl * 2, 320);
  const bioMaxLength = i18n.language === 'en' ? 80 : 20;
  const { data: profile } = useProfile();
  const user = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const updateProfile = useUpdateProfile();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Use same data source as MeScreen: profile query > authStore
  const currentUser = profile || user;

  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
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
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
  const getMajorLabel = useCallback((value: string) => getLocalizedMajorLabel(value, t), [t]);
  const [isCropping, setIsCropping] = useState(false);

  const GRADE_KEYS = ['gradeUndergradY1', 'gradeUndergradY2', 'gradeUndergradY3', 'gradeUndergradY4', 'gradePostgrad', 'gradePhD'];

  const pickAvatar = useCallback(async () => {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existing.status === 'denied') {
      Alert.alert('', t('photoPermissionMessage'));
      return;
    }

    if (existing.status !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', t('photoPermissionMessage'));
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const sourceUri = result.assets[0]?.uri;
      if (sourceUri) {
        setCropSourceUri(sourceUri);
        setCropperVisible(true);
      }
    }
  }, [t]);

  const handleCropConfirm = useCallback(async (uri: string) => {
    setPickedAvatar(uri);
    setCropperVisible(false);
    setCropSourceUri(null);
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropperVisible(false);
    setCropSourceUri(null);
  }, []);

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
      <ScreenHeader
        title={t('editProfile')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(i18n.language, 'bold')}
        showBottomBorder
        rightAction={
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
        }
      />

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

      <AvatarCropperModal
        visible={cropperVisible}
        imageUri={cropSourceUri}
        cropSize={cropSize}
        isCropping={isCropping}
        onCroppingChange={setIsCropping}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
        t={t}
      />
    </SafeAreaView>
  );
}

type AvatarCropperModalProps = {
  visible: boolean;
  imageUri: string | null;
  cropSize: number;
  isCropping: boolean;
  onCroppingChange: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
  t: (key: string) => string;
};

function AvatarCropperModal({
  visible,
  imageUri,
  cropSize,
  isCropping,
  onCroppingChange,
  onCancel,
  onConfirm,
  t,
}: AvatarCropperModalProps) {
  const scale = useSharedValue(1);
  const scaleOffset = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateXOffset = useSharedValue(0);
  const translateYOffset = useSharedValue(0);
  const [naturalSize, setNaturalSize] = useState({ width: cropSize, height: cropSize });
  // Mirrors scale.value on the JS thread so the percentage label stays in
  // sync with +/-, reset, and pinch gestures.
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    if (!visible || !imageUri) return;
    Image.getSize(
      imageUri,
      (width, height) => {
        setNaturalSize({
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
      },
      () => {
        setNaturalSize({ width: cropSize, height: cropSize });
      }
    );
    scale.value = 1;
    scaleOffset.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    translateXOffset.value = 0;
    translateYOffset.value = 0;
    setDisplayScale(1);
  }, [
    cropSize,
    imageUri,
    scale,
    scaleOffset,
    translateX,
    translateXOffset,
    translateY,
    translateYOffset,
    visible,
  ]);

  const baseScale = Math.max(cropSize / naturalSize.width, cropSize / naturalSize.height);
  const baseWidth = naturalSize.width * baseScale;
  const baseHeight = naturalSize.height * baseScale;

  const pinchGesture = Gesture.Pinch()
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      scaleOffset.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(scaleOffset.value * event.scale, 1), 4);
      scale.value = nextScale;
      translateX.value = clampTranslateWorklet(translateX.value, nextScale, baseWidth, cropSize);
      translateY.value = clampTranslateWorklet(translateY.value, nextScale, baseHeight, cropSize);
    })
    .onEnd(() => {
      scaleOffset.value = scale.value;
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
      runOnJS(setDisplayScale)(scale.value);
    });

  const panGesture = Gesture.Pan()
    .shouldCancelWhenOutside(false)
    .averageTouches(true)
    .minDistance(0)
    .onStart(() => {
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
    })
    .onUpdate((event) => {
      if (event.numberOfPointers > 1) return;
      translateX.value = clampTranslateWorklet(
        translateXOffset.value + event.translationX,
        scale.value,
        baseWidth,
        cropSize
      );
      translateY.value = clampTranslateWorklet(
        translateYOffset.value + event.translationY,
        scale.value,
        baseHeight,
        cropSize
      );
    })
    .onEnd(() => {
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const applyScaleFromJs = useCallback(
    (nextScale: number) => {
      const clampedScale = Math.min(Math.max(nextScale, 1), 4);
      scale.value = clampedScale;
      scaleOffset.value = clampedScale;
      translateX.value = clampTranslateWorklet(translateX.value, clampedScale, baseWidth, cropSize);
      translateY.value = clampTranslateWorklet(translateY.value, clampedScale, baseHeight, cropSize);
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
      setDisplayScale(clampedScale);
    },
    [
      baseHeight,
      baseWidth,
      cropSize,
      scale,
      scaleOffset,
      translateX,
      translateXOffset,
      translateY,
      translateYOffset,
    ]
  );

  const handleZoomIn = useCallback(() => {
    applyScaleFromJs(scale.value + 0.25);
  }, [applyScaleFromJs, scale]);

  const handleZoomOut = useCallback(() => {
    applyScaleFromJs(scale.value - 0.25);
  }, [applyScaleFromJs, scale]);

  const handleZoomReset = useCallback(() => {
    applyScaleFromJs(1);
    translateX.value = 0;
    translateY.value = 0;
    translateXOffset.value = 0;
    translateYOffset.value = 0;
  }, [applyScaleFromJs, translateX, translateXOffset, translateY, translateYOffset]);

  const handleConfirm = useCallback(async () => {
    if (!imageUri) return;
    onCroppingChange(true);
    try {
      const currentScale = scale.value;
      const currentTranslateX = translateX.value;
      const currentTranslateY = translateY.value;
      const ratioX = naturalSize.width / baseWidth;
      const ratioY = naturalSize.height / baseHeight;
      const cropWidth = (cropSize / currentScale) * ratioX;
      const cropHeight = (cropSize / currentScale) * ratioY;
      const offsetXFromCenter = (currentTranslateX / currentScale) * ratioX;
      const offsetYFromCenter = (currentTranslateY / currentScale) * ratioY;
      const maxOriginX = Math.max(0, naturalSize.width - cropWidth);
      const maxOriginY = Math.max(0, naturalSize.height - cropHeight);

      const originX = Math.min(
        Math.max((naturalSize.width - cropWidth) / 2 - offsetXFromCenter, 0),
        maxOriginX
      );
      const originY = Math.min(
        Math.max((naturalSize.height - cropHeight) / 2 - offsetYFromCenter, 0),
        maxOriginY
      );

      const cropped = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: Math.max(1, cropWidth),
              height: Math.max(1, cropHeight),
            },
          },
          { resize: { width: 320, height: 320 } },
        ],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      onConfirm(cropped.uri);
    } finally {
      onCroppingChange(false);
    }
  }, [
    baseHeight,
    baseWidth,
    cropSize,
    imageUri,
    naturalSize.height,
    naturalSize.width,
    onConfirm,
    onCroppingChange,
    scale,
    translateX,
    translateY,
  ]);

  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.cropperOverlay}>
        <View style={styles.cropperSheet}>
          <Text style={styles.cropperTitle}>{t('changeAvatar')}</Text>
          <Text style={styles.cropperHint}>{t('avatarCropperHint')}</Text>

          <View style={[styles.cropArea, { width: cropSize, height: cropSize, borderRadius: cropSize / 2 }]}>
            <GestureDetector gesture={gesture}>
              <View style={styles.cropGestureLayer} collapsable={false}>
                <Animated.View style={[{ width: baseWidth, height: baseHeight }, imageStyle]}>
                  <ExpoImage source={imageUri} style={styles.cropImage} contentFit="cover" pointerEvents="none" />
                </Animated.View>
              </View>
            </GestureDetector>
            <View
              pointerEvents="none"
              style={[
                styles.cropRing,
                {
                  width: cropSize,
                  height: cropSize,
                  borderRadius: cropSize / 2,
                },
              ]}
            />
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.75}>
              <Text style={styles.zoomBtnText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomResetBtn} onPress={handleZoomReset} activeOpacity={0.75}>
              <Text style={styles.zoomResetText}>{`${Math.round(displayScale * 100)}%`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.75}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cropActions}>
            <TouchableOpacity style={styles.cropCancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={styles.cropCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cropConfirmBtn, isCropping && styles.cropConfirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.75}
              disabled={isCropping}
            >
              {isCropping ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.cropConfirmText}>{t('confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function clampTranslateWorklet(
  value: number,
  currentScale: number,
  contentDimension: number,
  cropDimension: number
) {
  'worklet';
  const scaled = contentDimension * currentScale;
  const maxOffset = Math.max(0, (scaled - cropDimension) / 2);
  return Math.min(Math.max(value, -maxOffset), maxOffset);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  cropperOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cropperSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  cropperTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  cropperHint: {
    ...typography.bodySmall,
    color: colors.outline,
  },
  cropArea: {
    overflow: 'hidden',
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropGestureLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropImage: {
    width: '100%',
    height: '100%',
  },
  cropRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cropActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  zoomBtnText: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 28,
  },
  zoomResetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface3,
  },
  zoomResetText: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  cropCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface3,
  },
  cropCancelText: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  cropConfirmBtn: {
    minWidth: 86,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  cropConfirmBtnDisabled: {
    opacity: 0.8,
  },
  cropConfirmText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '700',
  },

});
