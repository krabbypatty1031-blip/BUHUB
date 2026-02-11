import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { Errand, ErrandCategory } from '../../types';
import { useErrands } from '../../hooks/useErrands';
import { useErrandStore } from '../../store/errandStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import { getRelativeTime } from '../../utils/formatTime';
import {
  BackIcon,
  PlusIcon,
  RepostIcon,
  TruckIcon,
  MoreHorizontalIcon,
  MessageIcon,
} from '../../components/common/icons';
import { mockErrands } from '../../data/mock/errands';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandList'>;

const CATEGORIES: Array<{ key: ErrandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'pickup', labelKey: 'pickup' },
  { key: 'buy', labelKey: 'buy' },
  { key: 'other', labelKey: 'other' },
];

export default function ErrandListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const selectedCategory = useErrandStore((s) => s.selectedCategory);
  const setCategory = useErrandStore((s) => s.setCategory);
  const acceptedErrands = useErrandStore((s) => s.acceptedErrands);
  const expiredNotified = useErrandStore((s) => s.expiredNotified);
  const setExpiredNotified = useErrandStore((s) => s.setExpiredNotified);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data: errands, isLoading, refetch } = useErrands(selectedCategory || undefined);

  useEffect(() => {
    if (errands && !expiredNotified) {
      const hasExpired = errands.some((item) => item.expired);
      if (hasExpired) {
        showSnackbar({ message: t('errandExpiryNotice'), type: 'info' });
        setExpiredNotified(true);
      }
    }
  }, [errands, expiredNotified, showSnackbar, t, setExpiredNotified]);

  const categoryOptions = useMemo<SegmentedControlOption<ErrandCategory | 'all'>[]>(
    () => CATEGORIES.map((cat) => ({ value: cat.key, label: t(cat.labelKey) })),
    [t]
  );

  const handleCategoryChange = useCallback(
    (key: ErrandCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const handleDmPoster = useCallback(
    (item: Errand, itemIndex: number) => {
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: { contactName: item.user, contactAvatar: item.avatar, forwardedType: 'errand', forwardedTitle: item.title, forwardedPosterName: item.user, forwardedIndex: itemIndex },
      });
    },
    [navigation]
  );

  // Action menu state (ellipsis popover)
  const [actionItem, setActionItem] = useState<{ post: Errand; index: number } | null>(null);
  // Forward sheet state (contact picker)
  const [shareSheetItem, setShareSheetItem] = useState<{ post: Errand; index: number } | null>(null);

  const renderItem = useCallback(
    ({ item }: { item: Errand }) => {
      const index = mockErrands.indexOf(item);
      const isAccepted = acceptedErrands.has(index);
      return (
        <TouchableOpacity
          style={[styles.card, item.expired && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ErrandDetail', { index })}
        >
          {/* Row 1: Avatar + Name · Time + Ellipsis */}
          <View style={styles.cardHeader}>
            <Avatar text={item.avatar} size="md" gender={item.gender} />
            <View style={styles.cardHeaderInfo}>
              <View style={styles.nameTimeRow}>
                <Text style={styles.userName}>{item.user}</Text>
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.timeMeta}>{getRelativeTime(item.createdAt, lang)}</Text>
              </View>
            </View>
            {!item.expired && (
              <TouchableOpacity
                style={styles.moreBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setActionItem({ post: item, index })}
              >
                <MoreHorizontalIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2+: Title & Content, aligned with name */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardContent} numberOfLines={2}>
              {item.desc}
            </Text>

            {/* Footer: price + badges */}
            <View style={styles.cardFooter}>
              <Text style={styles.priceText}>{item.price}</Text>
              {isAccepted && (
                <View style={styles.acceptedBadge}>
                  <Text style={styles.acceptedBadgeText}>{t('accepted')}</Text>
                </View>
              )}
              {item.expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('errandExpired')}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [acceptedErrands, navigation, t, lang]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('errands')}</Text>
        <View style={styles.iconBtn} />
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

      {/* Errand List */}
      <FlatList
        data={errands}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<TruckIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noErrands') || 'No errands yet'}
              message={t('createErrandHint') || 'Post an errand to get help!'}
              actionLabel={t('postErrand') || 'Post Errand'}
              onAction={() => navigation.navigate('ComposeErrand', { category: selectedCategory || 'pickup' })}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeErrand', { category: selectedCategory || 'pickup' })}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      {/* Action Menu (ellipsis popover) */}
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
              style={styles.actionRow}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) setShareSheetItem(a);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondaryContainer }]}>
                <RepostIcon size={20} color={colors.onSecondaryContainer} />
              </View>
              <Text style={styles.actionText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) handleDmPoster(a.post, a.index);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryContainer }]}>
                <MessageIcon size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{t('errandDmPoster')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Sheet (contact picker) */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="errand"
        functionTitle={shareSheetItem?.post.title ?? ''}
        functionPosterName={shareSheetItem?.post.user ?? ''}
        functionIndex={shareSheetItem?.index ?? 0}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 40; // md
const AVATAR_GAP = spacing.md; // 12

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
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  /* Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  cardExpired: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: AVATAR_GAP,
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  timeDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  timeMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },

  /* Card body — aligned with name */
  cardBody: {
    marginLeft: AVATAR_SIZE + AVATAR_GAP,
    marginTop: spacing.xs,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardContent: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  priceText: {
    ...typography.titleSmall,
    color: colors.error,
    fontWeight: '700',
  },
  acceptedBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  acceptedBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  expiredBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  expiredBadgeText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
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
});
