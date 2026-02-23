import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerPost, PartnerCategory } from '../../types';
import { usePartners } from '../../hooks/usePartners';
import { usePartnerStore } from '../../store/partnerStore';
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
  UsersIcon,
  MoreHorizontalIcon,
  MessageIcon,
  RepostIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerList'>;

const CATEGORIES: Array<{ key: PartnerCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
  { key: 'other', labelKey: 'other' },
];

export default function PartnerListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const selectedCategory = usePartnerStore((s) => s.selectedCategory);
  const setCategory = usePartnerStore((s) => s.setCategory);
  const joinedActivities = usePartnerStore((s) => s.joinedActivities);
  const expiredNotified = usePartnerStore((s) => s.expiredNotified);
  const setExpiredNotified = usePartnerStore((s) => s.setExpiredNotified);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data: partners, isLoading, refetch } = usePartners(selectedCategory || undefined);

  useEffect(() => {
    if (partners && !expiredNotified) {
      const hasExpired = partners.some((item) => item.expired);
      if (hasExpired) {
        showSnackbar({ message: t('partnerExpiryNotice'), type: 'info' });
        setExpiredNotified(true);
      }
    }
  }, [partners, expiredNotified, showSnackbar, t, setExpiredNotified]);

  const categoryOptions = useMemo<SegmentedControlOption<PartnerCategory | 'all'>[]>(
    () => CATEGORIES.map((cat) => ({ value: cat.key, label: t(cat.labelKey) })),
    [t]
  );

  const handleCategoryChange = useCallback(
    (key: PartnerCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  // Action menu state (ellipsis popover)
  const [actionItem, setActionItem] = useState<{ post: PartnerPost; index: number } | null>(null);
  // Forward sheet state (contact picker)
  const [shareSheetItem, setShareSheetItem] = useState<{ post: PartnerPost; index: number } | null>(null);

  const handleDmOrganizer = useCallback(
    (item: PartnerPost, itemIndex: number) => {
      const contactId = item.authorId;
      if (!contactId) return;
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: { contactId, contactName: item.user, contactAvatar: item.avatar, forwardedType: 'partner', forwardedTitle: item.title, forwardedPosterName: item.user, forwardedIndex: itemIndex },
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: PartnerPost }) => {
      const index = partners?.indexOf(item) ?? 0;
      const isJoined = joinedActivities.has(index);
      return (
        <TouchableOpacity
          style={[styles.card, item.expired && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PartnerDetail', { index })}
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
            <Text style={styles.cardContent} numberOfLines={3}>
              {item.desc}
            </Text>

            {/* Badges */}
            {(isJoined || item.expired) && (
              <View style={styles.badgeRow}>
                {isJoined && (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedBadgeText}>{t('joined')}</Text>
                  </View>
                )}
                {item.expired && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>{t('partnerExpired')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [joinedActivities, partners, navigation, t, lang]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('findPartner')}</Text>
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

      {/* Partner List */}
      <FlatList
        data={partners}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<UsersIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPartners')}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposePartner', { category: selectedCategory || 'travel' })}
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
                if (a) handleDmOrganizer(a.post, a.index);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryContainer }]}>
                <MessageIcon size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{t('partnerDmOrganizer')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Sheet (contact picker) */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="partner"
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  joinedBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  joinedBadgeText: {
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
