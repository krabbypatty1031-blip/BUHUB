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
import type { UserPost, UserComment, LikedPost, LikedComment, WantedItem, ForumPost } from '../../types';
import { useProfile, useMyContent } from '../../hooks/useUser';
import { usePosts } from '../../hooks/usePosts';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useAuthStore } from '../../store/authStore';
import { useForumStore } from '../../store/forumStore';
import { useSecondhandStore } from '../../store/secondhandStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { ProfileSkeleton } from '../../components/common/Skeleton';
import TabBar, { type TabOption } from '../../components/common/TabBar';
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
  ShoppingBagIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'MeHome'>;

type MeTab = 'posts' | 'comments' | 'anonPosts' | 'anonComments' | 'bookmarks' | 'myLikes' | 'myWants';

interface TabDef {
  key: MeTab;
  labelKey: string;
  locked: boolean;
}

const TAB_DEFS: TabDef[] = [
  { key: 'posts', labelKey: 'tabPosts', locked: false },
  { key: 'comments', labelKey: 'tabComments', locked: false },
  { key: 'anonPosts', labelKey: 'tabAnonPosts', locked: true },
  { key: 'anonComments', labelKey: 'tabAnonComments', locked: true },
  { key: 'bookmarks', labelKey: 'tabBookmarks', locked: true },
  { key: 'myLikes', labelKey: 'tabMyLikes', locked: false },
  { key: 'myWants', labelKey: 'tabMyWants', locked: false },
];

/*
 * Unified content card layout:
 *   [Context line]   ← optional, only for comment-type
 *   [Body text]      ← main content, max 3 lines
 *   [Footer]         ← left: metrics/author info, right: time
 */

/* ── Post card (own posts / anonPosts) ── */
const PostItem = React.memo(function PostItem({ post, author, onPress }: { post: UserPost; author: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.contentCard} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardBody} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerMetrics}>
          <Text style={styles.footerAuthor}>{author}</Text>
          <Text style={styles.footerDot}>·</Text>
          <HeartIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{post.likes}</Text>
          <CommentIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{post.comments}</Text>
        </View>
        <Text style={styles.footerTime}>{post.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ── Comment card (own comments / anonComments) ── */
const CommentItem = React.memo(function CommentItem({
  comment,
  t,
  onPress,
}: {
  comment: UserComment;
  t: (key: string) => string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contentCard} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardContext} numberOfLines={1}>
        {t('replyTo')} {comment.postAuthor}: {comment.postContent}
      </Text>
      <Text style={styles.cardBody} numberOfLines={3}>{comment.comment}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerMetrics}>
          <HeartIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{comment.likes}</Text>
        </View>
        <Text style={styles.footerTime}>{comment.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ── Liked post card ── */
const LikedPostItem = React.memo(function LikedPostItem({ post, onPress }: { post: LikedPost; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.contentCard} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardBody} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerMetrics}>
          <Text style={styles.footerAuthor}>{post.author}</Text>
          <Text style={styles.footerDot}>·</Text>
          <HeartIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{post.likes}</Text>
          <CommentIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{post.comments}</Text>
        </View>
        <Text style={styles.footerTime}>{post.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ── Liked comment card ── */
const LikedCommentItem = React.memo(function LikedCommentItem({
  comment,
  t,
  onPress,
}: {
  comment: LikedComment;
  t: (key: string) => string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contentCard} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardContext} numberOfLines={1}>
        {comment.commentAuthor} {t('replyTo')} {comment.postAuthor}: {comment.postContent}
      </Text>
      <Text style={styles.cardBody} numberOfLines={3}>{comment.comment}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerMetrics}>
          <HeartIcon size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.footerMetricText}>{comment.likes}</Text>
        </View>
        <Text style={styles.footerTime}>{comment.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

/* ── Wanted item card ── */
const WantedItemCard = React.memo(function WantedItemCard({ item, onPress }: { item: WantedItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.contentCard} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.cardBody} numberOfLines={3}>
        {item.title}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerMetrics}>
          <Text style={styles.footerAuthor}>{item.seller}</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerMetricText}>{item.price}</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerMetricText}>{item.condition}</Text>
        </View>
        <Text style={styles.footerTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function MeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();
  const { data: myContent } = useMyContent();
  const { data: allPosts } = usePosts();
  const { data: allSecondhand } = useSecondhand();
  const user = useAuthStore((s) => s.user);
  const likedPostIds = useForumStore((s) => s.likedPosts);
  const bookmarkedPostIds = useForumStore((s) => s.bookmarkedPosts);
  const wantedItemIds = useSecondhandStore((s) => s.wantedItems);
  const [activeTab, setActiveTab] = useState<MeTab>('posts');
  const [contactModalVisible, setContactModalVisible] = useState(false);

  const displayUser = profile || user;
  const stats = myContent?.stats;

  /* ── Derive liked & bookmarked posts from forumStore + real data ── */
  const storeLikedPosts = useMemo<LikedPost[]>(() => {
    if (!allPosts) return [];
    return allPosts
      .filter((p) => likedPostIds.has(p.id))
      .map((p) => ({
        postId: p.id,
        author: p.name,
        avatar: p.avatar,
        gender: p.gender,
        content: p.content,
        time: p.meta.split('·').pop()?.trim() || '',
        likes: p.likes,
        comments: p.comments,
      }));
  }, [allPosts, likedPostIds]);

  const storeBookmarkedPosts = useMemo<LikedPost[]>(() => {
    if (!allPosts) return [];
    return allPosts
      .filter((p) => bookmarkedPostIds.has(p.id))
      .map((p) => ({
        postId: p.id,
        author: p.name,
        avatar: p.avatar,
        gender: p.gender,
        content: p.content,
        time: p.meta.split('·').pop()?.trim() || '',
        likes: p.likes,
        comments: p.comments,
      }));
  }, [allPosts, bookmarkedPostIds]);

  /* ── Derive wanted items from secondhandStore + real data ── */
  const storeWantedItems = useMemo<WantedItem[]>(() => {
    if (!allSecondhand) return [];
    return allSecondhand
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx }) => wantedItemIds.has(idx))
      .map(({ item, idx }) => ({
        itemIndex: idx,
        title: item.title,
        price: item.price,
        condition: item.condition,
        seller: item.user,
        avatar: item.avatar,
        gender: item.gender,
        time: item.createdAt,
      }));
  }, [allSecondhand, wantedItemIds]);

  /* ── Tab options ── */
  const tabOptions = useMemo<TabOption<MeTab>[]>(
    () =>
      TAB_DEFS.map((tab) => ({
        value: tab.key,
        label: t(tab.labelKey),
        icon: tab.locked ? <LockIcon size={12} color={colors.onSurfaceVariant} /> : undefined,
        disabled: false,
      })),
    [t]
  );

  /* ── Empty label map ── */
  const emptyLabels: Record<MeTab, string> = useMemo(
    () => ({
      posts: t('noPosts'),
      comments: t('noComments'),
      anonPosts: t('noAnonPosts'),
      anonComments: t('noAnonComments'),
      bookmarks: t('noBookmarks'),
      myLikes: t('noLikeRecords'),
      myWants: t('noWantRecords'),
    }),
    [t]
  );

  /* ── Navigation helpers ── */
  const goToPost = useCallback(
    (postId: string) => navigation.navigate('PostDetail', { postId }),
    [navigation]
  );
  const goToComment = useCallback(
    (postId: string, commentId: string) => navigation.navigate('PostDetail', { postId, commentId }),
    [navigation]
  );
  const goToSecondhand = useCallback(
    (index: number) =>
      navigation.getParent()?.navigate('FunctionsTab', {
        screen: 'SecondhandDetail',
        params: { index },
      }),
    [navigation]
  );

  /* ── Tab content renderer ── */
  const renderTabContent = useCallback(() => {
    if (!myContent) {
      return <EmptyState icon={<EditIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels[activeTab]} />;
    }

    /* ── myLikes tab: derived from forumStore ── */
    if (activeTab === 'myLikes') {
      if (storeLikedPosts.length === 0) {
        return <EmptyState icon={<HeartIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.myLikes} />;
      }
      return (
        <>
          {storeLikedPosts.map((p) => (
            <LikedPostItem key={p.postId} post={p} onPress={() => goToPost(p.postId)} />
          ))}
        </>
      );
    }

    /* ── myWants tab: secondhand items user wants ── */
    if (activeTab === 'myWants') {
      const wants = storeWantedItems;
      if (wants.length === 0) {
        return <EmptyState icon={<ShoppingBagIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.myWants} />;
      }
      return (
        <>
          {wants.map((item, i) => (
            <WantedItemCard key={`w-${i}`} item={item} onPress={() => goToSecondhand(item.itemIndex)} />
          ))}
        </>
      );
    }

    /* ── bookmarks tab: derived from forumStore ── */
    if (activeTab === 'bookmarks') {
      if (storeBookmarkedPosts.length === 0) {
        return <EmptyState icon={<BookmarkIcon size={32} color={colors.onSurfaceVariant} />} title={emptyLabels.bookmarks} />;
      }
      return (
        <>
          {storeBookmarkedPosts.map((p) => (
            <LikedPostItem key={p.postId} post={p} onPress={() => goToPost(p.postId)} />
          ))}
        </>
      );
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
        <CommentItem key={i} comment={c} t={t} onPress={() => goToComment(c.postId, c.commentId)} />
      ));
    }
    const postAuthor = activeTab === 'anonPosts' ? t('anonymousUser') : (displayUser?.nickname || displayUser?.name || '');
    return (myContent[activeTab] as UserPost[]).map((p, i) => (
      <PostItem key={i} post={p} author={postAuthor} onPress={() => goToPost(p.postId)} />
    ));
  }, [activeTab, myContent, emptyLabels, t, goToPost, goToComment, goToSecondhand, storeLikedPosts, storeBookmarkedPosts, storeWantedItems, displayUser]);

  if (isLoading && !displayUser) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarIconBtn}
          activeOpacity={0.6}
          onPress={() => setContactModalVisible(true)}
        >
          <HelpCircleIcon size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.topBarIconBtn}
            activeOpacity={0.6}
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Upper Half: Profile ── */}
        <View style={styles.profileSection}>
          {/* Profile info row: left info + right avatar */}
          <View style={styles.profileInfoRow}>
            {/* Left: info */}
            <View style={styles.profileInfoLeft}>
              <Text style={styles.nickname}>
                {displayUser?.nickname || displayUser?.name || '---'}
              </Text>
              <Text style={styles.meta}>
                {[displayUser?.major ? t(displayUser.major) : undefined, displayUser?.grade ? t(displayUser.grade) : undefined]
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
                <TouchableOpacity
                  style={styles.miniStatItem}
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('FollowList', { type: 'following' })}
                >
                  <Text style={styles.miniStatValue}>{stats?.following ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followingStat')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.miniStatItem}
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('FollowList', { type: 'followers' })}
                >
                  <Text style={styles.miniStatValue}>{stats?.followers ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>
                    {t('followersStat')}
                  </Text>
                </TouchableOpacity>
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
              <EditIcon size={16} color={colors.onPrimary} />
              <Text style={styles.actionBtnText}>
                {t('editProfile')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ShareProfile')}
            >
              <ShareIcon size={16} color={colors.onPrimary} />
              <Text style={styles.actionBtnText}>
                {t('shareProfile')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <TabBar options={tabOptions} value={activeTab} onChange={setActiveTab} />

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
                <CloseIcon size={20} color={colors.onSurface} />
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

  /* ── Top Bar ── */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Upper: Profile section ── */
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  bio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  miniStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniStatValue: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  miniStatLabel: {
    ...typography.bodyMedium,
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
    backgroundColor: colors.onSurface,
  },
  actionBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },

  /* Tab content */
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  /* ── Unified content cards ── */
  contentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    marginBottom: spacing.sm,
  },
  cardContext: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  cardBody: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerMetricText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  footerAuthor: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  footerDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  footerTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* Contact Us Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
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
    color: colors.onSurface,
  },
  contactValue: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  contactDesc: {
    ...typography.bodySmall,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 18,
  },
});
