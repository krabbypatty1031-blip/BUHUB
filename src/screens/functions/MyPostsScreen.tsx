import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  SectionList,
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
import {
  BackIcon,
  UsersIcon,
  DollarIcon,
  ClockIcon,
  ShoppingBagIcon,
  CloseIcon,
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

  const sections = useMemo(() => {
    const result: Array<{ title: string; data: CardItem[] }> = [];

    if (partners) {
      const myPartners = partners
        .map((item, index) => ({ kind: 'partner' as const, data: item, index }))
        .filter((c) => c.data.user === nickname);
      if (myPartners.length > 0) {
        result.push({ title: t('findPartner'), data: myPartners });
      }
    }
    if (errands) {
      const myErrands = errands
        .map((item, index) => ({ kind: 'errand' as const, data: item, index }))
        .filter((c) => c.data.user === nickname);
      if (myErrands.length > 0) {
        result.push({ title: t('errands'), data: myErrands });
      }
    }
    if (secondhandItems) {
      const mySecondhand = secondhandItems
        .map((item, index) => ({ kind: 'secondhand' as const, data: item, index }))
        .filter((c) => c.data.user === nickname);
      if (mySecondhand.length > 0) {
        result.push({ title: t('secondhand'), data: mySecondhand });
      }
    }
    return result;
  }, [partners, errands, secondhandItems, t, nickname]);

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

  const handleClose = useCallback(
    (card: CardItem) => {
      Alert.alert(t('closePost'), t('confirmClosePost'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          style: 'destructive',
          onPress: () => {
            switch (card.kind) {
              case 'partner': closePartner(card.index); break;
              case 'errand': closeErrand(card.index); break;
              case 'secondhand': closeSecondhand(card.index); break;
            }
            showSnackbar({ message: t('postClosed'), type: 'success' });
          },
        },
      ]);
    },
    [t, closePartner, closeErrand, closeSecondhand, showSnackbar]
  );

  const isExpired = (card: CardItem): boolean => {
    return card.data.expired;
  };

  const renderItem = useCallback(
    ({ item }: { item: CardItem }) => {
      const expired = isExpired(item);
      const closed = isItemClosed(item);
      const showClose = !expired && !closed;

      if (item.kind === 'partner') {
        const p = item.data;
        return (
          <TouchableOpacity
            style={[styles.card, (expired || closed) && styles.cardExpired]}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
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
              <UsersIcon size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.footerText}>
                {p.joined}/{p.maxPeople} {t('people')}
              </Text>
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
              {showClose && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => handleClose(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CloseIcon size={14} color={colors.error} />
                  <Text style={styles.closeBtnText}>{t('closePost')}</Text>
                </TouchableOpacity>
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
              <DollarIcon size={14} color={colors.primary} />
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
              {showClose && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => handleClose(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CloseIcon size={14} color={colors.error} />
                  <Text style={styles.closeBtnText}>{t('closePost')}</Text>
                </TouchableOpacity>
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
            <DollarIcon size={14} color={colors.primary} />
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
            {showClose && !s.sold && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => handleClose(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={14} color={colors.error} />
                <Text style={styles.closeBtnText}>{t('closePost')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handlePress, handleClose, isItemClosed, t]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    []
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

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => `${item.kind}-${index}`}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('noPosts')}</Text>
          </View>
        }
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
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
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  tagSecondhand: {
    backgroundColor: colors.tertiaryContainer,
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
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.error,
  },
  closeBtnText: {
    ...typography.labelSmall,
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
