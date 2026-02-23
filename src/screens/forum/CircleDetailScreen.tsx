import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts, useLikePost, useBookmarkPost, useVotePost } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ForwardSheet from '../../components/common/ForwardSheet';
import { BackIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';
import { getVotedOptionIndex } from '../../utils/forum';

type Props = NativeStackScreenProps<ForumStackParamList, 'CircleDetail'>;

export default function CircleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { tag } = route.params;
  const { data: allPosts } = usePosts();
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const votePoll = useForumStore((s) => s.votePoll);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const currentUser = useAuthStore((s) => s.user);
  const [followed, setFollowed] = useState(false);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);

  // tag is an i18n key (e.g., "tagTreehole") — translate to current locale
  const displayName = useMemo(() => {
    const translated = t(tag);
    return translated !== tag ? translated : tag;
  }, [tag, t]);

  // Filter posts by tag and exclude blocked users
  const posts = useMemo(
    () => allPosts?.filter((p) => p.tags?.includes(tag) && !isBlocked(p.name)) ?? [],
    [allPosts, tag, blockedUsers, isBlocked]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.circleHeader}>
        <View style={styles.circleBody}>
          <View style={styles.circleIcon}>
            <Text style={styles.circleIconText}>
              {displayName.replace(/^#/, '').charAt(0) || '#'}
            </Text>
          </View>
          <View style={styles.circleInfo}>
            <Text style={styles.circleName}>{displayName}</Text>
            <Text style={styles.circleDesc}>
              {t('circleDetail')}
            </Text>
          </View>
        </View>
        <View style={styles.circleFooter}>
          <View style={styles.circleStats}>
            <View style={styles.circleStat}>
              <Text style={styles.circleStatNum}>{posts.length * 23}</Text>
              <Text style={styles.circleStatLabel}>{t('fans')}</Text>
            </View>
            <View style={styles.circleStat}>
              <Text style={styles.circleStatNum}>{posts.length * 156}</Text>
              <Text style={styles.circleStatLabel}>{t('receivedLikes')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, followed && styles.followBtnActive]}
            onPress={() => setFollowed(!followed)}
          >
            <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
              {followed ? t('alreadyFollowed') : `+ ${t('follow')}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [displayName, posts.length, followed, t]
  );

  const handleTagPress = useCallback(
    (pressedTag: string) => {
      if (pressedTag === tag) return; // already on this circle
      navigation.push('CircleDetail', { tag: pressedTag });
    },
    [navigation, tag]
  );

  const handleAvatarPress = useCallback(
    (post: ForumPost) => {
      if (!post.isAnonymous) {
        if (post.name === currentUser?.nickname) {
          navigation.dispatch(CommonActions.navigate({ name: 'MeTab' }));
        } else {
          navigation.navigate('UserProfile', { userName: post.name });
        }
      }
    },
    [navigation, currentUser]
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

  const handleQuote = useCallback(
    (post: ForumPost) => {
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    },
    [navigation]
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

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onAvatarPress={!item.isAnonymous ? () => handleAvatarPress(item) : undefined}
        onLike={() => likePostMutation.mutate(item.id)}
        onComment={() => handleCommentPress(item)}
        onForward={() => handleForward(item)}
        onBookmark={() => bookmarkPostMutation.mutate(item.id)}
        onQuote={() => handleQuote(item)}
        onTagPress={(pressedTag) => handleTagPress(pressedTag)}
        onFunctionPress={item.isFunction ? () => handleFunctionPress(item) : undefined}
        onVote={
          item.isPoll
            ? (optIdx) => {
                const optionId = item.pollOptions?.[optIdx]?.id;
                if (optionId) {
                  votePoll(item.id, optIdx);
                  votePostMutation.mutate({ postId: item.id, optionId });
                }
              }
            : undefined
        }
        isLiked={item.liked ?? false}
        isBookmarked={item.bookmarked ?? false}
        votedOptionIndex={getVotedOptionIndex(item, votedPolls)}
      />
    ),
    [posts, votedPolls, navigation, likePostMutation, bookmarkPostMutation, votePostMutation, votePoll, handleTagPress, handleAvatarPress, handleCommentPress, handleForward, handleQuote, handleFunctionPress]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('circleDetail')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={posts}
        ListHeaderComponent={renderHeader}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <ForwardSheet
        visible={!!forwardPost}
        post={forwardPost}
        onClose={() => setForwardPost(null)}
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
  listContent: {
    paddingBottom: spacing.lg,
  },
  // Circle Header
  circleHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface3,
    marginBottom: spacing.sm,
  },
  circleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  circleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2.5,
    borderColor: colors.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  circleIconText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '600',
  },
  circleDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  circleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleStats: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  circleStat: {
    alignItems: 'center',
  },
  circleStatNum: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  circleStatLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  followBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  followBtnActive: {
    backgroundColor: colors.surfaceVariant,
  },
  followBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
  followBtnTextActive: {
    color: colors.onSurfaceVariant,
  },
});
