import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { useSearch } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import { BackIcon, SearchIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';

type Props = NativeStackScreenProps<ForumStackParamList, 'Search'>;

const CIRCLE_KEYS = [
  'tagTreehole',
  'tagJobReferral',
  'tagCourseExchange',
  'tagCampusLife',
  'tagLostFound',
  'tagStudyHelp',
] as const;

export default function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { data: results } = useSearch(query);
  const likedPosts = useForumStore((s) => s.likedPosts);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const toggleLike = useForumStore((s) => s.toggleLike);
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleTagPress = useCallback(
    (tag: string) => {
      navigation.navigate('CircleDetail', { tag });
    },
    [navigation]
  );

  const renderResult = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onLike={() => toggleLike(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
        onTagPress={(tag) => handleTagPress(tag)}
        isLiked={likedPosts.has(item.id)}
        isBookmarked={bookmarkedPosts.has(item.id)}
      />
    ),
    [likedPosts, bookmarkedPosts, navigation, toggleLike, toggleBookmark, handleTagPress]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <SearchIcon size={18} color={colors.onSurfaceVariant} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {query.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.officialTagsTitle}>{t('officialTags')}</Text>
          <View style={styles.officialTagsList}>
            {CIRCLE_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.officialTag}
                onPress={() => handleTagPress(t(key))}
              >
                <Text style={styles.officialTagText}>{t(key)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.hintSection}>
            <SearchIcon size={48} color={colors.outlineVariant} />
            <Text style={styles.hintText}>{t('searchHint')}</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={results || []}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingRight: spacing.lg,
    gap: spacing.xs,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  officialTagsTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  officialTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  officialTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
  },
  officialTagText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  hintSection: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.md,
  },
  hintText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
});
