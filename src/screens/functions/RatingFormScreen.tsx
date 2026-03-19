import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingItem, ScoreDimension } from '../../types';
import { useRatingDetail, useSubmitRating, useRatingDimensions, useRatingTagOptions } from '../../hooks/useRatings';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { translateLabel } from '../../utils/translate';
import { canPublishCommunityContent, isPublishPermissionError } from '../../utils/publishPermission';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon } from '../../components/common/icons';
import Chip from '../../components/common/Chip';
import { hapticSelection, hapticMedium } from '../../utils/haptics';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingForm'>;

function CustomSlider({
  value,
  onValueChange,
  leftLabel,
  rightLabel,
}: {
  value: number;
  onValueChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  const trackWidth = useRef(0);
  const trackPageX = useRef(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const computeValue = useCallback((pageX: number) => {
    if (trackWidth.current <= 0) return;
    const x = pageX - trackPageX.current;
    const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
    const newValue = Math.round(ratio * 100);
    onValueChange(newValue);
  }, [onValueChange]);

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabelsRow}>
        <Text style={styles.sliderEndLabel} numberOfLines={1}>{leftLabel}</Text>
        <Text style={styles.sliderEndLabel} numberOfLines={1}>{rightLabel}</Text>
      </View>
      <View
        style={styles.sliderTouchArea}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          trackPageX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
          hapticSelection();
          computeValue(e.nativeEvent.pageX);
        }}
        onResponderMove={(e) => computeValue(e.nativeEvent.pageX)}
      >
        <View style={styles.sliderTrack} pointerEvents="none">
          <View style={[styles.sliderFill, { width: `${value}%` }]} />
        </View>
        <View style={[styles.sliderThumb, { left: `${value}%` }]} pointerEvents="none" />
      </View>
      <Text style={styles.sliderValueText}>{value}</Text>
    </View>
  );
}

export default function RatingFormScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { category, id } = route.params;
  const { data: item, isLoading } = useRatingDetail(category, id);
  const { data: dimensions } = useRatingDimensions(category);
  const { data: tagOptions } = useRatingTagOptions(category);
  const submitRating = useSubmitRating(category, id);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Tab bar visibility is now handled by MainTabNavigator's screenListeners

  const dimensionMap = useMemo(() => {
    if (!dimensions) return {};
    const map: Record<string, ScoreDimension> = {};
    dimensions.forEach((d) => { map[d.key] = d; });
    return map;
  }, [dimensions]);

  const [scores, setScores] = useState<Record<string, number>>({});

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!item) return;
    const initial: Record<string, number> = {};
    item.scores.forEach((s) => {
      initial[s.key] = 50;
    });
    setScores(initial);
  }, [item?.id]);

  const itemNameForShare = translateLabel(item?.name || 'Untitled', lang);
  const senderDisplayName = user?.nickname || user?.name || t('meLabel');

  const handleScoreChange = useCallback((key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    hapticSelection();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('submitRating')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Target Info */}
        <View style={styles.targetSection}>
          <Text style={styles.targetName}>{translateLabel(item.name || 'Untitled', lang)}</Text>
          <Text style={styles.targetCategory}>{t(category)}</Text>
        </View>

        {/* Custom Slider Inputs */}
        <View style={styles.section}>
          {item.scores.map((score) => {
            const dim = dimensionMap[score.key];
            return (
              <CustomSlider
                key={score.key}
                value={scores[score.key] ?? 50}
                onValueChange={(v) => handleScoreChange(score.key, v)}
                leftLabel={dim ? translateLabel(dim.left, lang) : ''}
                rightLabel={dim ? translateLabel(dim.right, lang) : ''}
              />
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
              {t('submitBtn')}
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    pointerEvents: 'none',
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
  sliderContainer: {
    marginBottom: spacing.sm,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sliderEndLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    maxWidth: '45%',
  },
  sliderTouchArea: {
    height: 44,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface2,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    marginLeft: -11,
    top: 11,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  sliderValueText: {
    ...typography.labelMedium,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.sm,
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
