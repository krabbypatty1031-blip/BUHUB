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
import { usePartnerDetail } from '../../hooks/usePartners';
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
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  MessageIcon,
  MoreHorizontalIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerDetail'>;

export default function PartnerDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { id, backToChat } = route.params;
  const { data: partner } = usePartnerDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const currentUser = useAuthStore((s) => s.user);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, partner?.authorId, partner?.user);
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

  const handleDmOrganizer = useCallback(() => {
    if (!partner?.authorId || isOwnPost) return;
    const backTo = buildChatBackTarget(navigation, 'FunctionsTab')
      ?? {
        tab: 'FunctionsTab' as const,
        screen: 'PartnerDetail',
        params: { id: partner.id },
      };
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: {
        contactId: partner.authorId,
        contactName: partner.user,
        contactAvatar: partner.avatar,
        forwardedType: 'partner',
        forwardedTitle: partner.title,
        forwardedPosterName: partner.user,
        forwardedId: partner.id,
        forwardedNonce: `${Date.now()}-${partner.id}-${partner.authorId}`,
        backTo,
      },
    });
  }, [isOwnPost, navigation, partner]);

  if (!partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
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

  const organizerMeta = buildPostMeta(t, lang, {
    gradeKey: partner.gradeKey,
    majorKey: partner.majorKey,
    createdAt: partner.createdAt,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('partnerDetail')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPopoverVisible(true)}>
          <MoreHorizontalIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Popover Menu */}
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
              <Text style={styles.tagText}>{t(partner.category)}</Text>
            </View>
            {partner.expired && (
              <>
                <View style={styles.tagDot} />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{t('partnerExpired')}</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.title}>{partner.title}</Text>
        </View>

        <View style={styles.divider} />

        {/* ----- Description ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('itemDescription')}</Text>
          <Text style={styles.descriptionText}>{partner.desc}</Text>
        </View>

        <View style={styles.divider} />

        {/* ----- Time ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('activityTime')}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <ClockIcon size={16} color={colors.onSurface} />
            </View>
            <Text style={styles.detailValue}>{partner.time}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Location ----- */}
        {partner.location ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('locationLabel')}</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MapPinIcon size={16} color={colors.onSurface} />
                </View>
                <Text style={styles.detailValue}>{partner.location}</Text>
              </View>
            </View>
            <View style={styles.divider} />
          </>
        ) : null}

        {/* ----- Organizer ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('organizer')}</Text>
          <View style={styles.organizerRow}>
            <Avatar text={partner.user} uri={partner.avatar} size="lg" gender={partner.gender} />
            <View style={styles.organizerInfo}>
              <View style={styles.organizerNameRow}>
                <Text style={styles.organizerName}>{partner.user}</Text>
                {partner.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                {partner.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.meta} numberOfLines={1}>{organizerMeta}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ----- Action Bar ----- */}
        <View style={[styles.actionBar, partner.expired && styles.actionBarDisabled]}>
          <TouchableOpacity
            style={[styles.dmButton, isOwnPost && styles.dmButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleDmOrganizer}
            disabled={partner.expired || isOwnPost}
          >
            <MessageIcon size={18} color={isOwnPost ? colors.onSurfaceVariant : colors.onPrimary} />
            <Text style={[styles.dmButtonText, isOwnPost && styles.dmButtonTextDisabled]}>
              {isOwnPost ? t('cannotDmSelf') : t('partnerDmOrganizer')}
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
            await reportService.submit({ targetType: 'function', targetId: partner.id, reason });
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
        functionType="partner"
        functionTitle={partner.title}
        functionPosterName={partner.user}
        functionId={partner.id}
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

  /* ----- Description ----- */
  descriptionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    lineHeight: 26,
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

  /* ----- Organizer ----- */
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerName: {
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

