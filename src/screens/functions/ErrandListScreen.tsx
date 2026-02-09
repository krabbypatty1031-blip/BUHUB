import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
import Chip from '../../components/common/Chip';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import {
  BackIcon,
  PlusIcon,
  DollarIcon,
  ClockIcon,
  MessageIcon,
  ForwardIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandList'>;

const CATEGORIES: Array<{ key: ErrandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'pickup', labelKey: 'pickup' },
  { key: 'buy', labelKey: 'buy' },
  { key: 'other', labelKey: 'other' },
];

export default function ErrandListScreen({ navigation }: Props) {
  const { t } = useTranslation();
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

  const handleCategoryPress = useCallback(
    (key: ErrandCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const handleDmPoster = useCallback(
    (item: Errand) => {
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: { contactName: item.user, contactAvatar: item.avatar, forwardedType: 'errand', forwardedTitle: item.title },
      });
    },
    [navigation]
  );

  const [shareSheetItem, setShareSheetItem] = useState<Errand | null>(null);

  const renderItem = useCallback(
    ({ item, index }: { item: Errand; index: number }) => {
      const isAccepted = acceptedErrands.has(index);
      return (
        <TouchableOpacity
          style={[styles.card, item.expired && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ErrandDetail', { index })}
        >
          <View style={styles.cardHeader}>
            <Avatar text={item.avatar} size="md" gender={item.gender} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.userName}>{item.user}</Text>
              <Text style={styles.timeMeta}>{item.time}</Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{t(item.category)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardContent} numberOfLines={2}>
            {item.desc}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <View style={styles.priceRow}>
                <DollarIcon size={16} color={colors.primary} />
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
              <View style={styles.deadlineRow}>
                <ClockIcon size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.deadlineText}>{item.time}</Text>
              </View>
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
            {!item.expired && (
              <View style={styles.footerRight}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                  onPress={() => setShareSheetItem(item)}
                >
                  <ForwardIcon size={16} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dmBtn}
                  activeOpacity={0.7}
                  onPress={() => handleDmPoster(item)}
                >
                  <MessageIcon size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [acceptedErrands, navigation, t, handleDmPoster]
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
              icon={<DollarIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noErrands') || 'No errands yet'}
              message={t('createErrandHint') || 'Post an errand to get help!'}
              actionLabel={t('postErrand') || 'Post Errand'}
              onAction={() => navigation.navigate('ComposeErrand')}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeErrand')}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      {/* Forward Sheet */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="errand"
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
  categoryTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  categoryTagText: {
    ...typography.labelSmall,
    color: colors.onSecondaryContainer,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardContent: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    ...typography.titleSmall,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
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
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
