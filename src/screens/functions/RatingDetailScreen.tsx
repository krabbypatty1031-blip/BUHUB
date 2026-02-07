import React, { useCallback } from 'react';
import {
  View,
  Text,
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
import { useRatings } from '../../hooks/useRatings';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, StarIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingDetail'>;

function StarDisplay({ score, size = 18 }: { score: number; size?: number }) {
  const stars = [];
  const rounded = Math.round(score * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars.push(
        <StarIcon key={i} size={size} color={colors.warning} fill={colors.warning} />
      );
    } else {
      stars.push(
        <StarIcon key={i} size={size} color={colors.outlineVariant} />
      );
    }
  }
  return <View style={styles.starRow}>{stars}</View>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.scoreBarValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

export default function RatingDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { category, index } = route.params;
  const { data: ratings, isLoading } = useRatings(category);

  const item: RatingItem | undefined = ratings?.[index];

  const getOverallScore = useCallback((ratingItem: RatingItem): number => {
    if (!ratingItem.scores || ratingItem.scores.length === 0) return 0;
    const total = ratingItem.scores.reduce((sum, s) => sum + s.value, 0);
    return total / ratingItem.scores.length;
  }, []);

  const getSubtitle = useCallback((ratingItem: RatingItem): string => {
    if ('email' in ratingItem) return `${ratingItem.department} | ${ratingItem.email}`;
    if ('code' in ratingItem) return `${ratingItem.code} | ${ratingItem.department}`;
    if ('location' in ratingItem) return ratingItem.location;
    return '';
  }, []);

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

  const overall = getOverallScore(item);

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
        <Text style={styles.topBarTitle}>{t(category)}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{getSubtitle(item)}</Text>

          <View style={styles.overallScoreContainer}>
            <Text style={styles.overallScoreValue}>{overall.toFixed(1)}</Text>
            <View style={styles.overallScoreRight}>
              <StarDisplay score={overall} size={20} />
              <Text style={styles.ratingCountText}>
                {item.ratingCount} {t('ratings')}
              </Text>
            </View>
          </View>
        </View>

        {/* Dimension Scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detailedScores') || 'Scores'}</Text>
          {item.scores.map((score) => (
            <ScoreBar key={score.key} label={score.label} value={score.value} />
          ))}
        </View>

        {/* Tags */}
        {item.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('tags') || 'Tags'}</Text>
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rate Button */}
        <TouchableOpacity
          style={styles.rateButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('RatingForm', { category, index })
          }
        >
          <StarIcon size={20} color={colors.onPrimary} />
          <Text style={styles.rateButtonText}>{t('writeReview') || 'Write a Review'}</Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  itemName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  itemSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  overallScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.warning,
  },
  overallScoreRight: {
    gap: spacing.xs,
  },
  ratingCountText: {
    ...typography.bodySmall,
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
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  scoreBarLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    width: 80,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  scoreBarValue: {
    ...typography.labelMedium,
    color: colors.onSurface,
    width: 30,
    textAlign: 'right',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
  },
  tagChipText: {
    ...typography.bodySmall,
    color: colors.onPrimaryContainer,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
  },
  rateButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
