import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { RatingCategory, RatingItem } from '../../types';
import { useRatings } from '../../hooks/useRatings';
import { useRatingStore } from '../../store/ratingStore';
import { translateLabel } from '../../utils/translate';
import { getLocalizedRatingDepartment, getLocalizedRatingLocation } from '../../utils/ratingMeta';
import { colors } from '../../theme/colors';
import { getLocalizedFontStyle } from '../../theme/typography';
import ScreenHeader from '../../components/common/ScreenHeader';
import { CloseIcon, StarIcon } from '../../components/common/icons';
import { FigmaSearchIcon26 } from '../../components/functions/SecondhandFigmaIcons';
import EmptyState from '../../components/common/EmptyState';
import { TeacherAvatarIcon, CourseAvatarIcon, CanteenAvatarIcon, MajorAvatarIcon } from '../../components/functions/DetailInfoIcons';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingList'>;

const CATEGORIES: RatingCategory[] = ['course', 'teacher', 'canteen'];
const PAGE_SIZE = 20;

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

function MiniScoreBar({
  label,
  value,
  lang,
}: {
  label: string;
  value: number;
  lang: 'tc' | 'sc' | 'en';
}) {
  return (
    <View style={styles.miniBarRow}>
      <Text
        style={[
          styles.miniBarLabel,
          getLocalizedFontStyle(lang, 'regular'),
          lang === 'en' ? styles.miniBarLabelEnglish : null,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${value}%` }]} />
      </View>
      <Text style={[styles.miniBarValue, getLocalizedFontStyle(lang, 'bold')]}>{value}</Text>
    </View>
  );
}

export default function RatingListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const listRef = useRef<FlashListRef<RatingItem> | null>(null);
  const selectedCategory = useRatingStore((s) => s.selectedCategory);
  const setCategory = useRatingStore((s) => s.setCategory);
  const searchQuery = useRatingStore((s) => s.searchQuery);
  const setSearchQuery = useRatingStore((s) => s.setSearchQuery);
  const sortMode = useRatingStore((s) => s.sortMode);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [showSearch, setShowSearch] = useState(false);
  const category = selectedCategory;

  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useRatings(category, deferredSearchQuery, sortMode, PAGE_SIZE);

  const ratings = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const filteredRatings = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return ratings;
    return ratings.filter((item) => {
      const display = translateLabel(item.name, lang).toLowerCase();
      const raw = (item.name ?? '').toLowerCase();
      return display.includes(q) || raw.includes(q);
    });
  }, [ratings, deferredSearchQuery, lang]);

  const isInitialLoading = isLoading && ratings.length === 0;
  const isRefreshing = isRefetching && !isFetchingNextPage;
  const hasSearchQuery = deferredSearchQuery.trim().length > 0;

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

  const handleSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setSearchQuery(value);
      });
    },
    [setSearchQuery]
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [category, deferredSearchQuery]);

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isInitialLoading) {
      return;
    }
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isInitialLoading]);

  const getSubtitle = useCallback(
    (item: RatingItem) => {
      const translatedDepartment = getLocalizedRatingDepartment(item, lang);
      if ('code' in item && item.code) {
        return [item.code, translatedDepartment].filter(Boolean).join(' | ');
      }
      if ('location' in item && item.location) {
        return [getLocalizedRatingLocation(item, lang), translatedDepartment].filter(Boolean).join(' | ');
      }
      if ('email' in item && item.email) {
        return [translatedDepartment, item.email].filter(Boolean).join(' | ');
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
      // Compute from the same scores[] that drive the bars so the headline
      // value is always on the same scale as the per-criterion display
      // (matches RatingDetailScreen's derivation).
      const overallScore = item.scores.length > 0
        ? Math.round(item.scores.reduce((sum, score) => sum + score.value, 0) / item.scores.length)
        : 0;
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('RatingDetail', { category, id: item.id })}
        >
          <View style={styles.cardHeader}>
            {category === 'teacher' ? <TeacherAvatarIcon size={40} /> :
             category === 'course' ? <CourseAvatarIcon size={40} /> :
             category === 'canteen' ? <CanteenAvatarIcon size={40} /> :
             <MajorAvatarIcon size={40} />}
            <View style={styles.cardTitleWrap}>
              <Text style={[styles.cardName, getLocalizedFontStyle(lang, 'bold')]} numberOfLines={lang === 'en' ? 2 : 1}>
                {translateLabel(item.name, lang)}
              </Text>
              <Text style={[styles.cardSubtitle, getLocalizedFontStyle(lang, 'regular')]} numberOfLines={lang === 'en' ? 2 : 1}>
                {getSubtitle(item)}
              </Text>
            </View>
            <View style={styles.overallScoreWrap}>
              <Text style={styles.overallScoreText}>{overallScore}</Text>
              <Text style={[styles.ratingCountSmall, getLocalizedFontStyle(lang, 'regular')]}>{item.ratingCount}{t('personRated')}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.miniBarsColumn}>
              {item.scores.map((score) => (
                <MiniScoreBar
                  key={score.key}
                  label={translateLabel(score.label, lang)}
                  value={score.value}
                  lang={lang}
                />
              ))}
            </View>
            <View style={styles.cardBottom}>
              {topTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={[styles.tagChipText, getLocalizedFontStyle(lang, 'regular')]}>{translateLabel(tag, lang)}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [category, navigation, getTopTags, t, lang, getSubtitle]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) {
      return <View style={styles.listFooterSpacer} />;
    }

    return (
      <View style={styles.listFooterLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        variant="campus"
        title={t('ratings')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(lang, 'bold')}
        rightAction={
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <FigmaSearchIcon26 size={30} />
          </TouchableOpacity>
        }
      />

      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <FigmaSearchIcon26 size={18} color="#999999" />
            <TextInput
              style={[styles.searchInput, getLocalizedFontStyle(lang, 'regular')]}
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

      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={category}
          onChange={handleCategoryChange}
        />
      </View>

      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            ref={listRef}
            data={filteredRatings}
            extraData={`${category}:${deferredSearchQuery.trim()}:${filteredRatings.length}:${isFetchingNextPage ? 'fetching' : 'idle'}`}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={refetch}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            drawDistance={500}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <EmptyState
                icon={<StarIcon size={36} color={colors.onSurfaceVariant} />}
                title={hasSearchQuery ? t('noSearchResults') : t('noRatingData')}
              />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  listFooterLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooterSpacer: {
    height: 16,
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
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
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
  cardBody: {},
  miniBarsColumn: {
    flexDirection: 'column',
    gap: 6,
  },
  overallScoreWrap: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: 8,
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
    width: 56,
    flexShrink: 0,
  },
  miniBarLabelEnglish: {
    width: 82,
    lineHeight: 14,
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
