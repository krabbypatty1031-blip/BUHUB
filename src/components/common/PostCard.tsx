import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { hapticLight } from '../../utils/haptics';
import type { ForumPost } from '../../types';
import Avatar from './Avatar';
import Tag from './Tag';
import {
  HeartIcon,
  CommentIcon,
  RepostIcon,
  BookmarkIcon,
  QuoteIcon,
  MaleIcon,
  FemaleIcon,
  ChevronRightIcon,
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

function AnimatedPollBar({ percent }: { percent: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percent, { duration: 600 });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return <Animated.View style={[styles.pollBar, barStyle]} />;
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
  const hasVoted = votedOptionIndex != null;
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
              text={post.avatar}
              size="sm"
              gender={post.gender}
            />
          </TouchableOpacity>
        ) : (
          <Avatar
            text={post.avatar}
            size="sm"
            gender={post.isAnonymous ? 'other' : post.gender}
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
          </View>
          <Text style={styles.meta}>{post.meta}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content} numberOfLines={4}>{post.content}</Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tags}>
          {post.tags.map((tag) => (
            <Tag key={tag} label={tag} onPress={onTagPress ? () => onTagPress(tag) : undefined} />
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
                <AnimatedPollBar percent={opt.percent} />
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
          style={styles.functionCard}
          activeOpacity={0.7}
          onPress={onFunctionPress}
        >
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
          <ChevronRightIcon size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <HeartIcon
            size={18}
            color={isLiked ? colors.error : colors.onSurfaceVariant}
            fill={isLiked ? colors.error : undefined}
          />
          <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
            {post.likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
          <CommentIcon size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onForward}>
          <RepostIcon size={18} color={colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
          <BookmarkIcon
            size={18}
            color={isBookmarked ? colors.primary : colors.onSurfaceVariant}
            fill={isBookmarked ? colors.primary : undefined}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onQuote}>
          <QuoteIcon size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    ...typography.titleSmall,
    fontWeight: '600',
    color: colors.onSurface,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  content: {
    ...typography.bodyLarge,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    marginBottom: spacing.sm,
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
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  functionCardInfo: {
    flex: 1,
  },
  functionCardType: {
    ...typography.labelSmall,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  functionCardTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  actionText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
