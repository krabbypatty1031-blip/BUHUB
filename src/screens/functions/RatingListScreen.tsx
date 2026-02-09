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
    <View style={styles.miniBarCol}>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.miniBarLabel} numberOfLines={1}>{label}</Text>
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
          <View style={styles.cardRow}>
            <Avatar text={item.name} uri={item.avatar} size="sm" />
            <View style={styles.cardCenter}>
              <Text style={styles.cardName} numberOfLines={1}>
                {translateLabel(item.name, lang)}
              </Text>
              <View style={styles.miniBarsRow}>
                {item.scores.map((score) => (
                  <MiniScoreBar
                    key={score.key}
                    label={translateLabel(score.label, lang)}
                    value={score.value}
                  />
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={styles.ratePill}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('RatingForm', { category, index })
              }
            >
              <Text style={styles.ratePillText}>{t('rateBtn')}</Text>
            </TouchableOpacity>
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
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, category === cat && styles.tabActive]}
            onPress={() => handleCategoryChange(cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                category === cat && styles.tabTextActive,
              ]}
            >
              {t(CATEGORY_LABELS[cat])}
            </Text>
          </TouchableOpacity>
        ))}
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
        <TouchableOpacity
          style={[styles.sortBtn, sortMode === 'recent' && styles.sortBtnActive]}
          onPress={() => setSortMode('recent')}
        >
          <Text style={[styles.sortBtnText, sortMode === 'recent' && styles.sortBtnTextActive]}>
            {t('sortRecent')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortMode === 'controversial' && styles.sortBtnActive]}
          onPress={() => setSortMode('controversial')}
        >
          <Text style={[styles.sortBtnText, sortMode === 'controversial' && styles.sortBtnTextActive]}>
            {t('sortControversial')}
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primaryContainer,
  },
  tabText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  sortBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sortBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sortBtnText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  sortBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardCenter: {
    flex: 1,
  },
  cardName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  miniBarsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniBarCol: {
    flex: 1,
  },
  miniBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  miniBarLabel: {
    fontSize: 9,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  ratePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
  },
  ratePillText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
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
