import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerPost, PartnerCategory } from '../../types';
import { usePartners, useDeletePartner, useClosePartner } from '../../hooks/usePartners';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { getLocalizedFontStyle, typography } from '../../theme/typography';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import PartnerCard from '../../components/functions/PartnerCard';
import { buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { useExpirationTick, isExpiredNow } from '../../hooks/useExpirationTick';
import { filterWithExpiredVisibility } from '../../utils/expiredFilter';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  PlusIcon,
  UsersIcon,
} from '../../components/common/icons';
import { FigmaSearchIcon26 } from '../../components/functions/SecondhandFigmaIcons';

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
  const expiredNotified = usePartnerStore((s) => s.expiredNotified);
  const setExpiredNotified = usePartnerStore((s) => s.setExpiredNotified);
  const currentUser = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = usePartners(selectedCategory || undefined);
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const handlePullToRefresh = useCallback(async () => {
    setIsUserRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsUserRefreshing(false);
    }
  }, [refetch]);
  const partners = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const now = useExpirationTick(30000);
  const visiblePartners = useMemo(
    () => filterWithExpiredVisibility(partners, now),
    [partners, now]
  );

  useEffect(() => {
    if (partners.length > 0 && !expiredNotified) {
      const hasOwnExpired = partners.some(
        (item) => item.expired && isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)
      );
      if (hasOwnExpired) {
        showSnackbar({ message: t('partnerExpiryNotice'), type: 'info' });
        setExpiredNotified(true);
      }
    }
  }, [partners, expiredNotified, showSnackbar, t, setExpiredNotified, currentUser]);

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
  const [actionItem, setActionItem] = useState<{ post: PartnerPost; id: string } | null>(null);
  // Forward sheet state (contact picker)
  const [shareSheetItem, setShareSheetItem] = useState<{ post: PartnerPost; id: string } | null>(null);
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredPartners = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return visiblePartners;
    return visiblePartners.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.user.toLowerCase().includes(query)
    );
  }, [visiblePartners, searchText]);

  const handleDmOrganizer = useCallback(
    (item: PartnerPost, functionId: string) => {
      const contactId = item.authorId;
      if (!contactId || isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)) return;
      const backTo = buildChatBackTarget(navigation, 'FunctionsTab');
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          contactId,
          contactName: item.user,
          contactAvatar: item.avatar,
          forwardedType: 'partner',
          forwardedTitle: item.title,
          forwardedPosterName: item.user,
          forwardedId: functionId,
          forwardedNonce: `${Date.now()}-${functionId}-${contactId}`,
          forwardedRequiresConfirm: true,
          ...(backTo ? { backTo } : {}),
        },
      });
    },
    [currentUser, navigation]
  );

  const isActionItemOwnPost = useMemo(
    () =>
      actionItem ? isCurrentUserFunctionAuthor(currentUser, actionItem.post.authorId, actionItem.post.user) : false,
    [actionItem, currentUser]
  );

  const deletePartnerMutation = useDeletePartner();
  const closePartnerMutation = useClosePartner();

  const handleEndAction = useCallback(() => {
    const a = actionItem;
    setActionItem(null);
    if (!a) return;
    Alert.alert(t('endPostTitle'), t('endPostMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          closePartnerMutation.mutate(a.id, {
            onSuccess: () => showSnackbar({ message: t('postEnded'), type: 'success' }),
            onError: () => showSnackbar({ message: t('endFailed'), type: 'error' }),
          });
        },
      },
    ]);
  }, [actionItem, closePartnerMutation, showSnackbar, t]);

  const handleDeleteAction = useCallback(() => {
    const a = actionItem;
    setActionItem(null);
    if (!a) return;
    Alert.alert(t('deletePostTitle'), t('deletePostMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          deletePartnerMutation.mutate(a.id, {
            onSuccess: () => showSnackbar({ message: t('postDeleted'), type: 'success' }),
            onError: () => showSnackbar({ message: t('deleteFailed'), type: 'error' }),
          });
        },
      },
    ]);
  }, [actionItem, deletePartnerMutation, showSnackbar, t]);

  const handleAvatarPress = useCallback(
    (item: PartnerPost) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName,
        displayName: item.user,
        cachedAvatar: item.avatar,
        cachedNickname: item.user,
        cachedGender: item.gender,
      });
    },
    [navigation, currentUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: PartnerPost }) => {
      const expired = isExpiredNow(item.expired, item.expiresAt, now);
      const displayAcademicMeta = buildGradeMajorMeta(t, {
        gradeKey: item.gradeKey,
        majorKey: item.majorKey,
        language: lang,
        abbreviateForumGrade: true,
      });
      const displayTime = getRelativeTime(item.createdAt, lang);
      return (
        <PartnerCard
          item={item}
          expired={expired}
          displayAcademicMeta={displayAcademicMeta}
          displayTime={displayTime}
          onPress={() => navigation.navigate('PartnerDetail', { id: item.id })}
          onAvatarPress={() => handleAvatarPress(item)}
          onMore={() => setActionItem({ post: item, id: item.id })}
          expiredLabel={t('partnerExpired')}
        />
      );
    },
    [navigation, t, lang, now, handleAvatarPress]
  );

  return (
      <SafeAreaView style={styles.container}>
      <ScreenHeader
        variant="campus"
        title={t('findPartner')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(lang, 'bold')}
        rightAction={
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <FigmaSearchIcon26 size={30} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar (collapsible) */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <FigmaSearchIcon26 size={18} color="#999999" />
            <TextInput
              style={[styles.searchInput, getLocalizedFontStyle(lang, 'regular')]}
              placeholder={t('searchPartner')}
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

      {/* Partner List */}
      <FlatList
        data={filteredPartners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={isUserRefreshing}
        onRefresh={handlePullToRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          !isLoading && !isRefetching ? (
            <EmptyState
              icon={<UsersIcon size={36} color={colors.onSurfaceVariant} />}
              title={searchText.trim() ? t('noSearchResults') : t('noPartners')}
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
      <SwipeableBottomSheet visible={!!actionItem} onClose={() => setActionItem(null)}>
            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) setShareSheetItem(a);
              }}
            >
              <Text style={[styles.actionText, getLocalizedFontStyle(lang, 'regular')]}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            {isActionItemOwnPost ? (
              <>
                <TouchableOpacity
                  style={styles.actionRowCenter}
                  onPress={() => {
                    const a = actionItem;
                    setActionItem(null);
                    if (!a) return;
                    navigateToForumComposeSelection({
                      navigation,
                      functionType: 'partner',
                      functionTitle: a.post.title,
                      functionId: a.id,
                    });
                  }}
                >
                  <Text style={[styles.actionText, getLocalizedFontStyle(lang, 'regular')]}>{t('forwardToForum')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRowCenter} onPress={handleEndAction}>
                  <Text style={[styles.actionText, getLocalizedFontStyle(lang, 'regular'), { color: '#ED4956' }]}>{t('endPost')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRowCenter} onPress={handleDeleteAction}>
                  <Text style={[styles.actionText, getLocalizedFontStyle(lang, 'regular'), { color: '#ED4956' }]}>{t('deletePost')}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!isActionItemOwnPost ? (
              <TouchableOpacity
                style={styles.actionRowCenter}
                onPress={() => {
                  const a = actionItem;
                  setActionItem(null);
                  if (a) handleDmOrganizer(a.post, a.id);
                }}
              >
                <Text style={[styles.actionText, getLocalizedFontStyle(lang, 'regular')]}>{t('partnerDmOrganizer')}</Text>
              </TouchableOpacity>
            ) : null}
      </SwipeableBottomSheet>

      {/* Forward Sheet (contact picker) */}
      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="partner"
        functionTitle={shareSheetItem?.post.title ?? ''}
        functionPosterName={shareSheetItem?.post.user ?? ''}
        functionId={shareSheetItem?.id ?? ''}
        navigation={navigation}
      />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },

  /* Action Menu */
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
