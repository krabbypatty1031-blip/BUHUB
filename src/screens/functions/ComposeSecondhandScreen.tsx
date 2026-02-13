import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandCategory } from '../../types';
import { useCreateSecondhand } from '../../hooks/useSecondhand';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useUIStore } from '../../store/uiStore';
import { uploadService } from '../../api/services/upload.service';
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

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposeSecondhand'>;

const CATEGORIES: Array<{ key: SecondhandCategory; labelKey: string }> = [
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

const CONDITIONS: Array<{ key: string; labelKey: string }> = [
  { key: 'new', labelKey: 'conditionNew' },
  { key: 'likeNew', labelKey: 'conditionLikeNew' },
  { key: 'good', labelKey: 'conditionGood' },
  { key: 'fair', labelKey: 'conditionFair' },
];

export default function ComposeSecondhandScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const { images, pickImages, removeImage } = useImagePicker({ allowsMultiple: true, maxImages: 9 });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const defaultCategory = (route.params?.category as SecondhandCategory) || 'electronics';
  const [category, setCategory] = useState<SecondhandCategory>(defaultCategory);
  const [condition, setCondition] = useState<string | null>(null);
  const [conditionPickerVisible, setConditionPickerVisible] = useState(false);
  const [tradeLocation, setTradeLocation] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  const selectedConditionLabel = condition
    ? t(CONDITIONS.find((c) => c.key === condition)?.labelKey ?? '')
    : null;

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(enforceContentLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    deadline !== null;

  const user = useAuthStore((s) => s.user);
  const createSecondhand = useCreateSecondhand();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(async () => {
    if (!canPost || !user || isPosting) return;
    setIsPosting(true);
    try {
      // Upload images if any
      let imageUrls: string[] | undefined;
      if (images.length > 0) {
        const result = await uploadService.uploadImages(
          images.map((uri, i) => ({ uri, type: 'image/jpeg', name: `secondhand-${i}.jpg` }))
        );
        imageUrls = result.urls;
      }

      createSecondhand.mutate(
        {
          category,
          type: t(category),
          title: title.trim(),
          desc: description.trim(),
          price: `HK$${price.trim()}`,
          condition: condition ? t(CONDITIONS.find((c) => c.key === condition)?.labelKey ?? '') : '',
          location: tradeLocation.trim(),
          expiresAt: deadline!.toISOString(),
          expired: false,
          createdAt: new Date().toISOString(),
        },
        {
          onSuccess: () => {
            navigation.replace('SecondhandShare', { itemName: title, posterName: user.name, index: 0 });
          },
          onError: () => {
            showSnackbar({ message: t('postFailed') || 'Failed to post', type: 'error' });
          },
          onSettled: () => {
            setIsPosting(false);
          },
        },
      );
    } catch {
      showSnackbar({ message: t('postFailed') || 'Failed to post', type: 'error' });
      setIsPosting(false);
    }
  }, [canPost, navigation, title, user, category, description, price, condition, tradeLocation, deadline, t, images, isPosting, createSecondhand, showSnackbar]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('newSecondhandPost')}</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text
            style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}
          >
            {t('publishBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          {/* ── Category Selector ── */}
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

          {/* ── Image Picker ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('itemPhotos')}</Text>
            <View style={styles.imageGrid}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.imageThumbImg} />
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

          {/* ── Title ── */}
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

          {/* ── Description ── */}
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
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ── Price ── */}
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
                onChangeText={setPrice}
                keyboardType="numeric"
                maxLength={10}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ── Trade Location ── */}
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

          {/* ── Condition Selector ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('conditionLabel')}</Text>
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

          {/* ── Deadline ── */}
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
            setCondition(value);
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
    minHeight: 96,
  },
  contentInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 88,
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
