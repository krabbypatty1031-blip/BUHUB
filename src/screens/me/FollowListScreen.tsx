import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { FollowListItem } from '../../types';
import { useFollowingList, useFollowersList, useFollowUser } from '../../hooks/useUser';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { BackIcon, UsersIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'FollowList'>;

const FollowItem = React.memo(function FollowItem({
  item,
  onPress,
  onToggleFollow,
  followedLabel,
  followLabel,
}: {
  item: FollowListItem & { _followed: boolean };
  onPress: () => void;
  onToggleFollow: () => void;
  followedLabel: string;
  followLabel: string;
}) {
  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
      <Avatar text={item.userName} uri={item.avatar} size="md" gender={item.gender} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.userName}</Text>
        {item.bio ? (
          <Text style={styles.itemBio} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item._followed && styles.followBtnFollowed]}
        activeOpacity={0.7}
        onPress={onToggleFollow}
      >
        <Text style={[styles.followBtnText, item._followed && styles.followBtnTextFollowed]}>
          {item._followed ? followedLabel : followLabel}
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

  const sourceData = type === 'following' ? followingData : followersData;

  // Local follow state overrides
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});

  const data = (sourceData || []).map((item) => ({
    ...item,
    _followed: followOverrides[item.userName] ?? item.isFollowed,
  }));

  const handleToggleFollow = useCallback((userName: string) => {
    setFollowOverrides((prev) => ({
      ...prev,
      [userName]: !(prev[userName] ?? sourceData?.find((i) => i.userName === userName)?.isFollowed ?? false),
    }));
    followUser(userName);
  }, [followUser, sourceData]);

  const followedLabel = t('followed');
  const followLabel = t('follow');

  const renderItem = useCallback(({ item }: { item: FollowListItem & { _followed: boolean } }) => (
    <FollowItem
      item={item}
      onPress={() => navigation.navigate('UserProfile', { userName: item.userName })}
      onToggleFollow={() => handleToggleFollow(item.userName)}
      followedLabel={followedLabel}
      followLabel={followLabel}
    />
  ), [navigation, handleToggleFollow, followedLabel, followLabel]);

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
        data={data}
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  itemName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemBio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
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
