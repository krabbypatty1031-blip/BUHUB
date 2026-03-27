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
import { getLocalizedFontStyle, typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildGradeMajorMeta, getRelativeTime, formatDeadline } from '../../utils/formatTime';
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
      cachedAvatar: partner.avatar,
      cachedNickname: partner.user,
      cachedGender: partner.gender,
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
          <Text style={[styles.topBarTitle, getLocalizedFontStyle(lang, 'bold')]}>{t('partnerDetail')}</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.emptyContainer}>
          {isPartnerLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <UsersIcon size={48} color="#86909C" />
              <Text style={[styles.emptyText, getLocalizedFontStyle(lang, 'regular')]}>{t('notFound')}</Text>
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
    language: lang,
    abbreviateForumGrade: true,
  });

  return (
    <PageTranslationProvider>
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, getLocalizedFontStyle(lang, 'bold')]}>{t('partnerDetail')}</Text>
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
              <Text style={[styles.popoverItemText, getLocalizedFontStyle(lang, 'regular')]}>{t('forwardToContact')}</Text>
            </TouchableOpacity>
            {isOwnPost ? (
              <>
                <TouchableOpacity style={styles.popoverItem} onPress={handleForwardToForum}>
                  <Text style={[styles.popoverItemText, getLocalizedFontStyle(lang, 'regular')]}>{t('forwardToForum')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.popoverItem} onPress={handleEdit}>
                  <Text style={[styles.popoverItemText, getLocalizedFontStyle(lang, 'regular')]}>{t('editPost')}</Text>
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
                <Text style={[styles.popoverItemTextDanger, getLocalizedFontStyle(lang, 'regular')]}>{t('reportAction')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title + expired tag */}
        <View style={styles.titleRow}>
          <TranslatableText
            entityType="partner"
            entityId={partner.id}
            fieldName="title"
            sourceText={partner.title}
            sourceLanguage={partner.sourceLanguage}
            textStyle={styles.contentTitle}
            containerStyle={styles.titleFlex}
          />
          {isExpired && (
            <View style={styles.expiredTag}>
              <Text style={[styles.expiredTagText, getLocalizedFontStyle(lang, 'bold')]}>{t('partnerExpired')}</Text>
            </View>
          )}
        </View>

        {/* Description Section */}
        <View style={styles.descSection}>
          <Text style={[styles.descLabel, getLocalizedFontStyle(lang, 'bold')]}>{t('details')}</Text>
          <TranslatableText
            entityType="partner"
            entityId={partner.id}
            fieldName="description"
            sourceText={partner.desc}
            sourceLanguage={partner.sourceLanguage}
            textStyle={styles.descText}
          />
        </View>

        {/* Location */}
        {partner.location ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <LocationPinIcon size={18} color="#0C1015" />
            </View>
            <View>
              <Text style={[styles.infoLabel, getLocalizedFontStyle(lang, 'regular')]}>{t('location')}</Text>
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
          <View style={styles.infoIconWrap}>
            <CalendarDotIcon size={18} color="#0C1015" />
          </View>
          <View>
            <Text style={[styles.infoLabel, getLocalizedFontStyle(lang, 'regular')]}>{t('activityTime')}</Text>
            <Text style={[styles.infoValue, getLocalizedFontStyle(lang, 'medium')]}>{formatDeadline(partner.time, lang)}</Text>
          </View>
        </View>

        {/* Deadline Time */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <ClockDeadlineIcon size={18} color="#0C1015" />
          </View>
          <View>
            <Text style={[styles.infoLabel, getLocalizedFontStyle(lang, 'regular')]}>{t('deadlineTime')}</Text>
            <Text style={[styles.infoValue, getLocalizedFontStyle(lang, 'medium')]}>{formatDeadline(partner.expiresAt, lang)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* User row */}
        <TouchableOpacity style={styles.userRow} activeOpacity={0.7} onPress={handleOrganizerAvatarPress}>
          <Avatar text={partner.user} uri={partner.avatar} size="sm" gender={partner.gender} />
          <View>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, getLocalizedFontStyle(lang, 'medium')]}>{partner.user}</Text>
              {partner.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
              {partner.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
            </View>
            <Text style={[styles.userMeta, getLocalizedFontStyle(lang, 'regular')]} numberOfLines={2}>
              {organizerMeta ? `${organizerMeta} \u00B7 ${organizerTime}` : organizerTime}
            </Text>
          </View>
        </TouchableOpacity>

        <PageTranslationToggle />

      </ScrollView>

      {/* Bottom action bar */}
      {!isOwnPost && (
        <View style={[styles.bottomBar, isExpired && styles.bottomBarDisabled]}>
          <TouchableOpacity
            style={styles.bottomBtn}
            activeOpacity={0.7}
            onPress={handleDmOrganizer}
            disabled={isExpired}
          >
            <Text style={[styles.bottomBtnText, getLocalizedFontStyle(lang, 'bold')]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{t('partnerDmOrganizer')}</Text>
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
    gap: 24,
  },

  /* ----- Title ----- */
  contentTitle: {
    fontSize: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    lineHeight: 26,
  },

  /* ----- Description Section ----- */
  descSection: {
    gap: 4,
  },
  descLabel: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#86909C',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    lineHeight: 22,
  },

  /* ----- Info rows ----- */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },

  /* ----- Divider ----- */
  divider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
  },

  /* ----- User row ----- */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  userMeta: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* ----- Expired stamp overlay ----- */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleFlex: {
    flex: 1,
  },
  expiredTag: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
  },
  expiredTagText: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#ED4956',
  },

  /* ----- Bottom action bar ----- */
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  bottomBtn: {
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#0C1015',
    alignItems: 'center',
  },
  bottomBtnText: {
    fontSize: 15,
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
