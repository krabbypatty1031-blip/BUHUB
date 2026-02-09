import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandItem, SecondhandCategory } from '../../types';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import {
  BackIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  MapPinIcon,
  AlertTriangleIcon,
  ForwardIcon,
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
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

/* ── Memoized Item Card ── */
const ItemCard = React.memo(function ItemCard({
  item,
  index,
  onPress,
  onForward,
  t,
}: {
  item: SecondhandItem;
  index: number;
  onPress: (index: number) => void;
  onForward: (index: number) => void;
  t: (key: string) => string;
}) {
  const isSoldOrExpired = item.sold || item.expired;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(index)}
    >
      {/* Image area */}
      <View style={[styles.imageArea, isSoldOrExpired && styles.imageAreaDimmed]}>
        <ShoppingBagIcon size={32} color={colors.outlineVariant} />

        {/* Condition tag - top left */}
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionBadgeText}>{item.condition}</Text>
        </View>

        {/* Status overlay - sold / expired */}
        {item.sold && (
          <View style={styles.statusOverlay}>
            <View style={styles.statusBadgeSold}>
              <Text style={styles.statusBadgeText}>{t('sold')}</Text>
            </View>
          </View>
        )}
        {item.expired && !item.sold && (
          <View style={styles.statusOverlay}>
            <View style={styles.statusBadgeExpired}>
              <Text style={styles.statusBadgeText}>{t('secondhandExpired')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={[styles.itemTitle, isSoldOrExpired && styles.textDimmed]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.itemPrice}>{item.price}</Text>

        {/* Footer: seller + location */}
        <View style={styles.cardFooter}>
          <View style={styles.sellerRow}>
            <Avatar text={item.avatar} size="xs" gender={item.gender} />
            <Text style={styles.sellerName} numberOfLines={1}>{item.user}</Text>
          </View>
          {item.location ? (
            <View style={styles.locationRow}>
              <MapPinIcon size={10} color={colors.outline} />
              <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>
        {!item.sold && !item.expired && (
          <TouchableOpacity
            style={styles.forwardBtn}
            activeOpacity={0.7}
            onPress={() => onForward(index)}
          >
            <ForwardIcon size={14} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function SecondhandListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedCategory = useSecondhandStore((s) => s.selectedCategory);
  const setCategory = useSecondhandStore((s) => s.setCategory);
  const expiredNotified = useSecondhandStore((s) => s.expiredNotified);
  const setExpiredNotified = useSecondhandStore((s) => s.setExpiredNotified);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data: items, isLoading, refetch } = useSecondhand(selectedCategory || undefined);

  const [searchText, setSearchText] = useState('');

  // Filter by search text
  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!searchText.trim()) return items;
    const query = searchText.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
    );
  }, [items, searchText]);

  useEffect(() => {
    if (items && !expiredNotified) {
      const hasExpired = items.some((item) => item.expired);
      if (hasExpired) {
        showSnackbar({ message: t('secondhandExpiryNotice'), type: 'info' });
        setExpiredNotified(true);
      }
    }
  }, [items, expiredNotified, showSnackbar, t, setExpiredNotified]);

  const categoryOptions = useMemo<SegmentedControlOption<SecondhandCategory | 'all'>[]>(
    () => CATEGORIES.map((cat) => ({ value: cat.key, label: t(cat.labelKey) })),
    [t]
  );

  const handleCategoryChange = useCallback(
    (key: SecondhandCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const handleItemPress = useCallback(
    (index: number) => {
      navigation.navigate('SecondhandDetail', { index });
    },
    [navigation]
  );

  const [shareSheetItem, setShareSheetItem] = useState<SecondhandItem | null>(null);

  const handleForward = useCallback(
    (index: number) => {
      const item = filteredItems[index];
      if (item) {
        setShareSheetItem(item);
      }
    },
    [filteredItems]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SecondhandItem; index: number }) => (
      <ItemCard item={item} index={index} onPress={handleItemPress} onForward={handleForward} t={t} />
    ),
    [handleItemPress, handleForward, t]
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

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchSecondhand')}
            placeholderTextColor={colors.outline}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={selectedCategory ?? 'all'}
          onChange={handleCategoryChange}
        />
      </View>

      {/* Disclaimer Banner */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
      </View>

      {/* Grid List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<ShoppingBagIcon size={36} color={colors.onSurfaceVariant} />}
              title={searchText.trim() ? t('noRelatedItems') : t('noRelatedItems')}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeSecondhand', { category: selectedCategory || 'electronics' })}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      {/* Forward Sheet */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="secondhand"
        functionTitle={shareSheetItem?.title ?? ''}
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

  /* Top Bar */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
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

  /* Search */
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.onSurface,
    padding: 0,
  },

  /* Category Tabs */
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  /* Disclaimer */
  disclaimerBar: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.onErrorContainer,
    textAlign: 'center',
    fontWeight: '500',
  },

  /* List */
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  /* Card */
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...elevation[1],
  },

  /* Image area */
  imageArea: {
    width: '100%',
    height: CARD_WIDTH * 0.8,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAreaDimmed: {
    opacity: 0.45,
  },
  conditionBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
  },
  conditionBadgeText: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 10,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  statusBadgeSold: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  statusBadgeExpired: {
    backgroundColor: colors.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontWeight: '700',
  },

  /* Card body */
  cardBody: {
    padding: spacing.md,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  textDimmed: {
    color: colors.outline,
  },
  itemPrice: {
    ...typography.titleSmall,
    color: colors.error,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  /* Card footer */
  cardFooter: {
    gap: spacing.xxs + 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sellerName: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  locationText: {
    ...typography.labelSmall,
    color: colors.outline,
    fontSize: 10,
    flex: 1,
  },

  forwardBtn: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FAB */
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
