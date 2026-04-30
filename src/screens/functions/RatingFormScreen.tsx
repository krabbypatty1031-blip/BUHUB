import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { ScoreDimension } from '../../types';
import { useRatingDetail, useSubmitRating, useRatingDimensions, useRatingTagOptions, useMyRating } from '../../hooks/useRatings';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { translateLabel } from '../../utils/translate';
import { canPublishCommunityContent, isPublishPermissionError } from '../../utils/publishPermission';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import ScreenHeader from '../../components/common/ScreenHeader';
import Chip from '../../components/common/Chip';
import { hapticSelection, hapticMedium } from '../../utils/haptics';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingForm'>;

export default function RatingFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { category, id } = route.params;
  const { data: item, isLoading } = useRatingDetail(category, id);
  const { data: dimensions } = useRatingDimensions(category);
  const { data: tagOptions } = useRatingTagOptions(category);
  const { data: myRating } = useMyRating(category, id);
  const submitRating = useSubmitRating(category, id);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const isEditing = !!myRating;

  // Tab bar visibility is now handled by MainTabNavigator's screenListeners

  const dimensionMap = useMemo(() => {
    if (!dimensions) return {};
    const map: Record<string, ScoreDimension> = {};
    dimensions.forEach((d) => { map[d.key] = d; });
    return map;
  }, [dimensions]);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  // Initialize scores from item defaults (70 for each dimension)
  useEffect(() => {
    if (!item) return;
    const initial: Record<string, number> = {};
    const initialInputs: Record<string, string> = {};
    item.scores.forEach((s) => {
      initial[s.key] = 70;
      initialInputs[s.key] = '70';
    });
    setScores(initial);
    setScoreInputs(initialInputs);
  }, [item?.id]);

  // Pre-populate from existing rating if available
  useEffect(() => {
    if (myRating?.scores) {
      const converted: Record<string, number> = {};
      const convertedInputs: Record<string, string> = {};
      for (const [key, value] of Object.entries(myRating.scores)) {
        // Backend stores 0-5, convert to 0-100
        const val = Math.round(value * 20);
        converted[key] = val;
        convertedInputs[key] = String(val);
      }
      setScores(converted);
      setScoreInputs(convertedInputs);
    }
    if (myRating?.tags) {
      setSelectedTags(myRating.tags);
    }
    if (myRating?.comment) {
      setComment(myRating.comment);
    }
  }, [myRating]);

  const itemNameForShare = translateLabel(item?.name || 'Untitled', lang);
  const senderDisplayName = user?.nickname || user?.name || t('meLabel');

  const adjustScore = useCallback((key: string, delta: number) => {
    hapticSelection();
    setScores((prev) => {
      const current = prev[key] ?? 70;
      const next = Math.max(0, Math.min(100, current + delta));
      setScoreInputs((p) => ({ ...p, [key]: String(next) }));
      return { ...prev, [key]: next };
    });
  }, []);

  const setScoreValue = useCallback((key: string, text: string) => {
    // Allow user to type freely — only digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setScoreInputs((prev) => ({ ...prev, [key]: cleaned }));
    // Commit to scores when valid
    if (cleaned === '') return;
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      setScores((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, num)) }));
    }
  }, []);

  const commitScoreInput = useCallback((key: string) => {
    // On blur: clamp and sync display
    setScoreInputs((prev) => {
      const val = parseInt(prev[key] || '0', 10);
      const clamped = Math.max(0, Math.min(100, isNaN(val) ? 70 : val));
      setScores((p) => ({ ...p, [key]: clamped }));
      return { ...prev, [key]: String(clamped) };
    });
  }, []);

  const toggleTag = useCallback((tag: string) => {
    hapticSelection();
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isLoggedIn) {
      showSnackbar({ message: t('emailVerifyRequired'), type: 'error' });
      return;
    }
    if (!canPublishCommunityContent(user)) {
      showSnackbar({ message: t('hkbuEmailRequiredForPublish'), type: 'error' });
      return;
    }
    hapticMedium();
    submitRating.mutate(
      {
        scores,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          showSnackbar({ message: t('ratingShareTitle'), type: 'success' });
          navigation.replace('RatingShare', {
            itemName: itemNameForShare,
            posterName: senderDisplayName,
            functionId: id,
            ratingCategory: category,
          });
        },
        onError: (error) => {
          const submitError = typeof error === 'object' && error
            ? error as { errorCode?: string; code?: string | number }
            : undefined;
          showSnackbar({
            message: isPublishPermissionError(submitError) ? t('hkbuEmailRequiredForPublish') : t('dataLoadFailed'),
            type: 'error',
          });
        },
      }
    );
  }, [scores, selectedTags, comment, submitRating, showSnackbar, navigation, t, isLoggedIn, user, itemNameForShare, senderDisplayName, id, category]);

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
      <ScreenHeader
        title={t('submitRating')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={24}
      >
        {/* Target Info */}
        <View style={styles.targetSection}>
          <Text style={styles.targetName}>{translateLabel(item.name || 'Untitled', lang)}</Text>
          <Text style={styles.targetCategory}>{t(category)}</Text>
        </View>

        {/* Editing Notice */}
        {isEditing && myRating?.updatedAt && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeText}>
              {t('editingNotice', { date: new Date(myRating.updatedAt).toLocaleDateString() })}
            </Text>
          </View>
        )}

        {/* Number Input per Dimension */}
        <View style={styles.section}>
          {item.scores.map((score) => {
            const dim = dimensionMap[score.key];
            return (
              <View key={score.key} style={styles.scoreRow}>
                <View style={styles.scoreLabel}>
                  <Text style={styles.scoreName}>
                    {dim ? translateLabel(dim.label, lang) : translateLabel(score.label, lang)}
                  </Text>
                  {dim && (dim.left || dim.right) && (
                    <Text style={styles.scoreRange}>
                      {translateLabel(dim.left, lang)} {'<'}- -{'>'} {translateLabel(dim.right, lang)}
                    </Text>
                  )}
                </View>
                <View style={styles.scoreInput}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustScore(score.key, -5)}>
                    <Text style={styles.stepBtnText}>{'\u2212'}</Text>
                  </TouchableOpacity>
                  <View style={styles.numberBox}>
                    <TextInput
                      style={styles.numberText}
                      value={scoreInputs[score.key] ?? '70'}
                      onChangeText={(text) => setScoreValue(score.key, text)}
                      onBlur={() => commitScoreInput(score.key)}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustScore(score.key, 5)}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tag Selection */}
        {tagOptions && tagOptions.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.lg }]}>{t('selectTagsMax3')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
            >
              {tagOptions.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={translateLabel(tag, lang)}
                    selected={selected}
                    onPress={() => toggleTag(tag)}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('additionalComment')}</Text>
          <TextInput
            style={styles.commentInput}
            placeholder={t('shareExperience')}
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
              {isEditing ? t('updateRating') : t('submitBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
    color: colors.onSurface,
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scoreLabel: {
    flex: 1,
  },
  scoreName: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: '#0C1015',
  },
  scoreRange: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: '#86909C',
  },
  scoreInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    color: '#86909C',
    fontFamily: fontFamily.medium,
  },
  numberBox: {
    width: 52,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DEE2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: '#0C1015',
    textAlign: 'center',
    padding: 0,
  },
  editNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFF8E1',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  editNoticeText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#8B6914',
    flex: 1,
  },
  tagSection: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  tagsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
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
