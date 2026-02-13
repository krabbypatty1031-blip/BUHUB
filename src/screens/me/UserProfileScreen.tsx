import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { usePublicProfile, useFollowUser, useBlockUser } from '../../hooks/useUser';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, UsersIcon, MessageIcon, MoreHorizontalIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { userName } = route.params;
  const { data: profile, isLoading } = usePublicProfile(userName);
  const followUser = useFollowUser();
  const blockUserMutation = useBlockUser();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (profile?.isFollowedByMe !== undefined) {
      setIsFollowing(profile.isFollowedByMe);
    }
  }, [profile?.isFollowedByMe]);

  const handleBlock = useCallback(() => {
    Alert.alert(t('blockUser'), t('blockUserConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          blockUserMutation.mutate(userName);
          showSnackbar({ message: t('blocked'), type: 'success' });
          navigation.goBack();
        },
      },
    ]);
  }, [t, blockUserMutation, userName, showSnackbar, navigation]);

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

          <Text style={styles.userName}>{profile?.nickname || userName}</Text>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats?.postCount ?? 0}</Text>
              <Text style={styles.statLabel}>{t('postsStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>{t('followingStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats?.followerCount ?? 0}</Text>
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
});
