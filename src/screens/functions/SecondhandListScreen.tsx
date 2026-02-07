import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandItem, SecondhandCategory } from '../../types';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Chip from '../../components/common/Chip';
import {
  BackIcon,
  PlusIcon,
  ShoppingBagIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandList'>;

const CATEGORIES: Array<{ key: SecondhandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

export default function SecondhandListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedCategory = useSecondhandStore((s) => s.selectedCategory);
  const setCategory = useSecondhandStore((s) => s.setCategory);
  const { data: items, isLoading, refetch } = useSecondhand(selectedCategory || undefined);

  const handleCategoryPress = useCallback(
    (key: SecondhandCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SecondhandItem; index: number }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SecondhandDetail', { index })}
      >
        <View style={styles.imagePlaceholder}>
          <ShoppingBagIcon size={32} color={colors.outlineVariant} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>{item.price}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.conditionText}>{item.condition}</Text>
            {item.sold && (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>{t('sold')}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Category Chips */}
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            label={t(cat.labelKey)}
            selected={
              cat.key === 'all'
                ? selectedCategory === null
                : selectedCategory === cat.key
            }
            onPress={() => handleCategoryPress(cat.key)}
          />
        ))}
      </View>

      {/* Grid List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeSecondhand')}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>
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
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...elevation[1],
  },
  imagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.sm,
  },
  itemTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  soldBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  soldBadgeText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },
});
