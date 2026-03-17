import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandCategory, SecondhandItem } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useEditSecondhand, type SecondhandInfiniteData } from '../../hooks/useSecondhand';
import { secondhandService } from '../../api/services/secondhand.service';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useUIStore } from '../../store/uiStore';
import { uploadService } from '../../api/services/upload.service';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CloseIcon,
  CameraIcon,
  DollarIcon,
  MapPinIcon,
  ClockIcon,
  ChevronRightIcon,
} from '../../components/common/icons';
import Chip from '../../components/common/Chip';
import DateTimePickerSheet from '../../components/common/DateTimePickerSheet';
import ScrollPickerSheet from '../../components/common/ScrollPickerSheet';
import { useAuthStore } from '../../store/authStore';
import {
  enforceTitleLimit,
  getTitleCountLabel,
  enforceContentLimit,
  getContentCountLabel,
} from '../../utils/textLimit';
import { formatDeadline } from '../../utils/dateFormat';
import {
  getLocalizedSecondhandCondition,
  normalizeSecondhandCondition,
  SECONDHAND_CONDITION_LABEL_KEYS,
  type SecondhandConditionKey,
} from '../../utils/secondhandCondition';
import { canPublishCommunityContent, isPublishPermissionError } from '../../utils/publishPermission';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposeSecondhand'>;

const CATEGORIES: Array<{ key: SecondhandCategory; labelKey: string }> = [
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

const CONDITIONS: Array<{ key: SecondhandConditionKey; labelKey: string }> = [
  { key: 'new', labelKey: SECONDHAND_CONDITION_LABEL_KEYS.new },
  { key: 'likeNew', labelKey: SECONDHAND_CONDITION_LABEL_KEYS.likeNew },
  { key: 'good', labelKey: SECONDHAND_CONDITION_LABEL_KEYS.good },
  { key: 'fair', labelKey: SECONDHAND_CONDITION_LABEL_KEYS.fair },
];

const normalizePriceInput = (value: string): string => {
  const sanitized = value.replace(/[^\d.]/g, '');
  if (!sanitized) return '';

  const [integerPart, ...fractionParts] = sanitized.split('.');
  if (fractionParts.length === 0) return integerPart;

  const fraction = fractionParts.join('').slice(0, 2);
  const safeInteger = integerPart || '0';
  return fraction.length > 0 ? `${safeInteger}.${fraction}` : `${safeInteger}.`;
};

const isValidPrice = (value: string): boolean => /^\d+(\.\d{1,2})?$/.test(value.trim());

const extractNumericPrice = (value: string | undefined): string =>
  (value ?? '').replace(/[^\d.]/g, '');

const isRemoteImage = (uri: string): boolean => /^https?:\/\//i.test(uri);

type ErrorWithMessage = {
  message?: string;
};

export default function ComposeSecondhandScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const editId = route.params?.editId;
  const initialData = route.params?.initialData;
  const isEditMode = Boolean(editId && initialData);

  const { images, pickImages, removeImage } = useImagePicker({
    allowsMultiple: true,
    maxImages: 9,
    initialImages: initialData?.images ?? [],
  });
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.desc ?? '');
  const [price, setPrice] = useState(extractNumericPrice(initialData?.price));
  const defaultCategory = initialData?.category ?? route.params?.category ?? 'electronics';
  const [category, setCategory] = useState<SecondhandCategory>(defaultCategory);
  const [condition, setCondition] = useState<SecondhandConditionKey | null>(
    normalizeSecondhandCondition(initialData?.condition)
  );
  const [conditionPickerVisible, setConditionPickerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tradeLocation, setTradeLocation] = useState(initialData?.location ?? '');
  const [deadline, setDeadline] = useState<Date | null>(
    () => (initialData?.expiresAt ? new Date(initialData.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  );
  const [pickerVisible, setPickerVisible] = useState(false);

  const getPlaceholders = useCallback(() => {
    switch (category) {
      case 'electronics':
        return { title: t('secondhandPlaceholderElectronicsTitle'), content: t('secondhandPlaceholderElectronicsContent') };
      case 'books':
        return { title: t('secondhandPlaceholderBooksTitle'), content: t('secondhandPlaceholderBooksContent') };
      case 'furniture':
        return { title: t('secondhandPlaceholderFurnitureTitle'), content: t('secondhandPlaceholderFurnitureContent') };
      default:
        return { title: t('secondhandPlaceholderOtherTitle'), content: t('secondhandPlaceholderOtherContent') };
    }
  }, [category, t]);

  const placeholders = getPlaceholders();

  const conditionPickerOptions = useMemo(
    () => CONDITIONS.map((c) => ({ value: c.key, label: t(c.labelKey) })),
    [t],
  );

  const selectedConditionLabel = condition ? getLocalizedSecondhandCondition(condition, t) : null;

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  // Keep content length rules consistent while supporting native multiline behavior.
  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(enforceContentLimit(text));
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    setPrice(normalizePriceInput(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    condition !== null &&
    isValidPrice(price) &&
    deadline !== null;

  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const editSecondhand = useEditSecondhand();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isPosting, setIsPosting] = useState(false);
  const postingLockRef = React.useRef(false);

  const resolveSubmitErrorMessage = useCallback((error: unknown) => {
    const submitError = typeof error === 'object' && error
      ? error as { errorCode?: string; code?: string | number; message?: string }
      : undefined;
    if (isPublishPermissionError(submitError)) {
      return t('hkbuEmailRequiredForPublish');
    }
    return submitError?.message || t(isEditMode ? 'saveFailed' : 'postFailed');
  }, [isEditMode, t]);

  const handlePost = useCallback(async () => {
    if (!canPost || !user || isPosting || postingLockRef.current) return;
    if (!isEditMode && !canPublishCommunityContent(user)) {
      showSnackbar({ message: t('hkbuEmailRequiredForPublish'), type: 'error' });
      return;
    }
    postingLockRef.current = true;
    setIsPosting(true);

    // ── Edit mode: keep synchronous flow ──
    if (isEditMode && editId) {
      try {
        const remoteImages = images.filter(isRemoteImage);
        const localImages = images.filter((uri) => !isRemoteImage(uri));
        let uploadedImages: string[] = [];
        if (localImages.length > 0) {
          const result = await uploadService.uploadImages(
            localImages.map((uri, i) => ({ uri, type: 'image/jpeg', name: `secondhand-${i}.jpg` }))
          );
          uploadedImages = result.urls;
        }
        const payload = {
          category,
          type: t(category),
          title: title.trim(),
          desc: description.trim(),
          images: [...remoteImages, ...uploadedImages],
          price: `HK$${price.trim()}`,
          condition: condition ?? '',
          location: tradeLocation.trim(),
          expiresAt: deadline!.toISOString(),
          expired: initialData?.expired ?? false,
          createdAt: initialData?.createdAt ?? new Date().toISOString(),
        };
        editSecondhand.mutate(
          { id: editId, item: payload },
          {
            onSuccess: () => {
              showSnackbar({ message: t('saveSuccess'), type: 'success' });
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'FunctionsHub' },
                  { name: 'MyPosts' },
                ],
              });
            },
            onError: (error: unknown) => {
              showSnackbar({ message: resolveSubmitErrorMessage(error), type: 'error' });
            },
            onSettled: () => {
              postingLockRef.current = false;
              setIsPosting(false);
            },
          },
        );
      } catch (error: unknown) {
        showSnackbar({ message: resolveSubmitErrorMessage(error), type: 'error' });
        postingLockRef.current = false;
        setIsPosting(false);
      }
      return;
    }

    // ── Create mode: optimistic + background upload ──
    const optimisticId = `optimistic-${Date.now()}`;
    const allImages = [...images];
    const optimisticItem: SecondhandItem = {
      id: optimisticId,
      category,
      type: t(category),
      title: title.trim(),
      desc: description.trim(),
      images: allImages,
      price: `HK$${price.trim()}`,
      condition: condition ?? '',
      location: tradeLocation.trim(),
      user: user.name,
      userName: user.userName,
      authorId: user.id,
      avatar: user.avatar || '',
      gender: user.gender || 'other',
      bio: user.bio || '',
      gradeKey: user.grade,
      majorKey: user.major,
      sold: false,
      isWanted: false,
      expiresAt: deadline!.toISOString(),
      expired: false,
      createdAt: new Date().toISOString(),
    };

    // Insert optimistic item into cache
    const insertOptimistic = (old: SecondhandInfiniteData | undefined) => {
      if (!old || !old.pages.length) return old;
      return {
        ...old,
        pages: [
          { ...old.pages[0], items: [optimisticItem, ...old.pages[0].items] },
          ...old.pages.slice(1),
        ],
      };
    };
    queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', category], insertOptimistic);
    queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', undefined], insertOptimistic);

    // Navigate back immediately — zero perceived delay
    navigation.goBack();
    showSnackbar({ message: t('postPublishing'), type: 'info' });

    // Capture values for background closure
    const capturedImages = allImages;
    const capturedTitle = title.trim();
    const capturedDesc = description.trim();
    const capturedPrice = `HK$${price.trim()}`;
    const capturedCondition = condition ?? '';
    const capturedLocation = tradeLocation.trim();
    const capturedDeadline = deadline!.toISOString();

    // Background upload + creation (fire-and-forget)
    (async () => {
      try {
        const remoteImages = capturedImages.filter(isRemoteImage);
        const localImages = capturedImages.filter((uri) => !isRemoteImage(uri));
        let uploadedImages: string[] = [];
        if (localImages.length > 0) {
          const result = await uploadService.uploadImages(
            localImages.map((uri, i) => ({ uri, type: 'image/jpeg', name: `secondhand-${i}.jpg` }))
          );
          uploadedImages = result.urls;
        }

        const createdItem = await secondhandService.create({
          category,
          type: t(category),
          title: capturedTitle,
          desc: capturedDesc,
          images: [...remoteImages, ...uploadedImages],
          price: capturedPrice,
          condition: capturedCondition,
          location: capturedLocation,
          expiresAt: capturedDeadline,
          expired: false,
          createdAt: new Date().toISOString(),
        });

        // Replace optimistic item with real server data
        const replaceOptimistic = (old: SecondhandInfiniteData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === optimisticId ? createdItem : item)),
            })),
          };
        };
        queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', category], replaceOptimistic);
        queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', undefined], replaceOptimistic);

        showSnackbar({ message: t('postSuccess'), type: 'success' });
      } catch (error: unknown) {
        // Remove optimistic item on failure
        const removeOptimistic = (old: SecondhandInfiniteData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== optimisticId),
            })),
          };
        };
        queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', category], removeOptimistic);
        queryClient.setQueryData<SecondhandInfiniteData>(['secondhand', undefined], removeOptimistic);
        showSnackbar({ message: resolveSubmitErrorMessage(error), type: 'error' });
      } finally {
        postingLockRef.current = false;
      }
    })();
  }, [canPost, user, isPosting, images, category, t, title, description, price, condition, tradeLocation, deadline, initialData?.expired, initialData?.createdAt, isEditMode, editId, editSecondhand, navigation, queryClient, showSnackbar, resolveSubmitErrorMessage]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t(isEditMode ? 'editPost' : 'newSecondhandPost')}</Text>
        <TouchableOpacity
          style={[styles.postBtn, (!canPost || isPosting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost || isPosting}
        >
          <Text
            style={[styles.postBtnText, (!canPost || isPosting) && styles.postBtnTextDisabled]}
          >
            {t(isEditMode ? 'save' : 'publishBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          {/* ----- Category Selector ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('categoryLabel')}</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.key}
                  label={t(cat.labelKey)}
                  selected={category === cat.key}
                  onPress={() => setCategory(cat.key)}
                />
              ))}
            </View>
          </View>

          {/* ----- Image Picker ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('itemPhotos')}</Text>
            <View style={styles.imageGrid}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumb}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setPreviewIndex(i);
                      setPreviewVisible(true);
                    }}
                  >
                    <ExpoImage
                      source={uri}
                      style={styles.imageThumbImg}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={0}
                      recyclingKey={uri}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                    <CloseIcon size={12} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 9 && (
                <TouchableOpacity style={styles.imagePicker} activeOpacity={0.7} onPress={pickImages}>
                  <CameraIcon size={28} color={colors.primary} />
                  <Text style={styles.imagePickerCount}>
                    {images.length}/9
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ImagePreviewModal
            visible={previewVisible}
            images={images}
            initialIndex={previewIndex}
            onClose={() => setPreviewVisible(false)}
          />

          {/* ----- Title ----- */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                {t('titleLabel')} <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.charCount}>{getTitleCountLabel(title)}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.titleInput}
                placeholder={placeholders.title}
                placeholderTextColor={colors.outline}
                value={title}
                onChangeText={handleTitleChange}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Description ----- */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>{t('contentLabel')}</Text>
              <Text style={styles.charCount}>{getContentCountLabel(description)}</Text>
            </View>
            <View style={[styles.inputWrapper, styles.contentInputWrapper]}>
              <TextInput
                style={styles.contentInput}
                placeholder={placeholders.content}
                placeholderTextColor={colors.outline}
                value={description}
                onChangeText={handleDescriptionChange}
                selectionColor={colors.primary}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ----- Price ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <DollarIcon size={14} color={colors.primary} />{' '}
              {t('sellingPrice')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder="HK$ 0"
                placeholderTextColor={colors.outline}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                maxLength={10}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Trade Location ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.primary} />{' '}
              {t('tradeLocation')}
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('placeholderTradeLocation')}
                placeholderTextColor={colors.outline}
                value={tradeLocation}
                onChangeText={setTradeLocation}
                maxLength={50}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Condition Selector ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('conditionLabel')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              activeOpacity={0.7}
              onPress={() => setConditionPickerVisible(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedConditionLabel && styles.selectPlaceholder,
                ]}
              >
                {selectedConditionLabel || t('conditionPlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* ----- Deadline ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !deadline && styles.selectPlaceholder,
                ]}
              >
                {deadline ? formatDeadline(deadline) : t('deadlinePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        <DateTimePickerSheet
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onConfirm={(date) => {
            setDeadline(date);
            setPickerVisible(false);
          }}
          initialDate={deadline || undefined}
        />

        <ScrollPickerSheet
          visible={conditionPickerVisible}
          onClose={() => setConditionPickerVisible(false)}
          onConfirm={(value) => {
            setCondition(normalizeSecondhandCondition(value));
            setConditionPickerVisible(false);
          }}
          options={conditionPickerOptions}
          initialValue={condition ?? undefined}
          title={t('conditionLabel')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  postBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  postBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  postBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Form */
  formSection: {
    paddingHorizontal: spacing.xl,
  },
  fieldGroup: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  required: {
    color: colors.error,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    ...typography.bodySmall,
    color: colors.outline,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  /* Image grid */
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageThumb: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbImg: {
    width: '100%',
    height: '100%',
  },
  imageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePicker: {
    width: 96,
    height: 96,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer + '20',
    gap: spacing.xs,
  },
  imagePickerCount: {
    ...typography.labelSmall,
    color: colors.primary,
  },

  /* Inputs */
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    width: '100%',
  },
  titleInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  contentInputWrapper: {
    minHeight: 48,
  },
  contentInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },

  /* Select */
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
});

