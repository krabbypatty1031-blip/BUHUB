import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import {
  BackIcon,
  ShoppingBagIcon,
  MapPinIcon,
  MessageIcon,
  HeartIcon,
  ClockIcon,
  AlertTriangleIcon,
  MoreHorizontalIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SecondhandDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { index } = route.params;
  const { data: items } = useSecondhand();
  const wantedItems = useSecondhandStore((s) => s.wantedItems);
  const toggleWant = useSecondhandStore((s) => s.toggleWant);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const item = items?.[index];
  const isWanted = wantedItems.has(index);
  const isSold = item?.sold ?? false;
  const isExpired = item ? item.expired && !item.sold : false;
  const isDisabled = isSold || isExpired;

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const expiryText = useMemo(() => {
    if (!item || isSold || isExpired) return null;
    const expires = new Date(item.expiresAt);
    const now = new Date();
    const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0) return t('expiresIn', { days });
    return null;
  }, [item, isSold, isExpired, t]);

  const handleContact = useCallback(() => {
    if (!item) return;
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: { contactName: item.user, contactAvatar: item.avatar, forwardedType: 'secondhand', forwardedTitle: item.title, forwardedPosterName: item.user, forwardedIndex: index },
    });
  }, [navigation, item, index]);

  const handleWant = useCallback(() => {
    toggleWant(index);
    if (!isWanted) {
      showSnackbar({ message: t('notifiedSeller'), type: 'info' });
    } else {
      showSnackbar({ message: t('wantCancelled'), type: 'info' });
    }
  }, [toggleWant, index, isWanted, showSnackbar, t]);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('secondhandDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <ShoppingBagIcon size={48} color={colors.outlineVariant} />
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
        <Text style={styles.topBarTitle}>{t('secondhandDetail')}</Text>
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
              <Text style={styles.popoverItemText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popoverItem}
              onPress={() => {
                setPopoverVisible(false);
                setReportVisible(true);
              }}
            >
              <Text style={styles.popoverItemTextDanger}>{t('reportAction')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero Image ── */}
        <View style={[styles.heroImage, isDisabled && styles.heroImageDimmed]}>
          <ShoppingBagIcon size={56} color={colors.outlineVariant} />

          {/* Condition badge - top left */}
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionBadgeText}>{item.condition}</Text>
          </View>

          {/* Status overlay */}
          {isSold && (
            <View style={styles.statusOverlay}>
              <View style={styles.statusBadgeSold}>
                <Text style={styles.statusBadgeText}>{t('sold')}</Text>
              </View>
            </View>
          )}
          {isExpired && (
            <View style={styles.statusOverlay}>
              <View style={styles.statusBadgeExpired}>
                <Text style={styles.statusBadgeText}>{t('secondhandExpired')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Price & Title Section ── */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.title}>{item.title}</Text>

          {/* Tags row */}
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{t(item.category)}</Text>
            </View>
            <View style={styles.conditionTag}>
              <Text style={styles.conditionTagText}>{item.condition}</Text>
            </View>
            {isSold && (
              <View style={styles.soldTag}>
                <Text style={styles.soldTagText}>{t('sold')}</Text>
              </View>
            )}
            {isExpired && (
              <View style={styles.expiredTag}>
                <Text style={styles.expiredTagText}>{t('secondhandExpired')}</Text>
              </View>
            )}
          </View>

          {/* Expiry countdown */}
          {expiryText && (
            <View style={styles.expiryRow}>
              <ClockIcon size={14} color={colors.outline} />
              <Text style={styles.expiryText}>{expiryText}</Text>
            </View>
          )}
        </View>

        {/* ── Description Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('itemDescription')}</Text>
          <Text style={styles.descriptionText}>{item.desc}</Text>
        </View>

        {/* ── Trade Location Card ── */}
        {item.location ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('tradeLocation')}</Text>
            <View style={styles.locationRow}>
              <View style={styles.locationIconCircle}>
                <MapPinIcon size={16} color={colors.primary} />
              </View>
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Seller Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('sellerLabel')}</Text>
          <View style={styles.sellerRow}>
            <Avatar text={item.avatar} size="lg" gender={item.gender} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.user}</Text>
              <Text style={styles.sellerBio} numberOfLines={1}>
                {item.bio}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimerCard}>
          <AlertTriangleIcon size={14} color={colors.onErrorContainer} />
          <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
        </View>

        {/* ── Action Bar ── */}
        <View style={[styles.bottomBar, isDisabled && styles.bottomBarDisabled]}>
          <TouchableOpacity
            style={[styles.wantButton, isWanted && styles.wantedButton]}
            activeOpacity={0.7}
            onPress={handleWant}
            disabled={isDisabled}
          >
            <HeartIcon
              size={18}
              color={isWanted ? colors.error : colors.onSurfaceVariant}
              fill={isWanted ? colors.error : undefined}
            />
            <Text style={[styles.wantButtonText, isWanted && styles.wantedButtonText]}>
              {isWanted ? t('wanted') : t('iWant')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, isDisabled && styles.contactButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleContact}
            disabled={isDisabled}
          >
            <MessageIcon size={18} color={colors.onPrimary} />
            <Text style={styles.contactButtonText}>{t('secondhandDmSeller')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={t('reportPost')}
        onClose={() => setReportVisible(false)}
        onSubmit={() => {
          setReportVisible(false);
          showSnackbar({ message: t('reportSubmitted'), type: 'success' });
        }}
      />

      {/* Forward Sheet */}
      <FunctionForwardSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        functionType="secondhand"
        functionTitle={item.title}
        functionPosterName={item.user}
        functionIndex={index}
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

  /* Hero Image */
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.65,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageDimmed: {
    opacity: 0.5,
  },
  conditionBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    ...elevation[1],
  },
  conditionBadgeText: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  statusBadgeSold: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusBadgeExpired: {
    backgroundColor: colors.outline,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.titleSmall,
    color: colors.white,
    fontWeight: '700',
  },

  /* Price & Title */
  priceSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  price: {
    ...typography.headlineMedium,
    color: colors.error,
    fontWeight: '700',
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
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
  conditionTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  conditionTagText: {
    ...typography.labelSmall,
    color: colors.onSecondaryContainer,
    fontWeight: '600',
  },
  soldTag: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  soldTagText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
    fontWeight: '600',
  },
  expiredTag: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  expiredTagText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiryText: {
    ...typography.bodySmall,
    color: colors.outline,
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

  /* Description */
  descriptionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    lineHeight: 24,
  },

  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },

  /* Seller */
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  sellerName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  sellerBio: {
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
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  wantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
  },
  wantedButton: {
    backgroundColor: colors.errorContainer,
  },
  wantButtonText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  wantedButtonText: {
    color: colors.error,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contactButtonDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  contactButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },

  /* Popover */
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
    color: colors.onSurface,
  },
  popoverItemTextDanger: {
    ...typography.bodyMedium,
    color: colors.error,
  },

});
