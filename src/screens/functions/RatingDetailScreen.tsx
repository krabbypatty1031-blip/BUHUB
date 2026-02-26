import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingItem } from '../../types';
import { useRatingDetail } from '../../hooks/useRatings';
import { translateLabel } from '../../utils/translate';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, StarIcon } from '../../components/common/icons';
import Avatar from '../../components/common/Avatar';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingDetail'>;

/* ── Dimension Bar ── */
function DimensionBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.dimCol}>
      <Text style={styles.dimValue}>{value}</Text>
      <View style={styles.dimVerticalTrack}>
        <View style={[styles.dimVerticalFill, { height: `${value}%` }]} />
      </View>
      <Text style={styles.dimColLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export default function RatingDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { category, id } = route.params;
  const { data: item, isLoading } = useRatingDetail(category, id);

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
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Profile Header ── */}
        <View style={styles.headerSection}>
          <Avatar text={item.name} uri={item.avatar} size="xl" />
          <Text style={styles.itemName}>{translateLabel(item.name, lang)}</Text>
          <Text style={styles.itemSubtitle}>{translateLabel(getSubtitle(item), lang)}</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Overall Score ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('overallScore')}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{overallScore}</Text>
            </View>
            <View style={styles.scoreInfo}>
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
              <Text style={styles.scoreCount}>
                {item.ratingCount} {t('participatedRating')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Dimension Bars ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('scoreDetail')}</Text>
          <View style={styles.dimVerticalRow}>
            {item.scores.map((score) => (
              <DimensionBar
                key={score.key}
                label={translateLabel(score.label, lang)}
                value={score.value}
              />
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Tag Cloud ── */}
        {tagCloud.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('commonTags')}</Text>
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
            <View style={styles.divider} />
          </>
        )}

        {/* ── Rate Button ── */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rateButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('RatingForm', { category, id })
            }
          >
            <StarIcon size={18} color={colors.onPrimary} />
            <Text style={styles.rateButtonText}>
              {t(`rate${category.charAt(0).toUpperCase() + category.slice(1)}` as any) || t('rate')}
            </Text>
          </TouchableOpacity>
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

  /* ── Top Bar ── */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
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
    paddingBottom: 120,
  },

  /* ── Header ── */
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  itemName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 32,
  },
  itemSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Shared ── */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.lg,
  },

  /* ── Score ── */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.onSurface,
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
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  scoreCount: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* ── Dimensions ── */
  dimVerticalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  dimCol: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  dimValue: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  dimVerticalTrack: {
    width: 24,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dimVerticalFill: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.onSurface,
    opacity: 0.7,
  },
  dimColLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 60,
  },

  /* ── Tag Cloud ── */
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
    color: colors.onSurface,
    fontWeight: '500',
  },
  tagCloudCount: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },

  /* ── Action Bar ── */
  actionBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  rateButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
