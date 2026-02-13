import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { FollowerNotification } from '../../types';
import { useFollowerNotifications } from '../../hooks/useNotifications';
import { useFollowUser } from '../../hooks/useUser';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, UsersIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyFollowers'>;

function FollowerItem({ item }: { item: FollowerNotification }) {
  const { t } = useTranslation();
  const followUser = useFollowUser();
  const [followed, setFollowed] = useState(item.isFollowed);

  const handleFollow = useCallback(() => {
    followUser.mutate(item.user, {
      onSuccess: () => {
        setFollowed((prev) => !prev);
      },
    });
  }, [item.user, followUser]);

  return (
    <View style={styles.notificationItem}>
      <Avatar
        text={item.user}
        uri={item.avatar || null}
        size="md"
        gender={item.gender}
      />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationUser} numberOfLines={1}>
          {item.user}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.notificationTime}>{item.time}</Text>
          <UsersIcon size={14} color={colors.primary} />
          <Text style={styles.notificationAction}>
            {t('followedYou')}
          </Text>
        </View>
        {item.bio ? (
          <Text style={styles.bioText} numberOfLines={1}>
            {item.bio}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.followBackBtn,
          followed && styles.followBackBtnFollowed,
        ]}
        onPress={handleFollow}
        disabled={followUser.isPending}
        activeOpacity={0.7}
      >
        {followUser.isPending ? (
          <ActivityIndicator size="small" color={followed ? colors.primary : colors.onPrimary} />
        ) : (
          <Text
            style={[
              styles.followBackText,
              followed && styles.followBackTextFollowed,
            ]}
          >
            {followed
              ? t('followed')
              : t('followBack')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function NotifyFollowersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: notifications, isLoading, refetch } = useFollowerNotifications();

  const renderItem = useCallback(
    ({ item }: { item: FollowerNotification }) => <FollowerItem item={item} />,
    []
  );

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
        <Text style={styles.topBarTitle}>
          {t('followerNotifications') || 'Followers'}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications || []}
          renderItem={renderItem}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('noNotifications') || 'No notifications yet'}
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
  },
  notificationUser: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xxs,
  },
  notificationTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  notificationAction: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  bioText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  followBackBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  followBackBtnFollowed: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followBackText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
  followBackTextFollowed: {
    color: colors.primary,
  },
});
