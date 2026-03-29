import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { hapticLight } from '../../utils/haptics';
import { buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import type { ForumPost } from '../../types';
import type { Language } from '../../types';
import Avatar from './Avatar';
import Tag from './Tag';
import PressScaleButton from './PressScaleButton';
import { PageTranslationProvider, PageTranslationToggle } from './PageTranslation';
import TranslatableText from './TranslatableText';
import PostImageGallery from './PostImageGallery';
import QuoteCard from './QuoteCard';
import FunctionRefCard from './FunctionRefCard';
import { normalizeImageUrl } from '../../utils/imageUrl';
import {
  TrashIcon,
  MaleIcon,
  FemaleIcon,
  CheckIcon,
} from './icons';
import {
  LikeActionIcon,
  CommentActionIcon,
  ShareActionIcon,
  BookmarkActionIcon,
  QuoteActionIcon,
} from './PostActionIcons';

export interface PostCardProps {
  post: ForumPost;
  onPress?: () => void;
  onAvatarPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onForward?: () => void;
  onBookmark?: () => void;
  onQuote?: () => void;
  onDelete?: () => void;
  onTagPress?: (tag: string) => void;
  onFunctionPress?: () => void;
  onImagePress?: (images: string[], index: number) => void;
  onVote?: (optionIndex: number) => void;
  onQuotedPostPress?: (postId: string) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  votedOptionIndex?: number;
}

function AnimatedPollBar({ percent, isVoted }: { percent: number; isVoted?: boolean }) {
  const width = useSharedValue(0);
  const targetPercent = Math.max(0, Math.min(percent, 100));

  useEffect(() => {
    width.value = withTiming(targetPercent, { duration: 600 });
  }, [targetPercent, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(width.value, 0), 100)}%`,
  }));

  return <Animated.View style={[styles.pollBar, isVoted && styles.pollBarVoted, barStyle]} />;
}

function PostCard({
  post,
  onPress,
  onAvatarPress,
  onLike,
  onComment,
  onForward,
  onBookmark,
  onQuote,
  onDelete,
  onTagPress,
  onFunctionPress,
  onImagePress,
  onVote,
  onQuotedPostPress,
  isLiked,
  isBookmarked,
  votedOptionIndex,
}: PostCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const hasVoted = votedOptionIndex != null;
  const totalPollVotes = useMemo(
    () => post.pollOptions?.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0) ?? 0,
    [post.pollOptions],
  );
  const [minuteTick, setMinuteTick] = useState(() => Math.floor(Date.now() / 60000));
  const likePulse = useSharedValue(1);
  const bookmarkPulse = useSharedValue(1);
  const didMountLikeRef = useRef(false);
  const didMountBookmarkRef = useRef(false);

  useEffect(() => {
    const updateTick = () => setMinuteTick(Math.floor(Date.now() / 60000));
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const delay = 60000 - (Date.now() % 60000);
    const timeoutId = setTimeout(() => {
      updateTick();
      intervalId = setInterval(updateTick, 60000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!didMountLikeRef.current) {
      didMountLikeRef.current = true;
      return;
    }
    likePulse.value = withSequence(
      withTiming(1.18, { duration: 140 }),
      withTiming(1, { duration: 180 }),
    );
  }, [isLiked, likePulse]);

  useEffect(() => {
    if (!didMountBookmarkRef.current) {
      didMountBookmarkRef.current = true;
      return;
    }
    bookmarkPulse.value = withSequence(
      withTiming(1.14, { duration: 140 }),
      withTiming(1, { duration: 180 }),
    );
  }, [isBookmarked, bookmarkPulse]);

  const displayTime = useMemo(
    () => getRelativeTime(post.createdAt, lang),
    [post.createdAt, lang, minuteTick],
  );

  const likePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likePulse.value }],
  }));

  const bookmarkPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkPulse.value }],
  }));

  const displayAcademicMeta = useMemo(
    () =>
      buildGradeMajorMeta(t, {
        gradeKey: post.gradeKey,
        majorKey: post.majorKey,
        isAnonymous: post.isAnonymous,
        language: lang,
        abbreviateForumGrade: true,
      }),
    [t, lang, post.gradeKey, post.majorKey, post.isAnonymous],
  );

  const quotedTime = useMemo(
    () =>
      post.quotedPost?.createdAt
        ? getRelativeTime(post.quotedPost.createdAt, lang)
        : '',
    [post.quotedPost, lang, minuteTick],
  );
  const displayImages = useMemo(() => {
    if (post.images && post.images.length > 0) return post.images;
    const fallback = normalizeImageUrl(post.image);
    return fallback ? [fallback] : [];
  }, [post.image, post.images]);

  const handleLike = useCallback(() => {
    hapticLight();
    onLike?.();
  }, [onLike]);

  const handleBookmark = useCallback(() => {
    hapticLight();
    onBookmark?.();
  }, [onBookmark]);

  const handleComment = useCallback(() => {
    hapticLight();
    onComment?.();
  }, [onComment]);

  return (
    <PageTranslationProvider>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        {!post.isAnonymous && onAvatarPress ? (
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7}>
            <Avatar
              text={post.name}
              uri={post.avatar}
              defaultAvatar={post.defaultAvatar}
              size="sm"
              gender={post.gender}
            />
          </TouchableOpacity>
        ) : (
          <Avatar
            text={post.name}
            uri={post.avatar}
            defaultAvatar={post.defaultAvatar}
            size="sm"
            gender={post.gender}
          />
        )}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <View style={styles.nameLeft}>
              <Text style={styles.name}>{post.name}</Text>
              {!post.isAnonymous && post.gender === 'male' && (
                <MaleIcon size={14} color={colors.genderMale} />
              )}
              {!post.isAnonymous && post.gender === 'female' && (
                <FemaleIcon size={14} color={colors.genderFemale} />
              )}
            </View>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {displayAcademicMeta ? `${displayAcademicMeta} · ${displayTime}` : displayTime}
          </Text>
        </View>
      </View>

      {/* Body aligned with name */}
      <View style={styles.body}>
        {/* Content */}
        <TranslatableText
          entityType="post"
          entityId={post.id}
          fieldName="content"
          sourceText={post.content}
          sourceLanguage={post.sourceLanguage ?? post.lang}
          textStyle={styles.content}
          numberOfLines={4}
        />

        {/* Image */}
        {post.hasImage && displayImages.length > 0 && (
          <View style={styles.imageWrap}>
            <PostImageGallery
              images={displayImages}
              onImagePress={(index) => onImagePress?.(displayImages, index)}
              borderRadiusValue={10}
              backgroundColor={colors.surface2}
            />
          </View>
        )}

        {/* Poll */}
        {post.isPoll && post.pollOptions && (
          <View style={styles.pollContainer}>
            {post.pollOptions.map((opt, i) =>
              hasVoted ? (
                <View
                  key={`voted-${opt.id ?? i}`}
                  style={[styles.pollOption, i === votedOptionIndex && styles.pollOptionVotedSelected]}
                >
                  <AnimatedPollBar percent={opt.percent ?? 0} isVoted={i === votedOptionIndex} />
                  <View style={styles.pollOptionContent}>
                    <View style={styles.pollOptionLeft}>
                      <Text
                        style={[styles.pollText, i === votedOptionIndex && styles.pollTextVoted]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {opt.text?.trim() || `${t('optionN')} ${i + 1}`}
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
                  key={`unvoted-${opt.id ?? i}`}
                  style={styles.pollOptionUnvoted}
                  activeOpacity={0.65}
                  onPress={() => onVote?.(i)}
                >
                  <Text style={styles.pollTextUnvoted} numberOfLines={1} ellipsizeMode="tail">
                    {opt.text?.trim() || `${t('optionN')} ${i + 1}`}
                  </Text>
                </TouchableOpacity>
              )
            )}
            {/* Figma: hint before voting / total count after voting */}
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

        {/* Forwarded Function Card */}
        {post.isFunction && post.functionType && (
          <FunctionRefCard
            functionType={post.functionType}
            title={post.functionTitle}
            preview={post.functionRefPreview}
            onPress={onFunctionPress}
          />
        )}

        {/* Quoted Post */}
        {post.quotedPost && (
          <>
            <QuoteCard
              postId={post.quotedPost.id}
              content={post.quotedPost.content}
              sourceLanguage={post.quotedPost.sourceLanguage}
              author={post.quotedPost.name}
              timeLabel={quotedTime}
              onPress={() => onQuotedPostPress?.(post.quotedPost!.id)}
            />
            <Text style={styles.quoteMeta}>
              {post.quotedPost.name} · {quotedTime}
            </Text>
          </>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <Tag key={tag} label={t(tag)} onPress={onTagPress ? () => onTagPress(tag) : undefined} />
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PressScaleButton style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={likePulseStyle}>
              <LikeActionIcon
                size={18}
                color={isLiked ? colors.error : '#86909C'}
                fill={isLiked ? colors.error : undefined}
              />
            </Animated.View>
            <Animated.View style={likePulseStyle}>
              <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
                {post.likes}
              </Text>
            </Animated.View>
          </PressScaleButton>

          <PressScaleButton style={styles.actionBtn} onPress={handleComment}>
            <CommentActionIcon size={18} color="#86909C" />
            <Text style={styles.actionText}>{post.comments}</Text>
          </PressScaleButton>

          <TouchableOpacity style={styles.actionBtn} onPress={onForward}>
            <ShareActionIcon size={18} color="#86909C" />
          </TouchableOpacity>

          <PressScaleButton style={styles.actionBtn} onPress={handleBookmark}>
            <Animated.View style={bookmarkPulseStyle}>
              <BookmarkActionIcon
                size={18}
                color={isBookmarked ? colors.primary : '#86909C'}
                fill={isBookmarked ? colors.primary : undefined}
              />
            </Animated.View>
          </PressScaleButton>

          <TouchableOpacity style={styles.actionBtn} onPress={onQuote}>
            <QuoteActionIcon size={18} color="#86909C" />
          </TouchableOpacity>

          <PageTranslationToggle />

          {onDelete && (
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <TrashIcon size={18} color="#86909C" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      </TouchableOpacity>
    </PageTranslationProvider>
  );
}

export function arePostCardPropsEqual(
  prev: PostCardProps,
  next: PostCardProps
): boolean {
  if (prev.post !== next.post) return false;
  if (prev.isLiked !== next.isLiked) return false;
  if (prev.isBookmarked !== next.isBookmarked) return false;
  if (prev.votedOptionIndex !== next.votedOptionIndex) return false;
  return true;
}

export default React.memo(PostCard, arePostCardPropsEqual);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerInfo: {
    flex: 1,
  },
  translationToggle: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  body: {
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  nameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  name: {
    ...typography.titleSmall,
    fontWeight: '400',
    color: '#0C1015',
  },
  timeText: {
    ...typography.bodySmall,
    color: '#86909C',
    marginLeft: 4,
  },
  meta: {
    ...typography.bodySmall,
    color: '#86909C',
    marginTop: 2,
    flexShrink: 1,
  },
  content: {
    ...typography.bodyLarge,
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  quoteMeta: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  imageWrap: {
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
  /* Figma: vote count on the right, 12px Regular #0C1015 */
  pollVoteCount: {
    fontFamily: 'SourceHanSansCN-Regular',
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
    fontFamily: 'SourceHanSansCN-Regular',
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#0C1015',
    zIndex: 1,
  },
  pollTextVoted: {
    fontFamily: 'SourceHanSansCN-Bold',
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
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#0C1015',
  },
  /* Figma: footer row below poll options */
  pollFooter: {
    flexDirection: 'row',
    marginTop: spacing.xxs,
  },
  /* Figma: "共 X 人投票" right-aligned, 12px Regular #9CA3AF */
  pollFooterText: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  /* Figma: "点击上方按钮，选择你的观点" left-aligned, 12px Regular #9CA3AF */
  pollHintText: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF',
  },
  pollTotal: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingLeft: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: 12,
    color: '#86909C',
  },
});
