import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { UserPost, UserComment, LikedPost, LikedComment } from '../../types';
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
  HelpCircleIcon,
  LockIcon,
  HeartIcon,
  BookmarkIcon,
  CommentIcon,
  CloseIcon,
  QrCodeIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'MeHome'>;

type MeTab = 'posts' | 'comments' | 'anonPosts' | 'anonComments' | 'bookmarks' | 'myLikes';

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
  { key: 'myLikes', labelKey: 'tabMyLikes', locked: false },
];

/* ── Post card (own posts / anonPosts / bookmarks) ── */
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

/* ── Comment card (own comments / anonComments) ── */
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

/* ── Liked post card (shows author info) ── */
const LikedPostItem = React.memo(function LikedPostItem({ post }: { post: LikedPost }) {
  return (
    <View style={styles.contentCard}>
      <View style={styles.likedAuthorRow}>
        <Avatar text={post.author} size="sm" gender={post.gender} />
        <Text style={styles.likedAuthorName}>{post.author}</Text>
      </View>
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

/* ── Liked comment card (shows who commented on which post) ── */
const LikedCommentItem = React.memo(function LikedCommentItem({
  comment,
  t,
}: {
  comment: LikedComment;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.commentRef} numberOfLines={1}>
        {comment.commentAuthor} {t('replyTo')} {comment.postAuthor}: {comment.postContent}
      </Text>
      <Text style={styles.cardContent}>{comment.comment}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{comment.time}</Text>
        <View style={styles.likeIndicator}>
          <HeartIcon size={12} color={colors.error} fill={colors.error} />
          <Text style={styles.cardStats}>{comment.likes}</Text>
        </View>
      </View>
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
  const [contactModalVisible, setContactModalVisible] = useState(false);

  const displayUser = profile || user;
  const stats = myContent?.stats;

  /* ── Empty label map ── */
  const emptyLabels: Record<MeTab, string> = useMemo(
    () => ({
      posts: t('noPosts'),
      comments: t('noComments'),
      anonPosts: t('noAnonPosts'),
      anonComments: t('noAnonComments'),
      bookmarks: t('noBookmarks'),
      myLikes: t('noLikeRecords'),
    }),
    [t]
  );

  /* ── Tab content renderer ── */
  const renderTabContent = useCallback(() => {
    if (!myContent) {
      return <EmptyState icon={<EditIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels[activeTab]} />;
    }

    /* ── myLikes tab: mixed posts + comments ── */
    if (activeTab === 'myLikes') {
      const likedPosts = myContent.myLikes?.posts || [];
      const likedComments = myContent.myLikes?.comments || [];
      if (likedPosts.length === 0 && likedComments.length === 0) {
        return <EmptyState icon={<HeartIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.myLikes} />;
      }
      return (
        <>
          {likedPosts.map((p, i) => (
            <LikedPostItem key={`lp-${i}`} post={p} />
          ))}
          {likedComments.map((c, i) => (
            <LikedCommentItem key={`lc-${i}`} comment={c} t={t} />
          ))}
        </>
      );
    }

    /* ── bookmarks tab ── */
    if (activeTab === 'bookmarks') {
      // bookmarked posts placeholder
      return <EmptyState icon={<BookmarkIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.bookmarks} />;
    }

    /* ── comment-based tabs ── */
    const isComment = activeTab === 'comments' || activeTab === 'anonComments';
    const data = isComment
      ? (myContent[activeTab] as UserComment[])
      : (myContent[activeTab] as UserPost[]);

    if (data.length === 0) {
      const iconMap: Record<string, React.ReactNode> = {
        posts: <EditIcon size={32} color={colors.onSurfaceVariant} />,
        comments: <CommentIcon size={32} color={colors.onSurfaceVariant} />,
        anonPosts: <LockIcon size={32} color={colors.onSurfaceVariant} />,
        anonComments: <LockIcon size={32} color={colors.onSurfaceVariant} />,
      };
      return <EmptyState icon={iconMap[activeTab]} title={emptyLabels[activeTab]} />;
    }

    if (isComment) {
      return (myContent[activeTab] as UserComment[]).map((c, i) => (
        <CommentItem key={i} comment={c} t={t} />
      ));
    }
    return (myContent[activeTab] as UserPost[]).map((p, i) => (
      <PostItem key={i} post={p} />
    ));
  }, [activeTab, myContent, emptyLabels, t]);

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
            <TouchableOpacity
              style={styles.topIconBtn}
              activeOpacity={0.6}
              onPress={() => setContactModalVisible(true)}
            >
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

              {/* Bio (shown only when set) */}
              {displayUser?.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {displayUser.bio}
                </Text>
              ) : null}

              {/* Stats: 关注 + 粉丝 + 赞藏 */}
              <View style={styles.miniStats}>
                <View style={styles.miniStatItem}>
                  <Text style={styles.miniStatValue}>{stats?.following ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followingStat')}
                  </Text>
                </View>
                <View style={styles.miniStatItem}>
                  <Text style={styles.miniStatValue}>{stats?.followers ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followersStat')}
                  </Text>
                </View>
                <View style={styles.miniStatItem}>
                  <Text style={styles.miniStatValue}>{stats?.collection ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('collectionStat')}
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
                {t('editProfile')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ShareProfile')}
            >
              <ShareIcon size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>
                {t('shareProfile')}
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
                    {t(tab.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tab content */}
          <View style={styles.tabContent}>{renderTabContent()}</View>
        </View>
      </ScrollView>

      {/* Contact Us Modal */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContactModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('contactUs')}</Text>
              <TouchableOpacity
                onPress={() => setContactModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* QR Code placeholder */}
            <View style={styles.qrSection}>
              <View style={styles.qrPlaceholder}>
                <QrCodeIcon size={80} color={colors.primary} />
              </View>
            </View>

            {/* WhatsApp Number */}
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactLabel}>{t('whatsappNumber')}</Text>
              <Text style={styles.contactValue}>+852 1234 5678</Text>
            </View>

            {/* Description */}
            <Text style={styles.contactDesc}>{t('contactUsDesc')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: spacing.xs,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
    fontStyle: 'italic',
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

  /* Liked content specific */
  likedAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  likedAuthorName: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  likeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },

  /* Contact Us Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  contactLabel: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  contactValue: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  contactDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
