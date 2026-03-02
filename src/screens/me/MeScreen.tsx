import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { UserPost, UserComment, ForumPost, Language, MyContent } from '../../types';
import { useProfile, useMyContent } from '../../hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { useLikePost, useBookmarkPost, useVotePost, useDeletePost, useDeleteComment, useLikeComment, useBookmarkComment } from '../../hooks/usePosts';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { ProfileSkeleton } from '../../components/common/Skeleton';
import TabBar, { type TabOption } from '../../components/common/TabBar';
import PostCard from '../../components/common/PostCard';
import TranslatableText from '../../components/common/TranslatableText';
import ForwardSheet from '../../components/common/ForwardSheet';
import PressScaleButton from '../../components/common/PressScaleButton';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import {
  EditIcon,
  ShareIcon,
  SettingsIcon,
  HelpCircleIcon,
  LockIcon,
  HeartIcon,
  BookmarkIcon,
  CommentIcon,
  CloseIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  MaleIcon,
  FemaleIcon,
  TrashIcon,
  ImageIcon,
  BarChartIcon,
  ChevronRightIcon,
} from '../../components/common/icons';
import { getRelativeTime, buildPostMeta } from '../../utils/formatTime';
import { getVotedOptionIndex } from '../../utils/forum';
import { hapticLight } from '../../utils/haptics';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MeStackParamList, 'MeHome'>;

type MeTab = 'posts' | 'comments' | 'anonPosts' | 'anonComments' | 'bookmarks' | 'myLikes';

interface TabDef {
  key: MeTab;
  labelKey: string;
  locked: boolean;
}

const TAB_DEFS: TabDef[] = [
  { key: 'posts', labelKey: 'tabPosts', locked: false },
  { key: 'comments', labelKey: 'tabComments', locked: false },
  { key: 'anonPosts', labelKey: 'tabAnonPosts', locked: true },
  { key: 'anonComments', labelKey: 'tabAnonComments', locked: true },
  { key: 'bookmarks', labelKey: 'tabBookmarks', locked: true },
  { key: 'myLikes', labelKey: 'tabMyLikes', locked: false },
];

/*
 * Unified content card layout:
 *   [Context line]   optional, only for comment-type
 *   [Body text]      main content, max 3 lines
 *   [Footer]         left: metrics/author info, right: time
 */

const CommentItem = React.memo(function CommentItem({
  comment,
  t,
  lang,
  onPress,
  onUpdate,
  onComment,
  onForward,
  onLikeUpdate,
  onBookmarkUpdate,
  showDelete = true,
}: {
  comment: UserComment;
  t: (key: string) => string;
  lang: Language;
  onPress: () => void;
  onUpdate: () => void;
  onComment?: () => void;
  onForward?: () => void;
  onLikeUpdate?: (liked: boolean) => void;
  onBookmarkUpdate?: (bookmarked: boolean) => void;
  showDelete?: boolean;
}) {
  const deleteCommentMutation = useDeleteComment(comment.postId);
  const likeCommentMutation = useLikeComment(comment.postId);
  const bookmarkCommentMutation = useBookmarkComment(comment.postId);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const showModal = useUIStore((s) => s.showModal);

  const commentMeta = useMemo(
    () => buildPostMeta(t, lang, {
      gradeKey: comment.isAnonymous ? undefined : comment.gradeKey,
      majorKey: comment.isAnonymous ? undefined : comment.majorKey,
      createdAt: comment.time,
      isAnonymous: comment.isAnonymous,
    }),
    [t, lang, comment.gradeKey, comment.majorKey, comment.time, comment.isAnonymous]
  );

  const handleCommentPress = useCallback(() => {
    hapticLight();
    onComment?.();
  }, [onComment]);

  const handleDelete = useCallback(() => {
    showModal({
      title: t('deleteCommentTitle'),
      message: t('deleteCommentMessage'),
      onConfirm: () => {
        deleteCommentMutation.mutate(comment.commentId, {
          onSuccess: () => {
            showSnackbar({ message: t('commentDeleted'), type: 'success' });
            onUpdate();
          },
          onError: () => {
            showSnackbar({ message: t('deleteFailed'), type: 'error' });
          },
        });
      },
    });
  }, [comment.commentId, deleteCommentMutation, showModal, showSnackbar, t, onUpdate]);

  const handleLike = useCallback(() => {
    hapticLight();
    likeCommentMutation.mutate(comment.commentId, {
      onSuccess: (res) => {
        const liked = res?.liked ?? !comment.liked;
        if (onLikeUpdate) {
          onLikeUpdate(liked);
        } else {
          onUpdate();
        }
      },
      onError: () => showSnackbar({ message: t('likeFailed'), type: 'error' }),
    });
  }, [comment.commentId, comment.liked, likeCommentMutation, showSnackbar, t, onLikeUpdate, onUpdate]);

  const handleBookmark = useCallback(() => {
    hapticLight();
    bookmarkCommentMutation.mutate(comment.commentId, {
      onSuccess: (res) => {
        const bookmarked = res?.bookmarked ?? !comment.bookmarked;
        if (onBookmarkUpdate) {
          onBookmarkUpdate(bookmarked);
        } else {
          onUpdate();
        }
      },
      onError: () => showSnackbar({ message: t('bookmarkFailed'), type: 'error' }),
    });
  }, [comment.commentId, comment.bookmarked, bookmarkCommentMutation, showSnackbar, t, onBookmarkUpdate, onUpdate]);

  return (
    <PageTranslationProvider>
    <TouchableOpacity style={styles.commentItem} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.commentHeader}>
        <Avatar
          text={comment.name}
          uri={comment.avatar}
          defaultAvatar={comment.defaultAvatar}
          size="sm"
          gender={comment.gender}
        />
        <View style={styles.commentUserInfo}>
          <View style={styles.commentNameRow}>
            <Text style={styles.commentName}>{comment.name}</Text>
            {!comment.isAnonymous && comment.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
            {!comment.isAnonymous && comment.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
            <Text style={styles.commentDot}> · </Text>
            <Text style={styles.commentMeta} numberOfLines={1}>{commentMeta}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.replyToLabel}>
        {t('replyTo')} @{comment.replyToName || comment.postAuthor}
      </Text>

      <TranslatableText
        entityType="comment"
        entityId={comment.commentId}
        fieldName="content"
        sourceText={comment.comment}
        sourceLanguage={comment.sourceLanguage}
        textStyle={styles.commentBody}
        numberOfLines={3}
      />

      <View style={styles.commentActionsRow}>
        <View style={styles.itemActions}>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleLike}>
            <HeartIcon size={14} color={comment.liked ? colors.error : colors.onSurface} fill={comment.liked ? colors.error : undefined} />
            <Text style={[styles.itemActionText, comment.liked && { color: colors.error }]}>{comment.likes}</Text>
          </PressScaleButton>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleCommentPress}>
            <CommentIcon size={14} color={colors.onSurface} />
            {comment.replyCount !== undefined && comment.replyCount > 0 && (
              <Text style={styles.replyCountBadge}>{comment.replyCount}</Text>
            )}
          </PressScaleButton>
          <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
            <ShareIcon size={14} color={colors.onSurface} />
          </TouchableOpacity>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleBookmark}>
            <BookmarkIcon size={14} color={comment.bookmarked ? colors.primary : colors.onSurface} fill={comment.bookmarked ? colors.primary : undefined} />
          </PressScaleButton>
          {showDelete && (
            <TouchableOpacity style={styles.itemActionBtn} onPress={handleDelete}>
              <TrashIcon size={14} color={colors.onSurface} />
            </TouchableOpacity>
          )}
        </View>
        <PageTranslationToggle style={styles.commentTranslationToggle} />
      </View>
    </TouchableOpacity>
    </PageTranslationProvider>
  );
});

export default function MeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { data: profile, isLoading } = useProfile();
  const { data: myContent } = useMyContent();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<MeTab>('posts');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [forwardComment, setForwardComment] = useState<ForumPost | null>(null);
  const [composeSheetVisible, setComposeSheetVisible] = useState(false);
  const [quotePostId, setQuotePostId] = useState<string | undefined>(undefined);

  const displayUser = profile || user;
  const stats = myContent?.stats;
  const votedPolls = useForumStore((s) => s.votedPolls);

  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const deletePostMutation = useDeletePost();
  const queryClient = useQueryClient();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const showModal = useUIStore((s) => s.showModal);

  /* ==================== Tab options ==================== */
  const tabOptions = useMemo<TabOption<MeTab>[]>(
    () =>
      TAB_DEFS.map((tab) => ({
        value: tab.key,
        label: t(tab.labelKey),
        icon: tab.locked ? <LockIcon size={12} color={colors.onSurfaceVariant} /> : undefined,
        disabled: false,
      })),
    [t]
  );

  /* ==================== Empty label map ==================== */
  const emptyLabels: Record<MeTab, string> = useMemo(
    () => ({
      posts: t('noPosts'),
      comments: t('noComments'),
      anonPosts: t('noAnonPosts'),
      anonComments: t('noAnonComments'),
      bookmarks: t('noBookmarks'),
      myLikes: t('noLikeRecords'),
    }),
    [t]
  );

  /* ==================== Navigation helpers ==================== */
  const goToPost = useCallback(
    (postId: string) => navigation.navigate('PostDetail', { postId }),
    [navigation]
  );
  const goToComment = useCallback(
    (postId: string, commentId: string, shouldReply?: boolean) => navigation.navigate('PostDetail', { postId, commentId, shouldReply }),
    [navigation]
  );
  const handleForward = useCallback((post: ForumPost) => {
    setForwardComment(post);
  }, []);

  const handleQuote = useCallback((post: ForumPost) => {
    setQuotePostId(post.id);
    setComposeSheetVisible(true);
  }, []);

  const closeComposeSheet = useCallback(() => {
    setComposeSheetVisible(false);
    setQuotePostId(undefined);
  }, []);

  const selectComposeType = useCallback((type: 'text' | 'image' | 'poll') => {
    setComposeSheetVisible(false);
    navigation.getParent()?.navigate('ForumTab', {
      screen: 'Compose',
      params: { type, quotePostId },
    });
    setQuotePostId(undefined);
  }, [navigation, quotePostId]);

  const handleAvatarPress = useCallback((post: ForumPost) => {
    handleAvatarPressNavigation({
      navigation,
      currentUser: user,
      isAnonymous: post.isAnonymous,
      userName: post.userName,
      displayName: post.name,
    });
  }, [navigation, user]);

  const handleTagPress = useCallback((_post: ForumPost, tag: string) => {
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

  const mapUserPostToForumPost = useCallback((p: UserPost): ForumPost => ({
    id: p.postId,
    name: p.name,
    userName: p.userName,
    avatar: p.avatar,
    defaultAvatar: p.defaultAvatar,
    gender: p.gender,
    gradeKey: p.gradeKey,
    majorKey: p.majorKey,
    meta: p.meta,
    content: p.content,
    createdAt: p.time,
    lang: p.lang,
    sourceLanguage: p.sourceLanguage ?? (p.lang as Language),
    likes: p.likes,
    comments: p.comments,
    tags: p.tags,
    images: p.images,
    hasImage: p.hasImage,
    image: p.image,
    isAnonymous: p.isAnonymous,
    postType: p.postType,
    isPoll: p.isPoll,
    pollOptions: p.pollOptions,
    myVote: p.myVote,
    isFunction: p.isFunction,
    functionType: p.functionType,
    functionId: p.functionId,
    functionIndex: p.functionIndex,
    functionTitle: p.functionTitle,
    quotedPost: p.quotedPost
      ? {
        ...p.quotedPost,
        sourceLanguage: p.quotedPost.sourceLanguage,
      }
      : undefined,
    liked: p.liked,
    bookmarked: p.bookmarked,
  }), []);

  /* ==================== Tab content renderer ==================== */
  const renderTabContent = useCallback(() => {
    if (!myContent) {
      return <EmptyState icon={<EditIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels[activeTab]} />;
    }

    /* ==================== myLikes tab: liked posts + liked comments ==================== */
    if (activeTab === 'myLikes') {
      const likedPosts = (myContent.myLikes?.posts ?? []).map(mapUserPostToForumPost);
      const likedComments = myContent.myLikes?.comments ?? [];
      if (likedPosts.length === 0 && likedComments.length === 0) {
        return <EmptyState icon={<HeartIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.myLikes} />;
      }
      return (
        <>
          {likedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() => goToPost(post.id)}
              onAvatarPress={!post.isAnonymous ? () => handleAvatarPress(post) : undefined}
              onLike={() => {
                likePostMutation.mutate(post.id, {
                  onSuccess: (res) => {
                    if (res?.liked === false) {
                      queryClient.setQueryData<MyContent>(['myContent'], (old) => {
                        if (!old) return old;
                        return {
                          ...old,
                          myLikes: {
                            ...old.myLikes,
                            posts: old.myLikes.posts.filter((item) => item.postId !== post.id),
                          },
                        };
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ['myContent'] });
                  },
                });
              }}
              onBookmark={() => bookmarkPostMutation.mutate(post.id)}
              onComment={() => goToPost(post.id)}
              onForward={() => handleForward(post)}
              onQuote={() => handleQuote(post)}
              onTagPress={(tag) => handleTagPress(post, tag)}
              onFunctionPress={post.isFunction ? () => handleFunctionPress(post) : undefined}
              onQuotedPostPress={(quotedId) => goToPost(quotedId)}
              onVote={(optIdx) => {
                const optionId = post.pollOptions?.[optIdx]?.id;
                if (optionId) {
                  votePostMutation.mutate({ postId: post.id, optionId, optionIndex: optIdx });
                }
              }}
              isLiked={post.liked ?? false}
              isBookmarked={post.bookmarked ?? false}
              votedOptionIndex={getVotedOptionIndex(post, votedPolls)}
            />
          ))}
          {likedComments.map((c) => (
            (() => {
              const likedCommentAsUser: UserComment = {
                postId: c.postId,
                commentId: c.commentId,
                name: c.name ?? (c.isAnonymous ? 'Anonymous' : (c.commentAuthor ?? c.postAuthor)),
                avatar: c.avatar ?? '',
                defaultAvatar: c.defaultAvatar,
                gender: c.gender,
                gradeKey: c.gradeKey,
                majorKey: c.majorKey,
                replyToName: c.replyToName,
                postAuthor: c.postAuthor,
                postContent: c.postContent,
                comment: c.comment,
                sourceLanguage: c.sourceLanguage,
                time: c.time,
                likes: c.likes,
                liked: c.liked ?? true,
                bookmarked: c.bookmarked ?? false,
                isAnonymous: c.isAnonymous ?? false,
                replyCount: c.replyCount ?? 0,
              };
              const commentAsPost: ForumPost = {
                id: c.commentId,
                sourcePostId: c.postId,
                name: likedCommentAsUser.name,
                avatar: likedCommentAsUser.avatar,
                defaultAvatar: likedCommentAsUser.defaultAvatar,
                gender: likedCommentAsUser.gender ?? 'other',
                content: c.comment,
                createdAt: c.time,
                lang: lang,
                meta: `${c.postAuthor}: ${c.postContent}`.slice(0, 100),
                likes: c.likes,
                comments: c.replyCount ?? 0,
              };
              return (
                <CommentItem
                  key={c.commentId}
                  comment={likedCommentAsUser}
                  t={t}
                  lang={lang}
                  onPress={() => goToComment(c.postId, c.commentId, false)}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['myContent'] })}
                  onLikeUpdate={(liked) => {
                    if (!liked) {
                      queryClient.setQueryData<MyContent>(['myContent'], (old) => {
                        if (!old) return old;
                        return {
                          ...old,
                          myLikes: {
                            ...old.myLikes,
                            comments: old.myLikes.comments.filter((item) => item.commentId !== c.commentId),
                          },
                        };
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ['myContent'] });
                  }}
                  onComment={() => goToComment(c.postId, c.commentId, true)}
                  onForward={() => setForwardComment(commentAsPost)}
                  showDelete={false}
                />
              );
            })()
          ))}
        </>
      );
    }

    /* ==================== bookmarks tab: bookmarked posts + bookmarked comments ==================== */
    if (activeTab === 'bookmarks') {
      const bookmarkedPosts = (myContent.myBookmarks?.posts ?? []).map(mapUserPostToForumPost);
      const bookmarkedComments = myContent.myBookmarks?.comments ?? [];
      if (bookmarkedPosts.length === 0 && bookmarkedComments.length === 0) {
        return <EmptyState icon={<BookmarkIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.bookmarks} />;
      }
      return (
        <>
          {bookmarkedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() => goToPost(post.id)}
              onAvatarPress={!post.isAnonymous ? () => handleAvatarPress(post) : undefined}
              onLike={() => likePostMutation.mutate(post.id)}
              onBookmark={() => {
                bookmarkPostMutation.mutate(post.id, {
                  onSuccess: (res) => {
                    if (res?.bookmarked === false) {
                      queryClient.setQueryData<MyContent>(['myContent'], (old) => {
                        if (!old) return old;
                        return {
                          ...old,
                          myBookmarks: {
                            ...old.myBookmarks,
                            posts: old.myBookmarks.posts.filter((item) => item.postId !== post.id),
                          },
                        };
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ['myContent'] });
                  },
                });
              }}
              onComment={() => goToPost(post.id)}
              onForward={() => handleForward(post)}
              onQuote={() => handleQuote(post)}
              onTagPress={(tag) => handleTagPress(post, tag)}
              onFunctionPress={post.isFunction ? () => handleFunctionPress(post) : undefined}
              onQuotedPostPress={(quotedId) => goToPost(quotedId)}
              onVote={(optIdx) => {
                const optionId = post.pollOptions?.[optIdx]?.id;
                if (optionId) {
                  votePostMutation.mutate({ postId: post.id, optionId, optionIndex: optIdx });
                }
              }}
              isLiked={post.liked ?? false}
              isBookmarked={post.bookmarked ?? false}
              votedOptionIndex={getVotedOptionIndex(post, votedPolls)}
            />
          ))}
          {bookmarkedComments.map((c) => (
            (() => {
              const bookmarkedCommentAsUser: UserComment = {
                postId: c.postId,
                commentId: c.commentId,
                name: c.name ?? (c.isAnonymous ? 'Anonymous' : (c.commentAuthor ?? c.postAuthor)),
                avatar: c.avatar ?? '',
                defaultAvatar: c.defaultAvatar,
                gender: c.gender,
                gradeKey: c.gradeKey,
                majorKey: c.majorKey,
                replyToName: c.replyToName,
                postAuthor: c.postAuthor,
                postContent: c.postContent,
                comment: c.comment,
                time: c.time,
                likes: c.likes,
                liked: c.liked ?? false,
                bookmarked: c.bookmarked ?? true,
                isAnonymous: c.isAnonymous ?? false,
                replyCount: c.replyCount ?? 0,
              };
              const commentAsPost: ForumPost = {
                id: c.commentId,
                sourcePostId: c.postId,
                name: bookmarkedCommentAsUser.name,
                avatar: bookmarkedCommentAsUser.avatar,
                defaultAvatar: bookmarkedCommentAsUser.defaultAvatar,
                gender: bookmarkedCommentAsUser.gender ?? 'other',
                content: c.comment,
                createdAt: c.time,
                lang: lang,
                meta: `${c.postAuthor}: ${c.postContent}`.slice(0, 100),
                likes: c.likes,
                comments: c.replyCount ?? 0,
              };
              return (
                <CommentItem
                  key={c.commentId}
                  comment={bookmarkedCommentAsUser}
                  t={t}
                  lang={lang}
                  onPress={() => goToComment(c.postId, c.commentId, false)}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['myContent'] })}
                  onBookmarkUpdate={(bookmarked) => {
                    if (!bookmarked) {
                      queryClient.setQueryData<MyContent>(['myContent'], (old) => {
                        if (!old) return old;
                        return {
                          ...old,
                          myBookmarks: {
                            ...old.myBookmarks,
                            comments: old.myBookmarks.comments.filter((item) => item.commentId !== c.commentId),
                          },
                        };
                      });
                    }
                    queryClient.invalidateQueries({ queryKey: ['myContent'] });
                  }}
                  onComment={() => goToComment(c.postId, c.commentId, true)}
                  onForward={() => setForwardComment(commentAsPost)}
                  showDelete={false}
                />
              );
            })()
          ))}
        </>
      );
    }

    /* ==================== comment-based tabs ==================== */
    const isComment = activeTab === 'comments' || activeTab === 'anonComments';
    const data = isComment
      ? (myContent[activeTab] as UserComment[])
      : (myContent[activeTab] as UserPost[]);

    if (data.length === 0) {
      const iconMap: Record<string, React.ReactNode> = {
        posts: <EditIcon size={32} color={colors.onSurfaceVariant} />,
        comments: <CommentIcon size={32} color={colors.onSurfaceVariant} />,
        anonPosts: <LockIcon size={32} color={colors.onSurfaceVariant} />,
        anonComments: <LockIcon size={32} color={colors.onSurfaceVariant} />,
      };
      return <EmptyState icon={iconMap[activeTab]} title={emptyLabels[activeTab]} />;
    }

    if (isComment) {
      return (myContent[activeTab] as UserComment[]).map((c, i) => {
        // Convert UserComment to ForumPost for forward
        const commentAsPost: ForumPost = {
          id: c.commentId,
          sourcePostId: c.postId,
          name: c.name,
          avatar: c.avatar,
          defaultAvatar: c.defaultAvatar,
          gender: c.gender ?? 'other',
          content: c.comment,
          createdAt: c.time,
          lang: lang,
          meta: `${c.postAuthor}: ${c.postContent}`.slice(0, 100),
          likes: c.likes,
          comments: c.replyCount ?? 0,
        };
        return (
          <CommentItem
            key={i}
            comment={c}
            t={t}
            lang={lang}
            onPress={() => goToComment(c.postId, c.commentId, false)}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['myContent'] })}
            onComment={() => goToComment(c.postId, c.commentId, true)}
            onForward={() => setForwardComment(commentAsPost)}
          />
        );
      });
    }
    // Convert UserPost to ForumPost format for PostCard
    const posts = (myContent[activeTab] as UserPost[]).map(mapUserPostToForumPost);
    return posts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        onPress={() => goToPost(post.id)}
        onAvatarPress={!post.isAnonymous ? () => handleAvatarPress(post) : undefined}
        onLike={() => likePostMutation.mutate(post.id)}
        onBookmark={() => bookmarkPostMutation.mutate(post.id)}
        onComment={() => goToPost(post.id)}
        onForward={() => handleForward(post)}
        onQuote={() => handleQuote(post)}
        onTagPress={(tag) => handleTagPress(post, tag)}
        onFunctionPress={post.isFunction ? () => handleFunctionPress(post) : undefined}
        onQuotedPostPress={(quotedId) => goToPost(quotedId)}
        onVote={(optIdx) => {
          const optionId = post.pollOptions?.[optIdx]?.id;
          if (optionId) {
            votePostMutation.mutate({ postId: post.id, optionId, optionIndex: optIdx });
          }
        }}
        onDelete={() => {
          showModal({
            title: t('deletePostTitle'),
            message: t('deletePostMessage'),
            onConfirm: () => {
              deletePostMutation.mutate(post.id, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['myContent'] });
                  queryClient.invalidateQueries({ queryKey: ['posts'] });
                  showSnackbar({ message: t('postDeleted'), type: 'success' });
                },
                onError: () => {
                  showSnackbar({ message: t('deleteFailed'), type: 'error' });
                },
              });
            },
          });
        }}
        isLiked={post.liked ?? false}
        isBookmarked={post.bookmarked ?? false}
        votedOptionIndex={getVotedOptionIndex(post, votedPolls)}
      />
    ));
  }, [activeTab, myContent, emptyLabels, t, lang, goToPost, goToComment, handleForward, handleQuote, handleAvatarPress, handleTagPress, handleFunctionPress, mapUserPostToForumPost, displayUser, likePostMutation, bookmarkPostMutation, votePostMutation, deletePostMutation, queryClient, showSnackbar, showModal, votedPolls]);

  if (isLoading && !displayUser) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ==================== Top Bar ==================== */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarIconBtn}
          activeOpacity={0.6}
          onPress={() => setContactModalVisible(true)}
        >
          <HelpCircleIcon size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.topBarIconBtn}
            activeOpacity={0.6}
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ==================== Upper Half: Profile ==================== */}
        <View style={styles.profileSection}>
          {/* Profile info row: left info + right avatar */}
          <View style={styles.profileInfoRow}>
            {/* Left: info */}
            <View style={styles.profileInfoLeft}>
              <Text style={styles.nickname}>
                {displayUser?.nickname || displayUser?.name || '---'}
              </Text>
              <Text style={styles.meta}>
                {[displayUser?.major ? t(displayUser.major) : undefined, displayUser?.grade ? t(displayUser.grade) : undefined]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              {/* Bio (shown only when set) */}
              {displayUser?.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {displayUser.bio}
                </Text>
              ) : null}

              {/* Stats: following + followers + collection */}
              <View style={styles.miniStats}>
                <TouchableOpacity
                  style={styles.miniStatItem}
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('FollowList', { type: 'following' })}
                >
                  <Text style={styles.miniStatValue}>{stats?.following ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followingStat')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.miniStatItem}
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('FollowList', { type: 'followers' })}
                >
                  <Text style={styles.miniStatValue}>{stats?.followers ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followersStat')}
                  </Text>
                </TouchableOpacity>
                <View style={styles.miniStatItem}>
                  <Text style={styles.miniStatValue}>{stats?.collection ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('collectionStat')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.profileAvatarWrap}>
              <Avatar
                text={displayUser?.nickname || displayUser?.name || '?'}
                uri={displayUser?.avatar}
                defaultAvatar={displayUser?.defaultAvatar}
                size="xl"
                gender={displayUser?.gender}
              />
            </View>
          </View>
        </View>

        {/* ==================== Lower Half: Content ==================== */}
        <View style={styles.contentSection}>
          {/* Action buttons: Edit Profile + Share Profile */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <EditIcon size={16} color={colors.onPrimary} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                {t('editProfile')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ShareProfile')}
            >
              <ShareIcon size={16} color={colors.onPrimary} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>
                {t('shareProfile')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <TabBar options={tabOptions} value={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          <View style={styles.tabContent}>{renderTabContent()}</View>
        </View>
      </ScrollView>

      {/* Contact Us Modal */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('contactUs')}</Text>
              <TouchableOpacity
                onPress={() => setContactModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* QR Code placeholder */}
            <View style={styles.qrSection}>
              <View style={styles.qrPlaceholder}>
                <QrCodeIcon size={80} color={colors.primary} />
              </View>
            </View>

            {/* WhatsApp Number */}
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactLabel}>{t('whatsappNumber')}</Text>
              <Text style={styles.contactValue}>+852 1234 5678</Text>
            </View>

            {/* Description */}
            <Text style={styles.contactDesc}>{t('contactUsDesc')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Compose Type Sheet */}
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

      {/* Forward Sheet */}
      <ForwardSheet
        visible={!!forwardComment}
        post={forwardComment}
        onClose={() => setForwardComment(null)}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* ==================== Top Bar ==================== */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ==================== Upper: Profile section ==================== */
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfoLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  profileAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: -60,
  },
  nickname: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  miniStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniStatValue: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },

  /* ==================== Lower: Content section ==================== */
  contentSection: {
    flex: 1,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 42,
    borderRadius: borderRadius.md,
  },
  actionBtnPrimary: {
    backgroundColor: colors.onSurface,
  },
  actionBtnSecondary: {
    backgroundColor: colors.onSurface,
  },
  actionBtnText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: colors.onPrimary,
  },
  actionBtnTextSecondary: {
    color: colors.onPrimary,
  },

  /* Tab content */
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  /* ==================== Unified content cards ==================== */
  contentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },

  /* ==================== Comment item (same style as PostDetailScreen) ==================== */
  commentItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentTranslationToggle: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  commentUserInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  commentNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
  },
  commentName: {
    ...typography.titleSmall,
    fontSize: 13,
    color: colors.onSurface,
  },
  commentDot: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  replyToLabel: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 40,
    marginBottom: spacing.xxs,
  },
  commentGradeMajor: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  commentContext: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    marginLeft: 32 + spacing.sm,
  },
  commentBody: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    marginLeft: 40,
  },
  cardBody: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  commentActionsRow: {
    marginLeft: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    minHeight: 28,
  },
  itemActionText: {
    fontSize: 12,
    color: colors.onSurface,
    marginLeft: 2,
  },
  replyCountBadge: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 2,
  },
  commentMeta: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerMetricText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  footerAuthor: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  footerDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  footerTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* Contact Us Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  contactLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  contactValue: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  contactDesc: {
    ...typography.bodySmall,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Compose Sheet */
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
