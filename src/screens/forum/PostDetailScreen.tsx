import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts, useComments } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import Tag from '../../components/common/Tag';
import ForwardSheet from '../../components/common/ForwardSheet';
import {
  BackIcon,
  HeartIcon,
  CommentIcon,
  SendIcon,
  BookmarkIcon,
  QuoteIcon,
  ChevronDownIcon,
} from '../../components/common/icons';
import type { ForumPost, Comment, Reply } from '../../types';

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
          color={liked ? colors.error : colors.onSurfaceVariant}
          fill={liked ? colors.error : undefined}
        />
        <Text style={[styles.itemActionText, liked && { color: colors.error }]}>
          {likes}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onComment}>
        <CommentIcon size={size} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
        <SendIcon size={size} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onBookmark}>
        <BookmarkIcon
          size={size}
          color={bookmarked ? colors.primary : colors.onSurfaceVariant}
          fill={bookmarked ? colors.primary : undefined}
        />
      </TouchableOpacity>
    </View>
  );
}

/* ── Reply item (二级评论 + 三级评论) ── */
function ReplyItem({
  reply,
  onReply,
  onForward,
}: {
  reply: Reply;
  onReply: (name: string) => void;
  onForward: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <View style={styles.replyItem}>
      <View style={styles.commentHeader}>
        <Avatar text={reply.avatar} size="xs" />
        <View style={styles.commentUserInfo}>
          <View style={styles.replyNameRow}>
            <Text style={styles.replyName}>{reply.name}</Text>
            {reply.replyTo ? (
              <Text style={styles.replyToLabel}> ▸ {reply.replyTo}</Text>
            ) : null}
          </View>
          <Text style={styles.replyTime}>{reply.time}</Text>
        </View>
      </View>
      <Text style={styles.replyBody}>{reply.content}</Text>
      <View style={styles.replyActions}>
        <ItemActions
          likes={reply.likes + (liked ? 1 : 0)}
          liked={liked}
          onLike={() => setLiked(!liked)}
          onComment={() => onReply(reply.name)}
          onForward={onForward}
          onBookmark={() => setBookmarked(!bookmarked)}
          bookmarked={bookmarked}
          size={14}
        />
      </View>
    </View>
  );
}

/* ── Comment item (一级评论) ── */
function CommentItem({
  comment,
  onReply,
  onForward,
}: {
  comment: Comment;
  onReply: (name: string) => void;
  onForward: () => void;
}) {
  const { t } = useTranslation();
  const [showReplies, setShowReplies] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <View style={styles.commentItem}>
      {/* Comment main */}
      <View style={styles.commentHeader}>
        <Avatar text={comment.avatar} size="sm" />
        <View style={styles.commentUserInfo}>
          <Text style={styles.commentName}>{comment.name}</Text>
          <Text style={styles.commentTime}>{comment.time}</Text>
        </View>
      </View>
      <Text style={styles.commentBody}>{comment.content}</Text>

      {/* Actions: like, comment, forward, bookmark */}
      <View style={styles.commentActionsRow}>
        <ItemActions
          likes={comment.likes + (liked ? 1 : 0)}
          liked={liked}
          onLike={() => setLiked(!liked)}
          onComment={() => onReply(comment.name)}
          onForward={onForward}
          onBookmark={() => setBookmarked(!bookmarked)}
          bookmarked={bookmarked}
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
                key={i}
                reply={reply}
                onReply={onReply}
                onForward={onForward}
              />
            ))}
        </>
      )}
    </View>
  );
}

/* ── Main screen ── */
export default function PostDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { postId } = route.params;
  const { data: posts } = usePosts();
  const { data: comments } = useComments(postId);
  const likedPosts = useForumStore((s) => s.likedPosts);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);

  const post = useMemo(
    () => posts?.find((p) => p.id === postId) || null,
    [posts, postId]
  );

  const isLiked = likedPosts.has(postId);
  const isBookmarked = bookmarkedPosts.has(postId);

  const handleReply = useCallback((name: string) => {
    setReplyTo(name);
    setCommentText(`@${name} `);
  }, []);

  const handleSendComment = useCallback(() => {
    if (!commentText.trim()) return;
    showSnackbar({ message: t('commentSent'), type: 'success' });
    setCommentText('');
    setReplyTo(null);
  }, [commentText, showSnackbar, t]);

  const handleForward = useCallback(() => {
    if (post) setForwardPost(post);
  }, [post]);

  const handleQuote = useCallback(() => {
    if (post) {
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    }
  }, [post, navigation]);

  const renderHeader = useCallback(() => {
    if (!post) return null;
    return (
      <View>
        {/* Post Content */}
        <View style={styles.postSection}>
          <View style={styles.postHeader}>
            <Avatar
              text={post.avatar}
              size="md"
              gender={post.isAnonymous ? 'other' : post.gender}
            />
            <View style={styles.postUserInfo}>
              <Text style={styles.postName}>{post.name}</Text>
              <Text style={styles.postMeta}>{post.meta}</Text>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.tags && post.tags.length > 0 && (
            <View style={styles.postTags}>
              {post.tags.map((tag) => (
                <Tag key={tag} label={tag} />
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
              onPress={() => toggleLike(postId)}
            >
              <HeartIcon
                size={20}
                color={isLiked ? colors.error : colors.onSurfaceVariant}
                fill={isLiked ? colors.error : undefined}
              />
              <Text style={[styles.postActionText, isLiked && { color: colors.error }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => handleReply('')}
            >
              <CommentIcon size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.postActionText}>{post.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleForward}
            >
              <SendIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => toggleBookmark(postId)}
            >
              <BookmarkIcon
                size={20}
                color={isBookmarked ? colors.primary : colors.onSurfaceVariant}
                fill={isBookmarked ? colors.primary : undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleQuote}
            >
              <QuoteIcon size={20} color={colors.onSurfaceVariant} />
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
  }, [post, isLiked, isBookmarked, postId, toggleLike, toggleBookmark, handleReply, handleForward, handleQuote, t]);

  if (!post) return null;

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
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments || []}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onReply={handleReply}
              onForward={handleForward}
            />
          )}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
        />

        {/* Comment Input Bar */}
        <View style={styles.commentInputBar}>
          <TextInput
            style={styles.commentInput}
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
  postUserInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  postName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  postMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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
    color: colors.onSurfaceVariant,
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
  commentName: {
    ...typography.titleSmall,
    fontSize: 13,
    color: colors.onSurface,
  },
  commentTime: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
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

  /* ── Comment Input Bar ── */
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
