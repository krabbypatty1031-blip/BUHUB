import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useErrandDetail } from '../../hooks/useErrands';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { reportService } from '../../api/services/report.service';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import { buildPostMeta } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
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
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandDetail'>;

export default function ErrandDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { id, backToChat } = route.params;
  const { data: errand } = useErrandDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const currentUser = useAuthStore((s) => s.user);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, errand?.authorId, errand?.user);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (backToChat) {
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: backToChat,
      });
      return;
    }
    navigation.goBack();
  }, [navigation, backToChat]);

  useFocusEffect(
    useCallback(() => {
      if (!backToChat) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [backToChat, handleBack])
  );

  const handleDmPoster = useCallback(() => {
    if (!errand?.authorId || isOwnPost) return;
    const backTo = buildChatBackTarget(navigation, 'FunctionsTab')
      ?? {
        tab: 'FunctionsTab' as const,
        screen: 'ErrandDetail',
        params: { id: errand.id },
      };
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: {
        contactId: errand.authorId,
        contactName: errand.user,
        contactAvatar: errand.avatar,
        forwardedType: 'errand',
        forwardedTitle: errand.title,
        forwardedPosterName: errand.user,
        forwardedId: errand.id,
        forwardedNonce: `${Date.now()}-${errand.id}-${errand.authorId}`,
        backTo,
      },
    });
  }, [errand, isOwnPost, navigation]);

  if (!errand) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
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

  const posterMeta = buildPostMeta(t, lang, {
    gradeKey: errand.gradeKey,
    majorKey: errand.majorKey,
    createdAt: errand.createdAt,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
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
        {/* ----- Header: Title & Tags ----- */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{t(errand.category)}</Text>
            </View>
            {errand.expired && (
              <>
                <View style={styles.tagDot} />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{t('errandExpired')}</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.title}>{errand.title}</Text>
        </View>

        <View style={styles.divider} />

        {/* ----- Reward ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('reward')}</Text>
          <View style={styles.rewardRow}>
            <View style={styles.detailIcon}>
              <DollarIcon size={16} color={colors.onSurface} />
            </View>
            <View style={styles.rewardContent}>
              <Text style={styles.rewardPrice}>{errand.price}</Text>
              <Text style={styles.rewardHint}>{t('paidOnComplete')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Description ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('itemDescription')}</Text>
          <Text style={styles.descriptionText}>{errand.desc}</Text>
        </View>

        <View style={styles.divider} />

        {/* ----- Route ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('pickupLocation')}</Text>
          <View style={styles.routeWrap}>
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
        </View>

        <View style={styles.divider} />

        {/* ----- Details: Item & Deadline ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('itemLabel')}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <PackageIcon size={16} color={colors.onSurface} />
            </View>
            <Text style={styles.detailValue}>{errand.item}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('deadline')}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <ClockIcon size={16} color={colors.onSurface} />
            </View>
            <Text style={styles.detailValue}>{errand.time}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Poster ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('poster')}</Text>
          <View style={styles.posterRow}>
            <Avatar text={errand.user} uri={errand.avatar} size="lg" gender={errand.gender} />
            <View style={styles.posterInfo}>
              <View style={styles.posterNameRow}>
                <Text style={styles.posterName}>{errand.user}</Text>
                {errand.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                {errand.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.meta} numberOfLines={1}>{posterMeta}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Disclaimer ----- */}
        <View style={styles.disclaimerSection}>
          <AlertTriangleIcon size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
        </View>

        {/* ----- Action Bar ----- */}
        <View style={[styles.actionBar, errand.expired && styles.actionBarDisabled]}>
          <TouchableOpacity
            style={[styles.dmButton, isOwnPost && styles.dmButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleDmPoster}
            disabled={errand.expired || isOwnPost}
          >
            <MessageIcon size={18} color={isOwnPost ? colors.onSurfaceVariant : colors.onPrimary} />
            <Text style={[styles.dmButtonText, isOwnPost && styles.dmButtonTextDisabled]}>
              {isOwnPost ? t('cannotDmSelf') : t('errandDmPoster')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={t('reportPost')}
        onClose={() => setReportVisible(false)}
        onSubmit={async (reason) => {
          try {
            await reportService.submit({ targetType: 'function', targetId: errand.id, reason });
            setReportVisible(false);
            showSnackbar({ message: t('reportSubmitted'), type: 'success' });
          } catch {
            showSnackbar({ message: t('reportFailed'), type: 'error' });
          }
        }}
      />

      {/* Forward Sheet */}
      <FunctionForwardSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        functionType="errand"
        functionTitle={errand.title}
        functionPosterName={errand.user}
        functionId={errand.id}
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

  /* ----- Top Bar ----- */
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

  /* ----- Empty ----- */
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
    paddingBottom: 120,
  },

  /* ----- Header ----- */
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  tagDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.outline,
  },
  statusTag: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
  },
  statusTagText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
    fontWeight: '600',
  },
  title: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    lineHeight: 32,
  },

  /* ----- Shared ----- */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  /* ----- Reward ----- */
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rewardContent: {
    flex: 1,
  },
  rewardPrice: {
    ...typography.headlineSmall,
    color: colors.error,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  rewardHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },

  /* ----- Description ----- */
  descriptionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    lineHeight: 26,
  },

  /* ----- Route ----- */
  routeWrap: {
    gap: 0,
  },
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  routeLine: {
    width: 1.5,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.xxs,
  },
  routeDotTo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  routeContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  routeLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xxs,
  },
  routeValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
    lineHeight: 22,
  },

  /* ----- Detail rows ----- */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },

  /* ----- Poster ----- */
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  posterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  posterName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  timeDot: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },

  /* ----- Disclaimer ----- */
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },

  /* ----- Action Bar ----- */
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  actionBarDisabled: {
    opacity: 0.5,
  },
  dmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dmButtonDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  dmButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  dmButtonTextDisabled: {
    color: colors.onSurfaceVariant,
  },

  /* ----- Popover ----- */
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

