import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { CommonActions } from '@react-navigation/native';
import { usePostDetail, useComments, useCreateComment, useLikePost, useBookmarkPost, useLikeComment, useBookmarkComment } from '../../hooks/usePosts';
import { useContacts } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import { reportService } from '../../api/services/report.service';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import Tag from '../../components/common/Tag';
import ForwardSheet from '../../components/common/ForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import IOSSwitch from '../../components/common/IOSSwitch';
import {
  BackIcon,
  HeartIcon,
  CommentIcon,
  SendIcon,
  ShareIcon,
  BookmarkIcon,
  QuoteIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  IncognitoIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import type { ForumPost, Comment, Reply, Language } from '../../types';
import { buildPostMeta, getRelativeTime } from '../../utils/formatTime';

type Props = NativeStackScreenProps<ForumStackParamList, 'PostDetail'>;

/* ── Inline action bar for comments / replies ── */
function ItemActions({
  likes,
  liked,
  onLike,
  onComment,
  onForward,
  onBookmark,
  bookmarked,
  size = 16,
}: {
  likes: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onForward: () => void;
  onBookmark: () => void;
  bookmarked: boolean;
  size?: number;
}) {
  return (
    <View style={styles.itemActions}>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onLike}>
        <HeartIcon
          size={size}
          color={liked ? colors.error : colors.onSurface}
          fill={liked ? colors.error : undefined}
        />
        <Text style={[styles.itemActionText, liked && { color: colors.error }]}>
          {likes}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onComment}>
        <CommentIcon size={size} color={colors.onSurface} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
        <ShareIcon size={size} color={colors.onSurface} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onBookmark}>
        <BookmarkIcon
          size={size}
          color={bookmarked ? colors.primary : colors.onSurface}
          fill={bookmarked ? colors.primary : undefined}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ── Reply item (二级评论 + 三级评论) ── */
function ReplyItem({
  reply,
  lang,
  t,
  onReply,
  onLike,
  onBookmark,
  onForward,
  onReport,
  highlighted,
}: {
  reply: Reply;
  lang: Language;
  t: (key: string) => string;
  onReply: (name: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: () => void;
  highlighted?: boolean;
}) {

  const replyMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: reply.gradeKey,
        majorKey: reply.majorKey,
        createdAt: reply.time,
      }),
    [t, lang, reply.gradeKey, reply.majorKey, reply.time],
  );

  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlighted) {
      const timer = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
          ]),
          { iterations: 2 }
        ).start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [highlighted, flashAnim]);

  const highlightBg = highlighted
    ? flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', colors.scrimLight],
      })
    : undefined;

  return (
    <Animated.View
      style={[
        styles.replyItem,
        highlightBg ? { backgroundColor: highlightBg, borderRadius: borderRadius.sm } : undefined,
      ]}
    >
      <TouchableOpacity activeOpacity={1} onLongPress={onReport}>
        <View style={styles.commentHeader}>
          <Avatar
            text={reply.name}
            uri={reply.avatar}
            defaultAvatar={reply.defaultAvatar}
            size="xs"
            gender={reply.gender}
          />
          <View style={styles.commentUserInfo}>
            <View style={styles.replyNameRow}>
              <Text style={styles.replyName}>{reply.name}</Text>
              {reply.gender === 'male' && <MaleIcon size={10} color={colors.genderMale} />}
              {reply.gender === 'female' && <FemaleIcon size={10} color={colors.genderFemale} />}
              {reply.replyTo ? (
                <Text style={styles.replyToLabel}> ▸ {reply.replyTo}</Text>
              ) : null}
            </View>
            <Text style={styles.replyTime}>{replyMeta}</Text>
          </View>
        </View>
        <Text style={styles.replyBody}>{reply.content}</Text>
      </TouchableOpacity>
      <View style={styles.replyActions}>
        <ItemActions
          likes={reply.likes}
          liked={reply.liked ?? false}
          onLike={() => onLike(reply.id)}
          onComment={() => onReply(reply.name)}
          onForward={onForward}
          onBookmark={() => onBookmark(reply.id)}
          bookmarked={reply.bookmarked ?? false}
          size={14}
        />
      </View>
    </Animated.View>
  );
}

/* ── Comment item (一级评论) ── */
function CommentItem({
  comment,
  lang,
  onReply,
  onLike,
  onBookmark,
  onForward,
  onReport,
  highlightId,
}: {
  comment: Comment;
  lang: Language;
  onReply: (name: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: () => void;
  highlightId?: string;
}) {
  const { t } = useTranslation();
  const isHighlighted = !!highlightId && comment.id === highlightId;
  const highlightedReplyId =
    highlightId && comment.replies?.find((r) => r.id === highlightId)?.id;
  const [showReplies, setShowReplies] = useState(!!highlightedReplyId);

  const commentMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: comment.isAnonymous ? undefined : comment.gradeKey,
        majorKey: comment.isAnonymous ? undefined : comment.majorKey,
        createdAt: comment.time,
        isAnonymous: comment.isAnonymous,
      }),
    [t, lang, comment.gradeKey, comment.majorKey, comment.time, comment.isAnonymous],
  );

  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      const timer = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
          ]),
          { iterations: 2 }
        ).start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, flashAnim]);

  const highlightBg = isHighlighted
    ? flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', colors.scrimLight],
      })
    : undefined;

  return (
    <Animated.View
      style={[
        styles.commentItem,
        highlightBg ? { backgroundColor: highlightBg, borderRadius: borderRadius.sm } : undefined,
      ]}
    >
      {/* Comment main */}
      <TouchableOpacity activeOpacity={1} onLongPress={onReport}>
        <View style={styles.commentHeader}>
          <Avatar
            text={comment.isAnonymous ? '' : comment.name}
            uri={comment.isAnonymous ? undefined : comment.avatar}
            defaultAvatar={comment.isAnonymous ? undefined : comment.defaultAvatar}
            size="sm"
            gender={comment.isAnonymous ? 'other' : comment.gender}
          />
          <View style={styles.commentUserInfo}>
            <View style={styles.commentNameRow}>
              {comment.isAnonymous && (
                <IncognitoIcon size={12} color={colors.onSurfaceVariant} />
              )}
              <Text style={styles.commentName}>{comment.name}</Text>
              {!comment.isAnonymous && comment.gender === 'male' && (
                <MaleIcon size={12} color={colors.genderMale} />
              )}
              {!comment.isAnonymous && comment.gender === 'female' && (
                <FemaleIcon size={12} color={colors.genderFemale} />
              )}
              <Text style={styles.commentDot}> · </Text>
              <Text style={styles.commentMeta} numberOfLines={1}>{commentMeta}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.commentBody}>{comment.content}</Text>
      </TouchableOpacity>

      {/* Actions: like, comment, forward, bookmark */}
      <View style={styles.commentActionsRow}>
        <ItemActions
          likes={comment.likes}
          liked={comment.liked ?? false}
          onLike={() => onLike(comment.id)}
          onComment={() => onReply(comment.name)}
          onForward={onForward}
          onBookmark={() => onBookmark(comment.id)}
          bookmarked={comment.bookmarked ?? false}
        />
      </View>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.toggleReplies}
            onPress={() => setShowReplies(!showReplies)}
          >
            <ChevronDownIcon size={16} color={colors.primary} />
            <Text style={styles.toggleRepliesText}>
              {showReplies ? t('collapseReplies') || '收起' : t('expandReplies')}{' '}
              {comment.replies.length} {t('repliesUnit')}
            </Text>
          </TouchableOpacity>
          {showReplies &&
            comment.replies.map((reply, i) => (
              <ReplyItem
                key={reply.id || i}
                reply={reply}
                lang={lang}
                t={t}
                onReply={onReply}
                onLike={onLike}
                onBookmark={onBookmark}
                onForward={onForward}
                onReport={onReport}
                highlighted={reply.id === highlightId}
              />
            ))}
        </>
      )}
    </Animated.View>
  );
}

/* ── Main screen ── */
export default function PostDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { postId, commentId } = route.params;
  const { data: post, isLoading } = usePostDetail(postId);
  const { data: comments } = useComments(postId);
  // like/bookmark state comes from server data (optimistic updates)
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const createCommentMutation = useCreateComment(postId);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const likeCommentMutation = useLikeComment(postId);
  const bookmarkCommentMutation = useBookmarkComment(postId);
  const { data: contacts } = useContacts();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [commentActionVisible, setCommentActionVisible] = useState(false);

  /* ── Refs ── */
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const targetCommentIndex = useMemo(() => {
    if (!commentId || !comments) return -1;
    return comments.findIndex(
      (c) => c.id === commentId || c.replies?.some((r) => r.id === commentId)
    );
  }, [commentId, comments]);

  useEffect(() => {
    if (targetCommentIndex >= 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: targetCommentIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [targetCommentIndex]);

  /* ── @ Mention detection ── */
  const mentionQuery = useMemo(() => {
    if (!commentText) return null;
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    const afterAt = commentText.substring(lastAtIndex + 1);
    // If there's a space after the mention text, it's already completed
    if (afterAt.includes(' ')) return null;
    return afterAt;
  }, [commentText]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || !contacts) return [];
    if (mentionQuery === '') return contacts;
    const q = mentionQuery.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [mentionQuery, contacts]);

  const showMentions = mentionQuery !== null && mentionSuggestions.length > 0;

  const handleMentionSelect = useCallback(
    (contactName: string) => {
      const lastAtIndex = commentText.lastIndexOf('@');
      const newText = commentText.substring(0, lastAtIndex) + `@${contactName} `;
      setCommentText(newText);
    },
    [commentText]
  );

  const displayMeta = useMemo(
    () =>
      post
        ? buildPostMeta(t, lang, {
            gradeKey: post.gradeKey,
            majorKey: post.majorKey,
            createdAt: post.createdAt,
            isAnonymous: post.isAnonymous,
          })
        : '',
    [post, t, lang],
  );

  const isLiked = post?.liked ?? false;
  const isBookmarked = post?.bookmarked ?? false;
  const currentUser = useAuthStore((s) => s.user);

  const handleAvatarPress = useCallback(() => {
    if (!post?.isAnonymous) {
      if (post?.name === currentUser?.nickname) {
        navigation.dispatch(CommonActions.navigate({ name: 'MeTab' }));
      } else {
        navigation.navigate('UserProfile', { userName: post?.userName ?? post?.name ?? '' });
      }
    }
  }, [post, currentUser, navigation]);

  const handleComment = useCallback(() => {
    setReplyTo(null);
    setCommentText('');
    setIsAnonymous(false);
    inputRef.current?.focus();
  }, []);

  const handleReply = useCallback((name: string) => {
    setReplyTo(null);
    setCommentText(`@${name} `);
    setIsAnonymous(false);
    setReplyTo(name);
    inputRef.current?.focus();
  }, []);

  const handleSendComment = useCallback(() => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate(
      { content: commentText.trim(), isAnonymous },
      {
        onSuccess: () => {
          showSnackbar({ message: t('commentSent'), type: 'success' });
          setCommentText('');
          setReplyTo(null);
          setIsAnonymous(false);
        },
        onError: () => {
          showSnackbar({ message: t('commentFailed') || 'Failed to send comment', type: 'error' });
        },
      }
    );
  }, [commentText, isAnonymous, createCommentMutation, showSnackbar, t]);

  const handleForward = useCallback(() => {
    if (post) setForwardPost(post);
  }, [post]);

  const handleQuote = useCallback(() => {
    if (post) {
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    }
  }, [post, navigation]);

  const handleLikeComment = useCallback((cId: string) => {
    likeCommentMutation.mutate(cId);
  }, [likeCommentMutation]);

  const handleBookmarkComment = useCallback((cId: string) => {
    bookmarkCommentMutation.mutate(cId);
  }, [bookmarkCommentMutation]);

  const handleReportPost = useCallback(() => {
    setPopoverVisible(true);
  }, []);

  const handleReportComment = useCallback(() => {
    setCommentActionVisible(true);
  }, []);

  const handleReportSubmit = useCallback(
    async (reason: string) => {
      try {
        await reportService.submit({
          targetType: 'post',
          targetId: postId,
          reason,
        });
        setReportVisible(false);
        showSnackbar({ message: t('reportSubmitted'), type: 'success' });
      } catch {
        showSnackbar({ message: t('reportFailed') || 'Failed to submit report', type: 'error' });
      }
    },
    [postId, showSnackbar, t]
  );

  const renderHeader = useCallback(() => {
    if (!post) return null;
    return (
      <View>
        {/* Post Content */}
        <View style={styles.postSection}>
          <View style={styles.postHeader}>
            {post.isAnonymous ? (
              <Avatar
                text=""
                uri={undefined}
                size="md"
                gender="other"
              />
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleAvatarPress}
                style={styles.postAvatarTouch}
              >
                <Avatar
                  text={post.name}
                  uri={post.avatar}
                  defaultAvatar={post.defaultAvatar}
                  size="md"
                  gender={post.gender}
                />
              </TouchableOpacity>
            )}
            <View style={styles.postUserInfo}>
              <View style={styles.postNameRow}>
                {post.isAnonymous && (
                  <IncognitoIcon size={14} color={colors.onSurfaceVariant} />
                )}
                {!post.isAnonymous ? (
                  <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} style={styles.postNameTouch}>
                    <Text style={styles.postName}>{post.name}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.postName}>{post.name}</Text>
                )}
                <Text style={styles.postDot}> · </Text>
                <Text style={styles.postMeta} numberOfLines={1}>{displayMeta}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.tags && post.tags.length > 0 && (
            <View style={styles.postTags}>
              {post.tags.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => navigation.navigate('CircleDetail', { tag })}>
                  <Tag label={t(tag)} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {post.hasImage && post.image && (
            <Image source={{ uri: post.image }} style={styles.postImage} />
          )}

          {post.isPoll && post.pollOptions && (
            <View style={styles.pollContainer}>
              {post.pollOptions.map((opt, i) => (
                <View key={i} style={styles.pollOption}>
                  <View style={[styles.pollBar, { width: `${opt.percent}%` }]} />
                  <Text style={styles.pollText}>{opt.text}</Text>
                  <Text style={styles.pollPercent}>{opt.percent}%</Text>
                </View>
              ))}
            </View>
          )}

          {/* 5 action buttons, evenly distributed */}
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => likePostMutation.mutate(postId)}
            >
              <HeartIcon
                size={20}
                color={isLiked ? colors.error : colors.onSurface}
                fill={isLiked ? colors.error : undefined}
              />
              <Text style={[styles.postActionText, isLiked && { color: colors.error }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleComment}
            >
              <CommentIcon size={20} color={colors.onSurface} />
              <Text style={styles.postActionText}>{post.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleForward}
            >
              <ShareIcon size={20} color={colors.onSurface} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => bookmarkPostMutation.mutate(postId)}
            >
              <BookmarkIcon
                size={20}
                color={isBookmarked ? colors.primary : colors.onSurface}
                fill={isBookmarked ? colors.primary : undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleQuote}
            >
              <QuoteIcon size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commentSectionHeader}>
          <Text style={styles.commentSectionTitle}>
            {t('commentSection')} ({post.comments})
          </Text>
        </View>
      </View>
    );
  }, [post, isLiked, isBookmarked, postId, likePostMutation, bookmarkPostMutation, handleComment, handleForward, handleQuote, handleAvatarPress, t, displayMeta, navigation]);

  if (isLoading || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('postDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('postDetail')}</Text>
        <TouchableOpacity onPress={handleReportPost} style={styles.iconBtn}>
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {popoverVisible && (
        <TouchableOpacity
          style={styles.popoverOverlay}
          activeOpacity={1}
          onPress={() => setPopoverVisible(false)}
        >
          <View style={styles.popoverBubble}>
            <TouchableOpacity
              style={styles.popoverItem}
              onPress={() => {
                setPopoverVisible(false);
                setReportTitle(t('reportPost'));
                setReportVisible(true);
              }}
            >
              <Text style={styles.popoverItemText}>{t('reportAction')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={comments || []}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              lang={lang}
              onReply={handleReply}
              onLike={handleLikeComment}
              onBookmark={handleBookmarkComment}
              onForward={handleForward}
              onReport={handleReportComment}
              highlightId={commentId}
            />
          )}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.3,
              });
            }, 500);
          }}
        />

        {/* @ Mention Suggestions */}
        {showMentions && (
          <View style={styles.mentionOverlay}>
            <Text style={styles.mentionHeader}>{t('recentChats')}</Text>
            <ScrollView
              keyboardShouldPersistTaps="always"
              style={styles.mentionScroll}
            >
              {mentionSuggestions.map((contact) => (
                <TouchableOpacity
                  key={contact.name}
                  style={styles.mentionItem}
                  activeOpacity={0.7}
                  onPress={() => handleMentionSelect(contact.name)}
                >
                  <Avatar text={contact.name} uri={contact.avatar} size="sm" gender={contact.gender} />
                  <Text style={styles.mentionName}>{contact.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Comment Input Bar */}
        <View style={styles.commentInputBar}>
          <View style={styles.anonToggle}>
            <IOSSwitch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              activeColor={colors.onSurface}
              thumbIcon={<IncognitoIcon size={16} color={colors.onSurface} />}
            />
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.commentInput, isAnonymous && styles.commentInputAnon]}
            placeholder={
              replyTo
                ? `${t('replyTo')} ${replyTo}`
                : t('writeComment')
            }
            placeholderTextColor={colors.onSurfaceVariant}
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <SendIcon
              size={20}
              color={commentText.trim() ? colors.onPrimary : colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Forward Sheet */}
      <ForwardSheet
        visible={!!forwardPost}
        post={forwardPost}
        onClose={() => setForwardPost(null)}
        navigation={navigation}
      />

      {/* Comment Action Sheet */}
      <Modal
        visible={commentActionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCommentActionVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setCommentActionVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHandle} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setCommentActionVisible(false);
                setReportTitle(t('reportComment'));
                setReportVisible(true);
              }}
            >
              <Text style={styles.actionSheetItemTextDestructive}>{t('reportComment')}</Text>
            </TouchableOpacity>
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => setCommentActionVisible(false)}
            >
              <Text style={styles.actionSheetItemText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={reportTitle}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex1: {
    flex: 1,
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

  /* ── Post Section ── */
  postSection: {
    padding: spacing.lg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  postAvatarTouch: {},
  postNameTouch: { alignSelf: 'flex-start' },
  postUserInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postName: {
    ...typography.titleSmall,
    fontWeight: '700',
    color: colors.onSurface,
  },
  postDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  postMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  postContent: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface2,
  },
  pollContainer: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  pollOption: {
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  pollBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.sm,
  },
  pollText: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    zIndex: 1,
  },
  pollPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    zIndex: 1,
  },

  /* Post actions — 5 buttons evenly spaced */
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
  },
  postActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  postActionText: {
    fontSize: 14,
    color: colors.onSurface,
  },

  divider: {
    height: 8,
    backgroundColor: colors.surface2,
  },

  /* ── Comments ── */
  commentSectionHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  commentSectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  commentItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentUserInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  commentNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  commentMeta: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  commentBody: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginLeft: 40,
    marginBottom: spacing.xs,
  },

  /* Comment-level actions */
  commentActionsRow: {
    marginLeft: 40,
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
    minHeight: 32,
  },
  itemActionText: {
    fontSize: 12,
    color: colors.onSurface,
  },

  /* ── Replies (二级评论) ── */
  toggleReplies: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  toggleRepliesText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  replyItem: {
    marginLeft: 40,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.outlineVariant,
  },
  replyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  replyToLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  replyTime: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  replyBody: {
    fontSize: 13,
    color: colors.onSurface,
    marginLeft: 28,
    lineHeight: 18,
    marginBottom: spacing.xxs,
  },
  replyActions: {
    marginLeft: 28,
  },

  /* ── Mention Suggestions ── */
  mentionOverlay: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    maxHeight: 200,
    ...elevation[2],
  },
  mentionHeader: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  mentionScroll: {
    maxHeight: 168,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  mentionName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },

  /* ── Popover ── */
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
    ...elevation[3],
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

  /* ── Comment Action Sheet ── */
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 32,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionSheetItem: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  actionSheetItemText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  actionSheetItemTextDestructive: {
    ...typography.bodyLarge,
    color: colors.error,
    fontWeight: '500',
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xl,
  },

  /* ── Comment Input Bar ── */
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: layout.bottomNavHeight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  commentInputAnon: {
    backgroundColor: '#E0E0E0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
});
