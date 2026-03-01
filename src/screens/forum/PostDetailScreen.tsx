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
  UIManager,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePostDetail, useComments, useCreateComment, useLikePost, useBookmarkPost, useLikeComment, useBookmarkComment, useVotePost } from '../../hooks/usePosts';
import { useContacts } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import { useForumStore } from '../../store/forumStore';
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
import PressScaleButton from '../../components/common/PressScaleButton';
import {
  BackIcon,
  HeartIcon,
  CommentIcon,
  SendIcon,
  ShareIcon,
  BookmarkIcon,
  QuoteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  MaleIcon,
  FemaleIcon,
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
} from '../../components/common/icons';
import type { ForumPost, Comment, Reply, Language } from '../../types';
import { buildPostMeta, getRelativeTime } from '../../utils/formatTime';
import { getVotedOptionIndex } from '../../utils/forum';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { hapticLight } from '../../utils/haptics';
import { normalizeImageUrl } from '../../utils/imageUrl';

type Props = NativeStackScreenProps<ForumStackParamList, 'PostDetail'>;

/* ── Helper functions for infinite nested comments ── */

// Recursively find all parent comment IDs that need to be expanded
// Returns null if not found, otherwise returns array of parent IDs
function findParentIdsToExpand(
  comments: Comment[],
  targetId: string,
  parents: string[] = []
): string[] | null {
  for (const comment of comments) {
    if (comment.id === targetId) {
      return parents; // Found the target, return the parent chain
    }
    if (comment.replies && comment.replies.length > 0) {
      const result = findParentIdsToExpand(
        comment.replies as Comment[],
        targetId,
        [...parents, comment.id]
      );
      if (result !== null) {
        // Found in nested replies, propagate the result up
        return result;
      }
      // Otherwise continue searching in next comment
    }
  }
  return null; // Not found in this branch
}

// Find a comment/reply node by ID in an arbitrarily deep tree
function findCommentById(
  comments: Array<Comment | Reply>,
  targetId: string
): Comment | Reply | null {
  for (const comment of comments) {
    if (comment.id === targetId) {
      return comment;
    }
    if (comment.replies && comment.replies.length > 0) {
      const found = findCommentById(comment.replies, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Find the top-level comment index that contains the target comment
function findTopLevelCommentIndex(comments: Comment[], targetId: string): number {
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    if (comment.id === targetId) {
      return i;
    }
    // Check if target is in any nested reply
    if (comment.replies && containsComment(comment.replies as Comment[], targetId)) {
      return i;
    }
  }
  return -1;
}

// Helper: check if a comment with given ID exists in the array
function containsComment(comments: Comment[], targetId: string): boolean {
  for (const comment of comments) {
    if (comment.id === targetId) return true;
    if (comment.replies && containsComment(comment.replies as Comment[], targetId)) {
      return true;
    }
  }
  return false;
}

// Count all descendant replies recursively (children + grandchildren + ...)
function countDescendantReplies(replies?: Reply[]): number {
  if (!replies || replies.length === 0) return 0;
  return replies.reduce((total, reply) => {
    return total + 1 + countDescendantReplies(reply.replies);
  }, 0);
}

function AnimatedPollBar({ percent, isVoted }: { percent: number; isVoted?: boolean }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent, width]);

  const barStyle = {
    width: width.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
  };

  return <Animated.View style={[styles.pollBar, isVoted && styles.pollBarVoted, barStyle]} />;
}

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
  replyCount,
}: {
  likes: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onForward: () => void;
  onBookmark: () => void;
  bookmarked: boolean;
  size?: number;
  replyCount?: number;
}) {
  const handleLikePress = useCallback(() => {
    hapticLight();
    onLike();
  }, [onLike]);

  const handleCommentPress = useCallback(() => {
    hapticLight();
    onComment();
  }, [onComment]);

  const handleBookmarkPress = useCallback(() => {
    hapticLight();
    onBookmark();
  }, [onBookmark]);

  return (
    <View style={styles.itemActions}>
      <PressScaleButton style={styles.itemActionBtn} onPress={handleLikePress}>
        <HeartIcon
          size={size}
          color={liked ? colors.error : colors.onSurface}
          fill={liked ? colors.error : undefined}
        />
        <Text style={[styles.itemActionText, liked && { color: colors.error }]}>
          {likes}
        </Text>
      </PressScaleButton>
      <PressScaleButton style={styles.itemActionBtn} onPress={handleCommentPress}>
        <CommentIcon size={size} color={colors.onSurface} />
        {replyCount !== undefined && replyCount > 0 && (
          <Text style={styles.replyCountBadge}>{replyCount}</Text>
        )}
      </PressScaleButton>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
        <ShareIcon size={size} color={colors.onSurface} />
      </TouchableOpacity>
      <PressScaleButton style={styles.itemActionBtn} onPress={handleBookmarkPress}>
        <BookmarkIcon
          size={size}
          color={bookmarked ? colors.primary : colors.onSurface}
          fill={bookmarked ? colors.primary : undefined}
        />
      </PressScaleButton>
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
  highlightId,
  level = 2,
  expandedReplies = [],
  registerItemRef,
}: {
  reply: Reply;
  lang: Language;
  t: (key: string) => string;
  onReply: (name: string, commentId?: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: (commentId: string) => void;
  highlightId?: string;
  level?: number;
  expandedReplies?: string[];
  registerItemRef?: (id: string, node: View | null) => void;
}) {

  const replyMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: reply.gradeKey,
        majorKey: reply.majorKey,
        createdAt: reply.createdAt || reply.time,
      }),
    [t, lang, reply.gradeKey, reply.majorKey, reply.createdAt, reply.time],
  );

  const flashAnim = useRef(new Animated.Value(0)).current;
  const isHighlighted = !!highlightId && reply.id === highlightId;

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

  // Level 2 = direct reply to main comment (with indent and border)
  // Level 3+ = reply to reply (no indent, no border)
  const isNestedReply = level >= 3;

  // Collapse logic for nested replies (level 3+) - show 0 by default
  const nestedReplies = reply.replies ?? [];
  const totalNestedReplies = countDescendantReplies(reply.replies);
  const hasNestedReplies = nestedReplies.length > 0;
  const NESTED_REPLY_BATCH_SIZE = 5;
  // Auto-expand if this reply's ID is in the expandedReplies list
  const shouldAutoExpandNested = expandedReplies.includes(reply.id);
  const [visibleNestedRepliesCount, setVisibleNestedRepliesCount] = useState(
    shouldAutoExpandNested ? nestedReplies.length : 0
  );
  const hasMoreNestedReplies = visibleNestedRepliesCount < nestedReplies.length;

  const expandMoreText = t('expandMore');

  useEffect(() => {
    if (shouldAutoExpandNested) {
      setVisibleNestedRepliesCount(nestedReplies.length);
    }
  }, [shouldAutoExpandNested, nestedReplies.length]);

  const handleExpandNestedReplies = useCallback(() => {
    if (visibleNestedRepliesCount === 0) {
      setVisibleNestedRepliesCount(Math.min(NESTED_REPLY_BATCH_SIZE, nestedReplies.length));
      return;
    }
    setVisibleNestedRepliesCount((prev) =>
      Math.min(prev + NESTED_REPLY_BATCH_SIZE, nestedReplies.length)
    );
  }, [visibleNestedRepliesCount, nestedReplies.length]);

  return (
    <Animated.View
      ref={(node) => registerItemRef?.(reply.id, node as unknown as View | null)}
      style={[
        isNestedReply ? styles.nestedReplyItem : styles.replyItem,
        highlightBg ? { backgroundColor: highlightBg, borderRadius: borderRadius.sm } : undefined,
      ]}
    >
      <TouchableOpacity activeOpacity={1} onLongPress={() => onReport(reply.id)}>
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
              <Text style={styles.replyTime}> ·{replyMeta}</Text>
            </View>
          </View>
        </View>
        <View style={styles.replyBodyContainer}>
          {reply.replyTo ? (
            <Text style={styles.replyBody}>
              <Text style={styles.replyToAt}>@{reply.replyTo}</Text>{' '}
              {reply.content}
            </Text>
          ) : (
            <Text style={styles.replyBody}>{reply.content}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.replyActions}>
        <ItemActions
          likes={reply.likes}
          liked={reply.liked ?? false}
          onLike={() => onLike(reply.id)}
          onComment={() => onReply(reply.name, reply.id)}
          onForward={onForward}
          onBookmark={() => onBookmark(reply.id)}
          bookmarked={reply.bookmarked ?? false}
          replyCount={totalNestedReplies}
          size={14}
        />
      </View>
      {/* Recursively render nested replies (level 3+) with collapse logic */}
      {hasNestedReplies && (
        <>
          {/* Render nested replies */}
          <View style={styles.nestedRepliesContainer}>
            {nestedReplies.slice(0, visibleNestedRepliesCount).map((nestedReply, i) => (
              <ReplyItem
                key={nestedReply.id || i}
                reply={nestedReply}
                lang={lang}
                t={t}
                onReply={onReply}
                onLike={onLike}
                onBookmark={onBookmark}
                onForward={onForward}
                onReport={onReport}
                highlightId={highlightId}
                level={level + 1}
                expandedReplies={expandedReplies}
                registerItemRef={registerItemRef}
              />
            ))}
          </View>
          {/* Toggle button for nested replies (shown below current list) */}
          {hasMoreNestedReplies && (
            <TouchableOpacity
              style={styles.toggleReplies}
              onPress={handleExpandNestedReplies}
            >
              <ChevronDownIcon size={14} color={colors.primary} />
              <Text style={styles.toggleRepliesText}>
                {visibleNestedRepliesCount === 0
                  ? `${t('expandReplies')} ${totalNestedReplies} ${t('repliesUnit')}`
                  : expandMoreText}
              </Text>
            </TouchableOpacity>
          )}
          {/* Collapse button when expanded */}
          {!hasMoreNestedReplies && visibleNestedRepliesCount > 0 && (
            <TouchableOpacity
              style={styles.toggleReplies}
              onPress={() => setVisibleNestedRepliesCount(0)}
            >
              <ChevronUpIcon size={14} color={colors.primary} />
              <Text style={styles.toggleRepliesText}>
                {t('collapseReplies')}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </Animated.View>
  );
}

/* ── Comment item (一级评论 ── */
function CommentItem({
  comment,
  lang,
  onReply,
  onLike,
  onBookmark,
  onForward,
  onReport,
  highlightId,
  expandedReplies = [],
  registerItemRef,
}: {
  comment: Comment;
  lang: Language;
  onReply: (name: string, commentId?: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: (commentId: string) => void;
  highlightId?: string;
  expandedReplies?: string[];
  registerItemRef?: (id: string, node: View | null) => void;
}) {
  const { t } = useTranslation();
  const isHighlighted = !!highlightId && comment.id === highlightId;
  const highlightedReplyId =
    highlightId && comment.replies?.find((r) => r.id === highlightId)?.id;
  // Show 0 replies by default, then expand in batches.
  const REPLY_BATCH_SIZE = 5;
  const directReplies = comment.replies ?? [];
  const hasReplies = directReplies.length > 0;
  const totalReplies = countDescendantReplies(comment.replies);
  const expandMoreText = t('expandMore');
  // Auto-expand if this comment's ID is in the expandedReplies list
  const shouldAutoExpand = expandedReplies.includes(comment.id);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(
    shouldAutoExpand || !!highlightedReplyId ? directReplies.length : 0
  );
  const hasMoreReplies = visibleRepliesCount < directReplies.length;

  useEffect(() => {
    if (shouldAutoExpand || !!highlightedReplyId) {
      setVisibleRepliesCount(directReplies.length);
    }
  }, [shouldAutoExpand, highlightedReplyId, directReplies.length]);

  const handleExpandReplies = useCallback(() => {
    if (visibleRepliesCount === 0) {
      setVisibleRepliesCount(Math.min(REPLY_BATCH_SIZE, directReplies.length));
      return;
    }
    setVisibleRepliesCount((prev) => Math.min(prev + REPLY_BATCH_SIZE, directReplies.length));
  }, [visibleRepliesCount, directReplies.length]);

  const commentMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: comment.isAnonymous ? undefined : comment.gradeKey,
        majorKey: comment.isAnonymous ? undefined : comment.majorKey,
        createdAt: comment.createdAt || comment.time,
        isAnonymous: comment.isAnonymous,
      }),
    [t, lang, comment.gradeKey, comment.majorKey, comment.createdAt, comment.time, comment.isAnonymous],
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
      ref={(node) => registerItemRef?.(comment.id, node as unknown as View | null)}
      style={[
        styles.commentItem,
        highlightBg ? { backgroundColor: highlightBg, borderRadius: borderRadius.sm } : undefined,
      ]}
    >
      {/* Comment main */}
      <TouchableOpacity activeOpacity={1} onLongPress={() => onReport(comment.id)}>
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
              {!comment.isAnonymous && comment.gender === 'male' && (
                <MaleIcon size={12} color={colors.genderMale} />
              )}
              {!comment.isAnonymous && comment.gender === 'female' && (
                <FemaleIcon size={12} color={colors.genderFemale} />
              )}
              <Text style={styles.commentDot}> ·</Text>
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
          onComment={() => onReply(comment.name, comment.id)}
          onForward={onForward}
          onBookmark={() => onBookmark(comment.id)}
          bookmarked={comment.bookmarked ?? false}
          replyCount={totalReplies}
        />
      </View>

      {/* Replies */}
      {hasReplies && (
        <>
          {/* Show replies based on progressive visible count. */}
          {directReplies.slice(0, visibleRepliesCount).map((reply, i) => (
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
              highlightId={highlightId}
              level={2}
              expandedReplies={expandedReplies}
              registerItemRef={registerItemRef}
            />
          ))}
          {/* Expand in batches until all replies are visible (shown below current list). */}
          {hasMoreReplies && (
            <TouchableOpacity
              style={styles.toggleReplies}
              onPress={handleExpandReplies}
            >
              <ChevronDownIcon size={16} color={colors.primary} />
              <Text style={styles.toggleRepliesText}>
                {visibleRepliesCount === 0
                  ? `${t('expandReplies')} ${totalReplies} ${t('repliesUnit')}`
                  : expandMoreText}
              </Text>
            </TouchableOpacity>
          )}
          {/* Collapse button when expanded */}
          {!hasMoreReplies && visibleRepliesCount > 0 && (
            <TouchableOpacity
              style={styles.toggleReplies}
              onPress={() => setVisibleRepliesCount(0)}
            >
              <ChevronUpIcon size={16} color={colors.primary} />
              <Text style={styles.toggleRepliesText}>
                {t('collapseReplies')}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </Animated.View>
  );
}

/* ── Main screen ── */
export default function PostDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { postId, commentId, shouldReply } = route.params;
  const { data: post, isLoading } = usePostDetail(postId);
  const { data: comments } = useComments(postId);
  // like/bookmark state comes from server data (optimistic updates)
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const createCommentMutation = useCreateComment(postId);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
  const likeCommentMutation = useLikeComment(postId);
  const bookmarkCommentMutation = useBookmarkComment(postId);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const { data: contacts } = useContacts();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ name: string; commentId: string } | null>(null);
  const autoReplyHandledKeyRef = useRef<string | null>(null);
  const preciseScrollHandledKeyRef = useRef<string | null>(null);
  const itemRefs = useRef<Map<string, View | null>>(new Map());

  // Auto-open reply input when commentId is passed (from homepage comment button)
  // Only auto-open when shouldReply is true (from comment button click)
  // Use useEffect to handle case when comments are not yet loaded on initial render
  useEffect(() => {
    if (!commentId || !comments || !shouldReply) return;
    const key = `${postId}:${commentId}:reply`;
    if (autoReplyHandledKeyRef.current === key) return;

    const targetComment = findCommentById(comments, commentId);
    if (targetComment) {
      setReplyTo({ name: targetComment.name, commentId: targetComment.id });
      autoReplyHandledKeyRef.current = key;
    }
  }, [postId, commentId, comments, shouldReply]);

  // Track which comment's replies should be expanded (for navigating to nested comments)
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);

  // Calculate expanded replies when comments are loaded (supports infinite nesting)
  useEffect(() => {
    if (!commentId || !comments) {
      setExpandedReplies([]);
      return;
    }
    const expanded = findParentIdsToExpand(comments, commentId) ?? [];
    setExpandedReplies(expanded);
  }, [commentId, comments]);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportTargetCommentId, setReportTargetCommentId] = useState<string | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [commentActionVisible, setCommentActionVisible] = useState(false);

  /* ── Refs ── */
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const registerItemRef = useCallback((id: string, node: View | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  const targetCommentIndex = useMemo(() => {
    if (!commentId || !comments) return -1;
    // Find the top-level comment index (supports infinite nesting)
    return findTopLevelCommentIndex(comments, commentId);
  }, [commentId, comments]);
  const commentsData = useMemo(() => comments ?? [], [comments]);

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

  // Second-stage precise scroll: after expanded render settles, center exact target node.
  useEffect(() => {
    if (!commentId || !commentsData.length || !flatListRef.current) return;

    const key = `${postId}:${commentId}`;
    if (preciseScrollHandledKeyRef.current === key) return;

    let cancelled = false;
    let attempts = 0;

    const tryPreciseScroll = () => {
      if (cancelled || !flatListRef.current) return;
      attempts += 1;

      const targetNode = itemRefs.current.get(commentId);
      const scrollNode = flatListRef.current.getNativeScrollRef?.() ?? flatListRef.current.getScrollableNode?.();
      const targetHandle = targetNode ? findNodeHandle(targetNode as any) : null;
      const scrollHandle =
        scrollNode == null
            ? null
          : typeof scrollNode === 'number'
            ? scrollNode
            : findNodeHandle(scrollNode as any);

      if (targetHandle != null && scrollHandle != null) {
        UIManager.measureLayout(
          targetHandle,
          scrollHandle,
          () => {
            if (!cancelled && attempts < 10) {
              setTimeout(tryPreciseScroll, 120);
            }
          },
          (_x, y, _width, height) => {
            if (cancelled || !flatListRef.current) return;
            const offset = Math.max(0, y - 220 + height / 2);
            flatListRef.current.scrollToOffset({
              offset,
              animated: true,
            });
            preciseScrollHandledKeyRef.current = key;
          }
        );
        return;
      }

      if (!cancelled && attempts < 10) {
        setTimeout(tryPreciseScroll, 120);
      }
    };

    const timer = setTimeout(tryPreciseScroll, 750);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [postId, commentId, commentsData.length, expandedReplies]);

  // Auto-focus input when commentId is passed (from homepage comment button)
  useEffect(() => {
    if (replyTo?.commentId && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [replyTo]);

  /* ── @ Mention detection ── */
  const mentionQuery = useMemo(() => {
    if (!commentText) return null;
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    const afterAt = commentText.substring(lastAtIndex + 1);
    // Mention ends when any whitespace appears (space/newline/tab).
    if (/\s/.test(afterAt)) return null;
    return afterAt;
  }, [commentText]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || !contacts) return [];
    if (mentionQuery === '') return contacts;
    const q = mentionQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.userName ?? '').toLowerCase().includes(q)
    );
  }, [mentionQuery, contacts]);

  const showMentions = mentionQuery !== null && mentionSuggestions.length > 0;

  const handleMentionSelect = useCallback(
    (contact: { name: string; userName?: string }) => {
      const lastAtIndex = commentText.lastIndexOf('@');
      if (lastAtIndex === -1) return;
      const mentionHandle = (contact.userName ?? contact.name).trim().replace(/\s+/g, '');
      if (!mentionHandle) return;
      const newText = commentText.substring(0, lastAtIndex) + `@${mentionHandle} `;
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
  const votedOptionIndex = post ? getVotedOptionIndex(post, votedPolls) : undefined;
  const hasVoted = votedOptionIndex != null;
  const totalPollVotes = useMemo(
    () => post?.pollOptions?.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0) ?? 0,
    [post?.pollOptions],
  );
  const currentUser = useAuthStore((s) => s.user);

  const handleAvatarPress = useCallback(() => {
    handleAvatarPressNavigation({
      navigation,
      currentUser,
      isAnonymous: post?.isAnonymous,
      userName: post?.userName,
      displayName: post?.name,
    });
  }, [post, currentUser, navigation]);

  const handleComment = useCallback(() => {
    hapticLight();
    setReplyTo(null);
    setCommentText('');
    setIsAnonymous(false);
    inputRef.current?.focus();
  }, []);

  const handleReply = useCallback((name: string, commentId?: string) => {
    setReplyTo(null);
    setCommentText('');
    setIsAnonymous(false);
    setReplyTo({ name, commentId: commentId || '' });
    inputRef.current?.focus();
  }, []);

  const handleSendComment = useCallback(() => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate(
      {
        content: commentText.trim(),
        isAnonymous,
        parentId: replyTo?.commentId || undefined,
      },
      {
        onSuccess: () => {
          showSnackbar({ message: t('commentSent'), type: 'success' });
          setCommentText('');
          setReplyTo(null);
          setIsAnonymous(false);
        },
        onError: () => {
          showSnackbar({ message: t('commentFailed'), type: 'error' });
        },
      }
    );
  }, [commentText, isAnonymous, replyTo, createCommentMutation, showSnackbar, t]);

  const handleForward = useCallback(() => {
    if (post) setForwardPost(post);
  }, [post]);

  const handleQuote = useCallback(() => {
    if (post) {
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    }
  }, [post, navigation]);

  const handleFunctionPress = useCallback(() => {
    if (!post?.isFunction || !post.functionType) return;
    const functionId =
      post.functionId ?? (post.functionIndex != null ? String(post.functionIndex) : undefined);
    if (!functionId) return;
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
  }, [post, navigation]);

  const handleLikeComment = useCallback((cId: string) => {
    hapticLight();
    likeCommentMutation.mutate(cId);
  }, [likeCommentMutation]);

  const handleBookmarkComment = useCallback((cId: string) => {
    hapticLight();
    bookmarkCommentMutation.mutate(cId);
  }, [bookmarkCommentMutation]);

  const handleLikePostPress = useCallback(() => {
    hapticLight();
    likePostMutation.mutate(postId);
  }, [likePostMutation, postId]);

  const handleBookmarkPostPress = useCallback(() => {
    hapticLight();
    bookmarkPostMutation.mutate(postId);
  }, [bookmarkPostMutation, postId]);

  const handleReportPost = useCallback(() => {
    setPopoverVisible(true);
  }, []);

  const handleReportComment = useCallback((commentId: string) => {
    setReportTargetCommentId(commentId);
    setCommentActionVisible(true);
  }, []);

  // Keep FlatList props stable so input-only state updates (e.g. isAnonymous)
  // do not trigger full list/header re-render that can cause image flicker.
  const renderCommentItem = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem
        comment={item}
        lang={lang}
        onReply={handleReply}
        onLike={handleLikeComment}
        onBookmark={handleBookmarkComment}
        onForward={handleForward}
        onReport={handleReportComment}
        highlightId={commentId}
        expandedReplies={expandedReplies}
        registerItemRef={registerItemRef}
      />
    ),
    [lang, handleReply, handleLikeComment, handleBookmarkComment, handleForward, handleReportComment, commentId, expandedReplies, registerItemRef]
  );

  const handleReportSubmit = useCallback(
    async (reasonCategory: string, reason?: string) => {
      try {
        const isComment = !!reportTargetCommentId;
        await reportService.submit({
          targetType: isComment ? 'comment' : 'post',
          targetId: isComment ? reportTargetCommentId! : postId,
          reasonCategory,
          reason,
        });
        setReportVisible(false);
        setReportTargetCommentId(null);
        showSnackbar({ message: t('reportSubmitted'), type: 'success' });
      } catch {
        showSnackbar({ message: t('reportFailed'), type: 'error' });
      }
    },
    [postId, reportTargetCommentId, showSnackbar, t]
  );

  const renderHeader = useCallback(() => {
    if (!post) return null;
    const headerImage = normalizeImageUrl(post.images?.[0] ?? post.image);
    return (
      <View>
        {/* Post Content */}
        <View style={styles.postSection}>
          <View style={styles.postHeader}>
            {post.isAnonymous ? (
              <Avatar
                text="匿"
                uri={post.avatar}
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
                {!post.isAnonymous ? (
                  <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} style={styles.postNameTouch}>
                    <Text style={styles.postName}>{post.name}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.postName}>{post.name}</Text>
                )}
                <Text style={styles.postDot}> ·</Text>
                <Text style={styles.postMeta} numberOfLines={1}>{displayMeta}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.isFunction && post.functionType && (
            <TouchableOpacity
              style={styles.functionCard}
              activeOpacity={0.7}
              onPress={handleFunctionPress}
            >
              <View style={styles.functionCardHeader}>
                <View style={styles.functionCardIconWrap}>
                  {post.functionType === 'partner' && <UsersIcon size={12} color={colors.onSurface} />}
                  {post.functionType === 'errand' && <TruckIcon size={12} color={colors.onSurface} />}
                  {post.functionType === 'secondhand' && <ShoppingBagIcon size={12} color={colors.onSurface} />}
                  {post.functionType === 'rating' && <QuoteIcon size={12} color={colors.onSurface} />}
                </View>
                <Text style={styles.functionCardType}>
                  {post.functionType === 'partner'
                    ? t('findPartner')
                    : post.functionType === 'errand'
                      ? t('errands')
                      : post.functionType === 'secondhand'
                        ? t('secondhand')
                        : t('forum')}
                </Text>
                <ChevronRightIcon size={12} color={colors.onSurfaceVariant} />
              </View>
              {!!post.functionTitle && (
                <Text style={styles.functionCardTitle} numberOfLines={2}>
                  {post.functionTitle}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {post.quotedPost && post.quotedPost.id && (
            <TouchableOpacity
              style={styles.quotedPostCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PostDetail', { postId: post.quotedPost!.id })}
            >
              <View style={styles.quotedHeader}>
                <QuoteIcon size={12} color="#999999" />
                <Text style={styles.quotedLabel}>引用帖子</Text>
              </View>
              <Text style={styles.quotedContent} numberOfLines={3}>
                {post.quotedPost.content}
              </Text>
              <Text style={styles.quotedMeta}>
                {post.quotedPost?.name} ·{getRelativeTime(post.quotedPost?.createdAt ?? '', lang)}
              </Text>
            </TouchableOpacity>
          )}

          {post.tags && post.tags.length > 0 && (
            <View style={styles.postTags}>
              {post.tags.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => navigation.navigate('CircleDetail', { tag })}>
                  <Tag label={t(tag)} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {headerImage && (
            <Image source={{ uri: headerImage }} style={styles.postImage} />
          )}

          {post.isPoll && post.pollOptions && (
            <View style={styles.pollContainer}>
              {post.pollOptions.map((opt, i) =>
                hasVoted ? (
                  <TouchableOpacity
                    key={opt.id ?? `${i}-${opt.text}`}
                    style={styles.pollOption}
                    activeOpacity={1}
                    disabled
                  >
                    <AnimatedPollBar percent={opt.percent} isVoted={i === votedOptionIndex} />
                    <Text style={[styles.pollText, votedOptionIndex === i && styles.pollTextVoted]} numberOfLines={1} ellipsizeMode="tail">
                      {opt.text}
                    </Text>
                    <Text style={[styles.pollPercent, votedOptionIndex === i && styles.pollPercentVoted]}>
                      {lang === 'en' ? `${opt.voteCount ?? 0} votes` : `${opt.voteCount ?? 0}票`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={opt.id ?? `${i}-${opt.text}`}
                    style={styles.pollOptionUnvoted}
                    activeOpacity={0.65}
                    onPress={() => {
                      if (!opt.id) return;
                      votePostMutation.mutate({
                        postId: post.id,
                        optionId: opt.id,
                        optionIndex: i,
                      });
                    }}
                  >
                    <Text style={styles.pollTextUnvoted} numberOfLines={1} ellipsizeMode="tail">
                      {opt.text}
                    </Text>
                  </TouchableOpacity>
                )
              )}
              <Text style={styles.pollTotal}>
                {lang === 'en' ? `Total ${totalPollVotes} votes` : `共${totalPollVotes}人投票`}
              </Text>
            </View>
          )}

          {/* 5 action buttons, evenly distributed */}
          <View style={styles.postActions}>
            <PressScaleButton
              style={styles.postActionBtn}
              onPress={handleLikePostPress}
            >
              <HeartIcon
                size={20}
                color={isLiked ? colors.error : colors.onSurface}
                fill={isLiked ? colors.error : undefined}
              />
              <Text style={[styles.postActionText, isLiked && { color: colors.error }]}>
                {post.likes}
              </Text>
            </PressScaleButton>

            <PressScaleButton
              style={styles.postActionBtn}
              onPress={handleComment}
            >
              <CommentIcon size={20} color={colors.onSurface} />
              <Text style={styles.postActionText}>{post.comments}</Text>
            </PressScaleButton>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleForward}
            >
              <ShareIcon size={20} color={colors.onSurface} />
            </TouchableOpacity>

            <PressScaleButton
              style={styles.postActionBtn}
              onPress={handleBookmarkPostPress}
            >
              <BookmarkIcon
                size={20}
                color={isBookmarked ? colors.primary : colors.onSurface}
                fill={isBookmarked ? colors.primary : undefined}
              />
            </PressScaleButton>

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
  }, [post, isLiked, isBookmarked, votedOptionIndex, votePostMutation, handleLikePostPress, handleBookmarkPostPress, handleComment, handleForward, handleQuote, handleAvatarPress, t, displayMeta, navigation]);

  const headerComponent = useMemo(() => renderHeader(), [renderHeader]);

  const keyExtractor = useCallback((item: Comment, index: number) => item.id || String(index), []);

  const handleScrollToIndexFailed = useCallback((info: { index: number }) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.3,
      });
    }, 500);
  }, []);

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
                setReportTargetCommentId(null);
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
          data={commentsData}
          ListHeaderComponent={headerComponent}
          renderItem={renderCommentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={handleScrollToIndexFailed}
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
                  key={contact.id}
                  style={styles.mentionItem}
                  activeOpacity={0.7}
                  onPress={() => handleMentionSelect(contact)}
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
              thumbIcon={
                <Text
                  style={{
                    fontSize: i18n.language === 'en' ? 9 : 11,
                    fontWeight: '700',
                    color: colors.onSurface,
                  }}
                >
                  {t('anonLabel')}
                </Text>
              }
            />
          </View>
          <TextInput
            ref={inputRef}
            style={[styles.commentInput, isAnonymous && styles.commentInputAnon]}
            placeholder={
              replyTo
                ? `${t('replyTo')} ${replyTo.name}`
                : t('writeComment')
            }
            placeholderTextColor={colors.onSurfaceVariant}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            textAlignVertical="top"
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

  /* === Post Section === */
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
  quotedPostCard: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  functionCard: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  functionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  functionCardIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  functionCardType: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
  },
  functionCardTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 20,
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quotedLabel: {
    fontSize: 12,
    color: '#999999',
    marginLeft: spacing.xs,
  },
  quotedContent: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  quotedMeta: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
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
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '12',
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
    backgroundColor: colors.primary + '30',
    borderRadius: borderRadius.sm,
  },
  pollBarVoted: {
    backgroundColor: colors.primary + '50',
  },
  pollText: {
    ...typography.bodyMedium,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
    fontSize: 13,
    color: colors.onSurface,
    zIndex: 1,
  },
  pollPercent: {
    ...typography.bodyMedium,
    minWidth: 56,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    zIndex: 1,
  },
  pollTextVoted: {
    fontWeight: '600',
  },
  pollPercentVoted: {
    color: colors.onPrimaryContainer,
  },
  pollOptionUnvoted: {
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pollTextUnvoted: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: colors.onSurface,
  },
  pollTotal: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
    textAlign: 'right',
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
  replyCountBadge: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 2,
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
  // Level 3+ reply - no indent, no border, directly below parent
  nestedReplyItem: {
    marginTop: spacing.sm,
  },
  nestedRepliesContainer: {
    marginTop: spacing.xs,
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
  replyBodyContainer: {
    marginLeft: 28,
    marginTop: 2,
    marginBottom: spacing.xxs,
  },
  replyBody: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  replyToAt: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
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
    minHeight: 40,
    maxHeight: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
