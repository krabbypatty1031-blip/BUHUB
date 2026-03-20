import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingCategory, RatingItem } from '../../types';
import { useRatings } from '../../hooks/useRatings';
import { useRatingStore } from '../../store/ratingStore';
import { ratingService } from '../../api/services/rating.service';
import { translateLabel } from '../../utils/translate';
import { getLocalizedRatingDepartment, getLocalizedRatingLocation, getLocalizedRatingMetaLabel } from '../../utils/ratingMeta';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, CloseIcon, SearchIcon, StarIcon } from '../../components/common/icons';
import { FigmaSearchIcon26 } from '../../components/functions/SecondhandFigmaIcons';
import EmptyState from '../../components/common/EmptyState';
import { TeacherAvatarIcon, CourseAvatarIcon, CanteenAvatarIcon, MajorAvatarIcon } from '../../components/functions/DetailInfoIcons';
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

const ALL_FILTER_VALUE = '__all__';

type QuickFilterOption = {
  value: string;
  label: string;
  count: number;
};

type IndexedSearchField = {
  rawLower: string;
  normalized: string;
  weight: number;
};

type IndexedRatingItem = {
  item: RatingItem;
  quickFilterValue: string;
  quickFilterLabel: string;
  searchFields: IndexedSearchField[];
};

type SearchQueryIndex = {
  trimmed: string;
  lowered: string;
  normalized: string;
  loweredTokens: string[];
  normalizedTokens: string[];
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\u3400-\u9fff]+/gi, '');
}

function extractCourseSubject(code: string) {
  const compactCode = code.replace(/\s+/g, '').toUpperCase();
  const matched = compactCode.match(/^[A-Z]+/);
  return matched?.[0] ?? compactCode;
}

function simplifyFilterLabel(value: string) {
  return value
    .replace(/^Department of\s+/i, '')
    .replace(/^School of\s+/i, '')
    .replace(/^Academy of\s+/i, '')
    .replace(/^Faculty of\s+/i, '')
    .replace(/^Institute of\s+/i, '')
    .trim();
}

function getQuickFilterValue(item: RatingItem, category: RatingCategory) {
  if (category === 'course' && 'code' in item && item.code) {
    return extractCourseSubject(item.code);
  }
  if (category === 'canteen' && 'location' in item && item.location) {
    return item.location.trim();
  }
  return item.department.trim();
}

function getDepartmentLabel(item: RatingItem, lang: 'tc' | 'sc' | 'en') {
  return getLocalizedRatingDepartment(item, lang);
}

function getLocationLabel(item: RatingItem, lang: 'tc' | 'sc' | 'en') {
  return getLocalizedRatingLocation(item, lang);
}

function buildSearchQueryIndex(query: string): SearchQueryIndex {
  const trimmed = query.trim();
  const rawTokens = trimmed.split(/\s+/).filter(Boolean);

  return {
    trimmed,
    lowered: trimmed.toLowerCase(),
    normalized: normalizeSearchText(trimmed),
    loweredTokens: rawTokens.map((token) => token.toLowerCase()),
    normalizedTokens: rawTokens.map((token) => normalizeSearchText(token)).filter(Boolean),
  };
}

function buildIndexedSearchFields(item: RatingItem, lang: 'tc' | 'sc' | 'en'): IndexedSearchField[] {
  const departmentLabel = getDepartmentLabel(item, lang);
  const fields: Array<{ value: string; weight: number }> = [
    { value: item.name ?? '', weight: 160 },
    { value: translateLabel(item.name ?? '', lang), weight: 180 },
    { value: item.department ?? '', weight: 80 },
    { value: departmentLabel, weight: 110 },
  ];

  if ('code' in item && item.code) {
    fields.push({ value: item.code, weight: 220 });
    fields.push({ value: extractCourseSubject(item.code), weight: 140 });
  }

  if ('email' in item && item.email) {
    fields.push({ value: item.email, weight: 90 });
  }

  if ('location' in item && item.location) {
    fields.push({ value: item.location, weight: 110 });
    fields.push({ value: getLocationLabel(item, lang), weight: 130 });
  }

  return fields
    .filter((field) => field.value.trim().length > 0)
    .map((field) => ({
      rawLower: field.value.toLowerCase(),
      normalized: normalizeSearchText(field.value),
      weight: field.weight,
    }));
}

function getSearchScore(indexedItem: IndexedRatingItem, queryIndex: SearchQueryIndex) {
  let bestScore = 0;

  for (const field of indexedItem.searchFields) {
    let score = 0;

    if (field.rawLower === queryIndex.lowered || field.normalized === queryIndex.normalized) {
      score = field.weight + 220;
    } else if (field.rawLower.startsWith(queryIndex.lowered) || field.normalized.startsWith(queryIndex.normalized)) {
      score = field.weight + 150;
    } else if (field.rawLower.includes(queryIndex.lowered) || field.normalized.includes(queryIndex.normalized)) {
      score = field.weight + 70;
    }

    if (queryIndex.loweredTokens.length > 1) {
      const matchedAllRawTokens = queryIndex.loweredTokens.every((token) => field.rawLower.includes(token));
      const matchedAllNormalizedTokens = queryIndex.normalizedTokens.every((token) => field.normalized.includes(token));
      if (matchedAllRawTokens || matchedAllNormalizedTokens) {
        score = Math.max(score, field.weight + 110 + queryIndex.loweredTokens.length * 15);
      }
    }

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function MiniScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniBarRow}>
      <Text style={styles.miniBarLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.miniBarValue}>{value}</Text>
    </View>
  );
}

export default function RatingListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const listRef = useRef<any>(null);
  const selectedCategory = useRatingStore((s) => s.selectedCategory);
  const setCategory = useRatingStore((s) => s.setCategory);
  const searchQuery = useRatingStore((s) => s.searchQuery);
  const setSearchQuery = useRatingStore((s) => s.setSearchQuery);
  // Use searchQuery directly — client-side filtering is fast enough, no need for useDeferredValue
  const deferredSearchQuery = searchQuery;
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<RatingCategory, string>>({
    course: ALL_FILTER_VALUE,
    teacher: ALL_FILTER_VALUE,
    canteen: ALL_FILTER_VALUE,
    major: ALL_FILTER_VALUE,
  });
  const category = selectedCategory;
  const activeQuickFilter = activeFilters[category] ?? ALL_FILTER_VALUE;

  const { data: ratings, isLoading, isRefetching, refetch, isStale } = useRatings(category);

  useFocusEffect(
    useCallback(() => {
      if (isStale) refetch();
    }, [isStale, refetch])
  );

  useEffect(() => {
    const categoriesToPrefetch = CATEGORIES.filter((candidate) => candidate !== category);
    for (const candidate of categoriesToPrefetch) {
      void queryClient.prefetchQuery({
        queryKey: ['ratings', candidate, 'recent'],
        queryFn: () => ratingService.getList(candidate),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [category, queryClient]);

  const categoryOptions = useMemo<SegmentedControlOption<RatingCategory>[]>(
    () =>
      CATEGORIES.map((cat) => ({
        value: cat,
        label: t(CATEGORY_LABELS[cat]),
      })),
    [t]
  );

  const handleCategoryChange = useCallback(
    (cat: RatingCategory) => {
      setCategory(cat);
    },
    [setCategory]
  );

  const indexedRatings = useMemo<IndexedRatingItem[]>(() => {
    if (!ratings) return [];

    return ratings.map((item) => {
      const quickFilterValue = getQuickFilterValue(item, category);
      const quickFilterLabel =
        category === 'course'
          ? quickFilterValue
          : simplifyFilterLabel(getLocalizedRatingMetaLabel(quickFilterValue, lang));

      return {
        item,
        quickFilterValue,
        quickFilterLabel,
        searchFields: buildIndexedSearchFields(item, lang),
      };
    });
  }, [ratings, category, lang]);

  const allQuickFilterOptions = useMemo<QuickFilterOption[]>(() => {
    const counts = new Map<string, QuickFilterOption>();
    for (const entry of indexedRatings) {
      if (!entry.quickFilterValue) continue;
      const existing = counts.get(entry.quickFilterValue);
      if (existing) {
        existing.count += 1;
        continue;
      }
      counts.set(entry.quickFilterValue, {
        value: entry.quickFilterValue,
        label: entry.quickFilterLabel,
        count: 1,
      });
    }

    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [indexedRatings]);

  const quickFilterOptions = useMemo(() => {
    const maxVisible = category === 'course' ? 12 : 8;
    const visibleOptions = allQuickFilterOptions.slice(0, maxVisible);

    if (activeQuickFilter === ALL_FILTER_VALUE) {
      return visibleOptions;
    }

    if (visibleOptions.some((option) => option.value === activeQuickFilter)) {
      return visibleOptions;
    }

    const activeOption = allQuickFilterOptions.find((option) => option.value === activeQuickFilter);
    return activeOption ? [...visibleOptions, activeOption] : visibleOptions;
  }, [activeQuickFilter, allQuickFilterOptions, category]);

  const effectiveQuickFilter = useMemo(
    () =>
      activeQuickFilter === ALL_FILTER_VALUE || allQuickFilterOptions.some((option) => option.value === activeQuickFilter)
        ? activeQuickFilter
        : ALL_FILTER_VALUE,
    [activeQuickFilter, allQuickFilterOptions]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setSearchQuery(value);
      });
    },
    [setSearchQuery]
  );

  const handleQuickFilterChange = useCallback(
    (value: string) => {
      setActiveFilters((prev) => ({ ...prev, [category]: value }));
    },
    [category]
  );

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(frameId);
  }, [category, effectiveQuickFilter, deferredSearchQuery]);

  const searchQueryIndex = useMemo(() => buildSearchQueryIndex(deferredSearchQuery), [deferredSearchQuery]);

  const filteredRatings = useMemo(() => {
    const scopedRatings =
      effectiveQuickFilter === ALL_FILTER_VALUE
        ? indexedRatings
        : indexedRatings.filter((entry) => entry.quickFilterValue === effectiveQuickFilter);

    if (!searchQueryIndex.trimmed) {
      return scopedRatings.map((entry) => entry.item);
    }

    return scopedRatings
      .map((entry, index) => ({
        item: entry.item,
        index,
        score: getSearchScore(entry, searchQueryIndex),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.item.recentCount - a.item.recentCount ||
          b.item.ratingCount - a.item.ratingCount ||
          a.index - b.index
      )
      .map((entry) => entry.item);
  }, [effectiveQuickFilter, indexedRatings, searchQueryIndex]);

  const getSubtitle = useCallback(
    (item: RatingItem) => {
      const translatedDepartment = getDepartmentLabel(item, lang);
      if ('code' in item && item.code) {
        return [item.code, translatedDepartment].filter(Boolean).join(' | ');
      }
      if ('email' in item && item.email) {
        return [translatedDepartment, item.email].filter(Boolean).join(' | ');
      }
      if ('location' in item && item.location) {
        return [getLocationLabel(item, lang), translatedDepartment].filter(Boolean).join(' | ');
      }
      return translatedDepartment;
    },
    [lang]
  );

  const getTopTags = useCallback((item: RatingItem) => {
    const entries = Object.entries(item.tagCounts);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 3).map(([tag]) => tag);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: RatingItem }) => {
      const topTags = getTopTags(item);
      const overallScore = item.scores.length > 0
        ? Math.round(item.scores.reduce((sum, s) => sum + s.value, 0) / item.scores.length)
        : 0;
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('RatingDetail', { category, id: item.id })
          }
        >
          <View style={styles.cardHeader}>
            {category === 'teacher' ? <TeacherAvatarIcon size={40} /> :
             category === 'course' ? <CourseAvatarIcon size={40} /> :
             category === 'canteen' ? <CanteenAvatarIcon size={40} /> :
             <MajorAvatarIcon size={40} />}
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardName} numberOfLines={1}>
                {translateLabel(item.name, lang)}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {getSubtitle(item)}
              </Text>
            </View>
            <View style={styles.overallScoreWrap}>
              <Text style={styles.overallScoreText}>{overallScore}</Text>
              <Text style={styles.ratingCountSmall}>{item.ratingCount}{t('personRated')}</Text>
            </View>
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
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [category, navigation, getTopTags, t, lang, getSubtitle]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar — matching Secondhand */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('ratings')}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <FigmaSearchIcon26 size={30} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (collapsible) */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <FigmaSearchIcon26 size={18} color="#999999" />
            <TextInput
              style={styles.searchInput}
              placeholder={t(SEARCH_PLACEHOLDERS[category])}
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                activeOpacity={0.7}
                onPress={() => handleSearchChange('')}
              >
                <CloseIcon size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={category}
          onChange={handleCategoryChange}
        />
      </View>

      {quickFilterOptions.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickFilterChange(ALL_FILTER_VALUE)}
              style={[
                styles.filterChip,
                effectiveQuickFilter === ALL_FILTER_VALUE && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  effectiveQuickFilter === ALL_FILTER_VALUE && styles.filterChipTextActive,
                ]}
              >
                {t('allFilter')}
              </Text>
            </TouchableOpacity>
            {quickFilterOptions.map((option) => {
              const isActive = effectiveQuickFilter === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.7}
                  onPress={() => handleQuickFilterChange(option.value)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Rating List */}
      {isLoading && !ratings ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          key={`${category}:${effectiveQuickFilter}`}
          data={filteredRatings}
          extraData={`${category}:${effectiveQuickFilter}:${searchQueryIndex.trimmed}:${filteredRatings.length}:${filteredRatings[0]?.id ?? 'empty'}`}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          drawDistance={250}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              icon={<StarIcon size={36} color={colors.onSurfaceVariant} />}
              title={deferredSearchQuery.trim() || effectiveQuickFilter !== ALL_FILTER_VALUE ? t('noSearchResults') : t('noRatingData')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 26,
    height: 26,
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  filterSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F5F7',
  },
  filterChipActive: {
    backgroundColor: '#0C1015',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginTop: 2,
  },
  cardBody: {
  },
  miniBarsColumn: {
    flexDirection: 'column',
    gap: 6,
  },
  overallScoreWrap: {
    alignItems: 'flex-end',
  },
  overallScoreText: {
    fontSize: 20,
    fontFamily: 'DINExp-Bold',
    color: '#0C1015',
  },
  ratingCountSmall: {
    fontSize: 10,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniBarLabel: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    width: 48,
    flexShrink: 0,
  },
  miniBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#0C1015',
  },
  miniBarValue: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    width: 22,
    textAlign: 'right',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F3F5F7',
  },
  tagChipText: {
    fontSize: 10,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
});
