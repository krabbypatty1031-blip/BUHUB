import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../../theme';
import GradientCard from './GradientCard';
import { hapticLight } from '../../utils/haptics';
import { buildPostMeta, getRelativeTime } from '../../utils/formatTime';
import type { ForumPost } from '../../types';
import type { Language } from '../../types';
import Avatar from './Avatar';
import Tag from './Tag';
import PressScaleButton from './PressScaleButton';
import { PageTranslationProvider, PageTranslationToggle } from './PageTranslation';
import TranslatableText from './TranslatableText';
import { normalizeImageUrl } from '../../utils/imageUrl';
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  QuoteIcon,
  TrashIcon,
  MaleIcon,
  FemaleIcon,
  ChevronRightIcon,
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
} from './icons';

interface PostCardProps {
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

  useEffect(() => {
    width.value = withTiming(percent, { duration: 600 });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(width.value)}%`,
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

  const displayMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: post.gradeKey,
        majorKey: post.majorKey,
        createdAt: post.createdAt,
        isAnonymous: post.isAnonymous,
      }),
    [t, lang, post.gradeKey, post.majorKey, post.createdAt, post.isAnonymous, minuteTick],
  );

  const quotedTime = useMemo(
    () =>
      post.quotedPost?.createdAt
        ? getRelativeTime(post.quotedPost.createdAt, lang)
        : '',
    [post.quotedPost, lang, minuteTick],
  );
  const displayImage = useMemo(
    () => normalizeImageUrl(post.image ?? post.images?.[0]),
    [post.image, post.images],
  );

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
            <Text style={styles.name}>{post.name}</Text>
            {!post.isAnonymous && post.gender === 'male' && (
              <MaleIcon size={14} color={colors.genderMale} />
            )}
            {!post.isAnonymous && post.gender === 'female' && (
              <FemaleIcon size={14} color={colors.genderFemale} />
            )}
            <Text style={styles.timeDot}> · </Text>
            <Text style={styles.meta}>{displayMeta}</Text>
          </View>
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

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <Tag key={tag} label={t(tag)} onPress={onTagPress ? () => onTagPress(tag) : undefined} />
            ))}
          </View>
        )}

        {/* Image */}
        {post.hasImage && displayImage && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(post.images?.length ? post.images : [displayImage], 0)}
          >
            <View style={styles.imageWrap}>
              <Image source={{ uri: displayImage }} style={styles.image} />
              {(post.images?.length ?? 0) > 1 ? (
                <View style={styles.imageCountBadge}>
                  <Text style={styles.imageCountBadgeText}>{`1/${post.images!.length}`}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* Poll */}
        {post.isPoll && post.pollOptions && (
          <View style={styles.pollContainer}>
            {post.pollOptions.map((opt, i) =>
              hasVoted ? (
                <TouchableOpacity
                  key={`voted-${opt.id ?? i}`}
                  style={styles.pollOption}
                  activeOpacity={1}
                  disabled
                >
                  <AnimatedPollBar percent={opt.percent ?? 0} isVoted={i === votedOptionIndex} />
                  <Text
                    style={[styles.pollText, i === votedOptionIndex && styles.pollTextVoted]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {opt.text?.trim() || `${t('optionN')} ${i + 1}`}
                  </Text>
                  <Text style={[styles.pollPercent, i === votedOptionIndex && styles.pollPercentVoted]}>
                    {lang === 'en' ? `${opt.voteCount ?? 0} votes` : `${opt.voteCount ?? 0}票`}
                  </Text>
                </TouchableOpacity>
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
            <Text style={styles.pollTotal}>
              {lang === 'en' ? `Total ${totalPollVotes} votes` : `共${totalPollVotes}人投票`}
            </Text>
          </View>
        )}

        {/* Forwarded Function Card */}
        {post.isFunction && post.functionType && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onFunctionPress}
          >
            <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.functionCard}>
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
                <ChevronRightIcon size={14} color="#999999" />
              </View>
              {post.functionTitle && (
                <Text style={styles.functionCardTitle} numberOfLines={2}>
                  {post.functionTitle}
                </Text>
              )}
            </GradientCard>
          </TouchableOpacity>
        )}

        {/* Quoted Post */}
        {post.quotedPost && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onQuotedPostPress?.(post.quotedPost!.id)}
          >
            <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.quotedCard}>
              <View style={styles.quotedHeader}>
                <QuoteIcon size={12} color="#999999" />
                <Text style={styles.quotedLabel}>引用帖子</Text>
              </View>
              <TranslatableText
                entityType="post"
                entityId={post.quotedPost.id}
                fieldName="content"
                sourceText={post.quotedPost.content}
                sourceLanguage={post.quotedPost.sourceLanguage}
                textStyle={styles.quotedContent}
                numberOfLines={3}
              />
              <Text style={styles.quotedMeta}>{post.quotedPost.name} · {quotedTime}</Text>
            </GradientCard>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PressScaleButton style={styles.actionBtn} onPress={handleLike}>
            <HeartIcon
              size={18}
              color={isLiked ? colors.error : colors.onSurface}
              fill={isLiked ? colors.error : undefined}
            />
            <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
              {post.likes}
            </Text>
          </PressScaleButton>

          <PressScaleButton style={styles.actionBtn} onPress={handleComment}>
            <CommentIcon size={18} color={colors.onSurface} />
            <Text style={styles.actionText}>{post.comments}</Text>
          </PressScaleButton>

          <TouchableOpacity style={styles.actionBtn} onPress={onForward}>
            <ShareIcon size={18} color={colors.onSurface} />
          </TouchableOpacity>

          <PressScaleButton style={styles.actionBtn} onPress={handleBookmark}>
            <BookmarkIcon
              size={18}
              color={isBookmarked ? colors.primary : colors.onSurface}
              fill={isBookmarked ? colors.primary : undefined}
            />
          </PressScaleButton>

          <TouchableOpacity style={styles.actionBtn} onPress={onQuote}>
            <QuoteIcon size={18} color={colors.onSurface} />
          </TouchableOpacity>

          {onDelete && (
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <TrashIcon size={18} color="#000000" />
            </TouchableOpacity>
          )}
          <PageTranslationToggle style={styles.translationToggle} />
        </View>
      </View>
      </TouchableOpacity>
    </PageTranslationProvider>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  translationToggle: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  body: {
    marginLeft: 32 + spacing.md,
    marginTop: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    ...typography.titleSmall,
    fontWeight: '700',
    color: colors.onSurface,
  },
  timeDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  content: {
    ...typography.bodyLarge,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
  },
  imageWrap: {
    marginBottom: spacing.sm,
    position: 'relative',
  },
  imageCountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  imageCountBadgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pollContainer: {
    marginBottom: spacing.sm,
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
  functionCard: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  functionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
  },
  functionCardTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 20,
  },
  quotedCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quotedLabel: {
    ...typography.labelSmall,
    color: '#999999',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  quotedContent: {
    ...typography.bodySmall,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  quotedMeta: {
    ...typography.labelSmall,
    color: '#999999',
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: 13,
    color: colors.onSurface,
  },
});
