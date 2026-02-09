import React, { useMemo } from 'react';
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
import type { RatingItem, ScoreDimension } from '../../types';
import { useRatings, useRatingDimensions } from '../../hooks/useRatings';
import { translateLabel } from '../../utils/translate';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, StarIcon, ShareIcon } from '../../components/common/icons';
import Avatar from '../../components/common/Avatar';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingDetail'>;

/* ── Dimension Bar ── */
function DimensionBar({
  leftLabel,
  rightLabel,
  value,
}: {
  leftLabel: string;
  rightLabel: string;
  value: number;
}) {
  return (
    <View style={styles.dimRow}>
      <Text style={styles.dimLeftLabel} numberOfLines={1}>{leftLabel}</Text>
      <View style={styles.dimTrack}>
        <View style={[styles.dimFill, { width: `${value}%` }]} />
        <View style={[styles.dimIndicator, { left: `${value}%` }]} />
      </View>
      <Text style={styles.dimRightLabel} numberOfLines={1}>{rightLabel}</Text>
    </View>
  );
}

export default function RatingDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { category, index } = route.params;
  const { data: ratings, isLoading } = useRatings(category);
  const { data: dimensions } = useRatingDimensions(category);

  const item: RatingItem | undefined = ratings?.[index];

  const dimensionMap = useMemo(() => {
    if (!dimensions) return {};
    const map: Record<string, ScoreDimension> = {};
    dimensions.forEach((d) => {
      map[d.key] = d;
    });
    return map;
  }, [dimensions]);

  const overallScore = useMemo(() => {
    if (!item) return 0;
    const total = item.scores.reduce((sum, s) => sum + s.value, 0);
    return Math.round(total / item.scores.length);
  }, [item]);

  const tagCloud = useMemo(() => {
    if (!item) return [];
    const entries = Object.entries(item.tagCounts);
    if (entries.length === 0) return [];
    entries.sort((a, b) => b[1] - a[1]);
    const maxCount = entries[0][1];
    const minCount = entries[entries.length - 1][1];
    const range = maxCount - minCount || 1;
    return entries.map(([tag, count]) => ({
      tag,
      count,
      fontSize: 12 + ((count - minCount) / range) * 7,
    }));
  }, [item]);

  const getSubtitle = (ratingItem: RatingItem): string => {
    if ('email' in ratingItem) return ratingItem.department;
    if ('code' in ratingItem) return `${ratingItem.code} | ${ratingItem.department}`;
    if ('location' in ratingItem) return ratingItem.location;
    return ratingItem.department;
  };

  const handleShare = () => {
    if (!item) return;
    navigation.navigate('RatingShare', { category, itemName: item.name });
  };

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
        <Text style={styles.topBarTitle}>{t(category)}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <ShareIcon size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Profile Header ── */}
        <View style={styles.headerSection}>
          <Avatar text={item.name} uri={item.avatar} size="xl" />
          <Text style={styles.itemName}>{translateLabel(item.name, lang)}</Text>
          <Text style={styles.itemSubtitle}>{translateLabel(getSubtitle(item), lang)}</Text>
        </View>

        {/* ── Overall Score Card ── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{overallScore}</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>{t('overallScore')}</Text>
            <Text style={styles.scoreCount}>
              {item.ratingCount} {t('participatedRating')}
            </Text>
          </View>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                size={16}
                color={star <= Math.round(overallScore / 20) ? colors.warning : colors.outlineVariant}
                fill={star <= Math.round(overallScore / 20) ? colors.warning : undefined}
              />
            ))}
          </View>
        </View>

        {/* ── Dimension Bars Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('scoreDetail')}</Text>
          {item.scores.map((score, i) => {
            const dim = dimensionMap[score.key];
            const leftLabel = dim ? translateLabel(dim.left, lang) : '';
            const rightLabel = dim ? translateLabel(dim.right, lang) : '';
            return (
              <View key={score.key}>
                <View style={styles.dimHeader}>
                  <Text style={styles.dimName}>
                    {translateLabel(score.label, lang)}
                  </Text>
                  <Text style={styles.dimScore}>{score.value}</Text>
                </View>
                <DimensionBar
                  leftLabel={leftLabel}
                  rightLabel={rightLabel}
                  value={score.value}
                />
                {i < item.scores.length - 1 && <View style={styles.dimSpacer} />}
              </View>
            );
          })}
        </View>

        {/* ── Tag Cloud Card ── */}
        {tagCloud.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('commonTags')}</Text>
            <View style={styles.tagCloudContainer}>
              {tagCloud.map(({ tag, count, fontSize }) => (
                <View key={tag} style={styles.tagCloudPill}>
                  <Text style={[styles.tagCloudText, { fontSize }]}>
                    {translateLabel(tag, lang)}
                  </Text>
                  <Text style={styles.tagCloudCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Rate Button ── */}
        <TouchableOpacity
          style={styles.rateButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('RatingForm', { category, index })
          }
        >
          <StarIcon size={20} color={colors.onPrimary} />
          <Text style={styles.rateButtonText}>
            {t(`rate${category.charAt(0).toUpperCase() + category.slice(1)}` as any) || t('rate')}
          </Text>
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

  /* Top Bar */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
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

  /* Header */
  headerSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  itemName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  itemSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  /* Score Card */
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    ...typography.titleLarge,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    ...typography.titleSmall,
    color: colors.onPrimaryContainer,
  },
  scoreCount: {
    ...typography.bodySmall,
    color: colors.onPrimaryContainer,
    opacity: 0.7,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },

  /* Card */
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },

  /* Dimensions */
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dimName: {
    ...typography.labelMedium,
    color: colors.onSurface,
  },
  dimScore: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dimLeftLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    width: 56,
    fontSize: 10,
  },
  dimTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    position: 'relative',
  },
  dimFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  dimIndicator: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginLeft: -6,
  },
  dimRightLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    width: 56,
    fontSize: 10,
    textAlign: 'right',
  },
  dimSpacer: {
    height: spacing.lg,
  },

  /* Tag Cloud */
  tagCloudContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagCloudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tagCloudText: {
    color: colors.primary,
    fontWeight: '500',
  },
  tagCloudCount: {
    ...typography.labelSmall,
    color: colors.outline,
    fontSize: 10,
  },

  /* Rate Button */
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    ...elevation[2],
  },
  rateButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
