import React, { useState, useCallback } from 'react';
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
import { useImagePicker } from '../../hooks/useImagePicker';
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
import { enforceTitleLimit, getTitleCountLabel } from '../../utils/textLimit';
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

export default function ComposeSecondhandScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const { images, pickImages, removeImage } = useImagePicker({ allowsMultiple: true, maxImages: 6 });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<SecondhandCategory>('electronics');
  const [condition, setCondition] = useState('good');
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

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    condition.length > 0 &&
    deadline !== null;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    navigation.replace('SecondhandShare', { itemName: title });
  }, [canPost, navigation, title]);

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
      >
        {/* ── Category Selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('categoryLabel')}</Text>
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

        {/* ── Image Picker Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('itemPhotos')}</Text>
          <View style={styles.imageGrid}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.imageThumbImg} />
                <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                  <CloseIcon size={12} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 6 && (
              <TouchableOpacity style={styles.imagePicker} activeOpacity={0.7} onPress={pickImages}>
                <CameraIcon size={28} color={colors.primary} />
                <Text style={styles.imagePickerCount}>
                  {images.length}/6
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Title & Description Card ── */}
        <View style={styles.card}>
          <TextInput
            style={styles.titleInput}
            placeholder={placeholders.title}
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={handleTitleChange}
          />
          <Text style={styles.charCount}>{getTitleCountLabel(title)}</Text>
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.descInput}
            placeholder={placeholders.content}
            placeholderTextColor={colors.outline}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* ── Price & Location Card ── */}
        <View style={styles.card}>
          {/* Price */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <DollarIcon size={14} color={colors.primary} />{' '}
              {t('sellingPrice')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="HK$ 0"
              placeholderTextColor={colors.outline}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Trade Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.primary} />{' '}
              {t('tradeLocation')}
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('placeholderTradeLocation')}
              placeholderTextColor={colors.outline}
              value={tradeLocation}
              onChangeText={setTradeLocation}
              maxLength={50}
            />
          </View>
        </View>

        {/* ── Condition Selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('conditionLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((cond) => (
              <Chip
                key={cond.key}
                label={t(cond.labelKey)}
                selected={condition === cond.key}
                onPress={() => setCondition(cond.key)}
              />
            ))}
          </View>
        </View>

        {/* ── Deadline ── */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.deadlineInput}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text
                style={[
                  styles.deadlineText,
                  !deadline && styles.deadlinePlaceholder,
                ]}
              >
                {deadline ? formatDeadline(deadline) : t('deadlinePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.outline} />
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
    paddingHorizontal: spacing.sm,
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
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.lg,
  },

  /* Card */
  card: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.md,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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

  /* Title & Description */
  titleInput: {
    ...typography.titleMedium,
    color: colors.onSurface,
    padding: 0,
  },
  descInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    minHeight: 120,
    padding: 0,
  },
  charCount: {
    ...typography.labelSmall,
    color: colors.outline,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  /* Fields */
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  required: {
    color: colors.error,
    fontWeight: '500',
  },
  fieldInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  /* Section */
  section: {},
  sectionLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  /* Deadline */
  deadlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  deadlineText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  deadlinePlaceholder: {
    color: colors.outline,
  },
});
