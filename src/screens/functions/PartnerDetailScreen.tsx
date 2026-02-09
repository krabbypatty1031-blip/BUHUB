import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { usePartners } from '../../hooks/usePartners';
import { usePartnerStore } from '../../store/partnerStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  MessageIcon,
  ShareIcon,
  AlertTriangleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerDetail'>;

export default function PartnerDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { index } = route.params;
  const { data: partners } = usePartners();
  const toggleJoin = usePartnerStore((s) => s.toggleJoin);
  const joinedActivities = usePartnerStore((s) => s.joinedActivities);

  const partner = partners?.[index];
  const isJoined = joinedActivities.has(index);
  const effectiveJoined = partner ? partner.joined + (isJoined ? 1 : 0) : 0;

  const spotsInfo = useMemo(() => {
    if (!partner) return null;
    const remaining = partner.maxPeople - effectiveJoined;
    if (remaining <= 0) return t('spotsFull');
    return `${t('spotsRemaining')} ${remaining} ${t('spotsUnit')}`;
  }, [partner, effectiveJoined, t]);

  const progressPercent = useMemo(() => {
    if (!partner) return 0;
    return Math.min((effectiveJoined / partner.maxPeople) * 100, 100);
  }, [partner, effectiveJoined]);

  const handleJoin = useCallback(() => {
    toggleJoin(index);
  }, [toggleJoin, index]);

  const handleDmOrganizer = useCallback(() => {
    if (!partner) return;
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: { contactName: partner.user, contactAvatar: partner.avatar },
    });
  }, [navigation, partner]);

  const handleShare = useCallback(() => {
    if (!partner) return;
    navigation.navigate('PartnerShare', { activityName: partner.title });
  }, [navigation, partner]);

  if (!partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('partnerDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <UsersIcon size={48} color={colors.outlineVariant} />
          <Text style={styles.emptyText}>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('partnerDetail')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <ShareIcon size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Header: Title & Tags ── */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{t(partner.category)}</Text>
            </View>
            {partner.expired && (
              <View style={styles.expiredTag}>
                <Text style={styles.expiredTagText}>{t('partnerExpired')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{partner.title}</Text>
        </View>

        {/* ── Description Card ── */}
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{partner.desc}</Text>
        </View>

        {/* ── Details Card ── */}
        <View style={styles.card}>
          {/* Time */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <ClockIcon size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('activityTime')}</Text>
              <Text style={styles.detailValue}>{partner.time}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Location */}
          {partner.location ? (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailIconCircle}>
                  <MapPinIcon size={16} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('locationLabel')}</Text>
                  <Text style={styles.detailValue}>{partner.location}</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
            </>
          ) : null}

          {/* People */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <UsersIcon size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('people')}</Text>
              <Text style={styles.detailValue}>{partner.people}</Text>
            </View>
          </View>
        </View>

        {/* ── Participation Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('participation')}</Text>
          <View style={styles.participationRow}>
            <Text style={styles.participationCount}>
              {effectiveJoined}/{partner.maxPeople}
            </Text>
            <Text style={styles.participationUnit}>{t('joinedCount')}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
                progressPercent >= 100 && styles.progressFillFull,
              ]}
            />
          </View>
          <Text style={styles.spotsText}>{spotsInfo}</Text>
        </View>

        {/* ── Organizer Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('organizer')}</Text>
          <View style={styles.organizerRow}>
            <Avatar text={partner.avatar} size="lg" gender={partner.gender} />
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>{partner.user}</Text>
              <Text style={styles.organizerBio} numberOfLines={1}>
                {partner.bio}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.organizerDmBtn}
              activeOpacity={0.7}
              onPress={handleDmOrganizer}
              disabled={partner.expired}
            >
              <MessageIcon size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, partner.expired && styles.bottomBarDisabled]}>
        <TouchableOpacity
          style={styles.dmButton}
          activeOpacity={0.7}
          onPress={handleDmOrganizer}
          disabled={partner.expired}
        >
          <MessageIcon size={18} color={colors.primary} />
          <Text style={styles.dmButtonText}>{t('partnerDmOrganizer')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined && styles.joinedButton,
            partner.expired && styles.disabledButton,
          ]}
          activeOpacity={0.7}
          onPress={handleJoin}
          disabled={partner.expired}
        >
          <Text
            style={[
              styles.joinButtonText,
              isJoined && styles.joinedButtonText,
            ]}
          >
            {isJoined ? t('cancelJoin') : t('joinNow')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Top Bar */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
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

  /* Empty */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  /* Header */
  headerSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryTag: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryTagText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  expiredTag: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  expiredTagText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
    fontWeight: '600',
  },
  title: {
    ...typography.headlineSmall,
    color: colors.onSurface,
  },

  /* Card */
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.md,
  },

  /* Description */
  descriptionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    lineHeight: 24,
  },

  /* Detail rows */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
  },

  /* Participation */
  participationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  participationCount: {
    ...typography.headlineMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  participationUnit: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressFillFull: {
    backgroundColor: colors.outline,
  },
  spotsText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* Organizer */
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  organizerName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  organizerBio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  organizerDmBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.md,
    ...elevation[2],
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  dmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dmButtonText: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  joinButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedButton: {
    backgroundColor: colors.surfaceVariant,
  },
  disabledButton: {
    backgroundColor: colors.outlineVariant,
  },
  joinButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  joinedButtonText: {
    color: colors.onSurfaceVariant,
  },
});
