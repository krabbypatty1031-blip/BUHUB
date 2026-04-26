import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import type { SecondhandItem, SecondhandCategory } from '../../types';
import { useSecondhand, useDeleteSecondhand, useCloseSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import ScreenHeader from '../../components/common/ScreenHeader';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import SecondhandCard from '../../components/functions/SecondhandCard';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { useExpirationTick, isExpiredNow } from '../../hooks/useExpirationTick';
import { filterWithExpiredVisibility } from '../../utils/expiredFilter';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import { ShoppingBagIcon } from '../../components/common/icons';
import {
  FigmaSearchIcon26,
  FigmaCartIcon,
  FigmaFabPlusIcon,
  FigmaInfoIcon,
} from '../../components/functions/SecondhandFigmaIcons';
import { getLocalizedFontStyle } from '../../theme/typography';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandList'>;

const CATEGORIES: Array<{ key: SecondhandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

export default function SecondhandListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const selectedCategory = useSecondhandStore((s) => s.selectedCategory);
  const setCategory = useSecondhandStore((s) => s.setCategory);
  const expiredNotified = useSecondhandStore((s) => s.expiredNotified);
  const setExpiredNotified = useSecondhandStore((s) => s.setExpiredNotified);
  const currentUser = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useSecondhand(selectedCategory || undefined);
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const handlePullToRefresh = useCallback(async () => {
    setIsUserRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsUserRefreshing(false);
    }
  }, [refetch]);
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const now = useExpirationTick(30000);
  const visibleItems = useMemo(
    () => filterWithExpiredVisibility(items, now),
    [items, now]
  );

  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return visibleItems;
    const query = searchText.trim().toLowerCase();
    return visibleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
    );
  }, [visibleItems, searchText]);

  useEffect(() => {
    if (items.length > 0 && !expiredNotified) {
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

  const [actionItem, setActionItem] = useState<{ item: SecondhandItem; id: string } | null>(null);
  const [shareSheetItem, setShareSheetItem] = useState<{ item: SecondhandItem; id: string } | null>(null);

  const handleDmSeller = useCallback(
    (item: SecondhandItem, functionId: string) => {
      if (!item.authorId || isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)) return;
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
          forwardedRequiresConfirm: true,
          ...(backTo ? { backTo } : {}),
        },
      });
    },
    [currentUser, navigation]
  );

  const isActionItemOwnPost = useMemo(
    () =>
      actionItem ? isCurrentUserFunctionAuthor(currentUser, actionItem.item.authorId, actionItem.item.user) : false,
    [actionItem, currentUser]
  );

  const deleteSecondhandMutation = useDeleteSecondhand();
  const closeSecondhandMutation = useCloseSecondhand();

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
          closeSecondhandMutation.mutate(a.id, {
            onSuccess: () => showSnackbar({ message: t('postEnded'), type: 'success' }),
            onError: () => showSnackbar({ message: t('endFailed'), type: 'error' }),
          });
        },
      },
    ]);
  }, [actionItem, closeSecondhandMutation, showSnackbar, t]);

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
          deleteSecondhandMutation.mutate(a.id, {
            onSuccess: () => showSnackbar({ message: t('postDeleted'), type: 'success' }),
            onError: () => showSnackbar({ message: t('deleteFailed'), type: 'error' }),
          });
        },
      },
    ]);
  }, [actionItem, deleteSecondhandMutation, showSnackbar, t]);

  const handleAvatarPress = useCallback(
    (item: SecondhandItem) => {
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

  const handleMore = useCallback(
    (item: SecondhandItem, id: string) => {
      setActionItem({ item, id });
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SecondhandItem }) => (
      <SecondhandCard
        id={item.id}
        item={item}
        onPress={handleItemPress}
        onAvatarPress={handleAvatarPress}
        onMore={handleMore}
        onImagePress={(images, index) => {
          setPreviewImages(images);
          setPreviewIndex(index);
          setPreviewVisible(true);
        }}
        now={now}
        t={t}
      />
    ),
    [handleItemPress, handleAvatarPress, handleMore, now, t]
  );

  /* Figma: disclaimer header */
  const renderHeader = useCallback(() => (
    <View style={styles.disclaimerSection}>
      <View style={styles.disclaimerTitleRow}>
        <Text style={[styles.disclaimerTitle, getLocalizedFontStyle(language, 'bold')]}>{t('secondhandDisclaimer')}</Text>
        <FigmaInfoIcon size={12} />
      </View>
      <Text style={[styles.disclaimerSubtext, getLocalizedFontStyle(language, 'regular')]}>{t('disclaimer')}</Text>
    </View>
  ), [language, t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        variant="campus"
        title={t('secondhand')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
        rightAction={
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={() => navigation.navigate('SecondhandCart')}>
              <FigmaCartIcon size={26} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
              <FigmaSearchIcon26 size={30} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search Bar (collapsible) */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <FigmaSearchIcon26 size={18} color="#999999" />
            <TextInput
              style={[styles.searchInput, getLocalizedFontStyle(language, 'regular')]}
              placeholder={t('searchSecondhand')}
              placeholderTextColor="#999999"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              autoFocus
            />
          </View>
        </View>
      )}

      {/* Figma: category tabs — bg:#F5F5F5, height:40, borderRadius:10 */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={selectedCategory ?? 'all'}
          onChange={handleCategoryChange}
          containerHeight={40}
          activeTextColor="#111827"
          inactiveTextColor="#6B7280"
        />
      </View>

      {/* Figma: single column list, gap:16 */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
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
              icon={<ShoppingBagIcon size={36} color="#999999" />}
              title={searchText.trim() ? t('noSearchResults') : t('noRelatedItems')}
            />
          ) : null
        }
      />

      {/* Figma: FAB — 56x56, bg:black, borderRadius:16, right:24 bottom:24 */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeSecondhand', { category: selectedCategory || 'electronics' })}
      >
        <FigmaFabPlusIcon size={17.5} />
      </TouchableOpacity>

      {/* Action Menu */}
      <SwipeableBottomSheet visible={!!actionItem} onClose={() => setActionItem(null)}>
            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) setShareSheetItem(a);
              }}
            >
              <Text style={[styles.actionText, getLocalizedFontStyle(language, 'regular')]}>{t('forwardToContact')}</Text>
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
                      functionType: 'secondhand',
                      functionTitle: a.item.title,
                      functionId: a.id,
                    });
                  }}
                >
                  <Text style={[styles.actionText, getLocalizedFontStyle(language, 'regular')]}>{t('forwardToForum')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRowCenter} onPress={handleEndAction}>
                  <Text style={[styles.actionText, getLocalizedFontStyle(language, 'regular'), { color: '#ED4956' }]}>{t('endPost')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionRowCenter} onPress={handleDeleteAction}>
                  <Text style={[styles.actionText, getLocalizedFontStyle(language, 'regular'), { color: '#ED4956' }]}>{t('deletePost')}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!isActionItemOwnPost ? (
              <TouchableOpacity
                style={styles.actionRowCenter}
                onPress={() => {
                  const a = actionItem;
                  setActionItem(null);
                  if (a) handleDmSeller(a.item, a.id);
                }}
              >
                <Text style={[styles.actionText, getLocalizedFontStyle(language, 'regular')]}>{t('secondhandDmSeller')}</Text>
              </TouchableOpacity>
            ) : null}
      </SwipeableBottomSheet>

      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="secondhand"
        functionTitle={shareSheetItem?.item.title ?? ''}
        functionPosterName={shareSheetItem?.item.user ?? ''}
        functionId={shareSheetItem?.id ?? ''}
        navigation={navigation}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  /* Search */
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

  /* Figma: category tabs — px:16 py:8 */
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  /* Figma: disclaimer — pl:16, pt:12, pb:16, gap:3 */
  disclaimerSection: {
    paddingLeft: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 3,
  },
  disclaimerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disclaimerTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
  },
  disclaimerSubtext: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    alignSelf: 'stretch',
    paddingRight: 16,
  },

  /* Figma: item list gap:16, px:16 */
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  /* Figma: FAB — 56x56, bg:black, borderRadius:16, right:24 bottom:24, shadow */
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },

  /* Action Menu */
  actionRowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
});
