import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  ActivityIndicator,
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
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { handleFunctionDetailBack } from '../../utils/functionDetailNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { useExpirationTick, isExpiredNow } from '../../hooks/useExpirationTick';
import { PinCheckIcon, HomeDeliverIcon, ClockDeadlineIcon, CategoryListIcon } from '../../components/functions/DetailInfoIcons';
import { FigmaMoreDotsIcon } from '../../components/functions/SecondhandFigmaIcons';
import {
  BackIcon,
  TruckIcon,
  MessageIcon,
  AlertTriangleIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandDetail'>;

export default function ErrandDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { id, backToChat, backTo } = route.params;
  const { data: errand, isLoading: isErrandLoading } = useErrandDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const currentUser = useAuthStore((s) => s.user);
  const now = useExpirationTick(30000);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, errand?.authorId, errand?.user);
  const isExpired = errand ? isExpiredNow(errand.expired, errand.expiresAt, now) : false;
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: !backTo && !backToChat });
  }, [navigation, backTo, backToChat]);

  const handleBack = useCallback(() => {
    handleFunctionDetailBack({
      navigation,
      backToChat,
      backTo,
    });
  }, [navigation, backToChat, backTo]);

  useFocusEffect(
    useCallback(() => {
      if (!backToChat && !backTo) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [backToChat, backTo, handleBack])
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
        forwardedRequiresConfirm: true,
        backTo,
      },
    });
  }, [errand, isOwnPost, navigation]);

  const handlePosterAvatarPress = useCallback(() => {
    if (!errand) return;
    handleAvatarPressNavigation({
      navigation,
      currentUser,
      userName: errand.userName,
      displayName: errand.user,
    });
  }, [navigation, currentUser, errand]);

  const handleEdit = useCallback(() => {
    if (!errand || !isOwnPost) return;
    setPopoverVisible(false);
    navigation.navigate('ComposeErrand', { editId: errand.id, initialData: errand });
  }, [errand, isOwnPost, navigation]);

  const handleForwardToForum = useCallback(() => {
    if (!errand) return;
    setPopoverVisible(false);
    navigateToForumComposeSelection({
      navigation,
      functionType: 'errand',
      functionTitle: errand.title,
      functionId: errand.id,
    });
  }, [errand, navigation]);

  if (!errand) {
    return (
      <PageTranslationProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          {isErrandLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <TruckIcon size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyText}>{t('notFound')}</Text>
            </>
          )}
        </View>
        </SafeAreaView>
      </PageTranslationProvider>
    );
  }

  const posterTime = getRelativeTime(errand.createdAt, lang);
  const posterMeta = buildGradeMajorMeta(t, {
    gradeKey: errand.gradeKey,
    majorKey: errand.majorKey,
  });

  return (
    <PageTranslationProvider>
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPopoverVisible(true)}>
          <FigmaMoreDotsIcon size={24} color={colors.onSurface} />
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
            {isOwnPost ? (
              <>
                <TouchableOpacity style={styles.popoverItem} onPress={handleForwardToForum}>
                  <Text style={styles.popoverItemText}>{t('forwardToForum')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.popoverItem} onPress={handleEdit}>
                  <Text style={styles.popoverItemText}>{t('editPost')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.popoverItem}
                onPress={() => {
                  setPopoverVisible(false);
                  setReportVisible(true);
                }}
              >
                <Text style={styles.popoverItemTextDanger}>{t('reportAction')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ----- Header: Title ----- */}
        <View style={styles.headerSection}>
          <TranslatableText
            entityType="errand"
            entityId={errand.id}
            fieldName="title"
            sourceText={errand.title}
            sourceLanguage={errand.sourceLanguage}
            textStyle={styles.title}
          />
        </View>

        <View style={styles.divider} />

        {/* ----- Content: Description, Price, Info Items ----- */}
        <View style={styles.section}>
          <TranslatableText
            entityType="errand"
            entityId={errand.id}
            fieldName="description"
            sourceText={errand.desc}
            sourceLanguage={errand.sourceLanguage}
            textStyle={styles.descriptionText}
          />

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceCurrency}>HK¥</Text>
            <Text style={styles.priceValue}>{errand.price?.replace(/^HK\$?\s*|^HKD?\s*/i, '') || '0'}</Text>
          </View>

          {/* Info items */}
          <View style={styles.infoItem}>
            <PinCheckIcon size={16} color="#86909C" />
            <Text style={styles.infoLabel}>{t('pickupLocation')}</Text>
            <TranslatableText
              entityType="errand"
              entityId={errand.id}
              fieldName="from"
              sourceText={errand.from}
              sourceLanguage={errand.sourceLanguage}
              textStyle={styles.infoValue}
              containerStyle={styles.infoValueContainer}
            />
          </View>

          <View style={styles.infoItem}>
            <HomeDeliverIcon size={16} color="#86909C" />
            <Text style={styles.infoLabel}>{t('deliveryLocation')}</Text>
            <TranslatableText
              entityType="errand"
              entityId={errand.id}
              fieldName="to"
              sourceText={errand.to}
              sourceLanguage={errand.sourceLanguage}
              textStyle={styles.infoValue}
              containerStyle={styles.infoValueContainer}
            />
          </View>

          <View style={styles.infoItem}>
            <ClockDeadlineIcon size={16} color="#86909C" />
            <Text style={styles.infoLabel}>{t('deadlineTime')}</Text>
            <TranslatableText
              entityType="errand"
              entityId={errand.id}
              fieldName="time"
              sourceText={errand.time}
              sourceLanguage={errand.sourceLanguage}
              textStyle={styles.infoValue}
              containerStyle={styles.infoValueContainer}
            />
          </View>

          {/* Category */}
          <View style={styles.infoItem}>
            <CategoryListIcon size={16} color="#86909C" />
            <Text style={styles.infoLabel}>{t('categoryLabel')}</Text>
            <Text style={styles.infoValue}>{t(errand.category.toLowerCase())}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Poster ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('poster')}</Text>
          <View style={styles.posterRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={handlePosterAvatarPress}>
              <Avatar text={errand.user} uri={errand.avatar} size="lg" gender={errand.gender} />
            </TouchableOpacity>
            <View style={styles.posterInfo}>
              <View style={styles.posterNameRow}>
                <View style={styles.posterNameLeft}>
                  <Text style={styles.posterName}>{errand.user}</Text>
                  {errand.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                  {errand.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
                </View>
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {posterMeta ? `${posterMeta} · ${posterTime}` : posterTime}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Disclaimer ----- */}
        <View style={styles.disclaimerSection}>
          <AlertTriangleIcon size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.disclaimerText}>{t('errandDisclaimer')}</Text>
        </View>

        {/* ----- Action Bar ----- */}
        {!isOwnPost && (
          <View style={[styles.actionBar, isExpired && styles.actionBarDisabled]}>
            <TouchableOpacity
              style={styles.dmButton}
              activeOpacity={0.7}
              onPress={handleDmPoster}
              disabled={isExpired}
            >
              <MessageIcon size={18} color={colors.onPrimary} />
              <Text style={styles.dmButtonText}>{t('errandDmPoster')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={t('reportPost')}
        onClose={() => setReportVisible(false)}
        overlayTransparent
        onSubmit={async (reasonCategory, reason) => {
          try {
            await reportService.submit({
              targetType: 'function',
              targetId: errand.id,
              reasonCategory,
              reason,
            });
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
    </PageTranslationProvider>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    pointerEvents: 'none',
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
  title: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
    marginBottom: 10,
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
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginBottom: 12,
  },

  /* ----- Price ----- */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 16,
  },
  priceCurrency: {
    fontSize: 12,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 0.6429,
  },
  priceValue: {
    fontSize: 19,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 1.5,
  },

  /* ----- Info Items ----- */
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    flex: 1,
  },
  infoValueContainer: {
    flex: 1,
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
    columnGap: 8,
  },
  posterNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  posterName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  timeText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
    marginTop: 2,
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
  dmButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },

  /* ----- Popover ----- */
  popoverOverlay: {
    position: 'absolute' as const,
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
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
