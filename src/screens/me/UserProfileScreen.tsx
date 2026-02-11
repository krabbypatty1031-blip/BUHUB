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
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { UserPost } from '../../types/user';
import { usePublicProfile, useFollowUser } from '../../hooks/useUser';
import { useForumStore } from '../../store/forumStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, UsersIcon, MessageIcon, MoreHorizontalIcon, HeartIcon, CommentIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'UserProfile'>;

function getPostContent(post: UserPost, lang: string): string {
  if (lang === 'tc' || lang === post.lang) return post.content;
  if (lang === 'sc' && post.translated?.sc) return post.translated.sc;
  if (lang === 'en' && post.translated?.en) return post.translated.en;
  return post.content;
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
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

  const handleMessage = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'MessagesTab',
        params: {
          screen: 'Chat',
          params: {
            contactName: userName,
            contactAvatar: profile?.avatar || userName,
          },
        },
      })
    );
  }, [navigation, userName, profile]);

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
              <Text style={styles.statLabel}>{t('postsStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.likes ?? 0}</Text>
              <Text style={styles.statLabel}>{t('likesStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{t('followersStat')}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {/* Message Button */}
            <TouchableOpacity
              style={styles.messageBtn}
              activeOpacity={0.85}
              onPress={handleMessage}
            >
              <MessageIcon size={18} color={colors.onPrimary} />
              <Text style={styles.messageBtnText}>{t('message')}</Text>
            </TouchableOpacity>

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
        </View>

        {/* User Posts */}
        {profile?.userPosts && profile.userPosts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>{t('tabPosts')}</Text>
            {profile.userPosts.map((post, i) => (
              <TouchableOpacity
                key={i}
                style={styles.postCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PostDetail', { postId: post.postId })}
              >
                <Text style={styles.postContent} numberOfLines={3}>
                  {getPostContent(post, i18n.language)}
                </Text>
                <View style={styles.postFooter}>
                  <View style={styles.postMetrics}>
                    <Text style={styles.postAuthor}>{userName}</Text>
                    <Text style={styles.postDot}>·</Text>
                    <HeartIcon size={13} color={colors.onSurfaceVariant} />
                    <Text style={styles.postMetricText}>{post.likes}</Text>
                    <CommentIcon size={13} color={colors.onSurfaceVariant} />
                    <Text style={styles.postMetricText}>{post.comments}</Text>
                  </View>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
              </TouchableOpacity>
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
  actionRow: {
    flexDirection: 'row',
    width: '80%',
    gap: spacing.sm,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.onSurface,
  },
  messageBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  postMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postAuthor: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  postDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  postMetricText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  postTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
