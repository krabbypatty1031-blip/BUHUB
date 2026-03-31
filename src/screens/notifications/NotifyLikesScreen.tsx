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
import type { LikeNotification } from '../../types';
import { useLikeNotifications, useMarkAsRead } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, getLocalizedFontStyle } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import { BackIcon, HeartIcon, MaleIcon, FemaleIcon } from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'NotifyLikes'>;

export default function NotifyLikesScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: notifications, isLoading, refetch } = useLikeNotifications();
  const markAsRead = useMarkAsRead();
  const setUnreadLikes = useNotificationStore((s) => s.setUnreadLikes);
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
    setUnreadLikes(0);
    markAsRead.mutate('likes');
  }, [isFocused, markAsRead, setUnreadLikes]);

  const handleAvatarPress = useCallback(
    (item: LikeNotification) => {
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

  const handleContentPress = useCallback(
    (item: LikeNotification) => {
      if (!item.postId) return;
      if (item.action === 'likedYourPost') {
        navigation.navigate('PostDetail', { postId: item.postId });
      } else {
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
            <HeartIcon size={14} color={colors.error} fill={colors.error} />
            <Text style={[styles.notificationAction, getLocalizedFontStyle(language, 'regular')]}>
              {t(item.action)}
            </Text>
          </View>
          {item.content ? (
            <View style={styles.previewContainer}>
              <Text style={[styles.previewText, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>
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
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, getLocalizedFontStyle(language, 'bold')]}>
          {t('likeNotifications')}
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    color: '#0C1015',
    pointerEvents: 'none',
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
