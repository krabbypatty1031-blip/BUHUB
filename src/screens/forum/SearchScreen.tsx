import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { useSearch, useLikePost, useBookmarkPost, useVotePost } from '../../hooks/usePosts';
import { useForumStore } from '../../store/forumStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PostCard from '../../components/common/PostCard';
import ForwardSheet from '../../components/common/ForwardSheet';
import { BackIcon, SearchIcon } from '../../components/common/icons';
import type { ForumPost } from '../../types';
import { getVotedOptionIndex } from '../../utils/forum';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

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
  const { data: rawResults } = useSearch(query);
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const results = useMemo(() => rawResults?.filter((p) => !isBlocked(p.name)) ?? [], [rawResults, blockedUsers, isBlocked]);
  const votedPolls = useForumStore((s) => s.votedPolls);
  const likePostMutation = useLikePost();
  const bookmarkPostMutation = useBookmarkPost();
  const votePostMutation = useVotePost();
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
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        isAnonymous: post.isAnonymous,
        userName: post.userName,
        displayName: post.name,
      });
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
      const functionId =
        post.functionId ?? (post.functionIndex != null ? String(post.functionIndex) : undefined);
      if (!post.functionType || !functionId) return;
      const nav = navigation.getParent();
      if (!nav) return;
      switch (post.functionType) {
        case 'partner':
          nav.navigate('FunctionsTab', { screen: 'PartnerDetail', params: { id: functionId } });
          break;
        case 'errand':
          nav.navigate('FunctionsTab', { screen: 'ErrandDetail', params: { id: functionId } });
          break;
        case 'secondhand':
          nav.navigate('FunctionsTab', { screen: 'SecondhandDetail', params: { id: functionId } });
          break;
        case 'rating':
          nav.navigate('FunctionsTab', { screen: 'RatingDetail', params: { category: 'teacher' as const, id: functionId } });
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
        onLike={() => likePostMutation.mutate(item.id)}
        onComment={() => handleCommentPress(item)}
        onForward={() => handleForward(item)}
        onBookmark={() => bookmarkPostMutation.mutate(item.id)}
        onQuote={() => handleQuote(item)}
        onTagPress={(tag) => handleTagPress(tag)}
        onFunctionPress={item.isFunction ? () => handleFunctionPress(item) : undefined}
        onQuotedPostPress={(quotedId) => navigation.navigate('PostDetail', { postId: quotedId })}
        onVote={
          item.isPoll
            ? (optIdx) => {
                const optionId = item.pollOptions?.[optIdx]?.id;
                if (optionId) {
                  votePostMutation.mutate({ postId: item.id, optionId, optionIndex: optIdx });
                }
              }
            : undefined
        }
        isLiked={item.liked ?? false}
        isBookmarked={item.bookmarked ?? false}
        votedOptionIndex={getVotedOptionIndex(item, votedPolls)}
      />
    ),
    [results, votedPolls, navigation, likePostMutation, bookmarkPostMutation, votePostMutation, handleTagPress, handleAvatarPress, handleCommentPress, handleForward, handleQuote, handleFunctionPress]
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
                onPress={() => handleTagPress(key)}
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
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          extraData={votedPolls}
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
