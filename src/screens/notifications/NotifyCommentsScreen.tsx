import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { CommentNotification } from '../../types';
import { useCommentNotifications, useMarkAsRead } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, getLocalizedFontStyle } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ScreenHeader from '../../components/common/ScreenHeader';
import { CommentIcon, MaleIcon, FemaleIcon } from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyComments'>;

export default function NotifyCommentsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: notifications, isLoading, refetch } = useCommentNotifications();
  const markAsRead = useMarkAsRead();
  const setUnreadComments = useNotificationStore((s) => s.setUnreadComments);
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
    setUnreadComments(0);
    markAsRead.mutate('comments');
  }, [isFocused, markAsRead, setUnreadComments]);

  const handleAvatarPress = useCallback(
    (item: CommentNotification) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName ?? item.user,
        displayName: item.user,
        isAnonymous: item.isAnonymous,
        cachedAvatar: item.avatar,
        cachedNickname: item.user,
        cachedGender: item.gender,
      });
    },
    [navigation, currentUser]
  );

  const handleContentPress = useCallback(
    (item: CommentNotification) => {
      if (!item.postId) return;
      navigation.navigate('PostDetail', {
        postId: item.postId,
        commentId: item.commentId,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentNotification }) => (
      <View style={styles.notificationItem}>
        <TouchableOpacity onPress={() => handleAvatarPress(item)}>
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
            <CommentIcon size={14} color={colors.tertiary} />
            <Text style={[styles.notificationAction, getLocalizedFontStyle(language, 'regular')]}>
              {t(item.action)}
            </Text>
          </View>
          {item.comment ? (
            <View style={styles.commentPreview}>
              <Text style={[styles.commentText, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>
                {item.comment}
              </Text>
            </View>
          ) : null}
          {item.originalPost ? (
            <View style={styles.originalPostRow}>
              <View style={styles.originalPostBar} />
              <Text style={[styles.originalPostText, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>
                {item.originalPost}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    ),
    [t, language, handleAvatarPress, handleContentPress]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('commentNotifications')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications || []}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
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
    marginTop: spacing.xxs,
  },
  commentText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  originalPostRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  originalPostBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.onSurfaceVariant,
  },
  originalPostText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
});
