import React, { useCallback } from 'react';
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
import type { LikeNotification } from '../../types';
import { useLikeNotifications } from '../../hooks/useNotifications';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, HeartIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyLikes'>;

export default function NotifyLikesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: notifications, isLoading, refetch } = useLikeNotifications();

  const handleAvatarPress = useCallback(
    (userName: string) => {
      navigation.navigate('UserProfile', { userName });
    },
    [navigation]
  );

  const handleContentPress = useCallback(
    (item: LikeNotification) => {
      if (item.action === 'likedYourPost') {
        navigation.navigate('PostDetail', { postId: item.postId });
      } else {
        // likedYourComment or likedYourReply → go to post and scroll to comment
        navigation.navigate('PostDetail', {
          postId: item.postId,
          commentId: item.commentId,
        });
      }
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: LikeNotification }) => (
      <View style={styles.notificationItem}>
        <TouchableOpacity onPress={() => handleAvatarPress(item.user)}>
          <Avatar
            text={item.user}
            uri={item.avatar || null}
            size="md"
            gender={item.gender}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.notificationContent}
          activeOpacity={0.7}
          onPress={() => handleContentPress(item)}
        >
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationUser} numberOfLines={1}>
              {item.user}
            </Text>
            <Text style={styles.notificationTime}>{item.time}</Text>
          </View>
          <View style={styles.actionRow}>
            <HeartIcon size={14} color={colors.error} fill={colors.error} />
            <Text style={styles.notificationAction}>
              {t(item.action) || 'liked your post'}
            </Text>
          </View>
          {item.content ? (
            <View style={styles.previewContainer}>
              <Text style={styles.previewText} numberOfLines={2}>
                {item.content}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    ),
    [t, handleAvatarPress, handleContentPress]
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
          {t('likeNotifications') || 'Likes'}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  notificationContent: {
    flex: 1,
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
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notificationAction: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  previewContainer: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    marginTop: spacing.xxs,
  },
  previewText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
