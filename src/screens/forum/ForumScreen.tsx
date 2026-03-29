import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts, useFollowingPosts, flattenPostPages, useLikePost, useBookmarkPost, useVotePost, useDeletePost } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useScrollTabBarAnimation } from '../../hooks/useScrollTabBarAnimation';
import { useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import EmptyState from '../../components/common/EmptyState';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import { ForumListSkeleton } from '../../components/common/Skeleton';
import ForwardSheet from '../../components/common/ForwardSheet';
import SearchFigmaIcon from '../../components/common/SearchFigmaIcon';
import {
  PlusIcon,
  ImageIcon,
  EditIcon,
  BarChartIcon,
  ChevronRightIcon,
  CloseIcon,
  AlertTriangleIcon,
} from '../../components/common/icons';
import type { ForumPost } from '../../types';
import { getVotedOptionIndex } from '../../utils/forum';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { isCurrentUserContentOwner } from '../../utils/contentOwnership';

type Props = NativeStackScreenProps<ForumStackParamList, 'ForumHome'>;

export default function ForumScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [feedTab, setFeedTab] = useState<'following' | 'discover'>('discover');
  // Both queries always enabled — cached data makes tab switching instant
  const discoverQuery = usePosts(true);
  const followingQuery = useFollowingPosts(true);
  const activeQuery = feedTab === 'following' ? followingQuery : discoverQuery;
  const { data, isLoading, isFetching, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = activeQuery;
  // Separate posts arrays for each tab
  const discoverAllPosts = useMemo(() => flattenPostPages(discoverQuery.data), [discoverQuery.data]);
  const followingAllPosts = useMemo(() => flattenPostPages(followingQuery.data), [followingQuery.data]);
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const pollListRefreshKey = useForumStore((s) => s.pollListRefreshKey);
  const discoverPosts = useMemo(() => discoverAllPosts.filter((p) => !isBlocked(p.name)), [discoverAllPosts, blockedUsers, isBlocked]);
  const followingPosts = useMemo(() => followingAllPosts.filter((p) => !isBlocked(p.name)), [followingAllPosts, blockedUsers, isBlocked]);
  const posts = feedTab === 'following' ? followingPosts : discoverPosts;
  const allPosts = feedTab === 'following' ? followingAllPosts : discoverAllPosts;
  const votedPolls = useForumStore((s) => s.votedPolls);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const deletePostMutation = useDeletePost();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { onScroll, show } = useScrollTabBarAnimation();
  const { tabBarTranslateY } = useTabBarAnimation();
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [functionRef, setFunctionRef] = useState<{
    functionType: 'partner' | 'errand' | 'secondhand' | 'rating';
    functionTitle: string;
    functionId: string;
    ratingCategory?: ForumPost['ratingCategory'];
  } | undefined>(undefined);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const discoverListRef = useRef<any>(null);
  const followingListRef = useRef<any>(null);
  const listRef = feedTab === 'following' ? followingListRef : discoverListRef;

  // Restore tab bar when screen gets focus
  useFocusEffect(
    useCallback(() => {
      show();
      // Scroll to top if a new post was just composed (flag set by ComposeScreen)
      if (queryClient.getQueryData<boolean>(['posts:scrollToTop'])) {
        queryClient.setQueryData(['posts:scrollToTop'], false);
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    }, [show, queryClient])
  );

  useEffect(() => {
    const pendingSelection = route.params?.pendingComposeSelection;
    if (!pendingSelection) return;

    // Clear the param FIRST to avoid double-navigation in concurrent mode
    navigation.setParams({ pendingComposeSelection: undefined });

    if (pendingSelection.functionType && pendingSelection.functionTitle && pendingSelection.functionId) {
      navigation.navigate('Compose', {
        type: 'text',
        quotePostId: pendingSelection.quotePostId,
        functionType: pendingSelection.functionType,
        functionTitle: pendingSelection.functionTitle,
        functionId: pendingSelection.functionId,
        ratingCategory: pendingSelection.ratingCategory,
      });
      return;
    } else {
      setQuotePostId(pendingSelection.quotePostId);
      setFunctionRef(undefined);
    }
    setComposeSheetVisible(true);
  }, [navigation, route.params?.pendingComposeSelection]);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
  }));

  const handlePostPress = useCallback(
    (post: ForumPost) => {
      navigation.navigate('PostDetail', { postId: post.id });
    },
    [navigation]
  );

  const handleCommentPress = useCallback(
    (post: ForumPost) => {
      navigation.navigate('PostDetail', { postId: post.id });
    },
    [navigation]
  );

  const handleForward = useCallback(
    (post: ForumPost) => {
      setForwardPost(post);
    },
    []
  );

  const currentUser = useAuthStore((s) => s.user);
  const handleDeletePost = useCallback(
    (postId: string) => {
      Alert.alert(t('deletePostTitle'), t('deletePostMessage'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          style: 'destructive',
          onPress: () => {
            deletePostMutation.mutate(postId, {
              onSuccess: () => {
                showSnackbar({ message: t('postDeleted'), type: 'success' });
              },
              onError: () => {
                showSnackbar({ message: t('deleteFailed'), type: 'error' });
              },
            });
          },
        },
      ]);
    },
    [deletePostMutation, showSnackbar, t]
  );
  const handleAvatarPress = useCallback(
    (post: ForumPost) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        isAnonymous: post.isAnonymous,
        userName: post.userName,
        displayName: post.name,
        cachedAvatar: post.avatar,
        cachedNickname: post.name,
        cachedGender: post.gender,
      });
    },
    [navigation, currentUser]
  );

  const handleTagPress = useCallback(
    (post: ForumPost, tag: string) => {
      navigation.navigate('CircleDetail', { tag });
    },
    [navigation]
  );

  const handleQuote = useCallback(
    (post: ForumPost) => {
      setQuotePostId(post.id);
      setFunctionRef(undefined);
      setComposeSheetVisible(true);
    },
    []
  );

  const handleFunctionPress = useCallback(
    (post: ForumPost) => {
      const functionId =
        post.functionId ?? (post.functionIndex != null ? String(post.functionIndex) : undefined);
      if (!post.functionType || !functionId) return;
      const nav = navigation.getParent();
      if (!nav) return;
      const backTo =
        buildChatBackTarget(navigation, 'ForumTab') ??
        ({
          tab: 'ForumTab' as const,
          screen: 'ForumHome',
        } as const);
      switch (post.functionType) {
        case 'partner':
          nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { id: functionId, backTo } });
          break;
        case 'errand':
          nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { id: functionId, backTo } });
          break;
        case 'secondhand':
          nav.navigate('FunctionsTab', { screen: 'SecondhandDetail', params: { id: functionId, backTo } });
          break;
        case 'rating':
          nav.navigate('FunctionsTab', {
            screen: 'RatingDetail',
            params: {
              ...(post.ratingCategory ? { category: post.ratingCategory } : {}),
              id: functionId,
              backTo,
            },
          });
          break;
      }
    },
    [navigation]
  );

  const closeSheet = useCallback(() => {
    setComposeSheetVisible(false);
    setQuotePostId(undefined);
    setFunctionRef(undefined);
  }, []);

  const selectComposeType = useCallback(
    (type: 'text' | 'image' | 'poll') => {
      setComposeSheetVisible(false);
      navigation.navigate('Compose', {
        type,
        quotePostId,
        functionType: functionRef?.functionType,
        functionTitle: functionRef?.functionTitle,
        functionId: functionRef?.functionId,
        ratingCategory: functionRef?.ratingCategory,
      });
      setQuotePostId(undefined);
      setFunctionRef(undefined);
    },
    [navigation, quotePostId, functionRef]
  );

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => {
      const detailPost = item.isPoll ? queryClient.getQueryData<ForumPost>(['post', item.id]) : undefined;
      const post = detailPost?.myVote
        ? { ...item, myVote: detailPost.myVote, pollOptions: detailPost.pollOptions ?? item.pollOptions }
        : item;
      const isOwnPost = isCurrentUserContentOwner(currentUser, {
        userName: post.userName,
        displayName: post.name,
        isAnonymous: post.isAnonymous,
      });
      const votedOptionIndex = getVotedOptionIndex(post, votedPolls);
      return (
        <PostCard
          post={post}
          onPress={() => handlePostPress(post)}
          onAvatarPress={!post.isAnonymous ? () => handleAvatarPress(post) : undefined}
          onLike={() => likePostMutation.mutate(post.id)}
          onComment={() => handleCommentPress(post)}
          onForward={() => handleForward(post)}
          onBookmark={() => bookmarkPostMutation.mutate(post.id)}
          onQuote={() => handleQuote(post)}
          onTagPress={(tag) => handleTagPress(post, tag)}
          onFunctionPress={post.isFunction ? () => handleFunctionPress(post) : undefined}
          onImagePress={(images, index) => {
            setPreviewImages(images);
            setPreviewIndex(index);
            setPreviewVisible(true);
          }}
          onQuotedPostPress={(quotedId) => navigation.navigate('PostDetail', { postId: quotedId })}
          onVote={
            post.isPoll
              ? (optIdx) => {
                  const optionId = post.pollOptions?.[optIdx]?.id;
                  if (optionId) {
                    votePostMutation.mutate({ postId: post.id, optionId, optionIndex: optIdx });
                  }
                }
              : undefined
          }
          isLiked={post.liked ?? false}
          isBookmarked={post.bookmarked ?? false}
          votedOptionIndex={votedOptionIndex}
          onDelete={isOwnPost ? () => handleDeletePost(post.id) : undefined}
        />
      );
    },
    [votedPolls, queryClient, currentUser, handlePostPress, handleAvatarPress, handleCommentPress, handleForward, likePostMutation, bookmarkPostMutation, votePostMutation, handleQuote, handleTagPress, handleFunctionPress, navigation, handleDeletePost]
  );

  const listExtraData = useMemo(() => votedPolls, [votedPolls]);
  const isPullRefreshing = isManualRefreshing;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingFooterText}>{t('loading')}...</Text>
      </View>
    );
  }, [isFetchingNextPage, t]);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

  const keyExtractor = useCallback((item: ForumPost) => item.id, []);

  return (
      <View style={styles.container}>
      {/* Top Bar with Following / Discover tabs */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.feedTabs}>
          <TouchableOpacity
            style={styles.feedTab}
            activeOpacity={0.7}
            onPress={() => {
              if (feedTab === 'following') return;
              setFeedTab('following');
              show();
            }}
          >
            <Text style={feedTab === 'following' ? styles.feedTabTextActive : styles.feedTabText}>
              {t('following')}
            </Text>
            {feedTab === 'following' && <View style={styles.feedTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.feedTab}
            activeOpacity={0.7}
            onPress={() => {
              if (feedTab === 'discover') return;
              setFeedTab('discover');
              show();
            }}
          >
            <Text style={feedTab === 'discover' ? styles.feedTabTextActive : styles.feedTabText}>
              {t('discover')}
            </Text>
            {feedTab === 'discover' && <View style={styles.feedTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <SearchFigmaIcon size={30} color="#0C1015" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Two stacked lists — both stay mounted, only active one is visible */}
      <View style={styles.feedContainer}>
        <View style={[styles.feedLayer, feedTab !== 'discover' && styles.feedLayerHidden]} pointerEvents={feedTab === 'discover' ? 'auto' : 'none'}>
          <FlashList
            ref={discoverListRef}
            data={discoverPosts}
            renderItem={renderPost}
            keyExtractor={keyExtractor}
            extraData={listExtraData}
            refreshing={feedTab === 'discover' && isPullRefreshing}
            onRefresh={handleRefresh}
            onEndReached={feedTab === 'discover' ? handleEndReached : undefined}
            onEndReachedThreshold={0.5}
            onScroll={feedTab === 'discover' ? onScroll : undefined}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={styles.listContent}
            drawDistance={700}
            ListFooterComponent={feedTab === 'discover' ? renderFooter : null}
            ListEmptyComponent={
              discoverQuery.isLoading && discoverAllPosts.length === 0 ? (
                <ForumListSkeleton />
              ) : discoverQuery.isError ? (
                <EmptyState icon={<AlertTriangleIcon size={36} color={colors.error} />} title={t('loadFailed')} />
              ) : (
                <EmptyState icon={<EditIcon size={36} color={colors.onSurfaceVariant} />} title={t('noPosts')} />
              )
            }
          />
        </View>
        <View style={[styles.feedLayer, feedTab !== 'following' && styles.feedLayerHidden]} pointerEvents={feedTab === 'following' ? 'auto' : 'none'}>
          <FlashList
            ref={followingListRef}
            data={followingPosts}
            renderItem={renderPost}
            keyExtractor={keyExtractor}
            extraData={listExtraData}
            refreshing={feedTab === 'following' && isPullRefreshing}
            onRefresh={handleRefresh}
            onEndReached={feedTab === 'following' ? handleEndReached : undefined}
            onEndReachedThreshold={0.5}
            onScroll={feedTab === 'following' ? onScroll : undefined}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            contentContainerStyle={styles.listContent}
            drawDistance={700}
            ListFooterComponent={feedTab === 'following' ? renderFooter : null}
            ListEmptyComponent={
              followingQuery.isLoading && followingAllPosts.length === 0 ? (
                <ForumListSkeleton />
              ) : followingQuery.isError ? (
                <EmptyState icon={<AlertTriangleIcon size={36} color={colors.error} />} title={t('loadFailed')} />
              ) : (
                <EmptyState icon={<EditIcon size={36} color={colors.onSurfaceVariant} />} title={t('noFollowingPosts')} />
              )
            }
          />
        </View>
      </View>

      {/* FAB */}
      <Animated.View style={[styles.fabWrapper, fabAnimatedStyle]}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            setQuotePostId(undefined);
            setFunctionRef(undefined);
            setComposeSheetVisible(true);
          }}
        >
          <PlusIcon size={28} color={colors.onPrimary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Compose Type Sheet */}
      <SwipeableBottomSheet visible={composeSheetVisible} onClose={closeSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{quotePostId ? t('quotePost') : t('newPost')}</Text>
              <TouchableOpacity onPress={closeSheet}>
                <CloseIcon size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.composeOption}
              onPress={() => selectComposeType('image')}
            >
              <View style={styles.composeOptionIcon}>
                <ImageIcon size={24} color={colors.primary} />
              </View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('imagePost')}</Text>
                <Text style={styles.composeOptionDesc}>{t('imagePostDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.composeOption}
              onPress={() => selectComposeType('text')}
            >
              <View style={styles.composeOptionIcon}>
                <EditIcon size={24} color={colors.primary} />
              </View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('textPost')}</Text>
                <Text style={styles.composeOptionDesc}>{t('textPostDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.composeOption}
              onPress={() => selectComposeType('poll')}
            >
              <View style={styles.composeOptionIcon}>
                <BarChartIcon size={24} color={colors.primary} />
              </View>
              <View style={styles.composeOptionInfo}>
                <Text style={styles.composeOptionTitle}>{t('poll')}</Text>
                <Text style={styles.composeOptionDesc}>{t('pollDesc')}</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
      </SwipeableBottomSheet>

      {/* Forward Sheet */}
      <ForwardSheet
        visible={!!forwardPost}
        post={forwardPost}
        onClose={() => setForwardPost(null)}
        navigation={navigation}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F9',
  },
  topBar: {
    backgroundColor: colors.white,
  },
  feedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 24,
  },
  feedTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  /* Figma: active 18px Bold #0C1015 */
  feedTabTextActive: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
  },
  /* Figma: inactive 16px Regular #86909C */
  feedTabText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  /* Figma: 15x3 black indicator bar below active tab */
  feedTabIndicator: {
    width: 15,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0C1015',
    marginTop: 2,
  },
  iconBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContainer: {
    flex: 1,
    position: 'relative',
  },
  feedLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  feedLayerHidden: {
    opacity: 0,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingFooterText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  fabWrapper: {
    position: 'absolute',
    right: 20,
    bottom: 104,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  // Compose Sheet
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  composeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  composeOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  composeOptionInfo: {
    flex: 1,
  },
  composeOptionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  composeOptionDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
