import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingCategory, RatingItem, RatingSortMode } from '../../types';
import { useRatings } from '../../hooks/useRatings';
import { useRatingStore } from '../../store/ratingStore';
import { translateLabel } from '../../utils/translate';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon } from '../../components/common/icons';
import Avatar from '../../components/common/Avatar';
import SearchInput from '../../components/common/SearchInput';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingList'>;

const CATEGORIES: RatingCategory[] = ['course', 'teacher', 'canteen', 'major'];

const CATEGORY_LABELS: Record<RatingCategory, string> = {
  course: 'course',
  teacher: 'teacher',
  canteen: 'canteen',
  major: 'majorTab',
};

const SEARCH_PLACEHOLDERS: Record<RatingCategory, string> = {
  teacher: 'searchTeacher',
  course: 'searchCourse',
  canteen: 'searchCanteen',
  major: 'searchMajor',
};

function MiniScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniBarRow}>
      <Text style={styles.miniBarLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

export default function RatingListScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const selectedCategory = useRatingStore((s) => s.selectedCategory);
  const setCategory = useRatingStore((s) => s.setCategory);
  const searchQuery = useRatingStore((s) => s.searchQuery);
  const setSearchQuery = useRatingStore((s) => s.setSearchQuery);
  const sortMode = useRatingStore((s) => s.sortMode);
  const setSortMode = useRatingStore((s) => s.setSortMode);

  const category = route.params?.category || selectedCategory;
  const { data: ratings, isLoading, refetch } = useRatings(category, sortMode);

  const categoryOptions = useMemo<SegmentedControlOption<RatingCategory>[]>(
    () =>
      CATEGORIES.map((cat) => ({
        value: cat,
        label: t(CATEGORY_LABELS[cat]),
      })),
    [t]
  );

  const sortOptions = useMemo<SegmentedControlOption<RatingSortMode>[]>(
    () => [
      { value: 'recent', label: t('sortRecent') },
      { value: 'controversial', label: t('sortControversial') },
    ],
    [t]
  );

  const handleCategoryChange = useCallback(
    (cat: RatingCategory) => {
      setCategory(cat);
    },
    [setCategory]
  );

  const filteredRatings = useMemo(() => {
    if (!ratings) return [];
    if (!searchQuery.trim()) return ratings;
    const q = searchQuery.toLowerCase();
    return ratings.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q)
    );
  }, [ratings, searchQuery]);

  const getTopTags = useCallback((item: RatingItem) => {
    const entries = Object.entries(item.tagCounts);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3).map(([tag]) => tag);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RatingItem; index: number }) => {
      const topTags = getTopTags(item);
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('RatingDetail', { category, index })
          }
        >
          <View style={styles.cardHeader}>
            <Avatar text={item.name} uri={item.avatar} size="sm" />
            <Text style={styles.cardName} numberOfLines={1}>
              {translateLabel(item.name, lang)}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.miniBarsColumn}>
              {item.scores.map((score) => (
                <MiniScoreBar
                  key={score.key}
                  label={translateLabel(score.label, lang)}
                  value={score.value}
                />
              ))}
            </View>
            <View style={styles.cardBottom}>
              {topTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{translateLabel(tag, lang)}</Text>
                </View>
              ))}
              <Text style={styles.ratingCount}>
                {item.ratingCount} {t('personRated')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [category, navigation, getTopTags, t, lang]
  );

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
        <Text style={styles.topBarTitle}>{t('ratings')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={category}
          onChange={handleCategoryChange}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t(SEARCH_PLACEHOLDERS[category])}
        />
      </View>

      {/* Sort Toggle */}
      <View style={styles.sortRow}>
        <SegmentedControl options={sortOptions} value={sortMode} onChange={setSortMode} />
      </View>

      {/* Rating List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={filteredRatings}
          renderItem={renderItem}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          drawDistance={250}
        />
      )}
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
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sortRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginLeft: spacing.md,
    flex: 1,
  },
  cardBody: {
    marginLeft: 32 + spacing.md,
    marginTop: spacing.md,
  },
  miniBarsColumn: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniBarLabel: {
    fontSize: 11,
    color: colors.onSurface,
    width: 60,
    flexShrink: 0,
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryContainer,
  },
  tagChipText: {
    fontSize: 11,
    color: colors.primary,
  },
  ratingCount: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginLeft: 'auto',
  },
});
