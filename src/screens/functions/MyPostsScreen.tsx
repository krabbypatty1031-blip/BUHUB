import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
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
import {
  BackIcon,
  ClockIcon,
  ForwardIcon,
  MoreHorizontalIcon,
  TrashIcon,
  CheckIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'MyPosts'>;

type CardItem =
  | { kind: 'partner'; data: PartnerPost; index: number }
  | { kind: 'errand'; data: Errand; index: number }
  | { kind: 'secondhand'; data: SecondhandItem; index: number };

export default function MyPostsScreen({ navigation }: Props) {
  const { t } = useTranslation();
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

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [shareSheetItem, setShareSheetItem] = useState<CardItem | null>(null);

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
      if (deleteMode) {
        const key = `${card.kind}-${card.index}`;
        setSelectedForDelete((prev) => {
          const next = new Set(prev);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          return next;
        });
        return;
      }
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
    [navigation, deleteMode]
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

  const enterDeleteMode = useCallback(() => {
    setPopoverVisible(false);
    setDeleteMode(true);
    setSelectedForDelete(new Set());
  }, []);

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
  }, []);

  const handleBatchDelete = useCallback(() => {
    Alert.alert(t('deleteExistingPosts'), t('confirmDeletePosts'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          let count = 0;
          selectedForDelete.forEach((key) => {
            const [kind, idx] = key.split('-');
            const index = Number(idx);
            switch (kind) {
              case 'partner': closePartner(index); break;
              case 'errand': closeErrand(index); break;
              case 'secondhand': closeSecondhand(index); break;
            }
            count++;
          });
          showSnackbar({ message: t('postsDeleted', { count }), type: 'success' });
          exitDeleteMode();
        },
      },
    ]);
  }, [selectedForDelete, closePartner, closeErrand, closeSecondhand, showSnackbar, t, exitDeleteMode]);

  // Hide/restore tab bar based on deleteMode
  useEffect(() => {
    const parent = navigation.getParent();
    if (deleteMode) {
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      parent?.setOptions({
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
      });
    }
  }, [deleteMode, navigation]);

  // Restore tab bar on unmount
  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
      });
    };
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: CardItem }) => {
      const expired = isExpired(item);
      const closed = isItemClosed(item);
      const itemKey = `${item.kind}-${item.index}`;
      const isSelected = selectedForDelete.has(itemKey);

      if (item.kind === 'partner') {
        const p = item.data;
        return (
          <TouchableOpacity
            style={[styles.card, (expired || closed) && styles.cardExpired]}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
            {deleteMode && (
              <View style={styles.selectCircle}>
                {isSelected ? (
                  <View style={styles.selectCircleFilled}>
                    <CheckIcon size={14} color={colors.onPrimary} />
                  </View>
                ) : (
                  <View style={styles.selectCircleEmpty} />
                )}
              </View>
            )}
            <View style={styles.cardHeader}>
              <Avatar text={p.avatar} size="md" gender={p.gender} />
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.userName}>{p.user}</Text>
                <Text style={styles.timeMeta}>{p.time}</Text>
              </View>
              <View style={styles.tagPartner}>
                <Text style={styles.tagText}>{t(p.category)}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{p.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{p.desc}</Text>
            <View style={styles.cardFooter}>
              {expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('partnerExpired')}</Text>
                </View>
              )}
              {closed && !expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('postClosed')}</Text>
                </View>
              )}
              {!deleteMode && (
                <View style={styles.footerActions}>
                  <TouchableOpacity
                    style={styles.forwardBtn}
                    onPress={() => setShareSheetItem(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ForwardIcon size={14} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      }

      if (item.kind === 'errand') {
        const e = item.data;
        return (
          <TouchableOpacity
            style={[styles.card, (expired || closed) && styles.cardExpired]}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
            {deleteMode && (
              <View style={styles.selectCircle}>
                {isSelected ? (
                  <View style={styles.selectCircleFilled}>
                    <CheckIcon size={14} color={colors.onPrimary} />
                  </View>
                ) : (
                  <View style={styles.selectCircleEmpty} />
                )}
              </View>
            )}
            <View style={styles.cardHeader}>
              <Avatar text={e.avatar} size="md" gender={e.gender} />
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.userName}>{e.user}</Text>
                <Text style={styles.timeMeta}>{e.time}</Text>
              </View>
              <View style={styles.tagErrand}>
                <Text style={styles.tagText}>{t(e.category)}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{e.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{e.desc}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.priceText}>{e.price}</Text>
              <ClockIcon size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.footerText}>{e.time}</Text>
              {expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('errandExpired')}</Text>
                </View>
              )}
              {closed && !expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>{t('postClosed')}</Text>
                </View>
              )}
              {!deleteMode && (
                <View style={styles.footerActions}>
                  <TouchableOpacity
                    style={styles.forwardBtn}
                    onPress={() => setShareSheetItem(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ForwardIcon size={14} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      }

      // secondhand
      const s = item.data;
      return (
        <TouchableOpacity
          style={[styles.card, (expired || closed) && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}
        >
          {deleteMode && (
            <View style={styles.selectCircle}>
              {isSelected ? (
                <View style={styles.selectCircleFilled}>
                  <CheckIcon size={14} color={colors.onPrimary} />
                </View>
              ) : (
                <View style={styles.selectCircleEmpty} />
              )}
            </View>
          )}
          <View style={styles.cardHeader}>
            <Avatar text={s.avatar} size="md" gender={s.gender} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.userName}>{s.user}</Text>
              <Text style={styles.timeMeta}>{s.condition}</Text>
            </View>
            <View style={styles.tagSecondhand}>
              <Text style={styles.tagText}>{t(s.category)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{s.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{s.desc}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>{s.price}</Text>
            {s.sold && (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>{t('sold')}</Text>
              </View>
            )}
            {(expired || closed) && !s.sold && (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>
                  {closed && !expired ? t('postClosed') : t('secondhandExpired')}
                </Text>
              </View>
            )}
            {!deleteMode && (
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.forwardBtn}
                  onPress={() => setShareSheetItem(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ForwardIcon size={14} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handlePress, isItemClosed, t, deleteMode, selectedForDelete, navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { if (deleteMode) exitDeleteMode(); else navigation.goBack(); }} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {deleteMode ? t('selectedCount', { count: selectedForDelete.size }) : t('myPosts')}
        </Text>
        {deleteMode ? (
          <TouchableOpacity onPress={exitDeleteMode} style={styles.iconBtn}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setPopoverVisible(true)} style={styles.iconBtn}>
            <MoreHorizontalIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
        )}
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

      {/* Popover menu */}
      {popoverVisible && (
        <TouchableOpacity style={styles.popoverOverlay} activeOpacity={1} onPress={() => setPopoverVisible(false)}>
          <View style={styles.popoverBubble}>
            <TouchableOpacity style={styles.popoverItem} onPress={enterDeleteMode}>
              <Text style={styles.popoverItemText}>{t('deleteExistingPosts')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Bottom delete bar */}
      {deleteMode && (
        <View style={styles.deleteBar}>
          <Text style={styles.deleteBarCount}>
            {t('selectedCount', { count: selectedForDelete.size })}
          </Text>
          <TouchableOpacity
            style={[styles.deleteBarBtn, selectedForDelete.size === 0 && styles.deleteBarBtnDisabled]}
            onPress={handleBatchDelete}
            disabled={selectedForDelete.size === 0}
          >
            <Text style={[styles.deleteBarBtnText, selectedForDelete.size === 0 && styles.deleteBarBtnTextDisabled]}>
              {t('deleteExistingPosts')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType={shareSheetItem?.kind ?? 'partner'}
        functionTitle={shareSheetItem?.data.title ?? ''}
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
  cancelText: {
    ...typography.titleSmall,
    color: colors.primary,
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
    ...elevation[1],
  },
  cardExpired: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  timeMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  tagPartner: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  tagErrand: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  tagSecondhand: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  tagText: {
    ...typography.labelSmall,
    color: colors.onSurface,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  priceText: {
    ...typography.titleSmall,
    color: colors.error,
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
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  forwardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surface2,
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
  // Popover
  popoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  popoverBubble: {
    marginTop: 56,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    ...elevation[3],
    minWidth: 180,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  popoverItemText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  // Select circle
  selectCircle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  selectCircleFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  // Bottom delete bar
  deleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    ...elevation[2],
  },
  deleteBarCount: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  deleteBarBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  deleteBarBtnDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  deleteBarBtnText: {
    ...typography.titleSmall,
    color: colors.onPrimary,
  },
  deleteBarBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
