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
  UsersIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import { LocationPinIcon, CalendarDotIcon, ClockDeadlineIcon } from '../../components/functions/DetailInfoIcons';
import { FigmaMoreDotsIcon } from '../../components/functions/SecondhandFigmaIcons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'PartnerDetail'>;

export default function PartnerDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { id, backToChat, backTo } = route.params;
  const { data: partner, isLoading: isPartnerLoading } = usePartnerDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const currentUser = useAuthStore((s) => s.user);
  const now = useExpirationTick(30000);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, partner?.authorId, partner?.user);
  const isExpired = partner ? isExpiredNow(partner.expired, partner.expiresAt, now) : false;
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
        forwardedRequiresConfirm: true,
        backTo,
      },
    });
  }, [isOwnPost, navigation, partner]);

  const handleOrganizerAvatarPress = useCallback(() => {
    if (!partner) return;
    handleAvatarPressNavigation({
      navigation,
      currentUser,
      userName: partner.userName,
      displayName: partner.user,
    });
  }, [navigation, currentUser, partner]);

  const handleEdit = useCallback(() => {
    if (!partner || !isOwnPost) return;
    setPopoverVisible(false);
    navigation.navigate('ComposePartner', { editId: partner.id, initialData: partner });
  }, [partner, isOwnPost, navigation]);

  const handleForwardToForum = useCallback(() => {
    if (!partner) return;
    setPopoverVisible(false);
    navigateToForumComposeSelection({
      navigation,
      functionType: 'partner',
      functionTitle: partner.title,
      functionId: partner.id,
    });
  }, [partner, navigation]);

  if (!partner) {
    return (
      <PageTranslationProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <BackIcon size={26} color="#0C1015" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('partnerDetail')}</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.emptyContainer}>
          {isPartnerLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <UsersIcon size={48} color="#86909C" />
              <Text style={styles.emptyText}>{t('notFound')}</Text>
            </>
          )}
        </View>
        </SafeAreaView>
      </PageTranslationProvider>
    );
  }

  const organizerTime = getRelativeTime(partner.createdAt, lang);
  const organizerMeta = buildGradeMajorMeta(t, {
    gradeKey: partner.gradeKey,
    majorKey: partner.majorKey,
  });

  return (
    <PageTranslationProvider>
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('partnerDetail')}</Text>
        <TouchableOpacity onPress={() => setPopoverVisible(true)}>
          <FigmaMoreDotsIcon size={20} />
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
        <View style={styles.contentArea}>
          {/* Title */}
          <TranslatableText
            entityType="partner"
            entityId={partner.id}
            fieldName="title"
            sourceText={partner.title}
            sourceLanguage={partner.sourceLanguage}
            textStyle={styles.title}
          />

          {/* Description */}
          <TranslatableText
            entityType="partner"
            entityId={partner.id}
            fieldName="description"
            sourceText={partner.desc}
            sourceLanguage={partner.sourceLanguage}
            textStyle={styles.description}
          />

          {/* Info items */}
          <View style={styles.infoItems}>
            {/* Location */}
            {partner.location ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <LocationPinIcon size={16} color="#86909C" />
                </View>
                <View style={styles.infoTextBlock}>
                  <Text style={styles.infoLabel}>{t('location')}</Text>
                  <TranslatableText
                    entityType="partner"
                    entityId={partner.id}
                    fieldName="location"
                    sourceText={partner.location}
                    sourceLanguage={partner.sourceLanguage}
                    textStyle={styles.infoValue}
                  />
                </View>
              </View>
            ) : null}

            {/* Activity Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <CalendarDotIcon size={16} color="#86909C" />
              </View>
              <View style={styles.infoTextBlock}>
                <Text style={styles.infoLabel}>{t('activityTime')}</Text>
                <TranslatableText
                  entityType="partner"
                  entityId={partner.id}
                  fieldName="time"
                  sourceText={partner.time}
                  sourceLanguage={partner.sourceLanguage}
                  textStyle={styles.infoValue}
                />
              </View>
            </View>

            {/* Deadline Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <ClockDeadlineIcon size={16} color="#86909C" />
              </View>
              <View style={styles.infoTextBlock}>
                <Text style={styles.infoLabel}>{t('deadlineTime')}</Text>
                <Text style={styles.infoValue}>{partner.expiresAt}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* User row */}
          <TouchableOpacity style={styles.userRow} activeOpacity={0.7} onPress={handleOrganizerAvatarPress}>
            <Avatar text={partner.user} uri={partner.avatar} size="sm" gender={partner.gender} />
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{partner.user}</Text>
                {partner.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                {partner.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
              </View>
              <Text style={styles.userMeta} numberOfLines={1}>
                {organizerMeta ? `${organizerMeta} \u00B7 ${organizerTime}` : organizerTime}
              </Text>
            </View>
          </TouchableOpacity>

          <PageTranslationToggle style={styles.translationToggle} />

          {/* Expired stamp overlay */}
          {isExpired && (
            <View style={styles.expiredOverlay}>
              <View style={styles.expiredStamp}>
                <Text style={styles.expiredStampText}>{t('partnerExpired')}</Text>
              </View>
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      {!isOwnPost && (
        <View style={[styles.bottomBar, isExpired && styles.bottomBarDisabled]}>
          <TouchableOpacity
            style={styles.dmButton}
            activeOpacity={0.7}
            onPress={handleDmOrganizer}
            disabled={isExpired}
          >
            <Text style={styles.dmButtonText}>{t('partnerDmOrganizer')}</Text>
          </TouchableOpacity>
        </View>
      )}

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
              targetId: partner.id,
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
        functionType="partner"
        functionTitle={partner.title}
        functionPosterName={partner.user}
        functionId={partner.id}
        navigation={navigation}
      />
      </SafeAreaView>
    </PageTranslationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ----- Top Bar ----- */
  topBar: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* ----- Empty ----- */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* ----- Scroll ----- */
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  contentArea: {
    position: 'relative',
  },

  /* ----- Title & Description ----- */
  title: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginBottom: 16,
  },

  /* ----- Info items ----- */
  infoItems: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },

  /* ----- Divider ----- */
  divider: {
    height: 0.5,
    backgroundColor: '#DEE2E5',
    marginBottom: 16,
  },

  /* ----- User row ----- */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  userMeta: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginTop: 2,
  },

  /* ----- Translation toggle ----- */
  translationToggle: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  /* ----- Expired stamp overlay ----- */
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredStamp: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ED4956',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-15deg' }],
    shadowColor: '#ED4956',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  expiredStampText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#ED4956',
    letterSpacing: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(237,73,86,0.15)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(237,73,86,0.15)',
  },

  /* ----- Bottom action bar ----- */
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#DEE2E5',
    backgroundColor: '#FFFFFF',
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  dmButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#0C1015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmButtonText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#FFFFFF',
  },

  /* ----- Popover ----- */
  popoverOverlay: {
    position: 'absolute' as const,
    top: 62,
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
    backgroundColor: '#FFFFFF',
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
    color: '#0C1015',
  },
  popoverItemTextDanger: {
    ...typography.bodyMedium,
    color: colors.error,
  },
});
