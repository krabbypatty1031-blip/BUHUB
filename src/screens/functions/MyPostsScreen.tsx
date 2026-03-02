import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerPost, Errand, SecondhandItem } from '../../types';
import { useMyPartners, useDeletePartner, useClosePartner } from '../../hooks/usePartners';
import { useMyErrands, useDeleteErrand, useCloseErrand } from '../../hooks/useErrands';
import { useMySecondhand, useDeleteSecondhand, useCloseSecondhand } from '../../hooks/useSecondhand';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import TranslatableText from '../../components/common/TranslatableText';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildPostMeta } from '../../utils/formatTime';
import {
  BackIcon,
  RepostIcon,
  ShareIcon,
  MoreHorizontalIcon,
  EditIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import EmptyState from '../../components/common/EmptyState';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'MyPosts'>;

type CardItem =
  | { kind: 'partner'; data: PartnerPost; id: string }
  | { kind: 'errand'; data: Errand; id: string }
  | { kind: 'secondhand'; data: SecondhandItem; id: string };

export default function MyPostsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const currentUser = useAuthStore((s) => s.user);
  const nickname = currentUser?.nickname || currentUser?.name || '浸大小明';
  const { data: partners } = useMyPartners();
  const { data: errands } = useMyErrands();
  const { data: secondhandItems } = useMySecondhand();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const deletePartnerMutation = useDeletePartner();
  const deleteErrandMutation = useDeleteErrand();
  const deleteSecondhandMutation = useDeleteSecondhand();
  const closePartnerMutation = useClosePartner();
  const closeErrandMutation = useCloseErrand();
  const closeSecondhandMutation = useCloseSecondhand();

  const [shareSheetItem, setShareSheetItem] = useState<CardItem | null>(null);
  const [actionItem, setActionItem] = useState<CardItem | null>(null);

  const allPosts = useMemo(() => {
    const now = new Date().getTime();
    const items: CardItem[] = [];
    if (partners) {
      partners.forEach((item) => {
        if (item.user === nickname) items.push({ kind: 'partner', data: item, id: item.id });
      });
    }
    if (errands) {
      errands.forEach((item) => {
        if (item.user === nickname) items.push({ kind: 'errand', data: item, id: item.id });
      });
    }
    if (secondhandItems) {
      secondhandItems.forEach((item) => {
        if (item.user === nickname) items.push({ kind: 'secondhand', data: item, id: item.id });
      });
    }
    const kindOrder = { partner: 0, errand: 1, secondhand: 2 };

    items.sort((a, b) => {
      const aExpired = new Date(a.data.expiresAt).getTime() < now;
      const bExpired = new Date(b.data.expiresAt).getTime() < now;
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1;
      }
      const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
      if (kindDiff !== 0) return kindDiff;
      return new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime();
    });

    return items;
  }, [partners, errands, secondhandItems, nickname]);

  const handlePress = useCallback(
    (card: CardItem) => {
      switch (card.kind) {
        case 'partner':
          navigation.navigate('PartnerDetail', { id: card.id });
          break;
        case 'errand':
          navigation.navigate('ErrandDetail', { id: card.id });
          break;
        case 'secondhand':
          navigation.navigate('SecondhandDetail', { id: card.id });
          break;
      }
    },
    [navigation]
  );

  const isExpired = (card: CardItem): boolean => {
    return card.data.expired;
  };
  const handleClosePost = useCallback(
    async (item: CardItem) => {
      try {
        switch (item.kind) {
          case 'partner':
            await closePartnerMutation.mutateAsync(item.id);
            break;
          case 'errand':
            await closeErrandMutation.mutateAsync(item.id);
            break;
          case 'secondhand':
            await closeSecondhandMutation.mutateAsync(item.id);
            break;
        }
        showSnackbar({ message: t('closedPublish'), type: 'success' });
      } catch {
        showSnackbar({ message: t('networkError'), type: 'error' });
      }
    },
    [
      showSnackbar,
      t,
      closePartnerMutation,
      closeErrandMutation,
      closeSecondhandMutation,
    ]
  );
  const handleDeletePost = useCallback(
    async (item: CardItem) => {
      try {
        switch (item.kind) {
          case 'partner':
            await deletePartnerMutation.mutateAsync(item.id);
            break;
          case 'errand':
            await deleteErrandMutation.mutateAsync(item.id);
            break;
          case 'secondhand':
            await deleteSecondhandMutation.mutateAsync(item.id);
            break;
        }
        showSnackbar({ message: t('deletedPublish'), type: 'success' });
      } catch {
        showSnackbar({ message: t('networkError'), type: 'error' });
      }
    },
    [
      showSnackbar,
      t,
      deletePartnerMutation,
      deleteErrandMutation,
      deleteSecondhandMutation,
    ]
  );

  const renderItem = useCallback(
    ({ item }: { item: CardItem }) => {
      const expired = isExpired(item);
      const d = item.data;
      const displayMeta = buildPostMeta(t, lang, {
        gradeKey: d.gradeKey,
        majorKey: d.majorKey,
        createdAt: d.createdAt,
      });
      const entityType = item.kind === 'partner' ? 'partner' : item.kind === 'errand' ? 'errand' : 'secondhand';

      return (
        <PageTranslationProvider>
        <TouchableOpacity
          style={[styles.card, expired && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}
        >
          <View style={styles.cardHeader}>
            <Avatar text={d.user} uri={d.avatar} size="sm" gender={d.gender} />
            <View style={styles.cardHeaderInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{d.user}</Text>
                {d.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                {d.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {displayMeta}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.moreBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setActionItem(item)}
            >
              <MoreHorizontalIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
            <TranslatableText
              entityType={entityType}
              entityId={item.id}
              fieldName="title"
              sourceText={d.title}
              sourceLanguage={d.sourceLanguage}
              textStyle={styles.cardTitle}
              numberOfLines={2}
            />
            <TranslatableText
              entityType={entityType}
              entityId={item.id}
              fieldName="description"
              sourceText={d.desc}
              sourceLanguage={d.sourceLanguage}
              textStyle={styles.cardDesc}
              numberOfLines={2}
            />
            <View style={styles.cardFooter}>
              <View style={styles.cardFooterLeft}>
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
              </View>
              {expired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>
                    {item.kind === 'partner' ? t('partnerExpired') :
                     item.kind === 'errand' ? t('errandExpired') :
                     t('secondhandExpired')}
                  </Text>
                </View>
              )}
              <PageTranslationToggle style={styles.cardTranslationToggle} />
            </View>
          </View>
        </TouchableOpacity>
        </PageTranslationProvider>
      );
    },
    [handlePress, t, lang]
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
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
            title={t('noRelatedPublish')}
          />
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
              style={styles.actionRowCenter}
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                if (item) setShareSheetItem(item);
              }}
            >
              <Text style={styles.actionText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                if (item) {
                  navigation.getParent()?.navigate('ForumTab', {
                    screen: 'Compose',
                    params: { functionType: item.kind, functionTitle: item.data.title, functionId: item.id },
                  });
                }
              }}
            >
              <Text style={styles.actionText}>{t('forwardToForum')}</Text>
            </TouchableOpacity>

            {/* 仅未过期帖子显示关闭选项 */}
            {!actionItem?.data.expired && (
              <TouchableOpacity
                style={styles.actionRowCenter}
                onPress={() => {
                  const item = actionItem;
                  setActionItem(null);
                  if (item) {
                    Alert.alert(
                      t('closePost'),
                      t('confirmClosePost'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('closePost'),
                          style: 'destructive',
                          onPress: () => handleClosePost(item),
                        },
                      ]
                    );
                  }
                }}
              >
                <Text style={styles.actionTextDanger}>{t('closePost')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const item = actionItem;
                setActionItem(null);
                if (item) {
                  Alert.alert(
                    t('deletePost'),
                    t('confirmDeletePost'),
                    [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: t('deletePost'),
                        style: 'destructive',
                        onPress: () => handleDeletePost(item),
                      },
                    ]
                  );
                }
              }}
            >
              <Text style={styles.actionTextDanger}>{t('deletePost')}</Text>
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
        functionId={shareSheetItem?.id ?? ''}
        navigation={navigation}
      />
      </SafeAreaView>
  );
}

const AVATAR_SIZE = 32; // sm
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
  cardTranslationToggle: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
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
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  actionRowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
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
