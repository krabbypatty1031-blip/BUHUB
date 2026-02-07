import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { UserPost, UserComment } from '../../types';
import { useProfile, useMyContent } from '../../hooks/useUser';
import { useAuthStore } from '../../store/authStore';
import { useForumStore } from '../../store/forumStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { ProfileSkeleton } from '../../components/common/Skeleton';
import {
  EditIcon,
  ShareIcon,
  SettingsIcon,
  LinkIcon,
  HelpCircleIcon,
  LockIcon,
  HeartIcon,
  UsersIcon,
  BookmarkIcon,
  CommentIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'MeHome'>;

type MeTab = 'posts' | 'comments' | 'anonPosts' | 'anonComments' | 'bookmarks';

interface TabDef {
  key: MeTab;
  labelKey: string;
  locked: boolean;
}

const TABS: TabDef[] = [
  { key: 'posts', labelKey: 'tabPosts', locked: false },
  { key: 'comments', labelKey: 'tabComments', locked: false },
  { key: 'anonPosts', labelKey: 'tabAnonPosts', locked: true },
  { key: 'anonComments', labelKey: 'tabAnonComments', locked: true },
  { key: 'bookmarks', labelKey: 'tabBookmarks', locked: true },
];

/* ── Post card (used in posts / anonPosts / bookmarks tabs) ── */
const PostItem = React.memo(function PostItem({ post }: { post: UserPost }) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.cardContent} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{post.time}</Text>
        <Text style={styles.cardStats}>
          {post.likes} likes · {post.comments} comments
        </Text>
      </View>
    </View>
  );
});

/* ── Comment card (used in comments / anonComments tabs) ── */
const CommentItem = React.memo(function CommentItem({
  comment,
  t,
}: {
  comment: UserComment;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.commentRef} numberOfLines={1}>
        {t('replyTo')} {comment.postAuthor}: {comment.postContent}
      </Text>
      <Text style={styles.cardContent}>{comment.comment}</Text>
      <Text style={styles.cardTime}>{comment.time}</Text>
    </View>
  );
});

export default function MeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();
  const { data: myContent } = useMyContent();
  const user = useAuthStore((s) => s.user);
  const bookmarkedPosts = useForumStore((s) => s.bookmarkedPosts);
  const [activeTab, setActiveTab] = useState<MeTab>('posts');

  const displayUser = profile || user;

  /* ── Empty label map ── */
  const emptyLabels: Record<MeTab, string> = useMemo(
    () => ({
      posts: t('noPosts') || 'No posts',
      comments: t('noComments') || 'No comments',
      anonPosts: t('noAnonPosts') || 'No anonymous posts',
      anonComments: t('noAnonComments') || 'No anonymous comments',
      bookmarks: t('noBookmarks') || 'No bookmarks',
    }),
    [t]
  );

  /* ── Tab content data ── */
  const tabData = useMemo(() => {
    if (!myContent)
      return { posts: [], comments: [], anonPosts: [], anonComments: [], bookmarks: [] };
    return {
      posts: myContent.posts,
      comments: myContent.comments,
      anonPosts: myContent.anonPosts,
      anonComments: myContent.anonComments,
      bookmarks: [] as UserPost[], // bookmarked posts would come from a joined query
    };
  }, [myContent]);

  /* ── Tab content renderer ── */
  const renderTabContent = useCallback(() => {
    const isComment = activeTab === 'comments' || activeTab === 'anonComments';
    const isEmpty = isComment
      ? (tabData[activeTab] as UserComment[]).length === 0
      : (tabData[activeTab] as UserPost[]).length === 0;

    if (isEmpty) {
      const iconMap: Record<MeTab, React.ReactNode> = {
        posts: <EditIcon size={32} color={colors.onSurfaceVariant} />,
        comments: <CommentIcon size={32} color={colors.onSurfaceVariant} />,
        anonPosts: <LockIcon size={32} color={colors.onSurfaceVariant} />,
        anonComments: <LockIcon size={32} color={colors.onSurfaceVariant} />,
        bookmarks: <BookmarkIcon size={32} color={colors.onSurfaceVariant} />,
      };
      return (
        <EmptyState
          icon={iconMap[activeTab]}
          title={emptyLabels[activeTab]}
        />
      );
    }

    if (isComment) {
      return (tabData[activeTab] as UserComment[]).map((c, i) => (
        <CommentItem key={i} comment={c} t={t} />
      ));
    }

    return (tabData[activeTab] as UserPost[]).map((p, i) => (
      <PostItem key={i} post={p} />
    ));
  }, [activeTab, tabData, emptyLabels, t]);

  if (isLoading && !displayUser) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Upper Half: Profile ── */}
        <View style={styles.profileSection}>
          {/* Top icons row */}
          <View style={styles.topIconsRow}>
            <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.6}>
              <HelpCircleIcon size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <View style={styles.topIconsRight}>
              <TouchableOpacity
                style={styles.topIconBtn}
                activeOpacity={0.6}
                onPress={() => navigation.navigate('Settings')}
              >
                <SettingsIcon size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.6}>
                <LinkIcon size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile info row: left info + right avatar */}
          <View style={styles.profileInfoRow}>
            {/* Left: info */}
            <View style={styles.profileInfoLeft}>
              <Text style={styles.nickname}>
                {displayUser?.nickname || displayUser?.name || '---'}
              </Text>
              <Text style={styles.meta}>
                {[displayUser?.major, displayUser?.grade]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              {/* Stats: followers + likes */}
              <View style={styles.miniStats}>
                <View style={styles.miniStatItem}>
                  <UsersIcon size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.miniStatValue}>0</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followersStat') || 'Followers'}
                  </Text>
                </View>
                <View style={styles.miniStatItem}>
                  <HeartIcon size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.miniStatValue}>0</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('receivedLikes') || 'Likes'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right: avatar */}
            <Avatar
              text={displayUser?.nickname || displayUser?.name || '?'}
              uri={displayUser?.avatar}
              size="xl"
              gender={displayUser?.gender}
            />
          </View>
        </View>

        {/* ── Lower Half: Content ── */}
        <View style={styles.contentSection}>
          {/* Action buttons: Edit Profile + Share Profile */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <EditIcon size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>
                {t('editProfile') || 'Edit Profile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <ShareIcon size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>
                {t('shareProfile') || 'Share Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            style={styles.tabBar}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  {tab.locked && (
                    <LockIcon
                      size={12}
                      color={
                        isActive
                          ? colors.primary
                          : colors.onSurfaceVariant
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.tabTextActive,
                    ]}
                  >
                    {t(tab.labelKey) || tab.labelKey}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tab content */}
          <View style={styles.tabContent}>{renderTabContent()}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* ── Upper: Profile section ── */
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  topIconsRight: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  topIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfoLeft: {
    flex: 1,
    marginRight: spacing.lg,
  },
  nickname: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  meta: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  miniStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  miniStatValue: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* ── Lower: Content section ── */
  contentSection: {
    flex: 1,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  actionBtnText: {
    ...typography.labelMedium,
    color: colors.primary,
  },

  /* Tab bar */
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  tabBarContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
    minHeight: 44,
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  /* Tab content */
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  /* Content cards */
  contentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },
  cardContent: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  cardStats: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  commentRef: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
});
