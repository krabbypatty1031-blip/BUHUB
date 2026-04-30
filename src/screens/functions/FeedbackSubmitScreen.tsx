import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FeedbackCategory } from '../../types/feedback';

type FeedbackStackParamList = {
  FeedbackList: undefined;
  FeedbackSubmit: undefined;
  FeedbackDetail: { id: string };
};
import { useSubmitFeedback } from '../../hooks/useFeedback';
import { useImagePicker } from '../../hooks/useImagePicker';
import { uploadService } from '../../api/services/upload.service';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontFamily } from '../../theme/typography';
import Chip from '../../components/common/Chip';
import ScreenHeader from '../../components/common/ScreenHeader';

type Props = NativeStackScreenProps<FeedbackStackParamList, 'FeedbackSubmit'>;

const CATEGORIES: Array<{ key: FeedbackCategory; labelKey: string }> = [
  { key: 'BUG', labelKey: 'feedbackCategoryBug' },
  { key: 'SUGGESTION', labelKey: 'feedbackCategorySuggestion' },
  { key: 'OTHER', labelKey: 'feedbackCategoryOther' },
];
const MIN_DESC_LENGTH = 10;
const MAX_DESC_LENGTH = 2000;

export default function FeedbackSubmitScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { images, pickImages, removeImage } = useImagePicker({
    allowsMultiple: true,
    maxImages: 3,
  });
  const submitFeedback = useSubmitFeedback();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const isValid = category !== null && description.trim().length >= MIN_DESC_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const files = images.map((uri, i) => ({
          uri,
          type: 'image/jpeg',
          name: `feedback-${i}.jpg`,
        }));
        const result = await uploadService.uploadImages(files);
        imageUrls = result.urls;
      }
      submitFeedback.mutate(
        {
          category: category!,
          description: description.trim(),
          imageUrls,
        },
        {
          onSuccess: () => {
            showSnackbar({ message: t('feedbackSubmitSuccess'), type: 'success' });
            navigation.replace('FeedbackList');
          },
          onError: () => {
            showSnackbar({ message: t('feedbackSubmitFailed'), type: 'error' });
            setIsSubmitting(false);
          },
        },
      );
    } catch {
      showSnackbar({ message: t('feedbackSubmitFailed'), type: 'error' });
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, images, category, description, submitFeedback, showSnackbar, t, navigation]);

  const isDisabled = isSubmitting || !isValid;
  const trimmedLength = description.trim().length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        variant="campus"
        title={t('feedbackSubmit')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
      />

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('feedbackSelectCategory')}</Text>
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

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('feedbackDescription')}</Text>
          <TextInput
            style={styles.descInput}
            multiline
            textAlignVertical="top"
            placeholder={t('feedbackDescPlaceholder')}
            placeholderTextColor={colors.outline}
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, MAX_DESC_LENGTH))}
          />
          <View style={styles.counterRow}>
            {trimmedLength > 0 && trimmedLength < MIN_DESC_LENGTH ? (
              <Text style={styles.minCharsWarning}>{t('feedbackDescMinChars')}</Text>
            ) : (
              <View />
            )}
            <Text style={styles.charCount}>
              {t('feedbackCharCount', { count: description.length })}
            </Text>
          </View>
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('feedbackImages')}</Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <View key={uri} style={styles.thumbContainer}>
                <ExpoImage source={{ uri }} style={styles.thumb} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeBtnText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Text style={styles.addImagePlus}>+</Text>
                <Text style={styles.addImageLabel}>{t('feedbackAddImages')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>{t('feedbackSubmitBtn')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: '#0C1015',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  descInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#0C1015',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  minCharsWarning: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#F59E0B',
  },
  charCount: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#86909C',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbContainer: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamily.bold,
    lineHeight: 14,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F5F7',
    borderWidth: 1,
    borderColor: '#C1C1C1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImagePlus: {
    fontSize: 24,
    color: '#86909C',
    lineHeight: 28,
  },
  addImageLabel: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: '#86909C',
    textAlign: 'center',
    marginTop: 2,
  },
  submitButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: colors.onPrimary,
  },
});
