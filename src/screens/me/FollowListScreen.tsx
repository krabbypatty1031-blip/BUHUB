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
import type { FollowListItem, ForumCircleSummary } from '../../types';
import { useFollowingList, useFollowersList, useFollowUser, useFollowedCircles } from '../../hooks/useUser';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import ScreenHeader from '../../components/common/ScreenHeader';
import { UsersIcon } from '../../components/common/icons';
import { getLocalizedMajorShortLabel } from '../../data/hkbuMajors';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { getLocalizedFontStyle } from '../../theme/typography';
import { getDisplayGradeLabel } from '../../utils/formatTime';

type Props = NativeStackScreenProps<MeStackParamList, 'FollowList'>;

const FollowItem = React.memo(function FollowItem({
  item,
  onPress,
  onToggleFollow,
  followedLabel,
  followLabel,
  t,
  language,
}: {
  item: FollowListItem;
  onPress: () => void;
  onToggleFollow: () => void;
  followedLabel: string;
  followLabel: string;
  t: (key: string) => string;
  language: string;
}) {
  const majorLabel = item.major ? getLocalizedMajorShortLabel(item.major, t, language) : '';
  const gradeLabel = getDisplayGradeLabel(item.grade, t, { language: language as 'tc' | 'sc' | 'en', abbreviate: true }) ?? '';
  const subInfo = [majorLabel, gradeLabel].filter(Boolean).join(' / ');
  const displayName = item.nickname || item.userName;

  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
      <Avatar text={displayName} uri={item.avatar} size="md" gender={item.gender} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, getLocalizedFontStyle(language, 'medium')]} numberOfLines={1}>{displayName}</Text>
        {subInfo ? (
          <Text style={[styles.itemSubInfo, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>{subInfo}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item.isFollowed && styles.followBtnFollowed]}
        activeOpacity={0.7}
        onPress={onToggleFollow}
      >
        <Text
          style={[styles.followBtnText, getLocalizedFontStyle(language, 'medium'), item.isFollowed && styles.followBtnTextFollowed]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {item.isFollowed ? followedLabel : followLabel}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const CircleItem = React.memo(function CircleItem({
  item,
  onPress,
  language,
  t,
}: {
  item: ForumCircleSummary;
  onPress: () => void;
  language: string;
  t: (key: string) => string;
}) {
  const rawName = item.name.startsWith('#') ? item.name.slice(1) : item.name;
  const translated = t(rawName) !== rawName ? t(rawName) : rawName;
  const translatedName = translated.startsWith('#') ? translated.slice(1) : translated;
  const firstChar = translatedName.charAt(0);
  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.circleAvatar}>
        <Text style={styles.circleAvatarText}>{firstChar}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, getLocalizedFontStyle(language, 'medium')]} numberOfLines={1}>{translatedName}</Text>
        <Text style={[styles.itemSubInfo, getLocalizedFontStyle(language, 'regular')]} numberOfLines={1}>
          {item.followerCount} {t('circleFollowers')} · {item.usageCount} {t('circlePosts')}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function FollowListScreen({ navigation, route }: Props) {
  const { type } = route.params;
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: followingData } = useFollowingList();
  const { data: followersData } = useFollowersList();
  const { data: followedCircles } = useFollowedCircles({ enabled: type === 'following' });
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
        cachedAvatar: item.avatar,
        cachedNickname: item.nickname ?? item.userName,
        cachedGender: item.gender,
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
        language={language}
      />
    );
  }, [navigation, currentUser, handleToggleFollow, followedLabel, followLabel, language, t]);

  const title = type === 'following' ? t('followingListTitle') : t('followersListTitle');
  const emptyText = type === 'following' ? t('noFollowingYet') : t('noFollowersYet');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <ScreenHeader
        title={title}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
      />

      <FlatList
        data={sourceData || []}
        keyExtractor={(item) => item.userName}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          type === 'following' && followedCircles && followedCircles.length > 0 ? (
            <View>
              <Text style={[styles.sectionHeader, getLocalizedFontStyle(language, 'bold')]}>{t('officialTags')}</Text>
              {followedCircles.map((circle) => (
                <CircleItem
                  key={circle.name}
                  item={circle}
                  onPress={() => navigation.navigate('CircleDetail', {
                    tag: circle.name,
                    cachedFollowed: circle.followed,
                    cachedFollowerCount: circle.followerCount,
                    cachedUsageCount: circle.usageCount,
                  })}
                  language={language}
                  t={t}
                />
              ))}
              {sourceData && sourceData.length > 0 && (
                <Text style={[styles.sectionHeader, getLocalizedFontStyle(language, 'bold')]}>{t('followingListTitle')}</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          type === 'following' && followedCircles && followedCircles.length > 0
            ? null
            : <EmptyState icon={<UsersIcon size={32} color={colors.onSurfaceVariant} />} title={emptyText} />
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
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
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  sectionHeader: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  circleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer ?? '#E8DEF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});
