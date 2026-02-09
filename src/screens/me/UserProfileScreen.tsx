import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { usePublicProfile, useFollowUser } from '../../hooks/useUser';
import { useForumStore } from '../../store/forumStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, UsersIcon, MoreHorizontalIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { userName } = route.params;
  const { data: profile, isLoading } = usePublicProfile(userName);
  const followUser = useFollowUser();
  const blockUser = useForumStore((s) => s.blockUser);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isFollowing, setIsFollowing] = useState(false);

  const handleBlock = useCallback(() => {
    Alert.alert(t('blockUser'), t('blockUserConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          blockUser(userName);
          showSnackbar({ message: t('blocked'), type: 'success' });
          navigation.goBack();
        },
      },
    ]);
  }, [t, blockUser, userName, showSnackbar, navigation]);

  const handleFollow = useCallback(() => {
    followUser.mutate(userName, {
      onSuccess: () => {
        setIsFollowing((prev) => !prev);
      },
    });
  }, [userName, followUser]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{userName}</Text>
          <TouchableOpacity onPress={handleBlock} style={styles.iconBtn}>
            <MoreHorizontalIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {userName}
        </Text>
        <TouchableOpacity onPress={handleBlock} style={styles.iconBtn}>
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar
            text={userName}
            uri={profile?.avatar || null}
            size="xl"
            gender={profile?.gender}
          />

          <Text style={styles.userName}>{userName}</Text>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.posts ?? 0}</Text>
              <Text style={styles.statLabel}>{t('posts') || 'Posts'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.likes ?? 0}</Text>
              <Text style={styles.statLabel}>{t('likes') || 'Likes'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{t('followers') || 'Followers'}</Text>
            </View>
          </View>

          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing && styles.followBtnFollowing,
            ]}
            activeOpacity={0.85}
            onPress={handleFollow}
            disabled={followUser.isPending}
          >
            {followUser.isPending ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? colors.primary : colors.onPrimary}
              />
            ) : (
              <>
                <UsersIcon
                  size={18}
                  color={isFollowing ? colors.primary : colors.onPrimary}
                />
                <Text
                  style={[
                    styles.followBtnText,
                    isFollowing && styles.followBtnTextFollowing,
                  ]}
                >
                  {isFollowing
                    ? t('following') || 'Following'
                    : t('follow') || 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* User Posts */}
        {profile?.userPosts && profile.userPosts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>{t('posts') || 'Posts'}</Text>
            {profile.userPosts.map((post, i) => (
              <View key={i} style={styles.postCard}>
                <Text style={styles.postContent} numberOfLines={3}>
                  {post.content}
                </Text>
                <View style={styles.postFooter}>
                  <Text style={styles.postTime}>{post.time}</Text>
                  <Text style={styles.postStats}>
                    {post.likes} {t('likes') || 'likes'} · {post.comments}{' '}
                    {t('comments') || 'comments'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* User Comments */}
        {profile?.userComments && profile.userComments.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>{t('comments') || 'Comments'}</Text>
            {profile.userComments.map((comment, i) => (
              <View key={i} style={styles.commentCard}>
                <Text style={styles.commentRef} numberOfLines={1}>
                  {t('replyTo')} {comment.postAuthor}: {comment.postContent}
                </Text>
                <Text style={styles.commentBody}>{comment.comment}</Text>
                <Text style={styles.postTime}>{comment.time}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  userName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  bio: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '80%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
  },
  followBtnFollowing: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  followBtnTextFollowing: {
    color: colors.primary,
  },
  // Posts
  postsSection: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  postCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },
  postContent: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  postStats: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  commentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },
  commentRef: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  commentBody: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
});
