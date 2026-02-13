import React, { useCallback, useEffect, useMemo } from 'react';
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
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  QuoteIcon,
  MaleIcon,
  FemaleIcon,
  ChevronRightIcon,
  IncognitoIcon,
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
  onTagPress?: (tag: string) => void;
  onFunctionPress?: () => void;
  onVote?: (optionIndex: number) => void;
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
    width: `${width.value}%`,
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
  onTagPress,
  onFunctionPress,
  onVote,
  isLiked,
  isBookmarked,
  votedOptionIndex,
}: PostCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const hasVoted = votedOptionIndex != null;

  const displayMeta = useMemo(
    () =>
      buildPostMeta(t, lang, {
        gradeKey: post.gradeKey,
        majorKey: post.majorKey,
        createdAt: post.createdAt,
        isAnonymous: post.isAnonymous,
      }),
    [t, lang, post.gradeKey, post.majorKey, post.createdAt, post.isAnonymous],
  );

  const quotedTime = useMemo(
    () =>
      post.quotedPost?.createdAt
        ? getRelativeTime(post.quotedPost.createdAt, lang)
        : post.quotedPost?.meta || '',
    [post.quotedPost, lang],
  );

  const handleLike = useCallback(() => {
    hapticLight();
    onLike?.();
  }, [onLike]);

  const handleBookmark = useCallback(() => {
    hapticLight();
    onBookmark?.();
  }, [onBookmark]);

  return (
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
            text={post.isAnonymous ? '' : post.name}
            uri={post.isAnonymous ? undefined : post.avatar}
            defaultAvatar={post.isAnonymous ? undefined : post.defaultAvatar}
            size="sm"
            gender={post.isAnonymous ? 'other' : post.gender}
          />
        )}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            {post.isAnonymous && (
              <IncognitoIcon size={14} color={colors.onSurfaceVariant} />
            )}
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

      {/* Body — aligned with name */}
      <View style={styles.body}>
        {/* Content */}
        <Text style={styles.content} numberOfLines={4}>{post.content}</Text>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <Tag key={tag} label={t(tag)} onPress={onTagPress ? () => onTagPress(tag) : undefined} />
            ))}
          </View>
        )}

        {/* Image */}
        {post.hasImage && post.image && (
          <Image source={{ uri: post.image }} style={styles.image} />
        )}

        {/* Poll */}
        {post.isPoll && post.pollOptions && (
          <View style={styles.pollContainer}>
            {post.pollOptions.map((opt, i) =>
              hasVoted ? (
                <View key={i} style={styles.pollOption}>
                  <AnimatedPollBar percent={opt.percent} isVoted={i === votedOptionIndex} />
                  <Text style={[styles.pollText, i === votedOptionIndex && styles.pollTextVoted]}>{opt.text}</Text>
                  <Text style={[styles.pollPercent, i === votedOptionIndex && styles.pollPercentVoted]}>{opt.percent}%</Text>
                </View>
              ) : (
                <TouchableOpacity
                  key={i}
                  style={styles.pollOptionUnvoted}
                  activeOpacity={0.65}
                  onPress={() => onVote?.(i)}
                >
                  <Text style={styles.pollTextUnvoted}>{opt.text}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* Forwarded Function Card */}
        {post.isFunction && post.functionType && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onFunctionPress}
          >
            <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.functionCard}>
              <View style={styles.functionCardInfo}>
                <Text style={styles.functionCardType}>
                  {post.functionType === 'partner' ? '找搭子' :
                   post.functionType === 'errand' ? '跑腿' :
                   post.functionType === 'secondhand' ? '二手' :
                   post.functionType === 'rating' ? '评分' : ''}
                </Text>
                {post.functionTitle && (
                  <Text style={styles.functionCardTitle} numberOfLines={1}>
                    {post.functionTitle}
                  </Text>
                )}
              </View>
              <ChevronRightIcon size={14} color="#999999" />
            </GradientCard>
          </TouchableOpacity>
        )}

        {/* Quoted Post */}
        {post.quotedPost && (
          <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.quotedCard}>
            <View style={styles.quotedHeader}>
              <QuoteIcon size={12} color="#999999" />
              <Text style={styles.quotedLabel}>引用帖子</Text>
            </View>
            <Text style={styles.quotedContent} numberOfLines={3}>{post.quotedPost.content}</Text>
            <Text style={styles.quotedMeta}>{post.quotedPost.name} · {quotedTime}</Text>
          </GradientCard>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <HeartIcon
              size={18}
              color={isLiked ? colors.error : colors.onSurface}
              fill={isLiked ? colors.error : undefined}
            />
            <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
              {post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
            <CommentIcon size={18} color={colors.onSurface} />
            <Text style={styles.actionText}>{post.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onForward}>
            <ShareIcon size={18} color={colors.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
            <BookmarkIcon
              size={18}
              color={isBookmarked ? colors.primary : colors.onSurface}
              fill={isBookmarked ? colors.primary : undefined}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onQuote}>
            <QuoteIcon size={18} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
    marginBottom: spacing.sm,
    backgroundColor: colors.surface2,
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
    fontSize: 13,
    color: colors.onSurface,
    zIndex: 1,
  },
  pollPercent: {
    ...typography.bodyMedium,
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
  functionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  functionCardInfo: {
    flex: 1,
  },
  functionCardType: {
    ...typography.labelSmall,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  functionCardTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
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
