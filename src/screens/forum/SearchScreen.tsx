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
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { useSearch } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ForwardSheet from '../../components/common/ForwardSheet';
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
  const votedPolls = useForumStore((s) => s.votedPolls);
  const votePoll = useForumStore((s) => s.votePoll);
  const currentUser = useAuthStore((s) => s.user);
  const [forwardPost, setForwardPost] = useState<ForumPost | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleTagPress = useCallback(
    (tag: string) => {
      navigation.navigate('CircleDetail', { tag });
    },
    [navigation]
  );

  const handleAvatarPress = useCallback(
    (post: ForumPost) => {
      if (!post.isAnonymous) {
        if (post.name === currentUser?.nickname) {
          navigation.dispatch(CommonActions.navigate({ name: 'MeTab' }));
        } else {
          navigation.navigate('UserProfile', { userName: post.name });
        }
      }
    },
    [navigation, currentUser]
  );

  const handleCommentPress = useCallback(
    (post: ForumPost) => {
      navigation.navigate('PostDetail', { postId: post.id });
    },
    [navigation]
  );

  const handleForward = useCallback(
    (post: ForumPost) => {
      setForwardPost(post);
    },
    []
  );

  const handleQuote = useCallback(
    (post: ForumPost) => {
      navigation.navigate('Compose', { type: 'text', quotePostId: post.id });
    },
    [navigation]
  );

  const handleFunctionPress = useCallback(
    (post: ForumPost) => {
      if (!post.functionType || post.functionIndex == null) return;
      const nav = navigation.getParent();
      if (!nav) return;
      switch (post.functionType) {
        case 'partner':
          nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { index: post.functionIndex } });
          break;
        case 'errand':
          nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { index: post.functionIndex } });
          break;
        case 'secondhand':
          nav.navigate('FunctionsTab', { screen: 'SecondhandDetail', params: { index: post.functionIndex } });
          break;
        case 'rating':
          nav.navigate('FunctionsTab', { screen: 'RatingDetail', params: { category: 'teacher' as const, index: post.functionIndex } });
          break;
      }
    },
    [navigation]
  );

  const renderResult = useCallback(
    ({ item }: { item: ForumPost }) => (
      <PostCard
        post={item}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onAvatarPress={!item.isAnonymous ? () => handleAvatarPress(item) : undefined}
        onLike={() => toggleLike(item.id)}
        onComment={() => handleCommentPress(item)}
        onForward={() => handleForward(item)}
        onBookmark={() => toggleBookmark(item.id)}
        onQuote={() => handleQuote(item)}
        onTagPress={(tag) => handleTagPress(tag)}
        onFunctionPress={item.isFunction ? () => handleFunctionPress(item) : undefined}
        onVote={item.isPoll ? (optIdx) => votePoll(item.id, optIdx) : undefined}
        isLiked={likedPosts.has(item.id)}
        isBookmarked={bookmarkedPosts.has(item.id)}
        votedOptionIndex={votedPolls.get(item.id)}
      />
    ),
    [likedPosts, bookmarkedPosts, votedPolls, navigation, toggleLike, toggleBookmark, votePoll, handleTagPress, handleAvatarPress, handleCommentPress, handleForward, handleQuote, handleFunctionPress]
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
                onPress={() => handleTagPress(t(key, { lng: 'tc' }))}
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

      <ForwardSheet
        visible={!!forwardPost}
        post={forwardPost}
        onClose={() => setForwardPost(null)}
        navigation={navigation}
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
