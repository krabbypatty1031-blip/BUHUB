import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts, useLikePost, useBookmarkPost, useVotePost } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { useScrollTabBarAnimation } from '../../hooks/useScrollTabBarAnimation';
import { useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import EmptyState from '../../components/common/EmptyState';
import { ForumListSkeleton } from '../../components/common/Skeleton';
import ForwardSheet from '../../components/common/ForwardSheet';
import {
  SearchIcon,
  PlusIcon,
  ImageIcon,
  EditIcon,
  BarChartIcon,
  ChevronRightIcon,
  CloseIcon,
} from '../../components/common/icons';
import type { ForumPost } from '../../types';
import { getVotedOptionIndex } from '../../utils/forum';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<ForumStackParamList, 'ForumHome'>;

export default function ForumScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: allPosts, isLoading, refetch } = usePosts();
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const pollListRefreshKey = useForumStore((s) => s.pollListRefreshKey);
  const posts = useMemo(() => allPosts?.filter((p) => !isBlocked(p.name)) ?? [], [allPosts, blockedUsers, isBlocked]);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const { onScroll, show } = useScrollTabBarAnimation();
  const { tabBarTranslateY } = useTabBarAnimation();
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [functionRef, setFunctionRef] = useState<{
    functionType: 'partner' | 'errand' | 'secondhand';
    functionTitle: string;
    functionId: string;
  } | undefined>(undefined);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Restore tab bar when screen gets focus
  useFocusEffect(
    useCallback(() => {
      show();
    }, [show])
  );

  useEffect(() => {
    const pendingSelection = route.params?.pendingComposeSelection;
    if (!pendingSelection) return;

    setQuotePostId(pendingSelection.quotePostId);
    if (pendingSelection.functionType && pendingSelection.functionTitle && pendingSelection.functionId) {
      setFunctionRef({
        functionType: pendingSelection.functionType,
        functionTitle: pendingSelection.functionTitle,
        functionId: pendingSelection.functionId,
      });
    } else {
      setFunctionRef(undefined);
    }
    setComposeSheetVisible(true);
    navigation.setParams({ pendingComposeSelection: undefined });
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
  const handleAvatarPress = useCallback(
    (post: ForumPost) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        isAnonymous: post.isAnonymous,
        userName: post.userName,
        displayName: post.name,
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
      switch (post.functionType) {
        case 'partner':
          nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { id: functionId } });
          break;
        case 'errand':
          nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { id: functionId } });
          break;
        case 'secondhand':
          nav.navigate('FunctionsTab', { screen: 'SecondhandDetail', params: { id: functionId } });
          break;
        case 'rating':
          nav.navigate('FunctionsTab', { screen: 'RatingDetail', params: { category: 'teacher' as const, id: functionId } });
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
        />
      );
    },
    [posts, votedPolls, pollListRefreshKey, queryClient, handlePostPress, handleAvatarPress, handleCommentPress, handleForward, likePostMutation, bookmarkPostMutation, votePostMutation, handleQuote, handleTagPress, handleFunctionPress, navigation]
  );

  const listExtraData = useMemo(
    () => ({
      votedPolls,
      pollListRefreshKey,
      pollVotes: posts?.map((p) => (p.isPoll ? `${p.id}:${p.myVote?.optionId ?? ''}` : '')).join('|'),
    }),
    [votedPolls, pollListRefreshKey, posts]
  );

  return (
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>UHUB</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Search')}
        >
          <SearchIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Post List */}
      <FlashList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        estimatedItemSize={160}
        extraData={listExtraData}
        refreshing={isLoading}
        onRefresh={refetch}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        drawDistance={250}
        ListEmptyComponent={
          isLoading ? (
            <ForumListSkeleton />
          ) : (
            <EmptyState
              icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPosts')}
            />
          )
        }
      />

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
      <Modal
        visible={composeSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSheet}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
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
          </View>
        </TouchableOpacity>
      </Modal>

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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
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
    ...elevation[3],
  },
  // Compose Sheet
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
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
