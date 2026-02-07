import React, { useCallback } from 'react';
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
import type { RatingCategory, RatingItem } from '../../types';
import { useRatings } from '../../hooks/useRatings';
import { useRatingStore } from '../../store/ratingStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, StarIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'RatingList'>;

const CATEGORIES: RatingCategory[] = ['teacher', 'course', 'canteen'];

function StarDisplay({ score }: { score: number }) {
  const stars = [];
  const rounded = Math.round(score * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars.push(
        <StarIcon key={i} size={16} color={colors.warning} fill={colors.warning} />
      );
    } else if (i - 0.5 <= rounded) {
      stars.push(
        <StarIcon key={i} size={16} color={colors.warning} fill={colors.warning} />
      );
    } else {
      stars.push(
        <StarIcon key={i} size={16} color={colors.outlineVariant} />
      );
    }
  }
  return <View style={styles.starRow}>{stars}</View>;
}

export default function RatingListScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const selectedCategory = useRatingStore((s) => s.selectedCategory);
  const setCategory = useRatingStore((s) => s.setCategory);

  const category = route.params?.category || selectedCategory;
  const { data: ratings, isLoading, refetch } = useRatings(category);

  const handleCategoryChange = useCallback(
    (cat: RatingCategory) => {
      setCategory(cat);
    },
    [setCategory]
  );

  const getOverallScore = useCallback((item: RatingItem): number => {
    if (!item.scores || item.scores.length === 0) return 0;
    const total = item.scores.reduce((sum, s) => sum + s.value, 0);
    return total / item.scores.length;
  }, []);

  const getDescription = useCallback((item: RatingItem): string => {
    if ('email' in item) return item.department;
    if ('code' in item) return `${item.code} - ${item.department}`;
    if ('location' in item) return item.location;
    return '';
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RatingItem; index: number }) => {
      const overall = getOverallScore(item);
      return (
        <TouchableOpacity
          style={styles.ratingCard}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('RatingDetail', { category, index })
          }
        >
          <View style={styles.ratingCardHeader}>
            <Text style={styles.ratingName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.scoreContainer}>
              <StarDisplay score={overall} />
              <Text style={styles.scoreText}>{overall.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.ratingDesc} numberOfLines={2}>
            {getDescription(item)}
          </Text>
          <View style={styles.ratingFooter}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
            <Text style={styles.ratingCount}>
              {item.ratingCount} {t('ratings')}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [category, navigation, getOverallScore, getDescription, t]
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
              {t(cat)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rating List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={ratings || []}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  ratingName: {
    ...typography.titleMedium,
    color: colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  scoreText: {
    ...typography.labelLarge,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  ratingDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  ratingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primaryContainer,
  },
  tagChipText: {
    fontSize: 12,
    color: colors.primary,
  },
  ratingCount: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginLeft: 'auto',
  },
});
