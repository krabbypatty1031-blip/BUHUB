import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { FollowListItem } from '../../types';
import { useFollowingList, useFollowersList, useFollowUser } from '../../hooks/useUser';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { BackIcon, UsersIcon } from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MeStackParamList, 'FollowList'>;

const FollowItem = React.memo(function FollowItem({
  item,
  onPress,
  onToggleFollow,
  followedLabel,
  followLabel,
  t,
}: {
  item: FollowListItem;
  onPress: () => void;
  onToggleFollow: () => void;
  followedLabel: string;
  followLabel: string;
  t: (key: string) => string;
}) {
  const majorLabel = item.major ? t(item.major) : '';
  const gradeLabel = item.grade ? t(item.grade) : '';
  const subInfo = [majorLabel, gradeLabel].filter(Boolean).join(' / ');
  const displayName = item.nickname || item.userName;

  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
      <Avatar text={displayName} uri={item.avatar} size="md" gender={item.gender} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{displayName}</Text>
        {subInfo ? (
          <Text style={styles.itemSubInfo} numberOfLines={1}>{subInfo}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item.isFollowed && styles.followBtnFollowed]}
        activeOpacity={0.7}
        onPress={onToggleFollow}
      >
        <Text style={[styles.followBtnText, item.isFollowed && styles.followBtnTextFollowed]}>
          {item.isFollowed ? followedLabel : followLabel}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function FollowListScreen({ navigation, route }: Props) {
  const { type } = route.params;
  const { t } = useTranslation();
  const { data: followingData } = useFollowingList();
  const { data: followersData } = useFollowersList();
  const { mutate: followUser } = useFollowUser();
  const currentUser = useAuthStore((s) => s.user);

  const sourceData = type === 'following' ? followingData : followersData;

  const handleToggleFollow = useCallback((userName: string) => {
    followUser(userName);
  }, [followUser]);

  const followedLabel = t('alreadyFollowed');
  const followLabel = t('follow');

  const renderItem = useCallback(({ item }: { item: FollowListItem }) => {
    const handlePress = () => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName,
        displayName: item.nickname ?? item.userName,
      });
    };
    return (
      <FollowItem
        item={item}
        onPress={handlePress}
        onToggleFollow={() => handleToggleFollow(item.userName)}
        followedLabel={followedLabel}
        followLabel={followLabel}
        t={t}
      />
    );
  }, [navigation, currentUser, handleToggleFollow, followedLabel, followLabel, t]);

  const title = type === 'following' ? t('followingListTitle') : t('followersListTitle');
  const emptyText = type === 'following' ? t('noFollowingYet') : t('noFollowersYet');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.6} onPress={() => navigation.goBack()}>
          <BackIcon size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={sourceData || []}
        keyExtractor={(item) => item.userName}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState icon={<UsersIcon size={32} color={colors.onSurfaceVariant} />} title={emptyText} />
        }
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  itemName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemSubInfo: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    minWidth: 80,
    alignItems: 'center',
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

