import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingItem } from '../../types';
import { useRatings, useSubmitRating } from '../../hooks/useRatings';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon } from '../../components/common/icons';
import { hapticSelection, hapticMedium } from '../../utils/haptics';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingForm'>;

export default function RatingFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { category, index } = route.params;
  const { data: ratings, isLoading } = useRatings(category);
  const submitRating = useSubmitRating(category, String(index));
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const item: RatingItem | undefined = ratings?.[index];

  const dimensionKeys = useMemo(() => {
    if (!item) return [];
    return item.scores.map((s) => s.key);
  }, [item]);

  const dimensionLabels = useMemo(() => {
    if (!item) return {};
    const labels: Record<string, string> = {};
    item.scores.forEach((s) => {
      labels[s.key] = s.label;
    });
    return labels;
  }, [item]);

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (item) {
      item.scores.forEach((s) => {
        initial[s.key] = 3;
      });
    }
    return initial;
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const handleScoreChange = useCallback((key: string, value: number) => {
    hapticSelection();
    setScores((prev) => ({ ...prev, [key]: Math.round(value * 10) / 10 }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    hapticSelection();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    hapticMedium();
    submitRating.mutate(
      {
        scores,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          showSnackbar({ message: t('submitSuccess') || 'Submitted!', type: 'success' });
          navigation.goBack();
        },
        onError: () => {
          showSnackbar({ message: t('submitError') || 'Failed to submit', type: 'error' });
        },
      }
    );
  }, [scores, selectedTags, comment, submitRating, showSnackbar, navigation, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) return null;

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
        <Text style={styles.topBarTitle}>{t('writeReview') || 'Write Review'}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Rating Target */}
        <View style={styles.targetSection}>
          <Text style={styles.targetName}>{item.name}</Text>
          <Text style={styles.targetCategory}>{t(category)}</Text>
        </View>

        {/* Score Sliders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('scoreRating') || 'Scores'}</Text>
          {dimensionKeys.map((key) => (
            <View key={key} style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>
                  {dimensionLabels[key] || key}
                </Text>
                <Text style={styles.sliderValue}>
                  {(scores[key] || 3).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreButtons}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.scoreBtn,
                      (scores[key] || 3) >= val && styles.scoreBtnActive,
                    ]}
                    onPress={() => handleScoreChange(key, val)}
                  >
                    <Text
                      style={[
                        styles.scoreBtnText,
                        (scores[key] || 3) >= val && styles.scoreBtnTextActive,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Tag Selection */}
        {item.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('selectTags') || 'Tags'}</Text>
            <View style={styles.tagsGrid}>
              {item.tags.map((tag, i) => {
                const selected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.tag, selected && styles.tagSelected]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selected && styles.tagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('comment') || 'Comment'}</Text>
          <TextInput
            style={styles.commentInput}
            placeholder={t('optionalComment') || 'Leave a comment (optional)'}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitRating.isPending && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitRating.isPending}
        >
          {submitRating.isPending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>
              {t('submit') || 'Submit'}
            </Text>
          )}
        </TouchableOpacity>
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
    paddingHorizontal: spacing.xs,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  targetSection: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface1,
  },
  targetName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  targetCategory: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  sliderRow: {
    marginBottom: spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  sliderValue: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnActive: {
    backgroundColor: colors.primary,
  },
  scoreBtnText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  scoreBtnTextActive: {
    color: colors.onPrimary,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
  },
  tagSelected: {
    backgroundColor: colors.primaryContainer,
  },
  tagText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  tagTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '500',
  },
  commentInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    minHeight: 100,
  },
  submitButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
