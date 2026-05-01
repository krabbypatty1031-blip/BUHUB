import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { FollowerNotification } from '../../types';
import { useFollowerNotifications, useMarkAsRead } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFollowUser } from '../../hooks/useUser';
import { getFollowLabel } from '../../utils/followLabel';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, getLocalizedFontStyle } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ScreenHeader from '../../components/common/ScreenHeader';
import { BrandRefreshControl } from '../../components/common/BrandRefreshControl';
import { UsersIcon, MaleIcon, FemaleIcon } from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyFollowers'>;

function FollowerItem({
  item,
  onAvatarPress,
  language,
}: {
  item: FollowerNotification;
  onAvatarPress: (item: FollowerNotification) => void;
  language: string;
}) {
  const { t } = useTranslation();
  const followUser = useFollowUser();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const targetUserName = item.userName ?? item.user;
  const followed = item.isFollowed;
  const mutual = item.isMutuallyFollowing ?? false;

  const handleFollow = useCallback(() => {
    if (!targetUserName) return;
    followUser.mutate(targetUserName, {
      onError: () => {
        showSnackbar({ message: t('followFailed'), type: 'error' });
      },
    });
  }, [targetUserName, followUser, showSnackbar, t]);

  return (
    <View style={styles.notificationItem}>
      <TouchableOpacity onPress={() => onAvatarPress(item)}>
        <Avatar
          text={item.user}
          uri={item.avatar || null}
          size="md"
          gender={item.gender}
        />
      </TouchableOpacity>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationNameRow}>
            <Text style={[styles.notificationUser, getLocalizedFontStyle(language, 'medium')]} numberOfLines={1}>
              {item.user}
            </Text>
            {item.gender === 'male' ? (
              <MaleIcon size={12} color={colors.genderMale} />
            ) : null}
            {item.gender === 'female' ? (
              <FemaleIcon size={12} color={colors.genderFemale} />
            ) : null}
          </View>
          <Text style={[styles.notificationTime, getLocalizedFontStyle(language, 'regular')]}>{item.time}</Text>
        </View>
        <View style={styles.actionRow}>
          <UsersIcon size={14} color={colors.primary} />
          <Text style={[styles.notificationAction, getLocalizedFontStyle(language, 'regular')]}>
            {t('followedYou')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followBtn,
          followed && styles.followBtnFollowed,
        ]}
        onPress={handleFollow}
        disabled={followUser.isPending || !targetUserName}
        activeOpacity={0.7}
      >
        {followUser.isPending ? (
          <ActivityIndicator size="small" color={followed ? colors.primary : colors.onPrimary} />
        ) : (
          <Text
            style={[
              styles.followBtnText,
              getLocalizedFontStyle(language, 'medium'),
              followed && styles.followBtnTextFollowed,
            ]}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            numberOfLines={1}
          >
            {/* The notification row is historical. Mutual is only true when
              both directions still exist right now — read it from the API. */}
            {getFollowLabel({ isFollowedByMe: followed, isMutuallyFollowing: mutual }, t)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function NotifyFollowersScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: notifications, isLoading, isFetching, refetch } = useFollowerNotifications();

  // Dedupe repeat follows by the same user (keep newest). The list is already
  // newest-first, so the first occurrence per userName is the latest event.
  // Notifications without a userName (e.g. fully-deleted accounts) are kept
  // as-is so two unrelated deleted users don't visually merge.
  const dedupedNotifications = useMemo(() => {
    if (!notifications) return [];
    const seen = new Set<string>();
    const result: typeof notifications = [];
    for (const item of notifications) {
      if (item.userName) {
        if (seen.has(item.userName)) continue;
        seen.add(item.userName);
      }
      result.push(item);
    }
    return result;
  }, [notifications]);
  const markAsRead = useMarkAsRead();
  const setUnreadFollowers = useNotificationStore((s) => s.setUnreadFollowers);
  const currentUser = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const hasMarkedReadOnFocusRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      hasMarkedReadOnFocusRef.current = false;
      return;
    }
    if (hasMarkedReadOnFocusRef.current) return;

    hasMarkedReadOnFocusRef.current = true;
    setUnreadFollowers(0);
    markAsRead.mutate('followers');
  }, [isFocused, markAsRead, setUnreadFollowers]);

  const handleAvatarPress = useCallback(
    (item: FollowerNotification) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName ?? item.user,
        displayName: item.user,
        cachedAvatar: item.avatar,
        cachedNickname: item.user,
        cachedGender: item.gender,
      });
    },
    [navigation, currentUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: FollowerNotification }) => (
      <FollowerItem item={item} onAvatarPress={handleAvatarPress} language={language} />
    ),
    [handleAvatarPress, language]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('followerNotifications')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={dedupedNotifications}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.userName ?? `anon-${item.time}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<BrandRefreshControl refreshing={isFetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('noNotifications')}
              </Text>
            </View>
          }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  notificationUser: {
    ...typography.titleSmall,
    color: colors.onSurface,
    flexShrink: 1,
  },
  notificationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  notificationTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flexShrink: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notificationAction: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  followBtnFollowed: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
  followBtnTextFollowed: {
    color: colors.primary,
  },
});
