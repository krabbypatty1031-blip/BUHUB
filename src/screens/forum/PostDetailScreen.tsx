import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
  UIManager,
  findNodeHandle,
  Keyboard,
  Alert,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePostDetail, useComments, useCreateComment, useLikePost, useBookmarkPost, useLikeComment, useBookmarkComment, useVotePost, useDeletePost, useDeleteComment } from '../../hooks/usePosts';
import { useContacts } from '../../hooks/useMessages';
import { useFollowersList, useFollowingList } from '../../hooks/useUser';
import { useAuthStore } from '../../store/authStore';
import { useForumStore } from '../../store/forumStore';
import { reportService } from '../../api/services/report.service';
import { canPublishCommunityContent, isHkbuCommunityPermissionError } from '../../utils/publishPermission';
import { promptHkbuVerification } from '../../utils/hkbuPrompt';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import PostImageGallery from '../../components/common/PostImageGallery';
import Tag from '../../components/common/Tag';
import ForwardSheet from '../../components/common/ForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import IOSSwitch from '../../components/common/IOSSwitch';
import PressScaleButton from '../../components/common/PressScaleButton';
import AnimatedActionButton from '../../components/common/AnimatedActionButton';
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import QuoteCard from '../../components/common/QuoteCard';
import FunctionRefCard from '../../components/common/FunctionRefCard';
import {
  BackIcon,
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  TrashIcon,
  MaleIcon,
  FemaleIcon,
  CheckIcon,
  IncognitoIcon,
} from '../../components/common/icons';
import {
  LikeActionIcon,
  CommentActionIcon,
  ShareActionIcon,
  BookmarkActionIcon,
  QuoteActionIcon,
} from '../../components/common/PostActionIcons';
import type { ForumPost, Comment, Reply, Language } from '../../types';
import { buildPostMeta, buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import { getVotedOptionIndex } from '../../utils/forum';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { hapticLight } from '../../utils/haptics';
import { normalizeImageUrl } from '../../utils/imageUrl';
import { isCurrentUserContentOwner } from '../../utils/contentOwnership';

type Props = NativeStackScreenProps<ForumStackParamList, 'PostDetail'>;
type MutationErrorLike = {
  errorCode?: string;
  code?: string;
};
type NativeNodeHandleTarget = React.Component<unknown> | number | null | undefined;
type MentionCandidate = {
  key: string;
  name: string;
  mentionValue: string;
  userName?: string;
  avatar?: string | null;
  gender?: ForumPost['gender'] | Comment['gender'];
};

const AUTO_GENERATED_USERNAME_REGEX = /^u[a-z0-9]{12}$/i;
const SAFE_MENTION_VALUE_REGEX = /^[\p{L}\p{N}_.-]{2,30}$/u;
const MULTILINGUAL_TEXT_FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif',
});

function resolveNodeHandle(target: NativeNodeHandleTarget): number | null {
  if (typeof target === 'number') return target;
  if (!target) return null;
  return findNodeHandle(target);
}

function buildMentionValue(name: string, userName?: string | null): string {
  const trimmedName = name.trim();
  const trimmedUserName = userName?.trim();

  if (
    trimmedName.length >= 2 &&
    SAFE_MENTION_VALUE_REGEX.test(trimmedName) &&
    (!trimmedUserName || AUTO_GENERATED_USERNAME_REGEX.test(trimmedUserName))
  ) {
    return trimmedName;
  }

  return trimmedUserName || trimmedName;
}

/* Helper functions for infinite nested comments */

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
  const targetPercent = Math.max(0, Math.min(percent, 100));

  useEffect(() => {
    Animated.timing(width, {
      toValue: targetPercent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [targetPercent, width]);

  const barStyle = {
    width: width.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp',
    }),
  };

  return <Animated.View style={[styles.pollBar, isVoted && styles.pollBarVoted, barStyle]} />;
}

/* Inline action bar for comments and replies */
function ItemActions({
  likes,
  liked,
  onLike,
  onComment,
  onForward,
  onBookmark,
  onDelete,
  bookmarked,
  size = 18,
  replyCount,
}: {
  likes: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onForward: () => void;
  onBookmark: () => void;
  onDelete?: () => void;
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

  const handleDeletePress = useCallback(() => {
    hapticLight();
    onDelete?.();
  }, [onDelete]);

  return (
    <View style={styles.itemActions}>
      <AnimatedActionButton style={styles.itemActionBtn} onPress={handleLikePress} isActive={liked}>
        <LikeActionIcon
          size={size}
          color={liked ? colors.error : '#86909C'}
          fill={liked ? colors.error : undefined}
        />
        <Text style={[styles.itemActionText, liked && { color: colors.error }]}>
          {likes}
        </Text>
      </AnimatedActionButton>
      <PressScaleButton style={styles.itemActionBtn} onPress={handleCommentPress}>
        <CommentActionIcon size={size} color="#86909C" />
        {replyCount !== undefined && replyCount > 0 && (
          <Text style={styles.replyCountBadge}>{replyCount}</Text>
        )}
      </PressScaleButton>
      <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
        <ShareActionIcon size={size} color="#86909C" />
      </TouchableOpacity>
      <AnimatedActionButton style={styles.itemActionBtn} onPress={handleBookmarkPress} isActive={bookmarked}>
        <BookmarkActionIcon
          size={size}
          color={bookmarked ? colors.primary : '#86909C'}
          fill={bookmarked ? colors.primary : undefined}
        />
      </AnimatedActionButton>
      {onDelete ? (
        <TouchableOpacity style={styles.itemActionBtn} onPress={handleDeletePress}>
          <TrashIcon size={size} color="#86909C" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* 鈹€鈹€ Reply item (浜岀骇璇勮 + 涓夌骇璇勮) 鈹€鈹€ */
function ReplyItem({
  reply,
  lang,
  t,
  onReply,
  onLike,
  onBookmark,
  onForward,
  onReport,
  onDelete,
  isOwnContent,
  highlightId,
  level = 2,
  expandedReplies = [],
  registerItemRef,
  onAvatarPress,
}: {
  reply: Reply;
  lang: Language;
  t: (key: string) => string;
  onReply: (name: string, commentId?: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  isOwnContent: (item: Comment | Reply) => boolean;
  highlightId?: string;
  level?: number;
  expandedReplies?: string[];
  registerItemRef?: (id: string, node: View | null) => void;
  onAvatarPress?: (reply: Reply) => void;
}) {
  const canDelete = isOwnContent(reply);

  const replyTime = useMemo(
    () => getRelativeTime(reply.createdAt || reply.time, lang),
    [reply.createdAt, reply.time, lang],
  );

  const replyAcademicMeta = useMemo(
    () =>
      buildGradeMajorMeta(t, {
        gradeKey: reply.gradeKey,
        majorKey: reply.majorKey,
        isAnonymous: false,
        language: lang,
        abbreviateForumGrade: true,
      }),
    [t, lang, reply.gradeKey, reply.majorKey],
  );

  const flashAnim = useRef(new Animated.Value(0)).current;
  const isHighlighted = !!highlightId && reply.id === highlightId;

  useEffect(() => {
    if (isHighlighted) {
      const timer = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          { iterations: 2 }
        ).start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, flashAnim]);

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
    <PageTranslationProvider>
      <View
      ref={(node) => registerItemRef?.(reply.id, node)}
      style={isNestedReply ? styles.nestedReplyItem : styles.replyItem}
    >
      {isHighlighted ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.scrimLight,
            opacity: flashAnim,
            borderRadius: borderRadius.sm,
          }}
        />
      ) : null}
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={canDelete ? undefined : () => onReport(reply.id)}
        style={styles.commentMainWrap}
      >
        <View style={styles.commentHeader}>
          {onAvatarPress && !reply.isAnonymous ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onAvatarPress(reply)}
            >
              <Avatar
                text={reply.name}
                uri={reply.avatar}
                defaultAvatar={reply.defaultAvatar}
                size="sm"
                gender={reply.gender}
              />
            </TouchableOpacity>
          ) : (
            <Avatar
              text={reply.name}
              uri={reply.avatar}
              defaultAvatar={reply.defaultAvatar}
              size="sm"
              gender={reply.gender}
            />
          )}
          <View style={styles.commentUserInfo}>
            <View style={styles.replyNameRow}>
              <View style={styles.replyNameLeft}>
                <Text style={styles.replyName}>{reply.name}</Text>
                {reply.gender === 'male' && <MaleIcon size={14} color={colors.genderMale} />}
                {reply.gender === 'female' && <FemaleIcon size={14} color={colors.genderFemale} />}
              </View>
            </View>
            <Text style={styles.replyAcademicMeta} numberOfLines={1}>
              {replyAcademicMeta ? `${replyAcademicMeta} · ${replyTime}` : replyTime}
            </Text>
          </View>
        </View>
        <View style={styles.replyBodyContainer}>
          {reply.replyTo ? (
            <TranslatableText
              entityType="comment"
              entityId={reply.id}
              fieldName="content"
              sourceText={reply.content}
              sourceLanguage={reply.sourceLanguage}
              textStyle={styles.replyBody}
              containerStyle={styles.replyTranslateBlock}
              prefixText={`@${reply.replyTo}`}
              prefixTextStyle={styles.replyToAt}
            />
          ) : (
            <TranslatableText
              entityType="comment"
              entityId={reply.id}
              fieldName="content"
              sourceText={reply.content}
              sourceLanguage={reply.sourceLanguage}
              textStyle={styles.replyBody}
              containerStyle={styles.replyTranslateBlock}
            />
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
          onDelete={canDelete && onDelete ? () => onDelete(reply.id) : undefined}
          bookmarked={reply.bookmarked ?? false}
          replyCount={totalNestedReplies}
          size={14}
        />
        <PageTranslationToggle style={styles.replyTranslationToggle} />
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
                onDelete={onDelete}
                isOwnContent={isOwnContent}
                highlightId={highlightId}
                level={level + 1}
                expandedReplies={expandedReplies}
                registerItemRef={registerItemRef}
                onAvatarPress={onAvatarPress}
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
      </View>
    </PageTranslationProvider>
  );
}

/* Comment item (top-level comment) */
function CommentItem({
  comment,
  lang,
  onReply,
  onLike,
  onBookmark,
  onForward,
  onReport,
  onDelete,
  isOwnContent,
  highlightId,
  expandedReplies = [],
  registerItemRef,
  onAvatarPress,
}: {
  comment: Comment;
  lang: Language;
  onReply: (name: string, commentId?: string) => void;
  onLike: (commentId: string) => void;
  onBookmark: (commentId: string) => void;
  onForward: () => void;
  onReport: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  isOwnContent: (item: Comment | Reply) => boolean;
  highlightId?: string;
  expandedReplies?: string[];
  registerItemRef?: (id: string, node: View | null) => void;
  onAvatarPress?: (comment: Comment | Reply) => void;
}) {
  const canDelete = isOwnContent(comment);
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

  const commentTime = useMemo(
    () => getRelativeTime(comment.createdAt || comment.time, lang),
    [comment.createdAt, comment.time, lang],
  );

  const commentAcademicMeta = useMemo(
    () =>
      comment.isAnonymous
        ? ''
        : buildGradeMajorMeta(t, {
            gradeKey: comment.gradeKey,
            majorKey: comment.majorKey,
            isAnonymous: false,
            language: lang,
            abbreviateForumGrade: true,
          }),
    [t, lang, comment.gradeKey, comment.majorKey, comment.isAnonymous],
  );

  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      const timer = setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          { iterations: 2 }
        ).start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, flashAnim]);

  return (
    <PageTranslationProvider>
      <View
      ref={(node) => registerItemRef?.(comment.id, node)}
      style={styles.commentItem}
    >
      {isHighlighted ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.scrimLight,
            opacity: flashAnim,
            borderRadius: borderRadius.sm,
          }}
        />
      ) : null}
      {/* Comment main */}
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={canDelete ? undefined : () => onReport(comment.id)}
        style={styles.commentMainWrap}
      >
        <View style={styles.commentHeader}>
          {onAvatarPress && !comment.isAnonymous ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onAvatarPress(comment)}
            >
              <Avatar
                text={comment.name}
                uri={comment.avatar}
                defaultAvatar={comment.defaultAvatar}
                size="sm"
                gender={comment.gender}
              />
            </TouchableOpacity>
          ) : (
            <Avatar
              text={comment.name}
              uri={comment.avatar}
              defaultAvatar={comment.defaultAvatar}
              size="sm"
              gender={comment.gender}
            />
          )}
          <View style={styles.commentUserInfo}>
            <View style={styles.commentNameRow}>
              <View style={styles.commentNameLeft}>
                <Text style={styles.commentName}>{comment.name}</Text>
                {!comment.isAnonymous && comment.gender === 'male' && (
                  <MaleIcon size={14} color={colors.genderMale} />
                )}
                {!comment.isAnonymous && comment.gender === 'female' && (
                  <FemaleIcon size={14} color={colors.genderFemale} />
                )}
              </View>
            </View>
            <Text style={styles.commentMeta} numberOfLines={1}>
              {commentAcademicMeta ? `${commentAcademicMeta} · ${commentTime}` : commentTime}
            </Text>
          </View>
        </View>
        <TranslatableText
          entityType="comment"
          entityId={comment.id}
          fieldName="content"
          sourceText={comment.content}
          sourceLanguage={comment.sourceLanguage}
          textStyle={styles.commentBody}
          containerStyle={styles.commentTranslateBlock}
        />
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
          onDelete={canDelete && onDelete ? () => onDelete(comment.id) : undefined}
          bookmarked={comment.bookmarked ?? false}
          replyCount={totalReplies}
        />
        <PageTranslationToggle style={styles.commentTranslationToggle} />
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
              onDelete={onDelete}
              isOwnContent={isOwnContent}
              highlightId={highlightId}
              level={2}
              expandedReplies={expandedReplies}
              registerItemRef={registerItemRef}
              onAvatarPress={onAvatarPress}
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
      </View>
    </PageTranslationProvider>
  );
}

/* 鈹€鈹€ Main screen 鈹€鈹€ */
export default function PostDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = i18n.language as Language;
  const { postId, commentId, shouldReply } = route.params;
  const currentUser = useAuthStore((s) => s.user);
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
  const deletePostMutation = useDeletePost();
  const deleteCommentMutation = useDeleteComment(postId);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const { data: contacts } = useContacts();
  const { data: followingList } = useFollowingList();
  const { data: followersList } = useFollowersList();
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  /* 鈹€鈹€ Refs 鈹€鈹€ */
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlashListRef<Comment>>(null);
  const postImages = useMemo(
    () => {
      if (post?.images && post.images.length > 0) return post.images;
      const fallback = normalizeImageUrl(post?.image);
      return fallback ? [fallback] : [];
    },
    [post?.images, post?.image]
  );
  const registerItemRef = useCallback((id: string, node: View | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  /** Stable inset avoids layout jumps when toggling keyboard; KeyboardStickyView already tracks the keyboard. */
  const composerBottomInset = Math.max(insets.bottom, spacing.sm);

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
      const targetHandle = resolveNodeHandle(targetNode);
      const scrollHandle = resolveNodeHandle(scrollNode);

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

  /* 鈹€鈹€ @ Mention detection 鈹€鈹€ */
  const mentionQuery = useMemo(() => {
    if (!commentText) return null;
    const lastAtIndex = commentText.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    const afterAt = commentText.substring(lastAtIndex + 1);
    // Mention ends when any whitespace appears (space/newline/tab).
    if (/\s/.test(afterAt)) return null;
    return afterAt;
  }, [commentText]);

  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const candidates = new Map<string, MentionCandidate>();
    const currentUserName = currentUser?.userName?.trim().toLowerCase();
    const currentNickname = currentUser?.nickname?.trim();

    const pushCandidate = (input: {
      key?: string;
      name?: string | null;
      userName?: string | null;
      avatar?: string | null;
      gender?: ForumPost['gender'] | Comment['gender'];
      isAnonymous?: boolean;
    }) => {
      if (input.isAnonymous) return;
      const name = input.name?.trim();
      const userName = input.userName?.trim() || undefined;
      if (!name) return;
      if (userName && currentUserName && userName.toLowerCase() === currentUserName) return;
      if (!userName && currentNickname && name === currentNickname) return;

      const mentionValue = buildMentionValue(name, userName);
      if (!mentionValue) return;

      const dedupeKey = (userName || name).trim().toLowerCase();
      if (!dedupeKey || candidates.has(dedupeKey)) return;

      candidates.set(dedupeKey, {
        key: input.key ?? dedupeKey,
        name,
        mentionValue,
        ...(userName ? { userName } : {}),
        ...(input.avatar ? { avatar: input.avatar } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
      });
    };

    contacts?.forEach((contact) => {
      pushCandidate({
        key: `contact:${contact.id}`,
        name: contact.name,
        userName: contact.userName,
        avatar: contact.avatar,
        gender: contact.gender,
      });
    });

    followingList?.forEach((item) => {
      pushCandidate({
        key: `following:${item.userName}`,
        name: item.nickname ?? item.userName,
        userName: item.userName,
        avatar: item.avatar,
        gender: item.gender,
      });
    });

    followersList?.forEach((item) => {
      pushCandidate({
        key: `follower:${item.userName}`,
        name: item.nickname ?? item.userName,
        userName: item.userName,
        avatar: item.avatar,
        gender: item.gender,
      });
    });

    if (post && !post.isAnonymous) {
      pushCandidate({
        key: `post:${post.id}`,
        name: post.name,
        userName: post.userName,
        avatar: post.avatar,
        gender: post.gender,
      });
    }

    const walkCommentTree = (items: Array<Comment | Reply> | undefined) => {
      items?.forEach((item) => {
        pushCandidate({
          key: `comment:${item.id}`,
          name: item.name,
          userName: item.userName,
          avatar: item.avatar,
          gender: item.gender,
          isAnonymous: item.isAnonymous,
        });
        if (item.replies?.length) {
          walkCommentTree(item.replies);
        }
      });
    };

    walkCommentTree(comments);

    return Array.from(candidates.values()).sort((left, right) => {
      const leftHasChat = contacts?.some((contact) => contact.userName === left.userName || contact.name === left.name) ? 1 : 0;
      const rightHasChat = contacts?.some((contact) => contact.userName === right.userName || contact.name === right.name) ? 1 : 0;
      if (leftHasChat !== rightHasChat) {
        return rightHasChat - leftHasChat;
      }
      return left.name.localeCompare(right.name);
    });
  }, [comments, contacts, currentUser?.nickname, currentUser?.userName, followersList, followingList, post]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    if (mentionQuery === '') return mentionCandidates.slice(0, 12);
    const q = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(q) ||
          (candidate.userName ?? '').toLowerCase().includes(q) ||
          candidate.mentionValue.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [mentionCandidates, mentionQuery]);

  const showMentions = mentionQuery !== null && mentionSuggestions.length > 0;

  const handleMentionSelect = useCallback(
    (candidate: MentionCandidate) => {
      const lastAtIndex = commentText.lastIndexOf('@');
      if (lastAtIndex === -1) return;
      if (!candidate.mentionValue) return;
      const newText = commentText.substring(0, lastAtIndex) + `@${candidate.mentionValue} `;
      setCommentText(newText);
    },
    [commentText]
  );

  const displayTime = useMemo(
    () => (post ? getRelativeTime(post.createdAt, lang) : ''),
    [post?.createdAt, lang],
  );

  const displayAcademicMeta = useMemo(
    () =>
      post
        ? buildGradeMajorMeta(t, {
            gradeKey: post.gradeKey,
            majorKey: post.majorKey,
            isAnonymous: post.isAnonymous,
            language: lang,
            abbreviateForumGrade: true,
          })
        : '',
    [post?.gradeKey, post?.majorKey, post?.isAnonymous, t, lang],
  );

  const isLiked = post?.liked ?? false;
  const isBookmarked = post?.bookmarked ?? false;
  const votedOptionIndex = post ? getVotedOptionIndex(post, votedPolls) : undefined;
  const hasVoted = votedOptionIndex != null;
  const totalPollVotes = useMemo(
    () => post?.pollOptions?.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0) ?? 0,
    [post?.pollOptions],
  );
  const isOwnPost = useMemo(
    () =>
      isCurrentUserContentOwner(currentUser, {
        isOwnedByCurrentUser: post?.isOwnedByCurrentUser,
        userName: post?.userName,
        displayName: post?.name,
        isAnonymous: post?.isAnonymous,
      }),
    [currentUser, post?.isOwnedByCurrentUser, post?.userName, post?.name, post?.isAnonymous]
  );

  const isOwnCommentContent = useCallback(
    (item: Comment | Reply | null | undefined) =>
      Boolean(
        item &&
          isCurrentUserContentOwner(currentUser, {
            isOwnedByCurrentUser: item.isOwnedByCurrentUser,
            userName: item.userName,
            displayName: item.name,
            isAnonymous: item.isAnonymous,
          })
      ),
    [currentUser]
  );

  const handleAvatarPress = useCallback(() => {
    handleAvatarPressNavigation({
      navigation,
      currentUser,
      isAnonymous: post?.isAnonymous,
      userName: post?.userName,
      displayName: post?.name,
      cachedAvatar: post?.avatar,
      cachedNickname: post?.name,
      cachedGender: post?.gender,
    });
  }, [post, currentUser, navigation]);

  const handleCommentAvatarPress = useCallback(
    (item: Comment | Reply) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        isAnonymous: item.isAnonymous,
        userName: item.userName,
        displayName: item.name,
        cachedAvatar: item.avatar,
        cachedNickname: item.name,
        cachedGender: item.gender,
      });
    },
    [currentUser, navigation]
  );

  const goToManageEmails = useCallback(() => {
    // initial:false keeps MeHome beneath ManageEmails so the user can pop back
    // and the tab-press reset can detect the stack as "nested".
    navigation.getParent()?.navigate('MeTab', { screen: 'ManageEmails', initial: false } as never);
  }, [navigation]);

  const handleComment = useCallback(() => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    hapticLight();
    setReplyTo(null);
    setCommentText('');
    setIsAnonymous(false);
    inputRef.current?.focus();
  }, [currentUser, goToManageEmails, t]);

  const handleReply = useCallback((name: string, commentId?: string) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    setReplyTo(null);
    setCommentText('');
    setIsAnonymous(false);
    setReplyTo({ name, commentId: commentId || '' });
    inputRef.current?.focus();
  }, [currentUser, goToManageEmails, t]);

  const handleSendComment = useCallback(() => {
    if (!commentText.trim() || createCommentMutation.isPending) return;
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
          inputRef.current?.blur();
          Keyboard.dismiss();
        },
        onError: (err: unknown) => {
          const error = typeof err === 'object' && err
            ? err as MutationErrorLike
            : undefined;
          const code = error?.errorCode || error?.code;
          if (isHkbuCommunityPermissionError(code)) {
            promptHkbuVerification(t, goToManageEmails);
            return;
          }
          const msg = code === 'CONTENT_VIOLATION' ? t('contentViolation') : t('commentFailed');
          showSnackbar({ message: msg, type: 'error' });
        },
      }
    );
  }, [commentText, goToManageEmails, isAnonymous, replyTo, createCommentMutation, showSnackbar, t]);

  const handleForward = useCallback(() => {
    if (!post) return;
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    setForwardPost(post);
  }, [currentUser, goToManageEmails, post, t]);

  const handleQuote = useCallback(() => {
    if (!post) return;
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
  }, [currentUser, goToManageEmails, navigation, post, t]);

  const handleFunctionPress = useCallback(() => {
    if (!post?.isFunction || !post.functionType) return;
    const functionId =
      post.functionId ?? (post.functionIndex != null ? String(post.functionIndex) : undefined);
    if (!functionId) return;
    const nav = navigation.getParent();
    if (!nav) return;

    // Build a back target so function detail can return to this post
    const backTo =
      buildChatBackTarget(navigation, 'ForumTab') ??
      ({
        tab: 'ForumTab' as const,
        screen: 'PostDetail',
        params: { postId: post.id },
      } as const);

    switch (post.functionType) {
      case 'partner':
        nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { id: functionId, backTo } });
        break;
      case 'errand':
        nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { id: functionId, backTo } });
        break;
      case 'secondhand':
        nav.navigate('FunctionsTab', {
          screen: 'SecondhandDetail',
          params: { id: functionId, backTo },
        });
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
  }, [post, navigation]);

  const handleLikeComment = useCallback((cId: string) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    hapticLight();
    likeCommentMutation.mutate(cId);
  }, [currentUser, goToManageEmails, likeCommentMutation, t]);

  const handleBookmarkComment = useCallback((cId: string) => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    hapticLight();
    bookmarkCommentMutation.mutate(cId);
  }, [bookmarkCommentMutation, currentUser, goToManageEmails, t]);

  const handleLikePostPress = useCallback(() => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    hapticLight();
    likePostMutation.mutate(postId);
  }, [currentUser, goToManageEmails, likePostMutation, postId, t]);

  const handleBookmarkPostPress = useCallback(() => {
    if (!canPublishCommunityContent(currentUser)) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    hapticLight();
    bookmarkPostMutation.mutate(postId);
  }, [bookmarkPostMutation, currentUser, goToManageEmails, postId, t]);

  const handleReportPost = useCallback(() => {
    setPopoverVisible(true);
  }, []);

  const handleDeletePost = useCallback(() => {
    Alert.alert(t('deletePostTitle'), t('deletePostMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          deletePostMutation.mutate(postId, {
            onSuccess: () => {
              showSnackbar({ message: t('postDeleted'), type: 'success' });
              navigation.goBack();
            },
            onError: () => {
              showSnackbar({ message: t('deleteFailed'), type: 'error' });
            },
          });
        },
      },
    ]);
  }, [deletePostMutation, navigation, postId, showSnackbar, t]);

  const handleCommentLongPress = useCallback((commentId: string) => {
    setReportTargetCommentId(commentId);
    setCommentActionVisible(true);
  }, []);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      Alert.alert(t('deleteCommentTitle'), t('deleteCommentMessage'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          style: 'destructive',
          onPress: () => {
            deleteCommentMutation.mutate(commentId, {
              onSuccess: () => {
                showSnackbar({ message: t('commentDeleted'), type: 'success' });
              },
              onError: () => {
                showSnackbar({ message: t('deleteCommentFailed'), type: 'error' });
              },
            });
          },
        },
      ]);
    },
    [deleteCommentMutation, showSnackbar, t]
  );

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
        onReport={handleCommentLongPress}
        onDelete={handleDeleteComment}
        isOwnContent={isOwnCommentContent}
        highlightId={commentId}
        expandedReplies={expandedReplies}
        registerItemRef={registerItemRef}
        onAvatarPress={handleCommentAvatarPress}
      />
    ),
    [lang, handleReply, handleLikeComment, handleBookmarkComment, handleForward, handleCommentLongPress, commentId, expandedReplies, registerItemRef, handleCommentAvatarPress]
  );

  const handleReportSubmit = useCallback(
    async (reasonCategory: string, reason?: string) => {
      try {
        const isComment = !!reportTargetCommentId;
        const targetComment = isComment ? findCommentById(commentsData, reportTargetCommentId!) : null;
        if ((isComment && isOwnCommentContent(targetComment)) || (!isComment && isOwnPost)) {
          setReportVisible(false);
          setReportTargetCommentId(null);
          showSnackbar({ message: t('cannotReportOwnContent'), type: 'info' });
          return;
        }
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
    [commentsData, isOwnCommentContent, isOwnPost, postId, reportTargetCommentId, showSnackbar, t]
  );

  const selectedCommentForAction = useMemo(
    () => (reportTargetCommentId ? findCommentById(commentsData, reportTargetCommentId) : null),
    [commentsData, reportTargetCommentId]
  );
  const selectedCommentIsOwn = useMemo(
    () => isOwnCommentContent(selectedCommentForAction),
    [isOwnCommentContent, selectedCommentForAction]
  );

  const renderHeader = useCallback(() => {
    if (!post) return null;
    return (
      <View>
        {/* Post Content */}
        <PageTranslationProvider>
        <View style={styles.postSection}>
          <View style={styles.postHeader}>
            {post.isAnonymous ? (
              <Avatar
                text="匿名"
                uri={post.avatar}
                size="sm"
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
                  size="sm"
                  gender={post.gender}
                />
              </TouchableOpacity>
            )}
            <View style={styles.postUserInfo}>
              <View style={styles.postNameRow}>
                <View style={styles.postNameLeft}>
                  {!post.isAnonymous ? (
                    <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} style={styles.postNameTouch}>
                      <Text style={styles.postName}>{post.name}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.postName}>{post.name}</Text>
                  )}
                  {!post.isAnonymous && post.gender === 'male' && (
                    <MaleIcon size={14} color={colors.genderMale} />
                  )}
                  {!post.isAnonymous && post.gender === 'female' && (
                    <FemaleIcon size={14} color={colors.genderFemale} />
                  )}
                </View>
              </View>
              <Text style={styles.postMeta} numberOfLines={1}>
                {displayAcademicMeta ? `${displayAcademicMeta} · ${displayTime}` : displayTime}
              </Text>
            </View>
          </View>
          <TranslatableText
            entityType="post"
            entityId={post.id}
            fieldName="content"
            sourceText={post.content}
            sourceLanguage={post.sourceLanguage ?? post.lang}
            textStyle={styles.postContent}
            containerStyle={styles.postTranslateBlock}
          />

          {post.isFunction && post.functionType && (
            <FunctionRefCard
              functionType={post.functionType}
              title={post.functionTitle}
              preview={post.functionRefPreview}
              onPress={handleFunctionPress}
            />
          )}

          {post.quotedPost && post.quotedPost.id && (
            <QuoteCard
              postId={post.quotedPost.id}
              content={post.quotedPost.content}
              sourceLanguage={post.quotedPost.sourceLanguage}
              author={post.quotedPost.name}
              timeLabel={getRelativeTime(post.quotedPost?.createdAt ?? '', lang)}
              onPress={() => navigation.navigate('PostDetail', { postId: post.quotedPost!.id })}
            />
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

          {postImages.length > 0 && (
            <View style={styles.postImageWrap}>
              <PostImageGallery
                images={postImages}
                onImagePress={(index) => {
                  setPreviewIndex(index);
                  setPreviewVisible(true);
                }}
                borderRadiusValue={borderRadius.md}
                backgroundColor={colors.surface2}
              />
            </View>
          )}

          {post.isPoll && post.pollOptions && (
            <View style={styles.pollContainer}>
              {post.pollOptions.map((opt, i) =>
                hasVoted ? (
                  <View
                    key={opt.id ?? `${i}-${opt.text}`}
                    style={[styles.pollOption, i === votedOptionIndex && styles.pollOptionVotedSelected]}
                  >
                    <AnimatedPollBar percent={opt.percent} isVoted={i === votedOptionIndex} />
                    <View style={styles.pollOptionContent}>
                      <View style={styles.pollOptionLeft}>
                        <Text style={[styles.pollText, votedOptionIndex === i && styles.pollTextVoted]} numberOfLines={1} ellipsizeMode="tail">
                          {opt.text}
                        </Text>
                        {i === votedOptionIndex && (
                          <CheckIcon size={16} color="#0463E2" />
                        )}
                      </View>
                      <Text style={styles.pollVoteCount}>{opt.voteCount ?? 0}</Text>
                    </View>
                  </View>
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
              <View style={styles.pollFooter}>
                {hasVoted ? (
                  <Text style={styles.pollFooterText}>
                    {t('totalVotes', { count: totalPollVotes })}
                  </Text>
                ) : (
                  <Text style={styles.pollHintText}>{t('pollHint')}</Text>
                )}
              </View>
            </View>
          )}

          {/* Post actions */}
          <View style={styles.postActions}>
            <AnimatedActionButton
              style={styles.postActionBtn}
              onPress={handleLikePostPress}
              isActive={isLiked}
            >
              <LikeActionIcon
                size={18}
                color={isLiked ? colors.error : '#86909C'}
                fill={isLiked ? colors.error : undefined}
              />
              <Text style={[styles.postActionText, isLiked && { color: colors.error }]}>
                {post.likes}
              </Text>
            </AnimatedActionButton>

            <PressScaleButton
              style={styles.postActionBtn}
              onPress={handleComment}
            >
              <CommentActionIcon size={18} color="#86909C" />
              <Text style={styles.postActionText}>{post.comments}</Text>
            </PressScaleButton>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleForward}
            >
              <ShareActionIcon size={18} color="#86909C" />
            </TouchableOpacity>

            <AnimatedActionButton
              style={styles.postActionBtn}
              onPress={handleBookmarkPostPress}
              isActive={isBookmarked}
            >
              <BookmarkActionIcon
                size={18}
                color={isBookmarked ? colors.primary : '#86909C'}
                fill={isBookmarked ? colors.primary : undefined}
              />
            </AnimatedActionButton>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={handleQuote}
            >
              <QuoteActionIcon size={18} color="#86909C" />
            </TouchableOpacity>

            <PageTranslationToggle />

            {isOwnPost && (
              <TouchableOpacity
                style={styles.postActionBtn}
                onPress={handleDeletePost}
              >
                <TrashIcon size={18} color="#86909C" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        </PageTranslationProvider>

        <View style={styles.divider} />

        <View style={styles.commentSectionHeader}>
          <Text style={styles.commentSectionTitle}>
            {t('commentSection')} ({post.comments})
          </Text>
        </View>
      </View>
    );
  }, [post, postImages, isLiked, isBookmarked, votedOptionIndex, votePostMutation, handleLikePostPress, handleBookmarkPostPress, handleComment, handleForward, handleQuote, handleAvatarPress, t, displayAcademicMeta, navigation, isOwnPost, handleDeletePost]);

  const headerComponent = useMemo(() => renderHeader(), [renderHeader]);

  const keyExtractor = useCallback((item: Comment, index: number) => item.id || String(index), []);

  if (isLoading || !post) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBarWrap, { paddingTop: insets.top }]}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <BackIcon size={24} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>{t('postDetail')}</Text>
            <View style={styles.iconBtn} />
          </View>
        </View>
      </View>
    );
  }

  return (
      <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBarWrap, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('postDetail')}</Text>
        {isOwnPost ? (
          <View style={styles.iconBtn} />
        ) : (
          <TouchableOpacity onPress={handleReportPost} style={styles.iconBtn}>
            <MoreHorizontalIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>
      </View>

      {!isOwnPost && popoverVisible && (
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

      <View style={styles.flex1}>
        <FlashList
          ref={flatListRef}
          style={styles.flex1}
          data={commentsData}
          ListHeaderComponent={headerComponent}
          renderItem={renderCommentItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        <KeyboardStickyView offset={{ closed: 0, opened: Math.max(composerBottomInset - spacing.sm, 0) }}>
          {/* @ Mention Suggestions */}
          {showMentions && (
            <View style={styles.mentionOverlay}>
              <Text style={styles.mentionHeader}>{t('mentionContact')}</Text>
              <ScrollView
                keyboardShouldPersistTaps="always"
                style={styles.mentionScroll}
              >
                {mentionSuggestions.map((candidate) => (
                  <TouchableOpacity
                    key={candidate.key}
                    style={styles.mentionItem}
                    activeOpacity={0.7}
                    onPress={() => handleMentionSelect(candidate)}
                  >
                    <Avatar text={candidate.name} uri={candidate.avatar} size="sm" gender={candidate.gender} />
                    <View style={styles.mentionTextWrap}>
                      <Text style={styles.mentionName}>{candidate.name}</Text>
                      <Text style={styles.mentionMeta}>@{candidate.mentionValue}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Comment Input Bar */}
          <View style={[styles.commentInputBar, { paddingBottom: composerBottomInset }]}>
            <View pointerEvents="none" style={styles.composerBgExtension} />
            <View style={styles.anonToggle}>
              <IOSSwitch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                activeColor={colors.onSurface}
                thumbIcon={
                  i18n.language === 'en' ? (
                    <IncognitoIcon size={14} color="#000000" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.onSurface,
                      }}
                    >
                      {t('anonLabel')}
                    </Text>
                  )
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
              style={[styles.sendBtn, (!commentText.trim() || createCommentMutation.isPending) && styles.sendBtnDisabled]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || createCommentMutation.isPending}
            >
              <SendIcon
                size={20}
                color={commentText.trim() ? colors.onPrimary : colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        </KeyboardStickyView>
      </View>

      {/* Forward Sheet */}
      <ForwardSheet
        visible={!!forwardPost}
        post={forwardPost}
        onClose={() => setForwardPost(null)}
        navigation={navigation}
      />

      {/* Comment Action Sheet */}
      <SwipeableBottomSheet
        visible={commentActionVisible}
        onClose={() => {
          setCommentActionVisible(false);
          setReportTargetCommentId(null);
        }}
      >
            {!selectedCommentIsOwn ? (
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  if (!reportTargetCommentId) {
                    setCommentActionVisible(false);
                    return;
                  }
                  setCommentActionVisible(false);
                  setReportTitle(t('reportComment'));
                  setReportVisible(true);
                }}
              >
                <Text style={styles.actionSheetItemTextDestructive}>{t('reportComment')}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setCommentActionVisible(false);
                setReportTargetCommentId(null);
              }}
            >
              <Text style={styles.actionSheetItemText}>{t('cancel')}</Text>
            </TouchableOpacity>
      </SwipeableBottomSheet>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={reportTitle}
        overlayTransparent={!reportTargetCommentId}
        onClose={() => {
          setReportVisible(false);
          setReportTargetCommentId(null);
        }}
        onSubmit={handleReportSubmit}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={postImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F9',
  },
  flex1: {
    flex: 1,
  },
  topBarWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    height: 44,
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
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.bold,
    color: '#0C1015',
  },
  listContent: {
    paddingBottom: spacing.lg,
  },

  /* === Post Section === */
  postSection: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.white,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  postAvatarTouch: {},
  postNameTouch: { alignSelf: 'flex-start' },
  postUserInfo: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  postNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  postTimeText: {
    ...typography.bodySmall,
    color: '#86909C',
    marginLeft: 4,
  },
  postName: {
    ...typography.titleSmall,
    fontWeight: '400',
    color: '#0C1015',
  },
  postDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  postMeta: {
    ...typography.bodySmall,
    color: '#86909C',
    marginTop: 2,
    flexShrink: 1,
  },
  postContent: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: fontFamily.medium,
    color: '#0C1015',
  },
  postTranslateBlock: {
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  quotedPostCard: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  postImageWrap: {
  },
  pollContainer: {
    gap: 8,
  },
  pollOption: {
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E5',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pollOptionVotedSelected: {
    borderColor: '#9CD7FF',
    backgroundColor: '#E8F3FF',
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexShrink: 1,
  },
  pollVoteCount: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#0C1015',
  },
  pollBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0463E2' + '10',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  pollBarVoted: {
    backgroundColor: '#0463E2' + '18',
  },
  pollText: {
    fontFamily: fontFamily.regular,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#0C1015',
    zIndex: 1,
  },
  pollTextVoted: {
    fontFamily: fontFamily.bold,
    color: '#0463E2',
  },
  pollOptionUnvoted: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9CD7FF',
    backgroundColor: '#E8F3FF',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pollTextUnvoted: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#0C1015',
  },
  pollFooter: {
    flexDirection: 'row',
    marginTop: spacing.xxs,
  },
  pollFooterText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  pollHintText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
  },

  /* Post actions: gap-based layout matching PostCard */
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingLeft: 4,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  postActionText: {
    fontSize: 12,
    color: '#86909C',
  },

  divider: {
    height: 0.5,
    backgroundColor: '#DEE2E5',
  },

  /* Comments */
  commentSectionHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  commentSectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  commentItem: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },
  commentMainWrap: {
    gap: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  commentTranslationToggle: {
  },
  commentUserInfo: {
    flex: 1,
  },
  commentNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    columnGap: 8,
  },
  commentNameLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    flexShrink: 1,
  },
  commentName: {
    ...typography.titleSmall,
    fontWeight: '400',
    color: '#0C1015',
  },
  commentMeta: {
    ...typography.bodySmall,
    color: '#86909C',
    marginTop: 2,
    flexShrink: 1,
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fontFamily.regular,
    color: '#0C1015',
  },
  commentTranslateBlock: {
  },

  /* Comment-level actions */
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingLeft: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 24,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  itemActionText: {
    fontSize: 12,
    color: '#86909C',
  },
  replyCountBadge: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 2,
  },

  /* 鈹€鈹€ Replies (浜岀骇璇勮) 鈹€鈹€ */
  toggleReplies: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  toggleRepliesText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  replyItem: {
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
    columnGap: 8,
  },
  replyNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  replyName: {
    ...typography.titleSmall,
    fontWeight: '400',
    color: '#0C1015',
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
  },
  replyAcademicMeta: {
    ...typography.bodySmall,
    color: '#86909C',
    marginTop: 2,
  },
  replyTranslationToggle: {
  },
  replyBodyContainer: {
    marginTop: 2,
    marginBottom: spacing.xxs,
  },
  replyTranslateBlock: {
    marginBottom: spacing.xxs,
  },
  replyBody: {
    ...typography.bodyMedium,
    color: '#0C1015',
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
  },
  replyToAt: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingLeft: 4,
  },

  /* 鈹€鈹€ Mention Suggestions 鈹€鈹€ */
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
  mentionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mentionName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
  },
  mentionMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
  },

  /* 鈹€鈹€ Popover 鈹€鈹€ */
  popoverOverlay: {
    position: 'absolute' as const,
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  popoverBubble: {
    position: 'absolute' as const,
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
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
  popoverItemTextNeutral: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.sm,
  },

  /* 鈹€鈹€ Comment Action Sheet 鈹€鈹€ */
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

  /* 鈹€鈹€ Comment Input Bar 鈹€鈹€ */
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
    height: 40,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  composerBgExtension: {
    position: 'absolute',
    left: -spacing.md,
    right: -spacing.md,
    bottom: -10000,
    height: 10000,
    backgroundColor: colors.surface,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
    includeFontPadding: false,
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontFamily: MULTILINGUAL_TEXT_FONT_FAMILY,
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
