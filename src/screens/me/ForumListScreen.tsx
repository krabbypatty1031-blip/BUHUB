import React, { useCallback, useMemo } from 'react';
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
import type { ForumCircleSummary } from '../../types';
import { useFollowedCircles } from '../../hooks/usePosts';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import EmptyState from '../../components/common/EmptyState';
import ScreenHeader from '../../components/common/ScreenHeader';
import { ChevronRightIcon, UsersIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'ForumList'>;

const CircleRow = React.memo(function CircleRow({
  item,
  displayName,
  onPress,
  followersLabel,
}: {
  item: ForumCircleSummary;
  displayName: string;
  onPress: () => void;
  followersLabel: string;
}) {
  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>
          {displayName.replace(/^#/, '').charAt(0) || '#'}
        </Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {item.followerCount} {followersLabel}
        </Text>
      </View>
      <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
});

export default function ForumListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data } = useFollowedCircles();

  const circles = useMemo(
    () => (data ?? []).filter((item) => item.followed),
    [data]
  );

  const renderItem = useCallback(({ item }: { item: ForumCircleSummary }) => {
    const translated = t(item.name);
    const displayName = translated !== item.name ? translated : item.name;
    return (
      <CircleRow
        item={item}
        displayName={displayName}
        followersLabel={t('fans')}
        onPress={() => navigation.getParent()?.navigate('ForumTab', {
          screen: 'CircleDetail',
          params: { tag: item.name },
          initial: false,
        })}
      />
    );
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('followedForumsTitle')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: 'SourceHanSansCN-Bold' }}
      />

      <FlatList
        data={circles}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<UsersIcon size={32} color={colors.onSurfaceVariant} />}
            title={t('noFollowedForums')}
          />
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
    flexGrow: 1,
    paddingVertical: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.onSurface,
  },
  iconText: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
