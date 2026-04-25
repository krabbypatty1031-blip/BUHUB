import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts, flattenPostPages, useLikePost, useBookmarkPost, useVotePost, useCircleFollow, useToggleCircleFollow } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { canPublishCommunityContent } from '../../utils/publishPermission';
import { promptHkbuVerification } from '../../utils/hkbuPrompt';
import { spacing } from '../../theme/spacing';
import { fontFamily } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import ForwardSheet from '../../components/common/ForwardSheet';
import { BackIcon, PlusIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';
import { getVotedOptionIndex } from '../../utils/forum';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const headerBg = require('../../../assets/images/campus-header-bg.png');

type Props = NativeStackScreenProps<ForumStackParamList, 'CircleDetail'>;

export default function CircleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tag, cachedFollowed, cachedFollowerCount, cachedUsageCount } = route.params;
  const { data } = usePosts();
  const allPosts = useMemo(() => flattenPostPages(data), [data]);
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const currentUser = useAuthStore((s) => s.user);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const { data: circleFollow } = useCircleFollow(tag);
  const toggleCircleFollowMutation = useToggleCircleFollow(tag);
  const followed = circleFollow?.followed ?? cachedFollowed ?? false;
  const displayName = useMemo(() => {
    const translated = t(tag);
    const name = translated !== tag ? translated : tag;
    return name.replace(/^#\s*/, '');
  }, [tag, t]);

  // Filter posts by tag and exclude blocked users
  const posts = useMemo(
    () => allPosts.filter((p) => p.tags?.includes(tag) && !isBlocked(p.name)),
    [allPosts, tag, blockedUsers, isBlocked]
  );
  const followerCount = circleFollow?.followerCount ?? cachedFollowerCount ?? 0;
  const contentCount = posts.length > 0 || cachedUsageCount === undefined ? posts.length : cachedUsageCount;

  const handleTagPress = useCallback(
    (pressedTag: string) => {
      if (pressedTag === tag) return; // already on this circle
      navigation.push('CircleDetail', { tag: pressedTag });
    },
    [navigation, tag]
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

  const handleCommentPress = useCallback(
    (post: ForumPost) => {
      navigation.navigate('PostDetail', { postId: post.id });
    },
    [navigation]
  );

  const goToManageEmails = useCallback(() => {
    navigation.getParent()?.navigate('MeTab', { screen: 'ManageEmails', initial: false } as never);
  }, [navigation]);

  const handleForward = useCallback(
    (post: ForumPost) => {
      if (!canPublishCommunityContent(currentUser)) {
        promptHkbuVerification(t, goToManageEmails);
        return;
      }
      setForwardPost(post);
    },
    [currentUser, goToManageEmails, t]
  );

  const handleQuote = useCallback(
    (post: ForumPost) => {
      if (!canPublishCommunityContent(currentUser)) {
        promptHkbuVerification(t, goToManageEmails);
        return;
      }
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    },
    [currentUser, goToManageEmails, navigation, t]
  );

  const handleLikePost = useCallback(
    (postId: string) => {
      if (!canPublishCommunityContent(currentUser)) {
        promptHkbuVerification(t, goToManageEmails);
        return;
      }
      likePostMutation.mutate(postId);
    },
    [currentUser, goToManageEmails, likePostMutation, t]
  );

  const handleBookmarkPost = useCallback(
    (postId: string) => {
      if (!canPublishCommunityContent(currentUser)) {
        promptHkbuVerification(t, goToManageEmails);
        return;
      }
      bookmarkPostMutation.mutate(postId);
    },
    [bookmarkPostMutation, currentUser, goToManageEmails, t]
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
          screen: 'CircleDetail',
          params: { tag },
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
    [navigation, tag]
  );

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onAvatarPress={!item.isAnonymous ? () => handleAvatarPress(item) : undefined}
        onLike={() => handleLikePost(item.id)}
        onComment={() => handleCommentPress(item)}
        onForward={() => handleForward(item)}
        onBookmark={() => handleBookmarkPost(item.id)}
        onQuote={() => handleQuote(item)}
        onTagPress={(pressedTag) => handleTagPress(pressedTag)}
        onFunctionPress={item.isFunction ? () => handleFunctionPress(item) : undefined}
        onImagePress={(images, index) => {
          setPreviewImages(images);
          setPreviewIndex(index);
          setPreviewVisible(true);
        }}
        onQuotedPostPress={(quotedId) => navigation.navigate('PostDetail', { postId: quotedId })}
        onVote={
          item.isPoll
            ? (optIdx) => {
                const optionId = item.pollOptions?.[optIdx]?.id;
                if (optionId) {
                  votePostMutation.mutate({ postId: item.id, optionId, optionIndex: optIdx });
                }
              }
            : undefined
        }
        isLiked={item.liked ?? false}
        isBookmarked={item.bookmarked ?? false}
        votedOptionIndex={getVotedOptionIndex(item, votedPolls)}
      />
    ),
    [posts, votedPolls, navigation, likePostMutation, bookmarkPostMutation, votePostMutation, handleTagPress, handleAvatarPress, handleCommentPress, handleForward, handleQuote, handleFunctionPress]
  );

  return (
    <View style={styles.container}>
      {/* Dark immersive header */}
      <SafeAreaView edges={['top']} style={styles.darkHeader}>
        <Image source={headerBg} style={styles.headerBgImage} resizeMode="cover" />
        {/* Navigation bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Circle info + Follow button */}
        <View style={styles.headerContent}>
          {/* Row 1: name */}
          <View style={styles.circleNameRow}>
            <Text style={styles.hashIcon}>#</Text>
            <Text style={styles.circleNameText}>{displayName}</Text>
          </View>
          {/* Row 2: stats + follow button */}
          <View style={styles.statsWithBtn}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>{t('circleDetail')}</Text>
              <Text style={styles.statsSep}>｜</Text>
              <Text style={styles.statsNum}>{followerCount}</Text>
              <Text style={styles.statsLabel}>{t('fansUnit')}</Text>
              <Text style={styles.statsLabel}>·</Text>
              <Text style={styles.statsNum}>{contentCount}</Text>
              <Text style={styles.statsLabel}>{t('contentUnit')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, followed && styles.followBtnActive]}
              onPress={() => toggleCircleFollowMutation.mutate()}
              disabled={toggleCircleFollowMutation.isPending}
            >
              {!followed && <PlusIcon size={15} color="#0C1015" />}
              <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
                {followed ? t('alreadyFollowed') : t('follow')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Posts area with rounded top corners */}
      <View style={styles.postsWrapper}>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          extraData={votedPolls}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        />
      </View>

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
    backgroundColor: '#333333',
  },
  darkHeader: {
    backgroundColor: '#333333',
    overflow: 'hidden',
  },
  headerBgImage: {
    position: 'absolute',
    top: -20,
    left: 0,
    width: '100%',
    height: '200%',
    opacity: 0.04,
  },
  navBar: {
    height: 62,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    paddingLeft: 21,
    paddingRight: 24,
    paddingBottom: 20,
    gap: 16,
  },
  statsWithBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 25,
  },
  hashIcon: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: '#0090F0',
    lineHeight: 22,
  },
  circleNameText: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statsLabel: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.5)',
  },
  statsSep: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  statsNum: {
    fontSize: 12,
    lineHeight: 12,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EDF2F5',
    borderWidth: 1,
    borderColor: '#EDF2F5',
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  followBtnText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: '#0C1015',
    lineHeight: 20,
  },
  followBtnTextActive: {
    color: '#FFFFFF',
  },
  postsWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
});
