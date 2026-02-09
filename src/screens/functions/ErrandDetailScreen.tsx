import React, { useCallback, useState } from 'react';
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
import { useErrands } from '../../hooks/useErrands';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import {
  BackIcon,
  DollarIcon,
  ClockIcon,
  MapPinIcon,
  PackageIcon,
  MessageIcon,
  AlertTriangleIcon,
  TruckIcon,
  MoreHorizontalIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandDetail'>;

export default function ErrandDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { index } = route.params;
  const { data: errands } = useErrands();
  const errand = errands?.[index];

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  const handleDmPoster = useCallback(() => {
    if (!errand) return;
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: { contactName: errand.user, contactAvatar: errand.avatar, forwardedType: 'errand', forwardedTitle: errand.title },
    });
  }, [navigation, errand]);

  if (!errand) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <TruckIcon size={48} color={colors.outlineVariant} />
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
        <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPopoverVisible(true)}>
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {popoverVisible && (
        <TouchableOpacity
          style={styles.popoverOverlay}
          activeOpacity={1}
          onPress={() => setPopoverVisible(false)}
        >
          <View style={styles.popoverBubble}>
            <TouchableOpacity
              style={styles.popoverItem}
              onPress={() => {
                setPopoverVisible(false);
                setShareSheetVisible(true);
              }}
            >
              <Text style={styles.popoverItemText}>{t('forwardAction')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Header: Tags & Title ── */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{t(errand.category)}</Text>
            </View>
            {errand.expired && (
              <View style={styles.expiredTag}>
                <Text style={styles.expiredTagText}>{t('errandExpired')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{errand.title}</Text>
        </View>

        {/* ── Price Card (prominent) ── */}
        <View style={styles.priceCard}>
          <View style={styles.priceIconCircle}>
            <DollarIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.priceContent}>
            <Text style={styles.priceLabel}>{t('reward')}</Text>
            <Text style={styles.priceHint}>{t('paidOnComplete')}</Text>
          </View>
          <Text style={styles.priceValue}>{errand.price}</Text>
        </View>

        {/* ── Description Card ── */}
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{errand.desc}</Text>
        </View>

        {/* ── Route Card ── */}
        <View style={styles.card}>
          {/* From */}
          <View style={styles.routeRow}>
            <View style={styles.routeIndicator}>
              <View style={styles.routeDotFrom} />
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>{t('pickupLocation')}</Text>
              <Text style={styles.routeValue}>{errand.from}</Text>
            </View>
          </View>

          {/* To */}
          <View style={styles.routeRow}>
            <View style={styles.routeIndicator}>
              <View style={styles.routeDotTo} />
            </View>
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>{t('deliveryLocation')}</Text>
              <Text style={styles.routeValue}>{errand.to}</Text>
            </View>
          </View>
        </View>

        {/* ── Details Card ── */}
        <View style={styles.card}>
          {/* Item */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <PackageIcon size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('itemLabel')}</Text>
              <Text style={styles.detailValue}>{errand.item}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Deadline */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconCircle}>
              <ClockIcon size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('deadline')}</Text>
              <Text style={styles.detailValue}>{errand.time}</Text>
            </View>
          </View>
        </View>

        {/* ── Poster Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('poster')}</Text>
          <View style={styles.posterRow}>
            <Avatar text={errand.avatar} size="lg" gender={errand.gender} />
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>{errand.user}</Text>
              <Text style={styles.posterBio} numberOfLines={1}>
                {errand.bio}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimerCard}>
          <AlertTriangleIcon size={14} color={colors.onErrorContainer} />
          <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
        </View>
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, errand.expired && styles.bottomBarDisabled]}>
        <TouchableOpacity
          style={styles.dmButtonFull}
          activeOpacity={0.7}
          onPress={handleDmPoster}
          disabled={errand.expired}
        >
          <MessageIcon size={18} color={colors.onPrimary} />
          <Text style={styles.dmButtonFullText}>{t('errandDmPoster')}</Text>
        </TouchableOpacity>
      </View>

      {/* Forward Sheet */}
      <FunctionForwardSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        functionType="errand"
        functionTitle={errand.title}
        navigation={navigation}
      />
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

  /* Price Card */
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.accentContainer,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  priceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContent: {
    flex: 1,
  },
  priceLabel: {
    ...typography.titleSmall,
    color: colors.onAccentContainer,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.onAccentContainer,
    opacity: 0.7,
    marginTop: 1,
  },
  priceValue: {
    ...typography.headlineSmall,
    color: colors.error,
    fontWeight: '700',
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

  /* Route */
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeIndicator: {
    alignItems: 'center',
    width: 20,
    paddingTop: spacing.xs,
  },
  routeDotFrom: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.xxs,
  },
  routeDotTo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  routeContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  routeLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  routeValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
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

  /* Poster */
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  posterName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  posterBio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  /* Disclaimer */
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.lg,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.onErrorContainer,
    flex: 1,
    fontWeight: '500',
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
  dmButtonFull: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dmButtonFullText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  popoverOverlay: {
    position: 'absolute' as const,
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  popoverBubble: {
    position: 'absolute' as const,
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 160,
    ...elevation[3],
  },
  popoverItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  popoverItemText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
});
