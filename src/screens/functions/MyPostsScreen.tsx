import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { usePosts } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import { BackIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'MyPosts'>;

export default function MyPostsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: posts } = usePosts();
  const likedPosts = useForumStore((s) => s.likedPosts);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);

  const renderPost = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onLike={() => toggleLike(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
        isLiked={likedPosts.has(item.id)}
        isBookmarked={bookmarkedPosts.has(item.id)}
      />
    ),
    [likedPosts, bookmarkedPosts, toggleLike, toggleBookmark]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('myPosts')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <FlashList
        data={posts?.slice(0, 3) || []}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('noPosts') || '暫無帖子'}</Text>
          </View>
        }
        drawDistance={250}
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
});
