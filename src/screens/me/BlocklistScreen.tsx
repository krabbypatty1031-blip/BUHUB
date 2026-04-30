import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import type { FollowListItem } from '../../types';
import { useBlockedList, useUnblockUser } from '../../hooks/useUser';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import ScreenHeader from '../../components/common/ScreenHeader';
import { UsersIcon } from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MeStackParamList, 'Blocklist'>;

const BlockedItem = React.memo(function BlockedItem({
  item,
  onPress,
  onUnblock,
  unblockLabel,
}: {
  item: FollowListItem;
  onPress: () => void;
  onUnblock: () => void;
  unblockLabel: string;
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
        style={styles.unblockBtn}
        activeOpacity={0.7}
        onPress={onUnblock}
      >
        <Text style={styles.unblockBtnText}>{unblockLabel}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function BlocklistScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: blockedData } = useBlockedList();
  const unblockUserMutation = useUnblockUser();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const currentUser = useAuthStore((s) => s.user);

  const handleUnblock = useCallback((userName: string) => {
    Alert.alert(t('unblock'), t('unblockConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          unblockUserMutation.mutate(userName);
          showSnackbar({ message: t('unblocked'), type: 'success' });
        },
      },
    ]);
  }, [unblockUserMutation, showSnackbar, t]);

  const unblockLabel = t('unblock');

  const renderItem = useCallback(({ item }: { item: FollowListItem }) => {
    const handlePress = () => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName,
        displayName: item.userName,
        cachedAvatar: item.avatar,
        cachedNickname: item.userName,
        cachedGender: item.gender,
      });
    };
    return (
      <BlockedItem
        item={item}
        onPress={handlePress}
        onUnblock={() => handleUnblock(item.userName)}
        unblockLabel={unblockLabel}
      />
    );
  }, [navigation, currentUser, handleUnblock, unblockLabel]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('blocklist')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
      />

      <FlashList
        data={blockedData || []}
        keyExtractor={(item) => item.userName}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState icon={<UsersIcon size={32} color={colors.onSurfaceVariant} />} title={t('blocklistEmpty')} />
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
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockBtnText: {
    ...typography.labelMedium,
    color: colors.error,
  },
});
