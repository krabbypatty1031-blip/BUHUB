import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingCategory, RatingItem } from '../../types';
import { useRatingDetail, useMyRating } from '../../hooks/useRatings';
import { ratingService } from '../../api/services/rating.service';
import { useAuthStore } from '../../store/authStore';
import { translateLabel } from '../../utils/translate';
import { getRelativeTime } from '../../utils/formatTime';
import { getLocalizedRatingDepartment, getLocalizedRatingLocation } from '../../utils/ratingMeta';
import { handleFunctionDetailBack } from '../../utils/functionDetailNavigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import { BackIcon, MoreHorizontalIcon, StarIcon } from '../../components/common/icons';
import { TeacherAvatarIcon, CourseAvatarIcon, CanteenAvatarIcon, MajorAvatarIcon } from '../../components/functions/DetailInfoIcons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingDetail'>;
const RATE_LABEL_KEYS = {
  course: 'rateCourse',
  teacher: 'rateProfessor',
  canteen: 'rateCanteen',
  major: 'rateMajor',
} as const;

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
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { category: initialCategory, id, backToChat, backTo } = route.params;
  const [resolvedCategory, setResolvedCategory] = useState<RatingCategory | undefined>(initialCategory);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [isResolvingCategory, setIsResolvingCategory] = useState(!initialCategory);
  const activeCategory = initialCategory ?? resolvedCategory;
  const { data: item, isLoading, refetch } = useRatingDetail(activeCategory, id, { enabled: !!activeCategory });
  const { data: myRating } = useMyRating(activeCategory ?? 'course', id);
  const rateLabelKey = activeCategory ? RATE_LABEL_KEYS[activeCategory] : 'rate';

  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: !backTo && !backToChat });
  }, [navigation, backTo, backToChat]);

  React.useEffect(() => {
    if (initialCategory) {
      setResolvedCategory(initialCategory);
      setIsResolvingCategory(false);
      return;
    }
    let cancelled = false;
    setResolvedCategory(undefined);
    setIsResolvingCategory(true);

    void (async () => {
      const categories: RatingCategory[] = ['course', 'teacher', 'canteen', 'major'];
      for (const candidate of categories) {
        try {
          await queryClient.fetchQuery({
            queryKey: ['rating', candidate, id],
            queryFn: () => ratingService.getDetail(candidate, id),
            staleTime: 60_000,
          });
          if (cancelled) return;
          setResolvedCategory(candidate);
          setIsResolvingCategory(false);
          navigation.setParams({ category: candidate });
          return;
        } catch {
          // Try the next rating category until one resolves.
        }
      }
      if (!cancelled) {
        setIsResolvingCategory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, initialCategory, navigation, queryClient]);

  const handleBack = React.useCallback(() => {
    handleFunctionDetailBack({
      navigation,
      backToChat,
      backTo,
    });
  }, [navigation, backToChat, backTo]);

  useFocusEffect(
    React.useCallback(() => {
      if (!activeCategory) return undefined;
      refetch();
    }, [activeCategory, refetch])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!backTo && !backToChat) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [backTo, backToChat, handleBack])
  );

  const overallScore = useMemo(() => {
    if (!item) return 0;
    if (item.scores.length === 0) return 0;
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
    const localizedDepartment = getLocalizedRatingDepartment(ratingItem, lang);
    const email = 'email' in ratingItem && ratingItem.email ? ratingItem.email as string : '';
    if ('code' in ratingItem) return [ratingItem.code, localizedDepartment].filter(Boolean).join(' | ');
    if ('location' in ratingItem) return getLocalizedRatingLocation(ratingItem, lang) || localizedDepartment || '';
    return [localizedDepartment, email].filter(Boolean).join(' | ');
  };
  const sharedTitle = item ? translateLabel(item.name, lang) : '';
  const senderDisplayName = currentUser?.nickname || currentUser?.name || t('meLabel');

  const handleShareToContact = React.useCallback(() => {
    setPopoverVisible(false);
    setShareSheetVisible(true);
  }, []);

  if (isLoading || isResolvingCategory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconBtn}
          >
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('ratings')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{activeCategory ? t(activeCategory) : t('ratings')}</Text>
        <TouchableOpacity
          onPress={() => setPopoverVisible(true)}
          style={styles.iconBtn}
        >
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {popoverVisible && (
        <TouchableOpacity
          style={styles.popoverOverlay}
          activeOpacity={1}
          onPress={() => setPopoverVisible(false)}
        >
          <View style={styles.popoverBubble}>
            <TouchableOpacity style={styles.popoverItem} onPress={handleShareToContact}>
              <Text style={styles.popoverItemText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Profile Header ── */}
        <View style={styles.headerSection}>
          {activeCategory === 'teacher' ? <TeacherAvatarIcon size={80} /> :
           activeCategory === 'course' ? <CourseAvatarIcon size={80} /> :
           activeCategory === 'canteen' ? <CanteenAvatarIcon size={80} /> :
           <MajorAvatarIcon size={80} />}
          <Text style={styles.itemName}>{translateLabel(item.name, lang)}</Text>
          <Text style={styles.itemSubtitle}>{getSubtitle(item)}</Text>
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

        {/* ── Anonymous Comments ── */}
        {item.comments && item.comments.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('reviews')} ({item.comments.length})
              </Text>
              {item.comments.map((c, i) => (
                <View key={i} style={[styles.commentCard, i > 0 && { marginTop: spacing.sm }]}>
                  <Text style={styles.commentText}>{c.comment}</Text>
                  <Text style={styles.commentTime}>{getRelativeTime(c.createdAt, lang)}</Text>
                </View>
              ))}
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
              activeCategory
                ? navigation.navigate('RatingForm', { category: activeCategory, id })
                : undefined
            }
          >
            <StarIcon size={18} color={colors.onPrimary} />
            <Text style={styles.rateButtonText}>
              {myRating ? t('editMyRating') : t('rateThis')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FunctionForwardSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        functionType="rating"
        functionTitle={sharedTitle}
        functionPosterName={senderDisplayName}
        functionId={item.id}
        ratingCategory={activeCategory}
        navigation={navigation}
      />
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
    justifyContent: 'space-between',
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
  popoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  popoverBubble: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    minWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xs,
    ...elevation[2],
  },
  popoverItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  popoverItemText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
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
    justifyContent: 'center',
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
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  scoreCount: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
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

  /* ── Comments ── */
  commentCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    lineHeight: 20,
    marginBottom: 6,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#C7C7CC',
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
