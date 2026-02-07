import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { CommentNotification } from '../../types';
import { useCommentNotifications } from '../../hooks/useNotifications';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, CommentIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyComments'>;

export default function NotifyCommentsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: notifications, isLoading, refetch } = useCommentNotifications();

  const renderItem = useCallback(
    ({ item }: { item: CommentNotification }) => (
      <View style={styles.notificationItem}>
        <Avatar
          text={item.user}
          uri={item.avatar || null}
          size="md"
          gender={item.gender}
        />
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationUser} numberOfLines={1}>
              {item.user}
            </Text>
            <Text style={styles.notificationTime}>{item.time}</Text>
          </View>
          <View style={styles.actionRow}>
            <CommentIcon size={14} color={colors.tertiary} />
            <Text style={styles.notificationAction}>
              {t(item.action) || 'commented on your post'}
            </Text>
          </View>
          {/* Comment Preview */}
          {item.comment ? (
            <View style={styles.commentPreview}>
              <Text style={styles.commentText} numberOfLines={2}>
                {item.comment}
              </Text>
            </View>
          ) : null}
          {/* Original Post Reference */}
          {item.originalPost ? (
            <View style={styles.originalPostContainer}>
              <View style={styles.originalPostBar} />
              <Text style={styles.originalPostText} numberOfLines={1}>
                {item.originalPost}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    ),
    [t]
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
          {t('commentNotifications') || 'Comments'}
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
  commentPreview: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface2,
    marginBottom: spacing.xs,
  },
  commentText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  originalPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  originalPostBar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: colors.outlineVariant,
  },
  originalPostText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
});
