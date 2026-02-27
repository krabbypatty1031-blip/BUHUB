import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import Avatar from '../../components/common/Avatar';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import {
  BackIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  MapPinIcon,
  AlertTriangleIcon,
  RepostIcon,
  MoreHorizontalIcon,
  MessageIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandList'>;

const CATEGORIES: Array<{ key: SecondhandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

const CARD_GAP = spacing.sm;

/* ── Memoized Item Card ── */
const ItemCard = React.memo(function ItemCard({
  item,
  id,
  onPress,
  onMore,
  t,
  cardWidth,
}: {
  item: SecondhandItem;
  id: string;
  onPress: (id: string) => void;
  onMore: (item: SecondhandItem, id: string) => void;
  t: (key: string) => string;
  cardWidth: number;
}) {
  const isSoldOrExpired = item.sold || item.expired;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.7}
      onPress={() => onPress(id)}
    >
      {/* Image area */}
      <View style={[styles.imageArea, { height: cardWidth * 0.8 }, isSoldOrExpired && styles.imageAreaDimmed]}>
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

        <View style={styles.sellerRow}>
          <Avatar text={item.user} uri={item.avatar} size="sm" gender={item.gender} />
          <View style={styles.sellerInfo}>
            <View style={styles.sellerNameRow}>
              <Text style={styles.sellerName} numberOfLines={1}>
                {item.user}
              </Text>
              {item.gender === 'male' && <MaleIcon size={10} color={colors.genderMale} />}
              {item.gender === 'female' && <FemaleIcon size={10} color={colors.genderFemale} />}
            </View>
          </View>
        </View>
        {!item.sold && !item.expired && (
          <TouchableOpacity
            style={styles.moreBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onMore(item, id)}
          >
            <MoreHorizontalIcon size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function SecondhandListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - spacing.lg * 2 - CARD_GAP) / 2;
  const selectedCategory = useSecondhandStore((s) => s.selectedCategory);
  const setCategory = useSecondhandStore((s) => s.setCategory);
  const expiredNotified = useSecondhandStore((s) => s.expiredNotified);
  const setExpiredNotified = useSecondhandStore((s) => s.setExpiredNotified);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data: items, isLoading, refetch } = useSecondhand(selectedCategory || undefined);

  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

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
    (id: string) => {
      navigation.navigate('SecondhandDetail', { id });
    },
    [navigation]
  );

  // Action menu state
  const [actionItem, setActionItem] = useState<{ item: SecondhandItem; id: string } | null>(null);
  // Forward sheet state
  const [shareSheetItem, setShareSheetItem] = useState<{ item: SecondhandItem; id: string } | null>(null);

  const handleDmSeller = useCallback(
    (item: SecondhandItem, functionId: string) => {
      if (!item.authorId) return;
      const backTo = buildChatBackTarget(navigation, 'FunctionsTab');
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          contactId: item.authorId,
          contactName: item.user,
          contactAvatar: item.avatar,
          forwardedType: 'secondhand',
          forwardedTitle: item.title,
          forwardedPosterName: item.user,
          forwardedId: functionId,
          forwardedNonce: `${Date.now()}-${functionId}-${item.authorId}`,
          ...(backTo ? { backTo } : {}),
        },
      });
    },
    [navigation]
  );

  const handleMore = useCallback(
    (item: SecondhandItem, id: string) => {
      setActionItem({ item, id });
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SecondhandItem }) => {
      return (
        <ItemCard id={item.id} item={item} onPress={handleItemPress} onMore={handleMore} t={t} cardWidth={cardWidth} />
      );
    },
    [handleItemPress, handleMore, t, cardWidth]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSearch(!showSearch)}
        >
          <SearchIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Search Bar (collapsible) */}
      {showSearch && (
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
              autoFocus
            />
          </View>
        </View>
      )}

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
        keyExtractor={(item) => item.id}
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

      {/* Action Menu */}
      <Modal
        visible={!!actionItem}
        transparent
        animationType="fade"
        onRequestClose={() => setActionItem(null)}
      >
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setActionItem(null)}
        >
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.actionHandle} />

            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) setShareSheetItem(a);
              }}
            >
              <Text style={styles.actionText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) handleDmSeller(a.item, a.id);
              }}
            >
              <Text style={styles.actionText}>{t('secondhandDmSeller')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Sheet (contact picker) */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="secondhand"
        functionTitle={shareSheetItem?.item.title ?? ''}
        functionPosterName={shareSheetItem?.item.user ?? ''}
        functionId={shareSheetItem?.id ?? ''}
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

  /* Search */
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
    paddingTop: spacing.sm,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },

  /* Image area */
  imageArea: {
    width: '100%',
    height: 120,
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
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    flexShrink: 0,
  },

  moreBtn: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },

  /* Action Menu */
  actionOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 36,
  },
  actionHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  actionRowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
