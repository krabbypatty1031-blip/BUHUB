import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  MeStackParamList,
  ForumStackParamList,
  MessagesStackParamList,
  FunctionsStackParamList,
} from '../../types/navigation';
import type { ForumPost, Language } from '../../types';
import { usePublicProfile, useFollowUser, useBlockUser } from '../../hooks/useUser';
import { getFollowLabel } from '../../utils/followLabel';
import { useUserPosts, flattenPostPages, useLikePost, useBookmarkPost, useVotePost, useDeletePost } from '../../hooks/usePosts';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useForumStore } from '../../store/forumStore';
import { canPublishCommunityContent } from '../../utils/publishPermission';
import { promptHkbuVerification } from '../../utils/hkbuPrompt';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import PostCard from '../../components/common/PostCard';
import ForwardSheet from '../../components/common/ForwardSheet';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import SkeletonBox, { ForumListSkeleton } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  EditIcon,
  ImageIcon,
  BarChartIcon,
  ChevronRightIcon,
  CloseIcon,
} from '../../components/common/icons';
import { ChatBubbleIcon, FollowPersonIcon, FollowedCheckIcon } from '../../components/functions/DetailInfoIcons';
import { MoreHorizontalIcon } from '../../components/common/icons';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { getVotedOptionIndex } from '../../utils/forum';
import { isCurrentUserContentOwner } from '../../utils/contentOwnership';
import { getLocalizedFontStyle } from '../../theme/typography';
import { getLocalizedMajorShortLabel } from '../../data/hkbuMajors';
import { getDisplayGradeLabel } from '../../utils/formatTime';

type UserProfileParamList =
  & MeStackParamList
  & ForumStackParamList
  & MessagesStackParamList
  & FunctionsStackParamList;

type Props = NativeStackScreenProps<UserProfileParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { userName, cachedAvatar, cachedNickname, cachedGender: rawCachedGender } = route.params;
  const validGenders = ['male', 'female', 'other', 'secret'] as const;
  type Gender = typeof validGenders[number];
  const cachedGender: Gender | undefined = validGenders.includes(rawCachedGender as Gender) ? (rawCachedGender as Gender) : undefined;
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = usePublicProfile(userName);
  const { data: postsData, isLoading: postsLoading, error: postsError, refetch: refetchPosts, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserPosts(userName);
  const postsHidden =
    !!postsError &&
    typeof postsError === 'object' &&
    'errorCode' in postsError &&
    (postsError as { errorCode?: string }).errorCode === 'PROFILE_HIDDEN';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);

  const isFollowing = profile?.isFollowedByMe ?? false;
  const profileMeta = [
    getLocalizedMajorShortLabel(profile?.major, t, language),
    getDisplayGradeLabel(profile?.grade, t, { language: language as Language, abbreviate: true }) ?? '',
  ]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .join(' / ');

  const userPosts = allPosts;

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

  const goToManageEmails = useCallback(() => {
    navigation.getParent()?.navigate('MeTab', { screen: 'ManageEmails', initial: false } as never);
  }, [navigation]);

  const handleForward = useCallback((post: ForumPost) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    setForwardPost(post);
  }, [currentUser, goToManageEmails, t]);

  const handleQuote = useCallback((post: ForumPost) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    setQuotePostId(post.id);
    setComposeSheetVisible(true);
  }, [currentUser, goToManageEmails, t]);

  const handleLikePost = useCallback((postId: string) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    likePostMutation.mutate(postId);
  }, [currentUser, goToManageEmails, likePostMutation, t]);

  const handleBookmarkPost = useCallback((postId: string) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    bookmarkPostMutation.mutate(postId);
  }, [bookmarkPostMutation, currentUser, goToManageEmails, t]);

  const closeComposeSheet = useCallback(() => {
    setComposeSheetVisible(false);
    setQuotePostId(undefined);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchPosts()]);
    } finally {
      setIsRefreshing(false);
    }
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
    const backTo = buildChatBackTarget(navigation, 'MeTab')
      ?? {
        tab: 'MeTab' as const,
        screen: 'UserProfile',
        params: { userName },
      };
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
  }, [navigation, userName]);

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
            text={profile?.nickname || cachedNickname || userName}
            uri={profile?.avatar || cachedAvatar || null}
            size="xl"
            gender={profile?.gender || cachedGender}
          />
        </TouchableOpacity>

        <Text style={[styles.userName, getLocalizedFontStyle(language, 'bold')]}>{profile?.nickname || cachedNickname || userName}</Text>

        {profileLoading ? (
          <SkeletonBox width={120} height={14} style={{ marginTop: 6 }} />
        ) : profileMeta ? (
          <Text style={[styles.profileMeta, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>
            {profileMeta}
          </Text>
        ) : null}

        {profileLoading ? (
          <SkeletonBox width="60%" height={13} style={{ marginTop: 8 }} />
        ) : profile?.bio ? (
          <Text style={[styles.bio, getLocalizedFontStyle(language, 'regular')]}>{profile.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          {profileLoading ? (
            <>
              <SkeletonBox width={50} height={36} />
              <View style={styles.statDivider} />
              <SkeletonBox width={50} height={36} />
              <View style={styles.statDivider} />
              <SkeletonBox width={50} height={36} />
            </>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.postCount ?? userPosts.length}</Text>
                <Text style={[styles.statLabel, getLocalizedFontStyle(language, 'regular')]}>{t('postsStat')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.followingCount ?? 0}</Text>
                <Text style={[styles.statLabel, getLocalizedFontStyle(language, 'regular')]}>{t('followingStat')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.stats?.followerCount ?? 0}</Text>
                <Text style={[styles.statLabel, getLocalizedFontStyle(language, 'regular')]}>{t('followersStat')}</Text>
              </View>
            </>
          )}
        </View>

        {profileLoading ? (
          <View style={styles.actionRow}>
            <View style={[styles.messageBtn, styles.messageBtnDisabled]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
            <View style={styles.followBtn}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.messageBtn, !profile?.id && styles.messageBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleMessage}
              disabled={!profile?.id}
            >
              <ChatBubbleIcon size={18} color="#FFFFFF" />
              <Text
                style={[styles.messageBtnText, getLocalizedFontStyle(language, 'bold')]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t('message')}
              </Text>
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
                  color={isFollowing ? '#0C1015' : '#FFFFFF'}
                />
              ) : (
                <>
                  {isFollowing ? (
                    <FollowedCheckIcon size={18} color="#0C1015" />
                  ) : (
                    <FollowPersonIcon size={18} color="#FFFFFF" />
                  )}
                  <Text
                    style={[
                      styles.followBtnText,
                      getLocalizedFontStyle(language, 'bold'),
                      isFollowing && styles.followBtnTextFollowing,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {getFollowLabel({ isFollowedByMe: isFollowing, isMutuallyFollowing: profile?.isMutuallyFollowing }, t)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, getLocalizedFontStyle(language, 'bold')]}>{t('postsStat')}</Text>
      </View>
    </View>
  ), [userName, profile, profileLoading, profileMeta, t, language, handleMessage, isFollowing, handleFollow, followUser.isPending, cachedAvatar, cachedNickname, cachedGender]);

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => {
      const detailPost = item.isPoll ? queryClient.getQueryData<ForumPost>(['post', item.id]) : undefined;
      const post = detailPost?.myVote
        ? { ...item, myVote: detailPost.myVote, pollOptions: detailPost.pollOptions ?? item.pollOptions }
        : item;
      const isOwnPost = isCurrentUserContentOwner(currentUser, {
        isOwnedByCurrentUser: post.isOwnedByCurrentUser,
        userName: post.userName,
        displayName: post.name,
        isAnonymous: post.isAnonymous,
      });
      return (
        <PostCard
          post={post}
          onPress={() => handlePostPress(post)}
          onLike={() => handleLikePost(post.id)}
          onComment={() => handleCommentPress(post)}
          onForward={() => handleForward(post)}
          onBookmark={() => handleBookmarkPost(post.id)}
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
      <ScreenHeader
        variant="campus"
        center={<View />}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleOpenActions} style={styles.headerMoreBtn}>
            <MoreHorizontalIcon size={24} color="#0C1015" />
          </TouchableOpacity>
        }
      />

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
        data={postsHidden ? [] : userPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        extraData={listExtraData}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={() => { if (!postsHidden && hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          postsHidden ? (
            <EmptyState
              icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('profileIsPrivate')}
            />
          ) : loading ? (
            <ForumListSkeleton />
          ) : (
            <EmptyState
              icon={<EditIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPosts')}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
            </View>
          ) : null
        }
      />

      <ImagePreviewModal
        visible={avatarPreviewVisible}
        images={profile?.avatar ? [profile.avatar] : []}
        onClose={() => setAvatarPreviewVisible(false)}
      />

      <SwipeableBottomSheet visible={composeSheetVisible} onClose={closeComposeSheet}>
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
      </SwipeableBottomSheet>

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
    backgroundColor: '#FFFFFF',
  },
  headerMoreBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  userName: {
    marginTop: 12,
    marginBottom: 2,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
  },
  profileMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    lineHeight: 20,
    fontFamily: 'DINExp-Bold',
    color: '#0C1015',
  },
  statLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#DEE2E5',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    paddingHorizontal: 20,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0C1015',
  },
  messageBtnDisabled: {
    opacity: 0.5,
  },
  messageBtnText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#FFFFFF',
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0C1015',
  },
  followBtnFollowing: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E5',
  },
  followBtnText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#FFFFFF',
  },
  followBtnTextFollowing: {
    color: '#0C1015',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#DEE2E5',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
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
    top: 58,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 101,
  },
  popoverItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  popoverItemText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#ED4956',
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
