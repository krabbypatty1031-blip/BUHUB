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
import { useUIStore } from '../../store/uiStore';
import { useImagePicker } from '../../hooks/useImagePicker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CloseIcon, CameraIcon, PlusIcon } from '../../components/common/icons';
import Chip from '../../components/common/Chip';

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
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const { images, pickImages, removeImage } = useImagePicker({ allowsMultiple: true, maxImages: 6 });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<SecondhandCategory>('electronics');
  const [condition, setCondition] = useState('good');

  const canPost =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    price.trim().length > 0;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    showSnackbar({ message: t('postSuccess'), type: 'success' });
    navigation.goBack();
  }, [canPost, showSnackbar, t, navigation]);

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
            {t('post')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Picker */}
        <View style={styles.imageRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imageThumb}>
              <Image source={{ uri }} style={styles.imageThumbImg} />
              <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                <CloseIcon size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity style={styles.imagePicker} activeOpacity={0.7} onPress={pickImages}>
              <CameraIcon size={32} color={colors.outline} />
              <Text style={styles.imagePickerText}>{t('addPhotos')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder={t('secondhandTitlePlaceholder')}
          placeholderTextColor={colors.outline}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Description Input */}
        <TextInput
          style={styles.descInput}
          placeholder={t('secondhandDescPlaceholder')}
          placeholderTextColor={colors.outline}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Price Input */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{t('price')}</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="HK$ 0"
            placeholderTextColor={colors.outline}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Condition Selector */}
        <Text style={styles.sectionLabel}>{t('condition')}</Text>
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

        {/* Category Selector */}
        <Text style={styles.sectionLabel}>{t('category')}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  postBtnDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  postBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  postBtnTextDisabled: {
    color: colors.outline,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  imageThumb: {
    width: 100,
    height: 100,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    ...typography.bodyMedium,
    color: colors.outline,
    marginTop: spacing.sm,
  },
  titleInput: {
    ...typography.titleMedium,
    color: colors.onSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  descInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    minHeight: 120,
    marginBottom: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginRight: spacing.md,
    width: 60,
  },
  priceInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flex: 1,
  },
  sectionLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
});
