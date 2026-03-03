import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  BackHandler,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useSecondhandDetail, useWantSecondhand } from '../../hooks/useSecondhand';
import { reportService } from '../../api/services/report.service';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ReportModal from '../../components/common/ReportModal';
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildPostMeta } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import {
  BackIcon,
  ShoppingBagIcon,
  MapPinIcon,
  MessageIcon,
  HeartIcon,
  AlertTriangleIcon,
  MoreHorizontalIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandDetail'>;

export default function SecondhandDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { width: screenWidth } = useWindowDimensions();
  const { id, backToChat } = route.params;
  const { data: item } = useSecondhandDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const wantMutation = useWantSecondhand();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, item?.authorId, item?.user);

  const isWanted = !!item?.isWanted;
  const isSold = item?.sold ?? false;
  const isExpired = item ? item.expired && !item.sold : false;
  const isListingInactive = isSold || isExpired;
  const isWantDisabled = isListingInactive || isOwnPost;
  const isContactDisabled = isListingInactive || isOwnPost;
  const primaryImage = item?.images?.[0];

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

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

  const handleContact = useCallback(() => {
    if (!item?.authorId || isContactDisabled) return;
    const backTo = buildChatBackTarget(navigation, 'FunctionsTab')
      ?? {
        tab: 'FunctionsTab' as const,
        screen: 'SecondhandDetail',
        params: { id: item.id },
      };
    navigation.getParent()?.navigate('MessagesTab', {
      screen: 'Chat',
      params: {
        contactId: item.authorId,
        contactName: item.user,
        contactAvatar: item.avatar,
        forwardedType: 'secondhand',
        forwardedTitle: item.title,
        forwardedPosterName: item.user,
        forwardedId: item.id,
        forwardedNonce: `${Date.now()}-${item.id}-${item.authorId}`,
        forwardedRequiresConfirm: true,
        backTo,
      },
    });
  }, [isContactDisabled, item, navigation]);

  const handleSellerAvatarPress = useCallback(() => {
    if (!item) return;
    handleAvatarPressNavigation({
      navigation,
      currentUser,
      userName: item.userName,
      displayName: item.user,
    });
  }, [navigation, currentUser, item]);

  const handleEdit = useCallback(() => {
    if (!item || !isOwnPost) return;
    setPopoverVisible(false);
    navigation.navigate('ComposeSecondhand', { editId: item.id, initialData: item });
  }, [item, isOwnPost, navigation]);

  const handleForwardToForum = useCallback(() => {
    if (!item) return;
    setPopoverVisible(false);
    navigateToForumComposeSelection({
      navigation,
      functionType: 'secondhand',
      functionTitle: item.title,
      functionId: item.id,
    });
  }, [item, navigation]);

  const handleWant = useCallback(() => {
    wantMutation.mutate({ id, currentWanted: isWanted });
    if (!isWanted) {
      showSnackbar({ message: t('addedToCart'), type: 'info' });
    } else {
      showSnackbar({ message: t('wantCancelled'), type: 'info' });
    }
  }, [id, isWanted, showSnackbar, t, wantMutation]);

  if (!item) {
    return (
      <PageTranslationProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
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
      </PageTranslationProvider>
    );
  }

  const sellerMeta = buildPostMeta(t, lang, {
    createdAt: item.createdAt,
  });

  return (
    <PageTranslationProvider>
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
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
        {/* ----- Hero Image ----- */}
        <View style={[styles.heroImage, { width: screenWidth, height: screenWidth * 0.65 }, isListingInactive && styles.heroImageDimmed]}>
          {primaryImage ? (
            <TouchableOpacity
              style={styles.heroImageTouch}
              activeOpacity={0.9}
              onPress={() => setPreviewVisible(true)}
            >
              <Image source={{ uri: primaryImage }} style={styles.heroImageAsset} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <ShoppingBagIcon size={56} color={colors.outlineVariant} />
          )}
          {(item.images?.length ?? 0) > 1 ? (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountBadgeText}>{`1/${item.images!.length}`}</Text>
            </View>
          ) : null}

          {/* Condition badge */}
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

        {/* ----- Price & Title ----- */}
        <View style={styles.headerSection}>
          <Text style={styles.price}>{item.price}</Text>
          <TranslatableText
            entityType="secondhand"
            entityId={item.id}
            fieldName="title"
            sourceText={item.title}
            sourceLanguage={item.sourceLanguage}
            textStyle={styles.title}
          />
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{t(item.category)}</Text>
            </View>
            {isSold && (
              <>
                <View style={styles.tagDot} />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{t('sold')}</Text>
                </View>
              </>
            )}
            {isExpired && (
              <>
                <View style={styles.tagDot} />
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>{t('secondhandExpired')}</Text>
                </View>
              </>
            )}
            <PageTranslationToggle style={styles.headerTranslationToggle} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* ----- Description ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('itemDescription')}</Text>
          <TranslatableText
            entityType="secondhand"
            entityId={item.id}
            fieldName="description"
            sourceText={item.desc}
            sourceLanguage={item.sourceLanguage}
            textStyle={styles.descriptionText}
          />
        </View>

        <View style={styles.divider} />

        {/* ----- Trade Location ----- */}
        {item.location ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('tradeLocation')}</Text>
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MapPinIcon size={16} color={colors.onSurface} />
                </View>
                <TranslatableText
                  entityType="secondhand"
                  entityId={item.id}
                  fieldName="location"
                  sourceText={item.location}
                  sourceLanguage={item.sourceLanguage}
                  textStyle={styles.locationText}
                  containerStyle={styles.locationTextBlock}
                />
              </View>
            </View>
            <View style={styles.divider} />
          </>
        ) : null}

        {/* ----- Seller ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('sellerLabel')}</Text>
          <View style={styles.sellerRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSellerAvatarPress}>
              <Avatar text={item.user} uri={item.avatar} size="lg" gender={item.gender} />
            </TouchableOpacity>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={12} color={colors.genderMale} />}
                {item.gender === 'female' && <FemaleIcon size={12} color={colors.genderFemale} />}
                <Text style={styles.timeDot}> · </Text>
                <Text style={styles.meta} numberOfLines={1}>{sellerMeta}</Text>
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
        <View style={[styles.actionBar, isListingInactive && styles.actionBarDisabled]}>
          <TouchableOpacity
            style={[styles.wantButton, isWanted && styles.wantedButton]}
            activeOpacity={0.7}
            onPress={handleWant}
            disabled={isWantDisabled}
          >
            <HeartIcon
              size={18}
              color={isWanted ? colors.error : colors.onSurface}
              fill={isWanted ? colors.error : undefined}
            />
            <Text style={[styles.wantButtonText, isWanted && styles.wantedButtonText]}>
              {isWanted ? t('wanted') : t('iWant')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, isContactDisabled && styles.contactButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleContact}
            disabled={isContactDisabled}
          >
            <MessageIcon size={18} color={isContactDisabled ? colors.onSurfaceVariant : colors.onPrimary} />
            <Text style={[styles.contactButtonText, isContactDisabled && styles.contactButtonTextDisabled]}>
              {isOwnPost ? t('cannotDmSelf') : t('secondhandDmSeller')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportVisible}
        title={t('reportPost')}
        onClose={() => setReportVisible(false)}
onSubmit={async (reasonCategory, reason) => {
            try {
            await reportService.submit({ targetType: 'function', targetId: item.id, reasonCategory, reason });
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
        functionType="secondhand"
        functionTitle={item.title}
        functionPosterName={item.user}
        functionId={item.id}
        navigation={navigation}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={item.images ?? []}
        initialIndex={0}
        onClose={() => setPreviewVisible(false)}
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

  /* ----- Hero Image ----- */
  heroImage: {
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImageTouch: {
    width: '100%',
    height: '100%',
  },
  imageCountBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  imageCountBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontWeight: '700',
  },
  heroImageAsset: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroImageDimmed: {
    opacity: 0.5,
  },
  conditionBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusBadgeExpired: {
    backgroundColor: colors.outline,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.titleSmall,
    color: colors.white,
    fontWeight: '700',
  },

  /* ----- Header: Price & Title ----- */
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  headerTranslationToggle: {
    marginLeft: 'auto',
  },
  price: {
    ...typography.headlineMedium,
    color: colors.error,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
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

  /* ----- Location ----- */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 22,
  },
  locationTextBlock: {
    flex: 1,
  },

  /* ----- Seller ----- */
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
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
  wantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  wantedButton: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  wantButtonText: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  wantedButtonText: {
    color: colors.error,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 48,
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
  contactButtonTextDisabled: {
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
