import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { usePosts } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import { BackIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';

type Props = NativeStackScreenProps<ForumStackParamList, 'CircleDetail'>;

export default function CircleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { tag } = route.params;
  const { data: allPosts } = usePosts();
  const likedPosts = useForumStore((s) => s.likedPosts);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);
  const [followed, setFollowed] = useState(false);

  // Filter posts by tag
  const posts = allPosts?.filter((p) => p.tags?.includes(tag)) || [];

  const renderHeader = useCallback(
    () => (
      <View style={styles.circleHeader}>
        <View style={styles.circleBody}>
          <View style={styles.circleIcon}>
            <Text style={styles.circleIconText}>#</Text>
          </View>
          <View style={styles.circleInfo}>
            <Text style={styles.circleName}>{tag}</Text>
            <Text style={styles.circleDesc}>
              {t('circleDetail')}
            </Text>
          </View>
        </View>
        <View style={styles.circleFooter}>
          <View style={styles.circleStats}>
            <View style={styles.circleStat}>
              <Text style={styles.circleStatNum}>{posts.length * 23}</Text>
              <Text style={styles.circleStatLabel}>{t('fans')}</Text>
            </View>
            <View style={styles.circleStat}>
              <Text style={styles.circleStatNum}>{posts.length * 156}</Text>
              <Text style={styles.circleStatLabel}>{t('receivedLikes')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, followed && styles.followBtnActive]}
            onPress={() => setFollowed(!followed)}
          >
            <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
              {followed ? t('alreadyFollowed') : `+ ${t('follow')}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [tag, posts.length, followed, t]
  );

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onLike={() => toggleLike(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
        isLiked={likedPosts.has(item.id)}
        isBookmarked={bookmarkedPosts.has(item.id)}
      />
    ),
    [likedPosts, bookmarkedPosts, navigation, toggleLike, toggleBookmark]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('circleDetail')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={posts}
        ListHeaderComponent={renderHeader}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  // Circle Header
  circleHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },
  circleBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  circleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  circleIconText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '600',
  },
  circleDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  circleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleStats: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
  circleStat: {
    alignItems: 'center',
  },
  circleStatNum: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  circleStatLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  followBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  followBtnActive: {
    backgroundColor: colors.surfaceVariant,
  },
  followBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
  followBtnTextActive: {
    color: colors.onSurfaceVariant,
  },
});
