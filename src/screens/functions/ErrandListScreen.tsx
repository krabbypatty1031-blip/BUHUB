import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { Errand, ErrandCategory } from '../../types';
import { useErrands } from '../../hooks/useErrands';
import { useErrandStore } from '../../store/errandStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import TranslatableText from '../../components/common/TranslatableText';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildPostMeta } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import {
  BackIcon,
  PlusIcon,
  SearchIcon,
  RepostIcon,
  TruckIcon,
  MoreHorizontalIcon,
  MessageIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

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
  const currentUser = useAuthStore((s) => s.user);
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
    (item: Errand, functionId: string) => {
      if (!item.authorId || isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)) return;
      const backTo = buildChatBackTarget(navigation, 'FunctionsTab');
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          contactId: item.authorId,
          contactName: item.user,
          contactAvatar: item.avatar,
          forwardedType: 'errand',
          forwardedTitle: item.title,
          forwardedPosterName: item.user,
          forwardedId: functionId,
          forwardedNonce: `${Date.now()}-${functionId}-${item.authorId}`,
          ...(backTo ? { backTo } : {}),
        },
      });
    },
    [currentUser, navigation]
  );

  // Action menu state (ellipsis popover)
  const [actionItem, setActionItem] = useState<{ post: Errand; id: string } | null>(null);
  // Forward sheet state (contact picker)
  const [shareSheetItem, setShareSheetItem] = useState<{ post: Errand; id: string } | null>(null);
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  const isActionItemOwnPost = useMemo(
    () =>
      actionItem ? isCurrentUserFunctionAuthor(currentUser, actionItem.post.authorId, actionItem.post.user) : false,
    [actionItem, currentUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: Errand }) => {
      const isAccepted = acceptedErrands.has(item.id);
      const displayMeta = buildPostMeta(t, lang, {
        gradeKey: item.gradeKey,
        majorKey: item.majorKey,
        createdAt: item.createdAt,
      });
      return (
        <PageTranslationProvider>
        <TouchableOpacity
          style={[styles.card, item.expired && styles.cardExpired]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ErrandDetail', { id: item.id })}
        >
          {/* Row 1: Avatar + Name · Time + Ellipsis */}
          <View style={styles.cardHeader}>
            <Avatar text={item.user} uri={item.avatar} size="sm" gender={item.gender} />
            <View style={styles.cardHeaderInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                {item.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {displayMeta}
                </Text>
              </View>
            </View>
            {!item.expired && (
              <TouchableOpacity
                style={styles.moreBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setActionItem({ post: item, id: item.id })}
              >
                <MoreHorizontalIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2+: Title & Content, aligned with name */}
          <View style={styles.cardBody}>
            <TranslatableText
              entityType="errand"
              entityId={item.id}
              fieldName="title"
              sourceText={item.title}
              sourceLanguage={item.sourceLanguage}
              textStyle={styles.cardTitle}
              numberOfLines={2}
            />
            <TranslatableText
              entityType="errand"
              entityId={item.id}
              fieldName="description"
              sourceText={item.desc}
              sourceLanguage={item.sourceLanguage}
              textStyle={styles.cardContent}
              numberOfLines={2}
            />

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
              <PageTranslationToggle style={styles.cardTranslationToggle} />
            </View>
          </View>
        </TouchableOpacity>
        </PageTranslationProvider>
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
              placeholder={t('searchErrands')}
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

      {/* Errand List */}
      <FlatList
        data={errands}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<TruckIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noErrands')}
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
                if (a) handleDmPoster(a.post, a.id);
              }}
              disabled={isActionItemOwnPost}
            >
              <Text style={[styles.actionText, isActionItemOwnPost && styles.actionTextDisabled]}>
                {isActionItemOwnPost ? t('cannotDmSelf') : t('errandDmPoster')}
              </Text>
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
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginLeft: spacing.sm,
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
  actionTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  actionRowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
