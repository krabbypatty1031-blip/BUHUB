import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerPost, PartnerCategory } from '../../types';
import { usePartners } from '../../hooks/usePartners';
import { usePartnerStore } from '../../store/partnerStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Chip from '../../components/common/Chip';
import EmptyState from '../../components/common/EmptyState';
import { BackIcon, PlusIcon, UsersIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerList'>;

const CATEGORIES: Array<{ key: PartnerCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
];

export default function PartnerListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedCategory = usePartnerStore((s) => s.selectedCategory);
  const setCategory = usePartnerStore((s) => s.setCategory);
  const joinedActivities = usePartnerStore((s) => s.joinedActivities);
  const { data: partners, isLoading, refetch } = usePartners(selectedCategory || undefined);

  const handleCategoryPress = useCallback(
    (key: PartnerCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PartnerPost; index: number }) => {
      const isJoined = joinedActivities.has(index);
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PartnerDetail', { index })}
        >
          <View style={styles.cardHeader}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.userName}>{item.user}</Text>
              <Text style={styles.timeMeta}>{item.time}</Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{t(item.category)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardContent} numberOfLines={3}>
            {item.desc}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.joinInfo}>
              <UsersIcon size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.joinText}>
                {item.joined}/{item.maxPeople} {t('people')}
              </Text>
            </View>
            {isJoined && (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedBadgeText}>{t('joined')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [joinedActivities, navigation, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('findPartner')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Category Chips */}
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            label={t(cat.labelKey)}
            selected={
              cat.key === 'all'
                ? selectedCategory === null
                : selectedCategory === cat.key
            }
            onPress={() => handleCategoryPress(cat.key)}
          />
        ))}
      </View>

      {/* Partner List */}
      <FlatList
        data={partners}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<UsersIcon size={36} color={colors.onSurfaceVariant} />}
              title={t('noPartners') || 'No activities yet'}
              message={t('createPartnerHint') || 'Create an activity to find partners!'}
              actionLabel={t('createActivity') || 'Create Activity'}
              onAction={() => navigation.navigate('ComposePartner')}
            />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposePartner')}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>
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
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation[1],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  timeMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  categoryTag: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  categoryTagText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardContent: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  joinedBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  joinedBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },
});
