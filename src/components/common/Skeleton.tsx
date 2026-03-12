import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius: br = borderRadius.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: br,
          backgroundColor: colors.surfaceVariant,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <View style={skeletonStyles.headerInfo}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width={60} height={10} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonBox height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="85%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="60%" height={14} style={{ marginBottom: spacing.md }} />
      <View style={skeletonStyles.actions}>
        <SkeletonBox width={48} height={14} />
        <SkeletonBox width={48} height={14} />
        <SkeletonBox width={24} height={14} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={skeletonStyles.profileContainer}>
      <View style={skeletonStyles.profileRow}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <SkeletonBox width={80} height={32} borderRadius={borderRadius.full} />
      </View>
      <SkeletonBox width={140} height={24} style={{ marginTop: spacing.lg }} />
      <SkeletonBox width="70%" height={14} style={{ marginTop: spacing.sm }} />
      <View style={skeletonStyles.statsRow}>
        <SkeletonBox width={60} height={40} />
        <SkeletonBox width={60} height={40} />
        <SkeletonBox width={60} height={40} />
      </View>
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={skeletonStyles.listItem}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.listItemInfo}>
        <SkeletonBox width={120} height={14} />
        <SkeletonBox width="80%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function ForumListSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3, 4].map((i) => (
        <PostCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function MessageListSkeleton() {
  return (
    <View style={{ paddingTop: spacing.md }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  );
}

export default SkeletonBox;

const skeletonStyles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  profileContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  listItemInfo: {
    flex: 1,
  },
});
