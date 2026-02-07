import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
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

type Props = NativeStackScreenProps<ForumStackParamList, 'ForumHome'>;

export default function ForumScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: posts, isLoading, refetch } = usePosts();
  const likedPosts = useForumStore((s) => s.likedPosts);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const votePoll = useForumStore((s) => s.votePoll);
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);

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

  const handleAvatarPress = useCallback(
    (post: ForumPost) => {
      if (!post.isAnonymous) {
        navigation.navigate('UserProfile', { userName: post.name });
      }
    },
    [navigation]
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
      setComposeSheetVisible(true);
    },
    []
  );

  const handleFunctionPress = useCallback(
    (post: ForumPost) => {
      if (!post.functionType || post.functionIndex == null) return;
      const nav = navigation.getParent();
      if (!nav) return;
      switch (post.functionType) {
        case 'partner':
          nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { index: post.functionIndex } });
          break;
        case 'errand':
          nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { index: post.functionIndex } });
          break;
        case 'secondhand':
          nav.navigate('FunctionsTab', { screen: 'SecondhandDetail', params: { index: post.functionIndex } });
          break;
        case 'rating':
          nav.navigate('FunctionsTab', { screen: 'RatingDetail', params: { category: 'teacher' as const, index: post.functionIndex } });
          break;
      }
    },
    [navigation]
  );

  const closeSheet = useCallback(() => {
    setComposeSheetVisible(false);
    setQuotePostId(undefined);
  }, []);

  const selectComposeType = useCallback(
    (type: 'text' | 'image' | 'poll') => {
      setComposeSheetVisible(false);
      navigation.navigate('Compose', { type, quotePostId });
      setQuotePostId(undefined);
    },
    [navigation, quotePostId]
  );

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => handlePostPress(item)}
        onAvatarPress={!item.isAnonymous ? () => handleAvatarPress(item) : undefined}
        onLike={() => toggleLike(item.id)}
        onComment={() => handleCommentPress(item)}
        onForward={() => handleForward(item)}
        onBookmark={() => toggleBookmark(item.id)}
        onQuote={() => handleQuote(item)}
        onTagPress={(tag) => handleTagPress(item, tag)}
        onFunctionPress={item.isFunction ? () => handleFunctionPress(item) : undefined}
        onVote={item.isPoll ? (optIdx) => votePoll(item.id, optIdx) : undefined}
        isLiked={likedPosts.has(item.id)}
        isBookmarked={bookmarkedPosts.has(item.id)}
        votedOptionIndex={votedPolls.get(item.id)}
      />
    ),
    [likedPosts, bookmarkedPosts, votedPolls, handlePostPress, handleAvatarPress, handleCommentPress, handleForward, toggleLike, toggleBookmark, votePoll, handleQuote, handleTagPress, handleFunctionPress]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>BuHub</Text>
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
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        drawDistance={250}
        ListEmptyComponent={
          isLoading ? (
            <ForumListSkeleton />
          ) : (
            <EmptyState
              icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPosts') || 'No posts yet'}
              message={t('beFirstPost') || 'Be the first to share something with the community!'}
              actionLabel={t('createPost') || 'Create Post'}
              onAction={() => setComposeSheetVisible(true)}
            />
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setComposeSheetVisible(true)}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      {/* Compose Type Sheet */}
      <Modal
        visible={composeSheetVisible}
        transparent
        animationType="slide"
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
              <Text style={styles.sheetTitle}>{quotePostId ? t('quotePost') || 'Quote Post' : t('newPost')}</Text>
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
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
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
  // Compose Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
