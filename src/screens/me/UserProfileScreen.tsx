import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { ForumPost } from '../../types';
import { usePublicProfile, useFollowUser, useBlockUser } from '../../hooks/useUser';
import { usePosts, flattenPostPages, useLikePost, useBookmarkPost, useVotePost, useDeletePost } from '../../hooks/usePosts';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import PostCard from '../../components/common/PostCard';
import ForwardSheet from '../../components/common/ForwardSheet';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { ForumListSkeleton } from '../../components/common/Skeleton';
import {
  BackIcon,
  UsersIcon,
  MessageIcon,
  MoreHorizontalIcon,
  MaleIcon,
  FemaleIcon,
  EditIcon,
  ImageIcon,
  BarChartIcon,
  ChevronRightIcon,
  CloseIcon,
} from '../../components/common/icons';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { getVotedOptionIndex } from '../../utils/forum';
import { isCurrentUserContentOwner } from '../../utils/contentOwnership';

type Props = NativeStackScreenProps<MeStackParamList, 'UserProfile'>;

function normalizeHandle(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { userName } = route.params;
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = usePublicProfile(userName);
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = usePosts();
  const allPosts = useMemo(() => flattenPostPages(postsData), [postsData]);
  const followUser = useFollowUser();
  const blockUserMutation = useBlockUser();
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const deletePostMutation = useDeletePost();
  const votedPolls = useForumStore((s) => s.votedPolls);
  const pollListRefreshKey = useForumStore((s) => s.pollListRefreshKey);
  const currentUser = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [popoverVisible, setPopoverVisible] = React.useState(false);
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);

  const isFollowing = profile?.isFollowedByMe ?? false;
  const profileMeta = [profile?.major, profile?.grade]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .map((value) => t(value, { defaultValue: value }))
    .join(' / ');

  const profileHandles = useMemo(
    () =>
      new Set(
        [
          userName,
          profile?.userName,
          profile?.nickname,
        ]
          .map((value) => normalizeHandle(value))
          .filter((value) => value.length > 0)
      ),
    [userName, profile?.userName, profile?.nickname]
  );

  const userPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const postUserName = normalizeHandle(post.userName);
      const postDisplayName = normalizeHandle(post.name);
      return profileHandles.has(postUserName) || profileHandles.has(postDisplayName);
    });
  }, [allPosts, profileHandles]);

  const handleBlock = useCallback(() => {
    Alert.alert(t('blockUser'), t('blockUserConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          blockUserMutation.mutate(userName);
          showSnackbar({ message: t('blocked'), type: 'success' });
          navigation.goBack();
        },
      },
    ]);
  }, [t, blockUserMutation, userName, showSnackbar, navigation]);

  const handleOpenActions = useCallback(() => {
    setPopoverVisible(true);
  }, []);

  const handleCloseActions = useCallback(() => {
    setPopoverVisible(false);
  }, []);

  const handleBlockAction = useCallback(() => {
    setPopoverVisible(false);
    handleBlock();
  }, [handleBlock]);

  const handleFollow = useCallback(() => {
    followUser.mutate(userName);
  }, [userName, followUser]);

  const handleMessage = useCallback(() => {
    const userId = profile?.id;
    if (!userId) return;
    const backTo = buildChatBackTarget(navigation, 'MeTab')
      ?? {
        tab: 'MeTab' as const,
        screen: 'UserProfile',
        params: { userName },
      };
    navigation.dispatch(
      CommonActions.navigate({
        name: 'MessagesTab',
        params: {
          screen: 'Chat',
          params: {
            contactId: userId,
            contactName: profile?.nickname ?? userName,
            contactAvatar: profile?.avatar ?? '',
            backTo,
          },
        },
      })
    );
  }, [navigation, userName, profile]);

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

  const handleForward = useCallback((post: ForumPost) => {
    setForwardPost(post);
  }, []);

  const handleQuote = useCallback((post: ForumPost) => {
    setQuotePostId(post.id);
    setComposeSheetVisible(true);
  }, []);

  const closeComposeSheet = useCallback(() => {
    setComposeSheetVisible(false);
    setQuotePostId(undefined);
  }, []);

  const handleRefresh = useCallback(() => {
    void Promise.all([refetchProfile(), refetchPosts()]);
  }, [refetchProfile, refetchPosts]);

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

  const selectComposeType = useCallback((type: 'text' | 'image' | 'poll') => {
    setComposeSheetVisible(false);
    navigation.getParent()?.navigate('ForumTab', {
      screen: 'Compose',
      params: { type, quotePostId },
    });
    setQuotePostId(undefined);
  }, [navigation, quotePostId]);

  const handleTagPress = useCallback((tag: string) => {
    navigation.getParent()?.navigate('ForumTab', {
      screen: 'CircleDetail',
      params: { tag },
    });
  }, [navigation]);

  const handleFunctionPress = useCallback((post: ForumPost) => {
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
        nav.navigate('FunctionsTab', { screen: 'RatingDetail', params: { category: 'teacher', id: functionId } });
        break;
    }
  }, [navigation]);

  const renderHeader = useMemo(() => (
    <View>
      <View style={styles.profileHeader}>
        <TouchableOpacity
          activeOpacity={profile?.avatar ? 0.7 : 1}
          onPress={() => {
            if (!profile?.avatar) return;
            setAvatarPreviewVisible(true);
          }}
        >
          <Avatar
            text={userName}
            uri={profile?.avatar || null}
            size="xl"
            gender={profile?.gender}
          />
        </TouchableOpacity>

        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{profile?.nickname || userName}</Text>
          {profile?.gender === 'male' ? (
            <MaleIcon size={14} color={colors.genderMale} />
          ) : null}
          {profile?.gender === 'female' ? (
            <FemaleIcon size={14} color={colors.genderFemale} />
          ) : null}
        </View>

        {profileMeta ? (
          <Text style={styles.profileMeta} numberOfLines={1}>
            {profileMeta}
          </Text>
        ) : null}

        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.stats?.postCount ?? userPosts.length}</Text>
            <Text style={styles.statLabel}>{t('postsStat')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.stats?.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('followingStat')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.stats?.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('followersStat')}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.messageBtn, !profile?.id && styles.messageBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleMessage}
            disabled={!profile?.id}
          >
            <MessageIcon size={18} color={colors.onPrimary} />
            <Text style={styles.messageBtnText}>{t('message')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing && styles.followBtnFollowing,
            ]}
            activeOpacity={0.85}
            onPress={handleFollow}
            disabled={followUser.isPending}
          >
            {followUser.isPending ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? colors.primary : colors.onPrimary}
              />
            ) : (
              <>
                <UsersIcon
                  size={18}
                  color={isFollowing ? colors.primary : colors.onPrimary}
                />
                <Text
                  style={[
                    styles.followBtnText,
                    isFollowing && styles.followBtnTextFollowing,
                  ]}
                >
                  {isFollowing ? t('alreadyFollowed') : t('follow')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('postsStat')}</Text>
      </View>
    </View>
  ), [userName, profile, profileMeta, userPosts.length, t, handleMessage, isFollowing, handleFollow, followUser.isPending]);

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
      return (
        <PostCard
          post={post}
          onPress={() => handlePostPress(post)}
          onLike={() => likePostMutation.mutate(post.id)}
          onComment={() => handleCommentPress(post)}
          onForward={() => handleForward(post)}
          onBookmark={() => bookmarkPostMutation.mutate(post.id)}
          onQuote={() => handleQuote(post)}
          onTagPress={(tag) => handleTagPress(tag)}
          onFunctionPress={post.isFunction ? () => handleFunctionPress(post) : undefined}
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
          votedOptionIndex={getVotedOptionIndex(post, votedPolls)}
          onDelete={isOwnPost ? () => handleDeletePost(post.id) : undefined}
        />
      );
    },
    [
      queryClient,
      handlePostPress,
      likePostMutation,
      handleCommentPress,
      handleForward,
      bookmarkPostMutation,
      handleQuote,
      handleTagPress,
      handleFunctionPress,
      navigation,
      votePostMutation,
      votedPolls,
      currentUser,
      handleDeletePost,
    ]
  );

  const listExtraData = useMemo(
    () => ({
      votedPolls,
      pollListRefreshKey,
      pollVotes: userPosts.map((p) => (p.isPoll ? `${p.id}:${p.myVote?.optionId ?? ''}` : '')).join('|'),
    }),
    [votedPolls, pollListRefreshKey, userPosts]
  );

  const loading = profileLoading || postsLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.topBarCenterSpacer} />
        <TouchableOpacity onPress={handleOpenActions} style={styles.iconBtn}>
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {popoverVisible && (
        <TouchableOpacity
          style={styles.popoverOverlay}
          activeOpacity={1}
          onPress={handleCloseActions}
        >
          <View style={styles.popoverBubble}>
            <TouchableOpacity style={styles.popoverItem} onPress={handleBlockAction}>
              <Text style={styles.popoverItemText}>{t('blockUser')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <FlashList
        data={userPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        estimatedItemSize={160}
        extraData={listExtraData}
        refreshing={loading}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <ForumListSkeleton />
          ) : (
            <EmptyState
              icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPosts')}
            />
          )
        }
      />

      <ImagePreviewModal
        visible={avatarPreviewVisible}
        images={profile?.avatar ? [profile.avatar] : []}
        onClose={() => setAvatarPreviewVisible(false)}
      />

      <Modal
        visible={composeSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeComposeSheet}
      >
        <TouchableOpacity
          style={styles.composeOverlay}
          activeOpacity={1}
          onPress={closeComposeSheet}
        >
          <View style={styles.composeSheet}>
            <View style={styles.composeSheetHandle} />
            <View style={styles.composeSheetHeader}>
              <Text style={styles.composeSheetTitle}>
                {quotePostId ? t('quotePost') : t('newPost')}
              </Text>
              <TouchableOpacity onPress={closeComposeSheet}>
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
  topBarCenterSpacer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  userName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  profileMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  bio: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
  },
  actionRow: {
    flexDirection: 'row',
    width: '80%',
    gap: spacing.sm,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.onSurface,
  },
  messageBtnDisabled: {
    opacity: 0.5,
  },
  messageBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
  },
  followBtnFollowing: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  followBtnTextFollowing: {
    color: colors.primary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  popoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  popoverBubble: {
    position: 'absolute',
    top: 52,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 140,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 101,
  },
  popoverItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  popoverItemText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  composeOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  composeSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 32,
  },
  composeSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  composeSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  composeSheetTitle: {
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
