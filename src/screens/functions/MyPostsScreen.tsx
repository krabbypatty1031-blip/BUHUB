import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerPost, Errand, SecondhandItem } from '../../types';
import { usePartners } from '../../hooks/usePartners';
import { useErrands } from '../../hooks/useErrands';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useAuthStore } from '../../store/authStore';
import { usePartnerStore } from '../../store/partnerStore';
import { useErrandStore } from '../../store/errandStore';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import { getRelativeTime } from '../../utils/formatTime';
import {
  BackIcon,
  RepostIcon,
  ShareIcon,
  MoreHorizontalIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'MyPosts'>;

type CardItem =
  | { kind: 'partner'; data: PartnerPost; index: number }
  | { kind: 'errand'; data: Errand; index: number }
  | { kind: 'secondhand'; data: SecondhandItem; index: number };

export default function MyPostsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const currentUser = useAuthStore((s) => s.user);
  const nickname = currentUser?.nickname || currentUser?.name || '浸大小明';
  const { data: partners } = usePartners();
  const { data: errands } = useErrands();
  const { data: secondhandItems } = useSecondhand();
  const closePartner = usePartnerStore((s) => s.closePost);
  const partnerClosed = usePartnerStore((s) => s.closedPosts);
  const closeErrand = useErrandStore((s) => s.closePost);
  const errandClosed = useErrandStore((s) => s.closedPosts);
  const closeSecondhand = useSecondhandStore((s) => s.closePost);
  const secondhandClosed = useSecondhandStore((s) => s.closedPosts);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [shareSheetItem, setShareSheetItem] = useState<CardItem | null>(null);
  const [actionItem, setActionItem] = useState<CardItem | null>(null);

  const allPosts = useMemo(() => {
    const items: CardItem[] = [];
    if (partners) {
      partners.forEach((item, index) => {
        if (item.user === nickname) items.push({ kind: 'partner', data: item, index });
      });
    }
    if (errands) {
      errands.forEach((item, index) => {
        if (item.user === nickname) items.push({ kind: 'errand', data: item, index });
      });
    }
    if (secondhandItems) {
      secondhandItems.forEach((item, index) => {
        if (item.user === nickname) items.push({ kind: 'secondhand', data: item, index });
      });
    }
    items.sort((a, b) => new Date(b.data.expiresAt).getTime() - new Date(a.data.expiresAt).getTime());
    return items;
  }, [partners, errands, secondhandItems, nickname]);

  const handlePress = useCallback(
    (card: CardItem) => {
      switch (card.kind) {
        case 'partner':
          navigation.navigate('PartnerDetail', { index: card.index });
          break;
        case 'errand':
          navigation.navigate('ErrandDetail', { index: card.index });
          break;
        case 'secondhand':
          navigation.navigate('SecondhandDetail', { index: card.index });
          break;
      }
    },
    [navigation]
  );

  const isItemClosed = useCallback(
    (card: CardItem): boolean => {
      switch (card.kind) {
        case 'partner': return partnerClosed.has(card.index);
        case 'errand': return errandClosed.has(card.index);
        case 'secondhand': return secondhandClosed.has(card.index);
      }
    },
    [partnerClosed, errandClosed, secondhandClosed]
  );

  const isExpired = (card: CardItem): boolean => {
    return card.data.expired;
  };

  const handleClosePost = useCallback(
    (item: CardItem) => {
      switch (item.kind) {
        case 'partner': closePartner(item.index); break;
        case 'errand': closeErrand(item.index); break;
        case 'secondhand': closeSecondhand(item.index); break;
      }
      showSnackbar({ message: t('postClosed'), type: 'success' });
    },
    [closePartner, closeErrand, closeSecondhand, showSnackbar, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: CardItem }) => {
      const expired = isExpired(item);
      const closed = isItemClosed(item);
      const d = item.data;

      return (
        <TouchableOpacity
          style={[styles.card, (expired || closed) && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}
        >
          <View style={styles.cardHeader}>
            <Avatar text={d.avatar} size="md" gender={d.gender} />
            <View style={styles.cardHeaderInfo}>
              <View style={styles.nameTimeRow}>
                <Text style={styles.userName}>{d.user}</Text>
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.timeMeta}>{getRelativeTime(d.createdAt, lang)}</Text>
              </View>
            </View>
            {!expired && !closed && (
              <TouchableOpacity
                style={styles.moreBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setActionItem(item)}
              >
                <MoreHorizontalIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{d.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{d.desc}</Text>
            <View style={styles.cardFooter}>
              {item.kind !== 'partner' && (
                <Text style={styles.priceText}>
                  {(d as Errand | SecondhandItem).price}
                </Text>
              )}
              {item.kind === 'secondhand' && (d as SecondhandItem).sold && (
                <View style={styles.soldBadge}>
                  <Text style={styles.soldBadgeText}>{t('sold')}</Text>
                </View>
              )}
              {expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>
                    {item.kind === 'partner' ? t('partnerExpired') :
                     item.kind === 'errand' ? t('errandExpired') :
                     t('secondhandExpired')}
                  </Text>
                </View>
              )}
              {closed && !expired && !(item.kind === 'secondhand' && (d as SecondhandItem).sold) && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('postClosed')}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handlePress, isItemClosed, t, lang]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('myPosts')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={allPosts}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.kind}-${item.index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('noPosts')}</Text>
          </View>
        }
      />

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
                const item = actionItem;
                setActionItem(null);
                if (item) setShareSheetItem(item);
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
                const item = actionItem;
                setActionItem(null);
                if (item) {
                  navigation.getParent()?.navigate('ForumTab', {
                    screen: 'Compose',
                    params: { functionType: item.kind, functionTitle: item.data.title },
                  });
                }
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryContainer }]}>
                <ShareIcon size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{t('forwardToForum')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                if (item) handleClosePost(item);
              }}
            >
              <Text style={styles.actionTextDanger}>{t('closePost')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Sheet (contact picker) */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType={shareSheetItem?.kind ?? 'partner'}
        functionTitle={shareSheetItem?.data.title ?? ''}
        functionPosterName={shareSheetItem?.data.user ?? ''}
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
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
  cardBody: {
    marginLeft: AVATAR_SIZE + AVATAR_GAP,
    marginTop: spacing.xs,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardDesc: {
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
  soldBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  soldBadgeText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
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
  actionTextDanger: {
    ...typography.bodyLarge,
    color: colors.error,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
});
