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
        {/* ----- Header: Title & Tags ----- */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{t(errand.category)}</Text>
            </View>
            {isExpired && (
              <>
                <View style={styles.tagDot} />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{t('errandExpired')}</Text>
                </View>
              </>
            )}
            <PageTranslationToggle style={styles.headerTranslationToggle} />
          </View>
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
          <TranslatableText
            entityType="errand"
            entityId={errand.id}
            fieldName="description"
            sourceText={errand.desc}
            sourceLanguage={errand.sourceLanguage}
            textStyle={styles.descriptionText}
          />
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
                <TranslatableText
                  entityType="errand"
                  entityId={errand.id}
                  fieldName="from"
                  sourceText={errand.from}
                  sourceLanguage={errand.sourceLanguage}
                  textStyle={styles.routeValue}
                  containerStyle={styles.routeTextBlock}
                />
              </View>
            </View>

            {/* To */}
            <View style={styles.routeRow}>
              <View style={styles.routeIndicator}>
                <View style={styles.routeDotTo} />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>{t('deliveryLocation')}</Text>
                <TranslatableText
                  entityType="errand"
                  entityId={errand.id}
                  fieldName="to"
                  sourceText={errand.to}
                  sourceLanguage={errand.sourceLanguage}
                  textStyle={styles.routeValue}
                  containerStyle={styles.routeTextBlock}
                />
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
            <TranslatableText
              entityType="errand"
              entityId={errand.id}
              fieldName="item"
              sourceText={errand.item}
              sourceLanguage={errand.sourceLanguage}
              textStyle={styles.detailValue}
              containerStyle={styles.detailTextBlock}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('deadline')}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <ClockIcon size={16} color={colors.onSurface} />
            </View>
            <TranslatableText
              entityType="errand"
              entityId={errand.id}
              fieldName="time"
              sourceText={errand.time}
              sourceLanguage={errand.sourceLanguage}
              textStyle={styles.detailValue}
              containerStyle={styles.detailTextBlock}
            />
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
                  {errand.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                  {errand.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                </View>
                <Text style={styles.timeText}>{posterTime}</Text>
              </View>
              {posterMeta ? <Text style={styles.meta} numberOfLines={1}>{posterMeta}</Text> : null}
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
  headerTranslationToggle: {
    marginLeft: 'auto',
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
  routeTextBlock: {
    flex: 1,
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
  detailTextBlock: {
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

