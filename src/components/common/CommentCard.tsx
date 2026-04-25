import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { UserComment, Language } from '../../types';
import { useDeleteComment, useLikeComment, useBookmarkComment } from '../../hooks/usePosts';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { canPublishCommunityContent } from '../../utils/publishPermission';
import { promptHkbuVerification } from '../../utils/hkbuPrompt';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from './Avatar';
import TranslatableText from './TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from './PageTranslation';
import PressScaleButton from './PressScaleButton';
import {
  LikeActionIcon,
  CommentActionIcon,
  ShareActionIcon,
  BookmarkActionIcon,
} from './PostActionIcons';
import { MaleIcon, FemaleIcon, TrashIcon } from './icons';
import { buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import { hapticLight } from '../../utils/haptics';

export interface CommentCardProps {
  comment: UserComment;
  t: (key: string) => string;
  lang: Language;
  onPress: () => void;
  onAvatarPress?: () => void;
  onUpdate: () => void;
  onComment?: () => void;
  onForward?: () => void;
  onLikeUpdate?: (liked: boolean) => void;
  onBookmarkUpdate?: (bookmarked: boolean) => void;
  showDelete?: boolean;
  /**
   * Optional callback fired when a non-HKBU user taps like / bookmark.
   * Parent screens supply a navigation-aware "go to ManageEmails" handler.
   * If absent, the prompt still pops but its CTA is a no-op.
   */
  onRequestHkbuVerification?: () => void;
}

const CommentCard = React.memo(function CommentCard({
  comment,
  t,
  lang,
  onPress,
  onAvatarPress,
  onUpdate,
  onComment,
  onForward,
  onLikeUpdate,
  onBookmarkUpdate,
  showDelete = true,
  onRequestHkbuVerification,
}: CommentCardProps) {
  const deleteCommentMutation = useDeleteComment(comment.postId);
  const likeCommentMutation = useLikeComment(comment.postId);
  const bookmarkCommentMutation = useBookmarkComment(comment.postId);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const showModal = useUIStore((s) => s.showModal);
  const currentUser = useAuthStore((s) => s.user);
  const ensureHkbu = useCallback((): boolean => {
    if (canPublishCommunityContent(currentUser)) return true;
    // CommentCard's `t` prop is a narrowed (key) => string; promptHkbuVerification
    // expects an i18next TFunction shape, which is structurally compatible at runtime.
    promptHkbuVerification(
      t as unknown as Parameters<typeof promptHkbuVerification>[0],
      onRequestHkbuVerification ?? (() => {})
    );
    return false;
  }, [currentUser, onRequestHkbuVerification, t]);

  const displayAcademicMeta = useMemo(
    () => buildGradeMajorMeta(t, {
      gradeKey: comment.isAnonymous ? undefined : comment.gradeKey,
      majorKey: comment.isAnonymous ? undefined : comment.majorKey,
      language: lang,
      abbreviateForumGrade: true,
    }),
    [t, lang, comment.isAnonymous, comment.gradeKey, comment.majorKey]
  );

  const displayTime = useMemo(
    () => getRelativeTime(comment.time, lang),
    [comment.time, lang]
  );

  const metaText = displayAcademicMeta ? `${displayAcademicMeta} · ${displayTime}` : displayTime;

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
    if (!ensureHkbu()) return;
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
  }, [comment.commentId, comment.liked, ensureHkbu, likeCommentMutation, showSnackbar, t, onLikeUpdate, onUpdate]);

  const handleBookmark = useCallback(() => {
    if (!ensureHkbu()) return;
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
  }, [comment.commentId, comment.bookmarked, bookmarkCommentMutation, ensureHkbu, showSnackbar, t, onBookmarkUpdate, onUpdate]);

  return (
    <PageTranslationProvider>
    <TouchableOpacity style={styles.commentItem} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.commentMainWrap}>
        <View style={styles.commentHeader}>
          {onAvatarPress && !comment.isAnonymous ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(event) => {
                event.stopPropagation();
                onAvatarPress();
              }}
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
              {metaText}
            </Text>
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
      </View>

      <View style={styles.commentActionsRow}>
        <View style={styles.itemActions}>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleLike}>
            <LikeActionIcon size={18} color={comment.liked ? colors.error : '#86909C'} fill={comment.liked ? colors.error : undefined} />
            <Text style={[styles.itemActionText, comment.liked && { color: colors.error }]}>{comment.likes}</Text>
          </PressScaleButton>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleCommentPress}>
            <CommentActionIcon size={18} color="#86909C" />
            {comment.replyCount !== undefined && comment.replyCount > 0 && (
              <Text style={styles.replyCountBadge}>{comment.replyCount}</Text>
            )}
          </PressScaleButton>
          <TouchableOpacity style={styles.itemActionBtn} onPress={onForward}>
            <ShareActionIcon size={18} color="#86909C" />
          </TouchableOpacity>
          <PressScaleButton style={styles.itemActionBtn} onPress={handleBookmark}>
            <BookmarkActionIcon size={18} color={comment.bookmarked ? colors.primary : '#86909C'} fill={comment.bookmarked ? colors.primary : undefined} />
          </PressScaleButton>
          {showDelete && (
            <TouchableOpacity style={styles.itemActionBtn} onPress={handleDelete}>
              <TrashIcon size={18} color="#86909C" />
            </TouchableOpacity>
          )}
        </View>
        <PageTranslationToggle style={styles.commentTranslationToggle} />
      </View>
    </TouchableOpacity>
    </PageTranslationProvider>
  );
});

const styles = StyleSheet.create({
  commentItem: {
    padding: 16,
    gap: 16,
    backgroundColor: '#FFFFFF',
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
  replyToLabel: {
    ...typography.bodySmall,
    fontSize: 12,
    color: '#86909C',
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
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
});

export default CommentCard;
