import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
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
import { buildGradeMajorMeta, getRelativeTime } from '../../utils/formatTime';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { handleFunctionDetailBack } from '../../utils/functionDetailNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { getLocalizedSecondhandCondition } from '../../utils/secondhandCondition';
import { useExpirationTick, isExpiredNow } from '../../hooks/useExpirationTick';
import { ConditionIcon, TradeMethodIcon, CategoryListIcon } from '../../components/functions/DetailInfoIcons';
import { FigmaMoreDotsIcon } from '../../components/functions/SecondhandFigmaIcons';
import {
  BackIcon,
  ShoppingBagIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandDetail'>;

export default function SecondhandDetailScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { width: screenWidth } = useWindowDimensions();
  const { id, backToChat, backTo } = route.params;
  const { data: item, isLoading: isItemLoading } = useSecondhandDetail(id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const wantMutation = useWantSecondhand();
  const currentUser = useAuthStore((s) => s.user);
  const now = useExpirationTick(30000);
  const isOwnPost = isCurrentUserFunctionAuthor(currentUser, item?.authorId, item?.user);

  const isWanted = !!item?.isWanted;
  const isSold = item?.sold ?? false;
  const isExpired = item ? !item.sold && isExpiredNow(item.expired, item.expiresAt, now) : false;
  const isListingInactive = isSold || isExpired;
  const isContactDisabled = isOwnPost || isListingInactive;
  const isWantDisabled = isListingInactive;
  const previewImages = useMemo(() => item?.images ?? [], [item?.images]);
  const primaryImage = previewImages[0];

  const [popoverVisible, setPopoverVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  /** Strip currency prefix from price string (e.g. "HK$100" -> "100") */
  const priceValue = useMemo(() => {
    if (!item?.price) return '';
    return item.price.replace(/^[A-Za-z$¥€£\s]+/, '').trim();
  }, [item?.price]);

  if (!item) {
    return (
      <PageTranslationProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
            <BackIcon size={24} color="#0C1015" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          {isItemLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <ShoppingBagIcon size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyText}>{t('notFound')}</Text>
            </>
          )}
        </View>
        </SafeAreaView>
      </PageTranslationProvider>
    );
  }

  const sellerTime = getRelativeTime(item.createdAt, lang);
  const sellerMeta = buildGradeMajorMeta(t, {
    gradeKey: item.gradeKey,
    majorKey: item.majorKey,
  });

  return (
    <PageTranslationProvider>
      <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <BackIcon size={24} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPopoverVisible(true)}>
          <FigmaMoreDotsIcon size={20} color="#86909C" />
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
        {/* ----- Hero Image ----- */}
        <View style={{ width: screenWidth, height: screenWidth * 0.65 }}>
          <View
            style={[
              styles.heroImage,
              { width: screenWidth, height: screenWidth * 0.65 },
              isListingInactive && styles.heroImageDimmed,
            ]}
          >
            {primaryImage ? (
              <>
                <TouchableOpacity
                  style={styles.heroImageTouch}
                  activeOpacity={0.9}
                  onPress={() => {
                    setPreviewIndex(0);
                    setPreviewVisible(true);
                  }}
                >
                  <ExpoImage
                    source={primaryImage}
                    style={styles.heroImageAsset}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                    recyclingKey={primaryImage}
                  />
                </TouchableOpacity>
                {previewImages.length > 1 ? (
                  <View style={styles.imageCountBadge}>
                    <Text style={styles.imageCountBadgeText}>{`1/${previewImages.length}`}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <ShoppingBagIcon size={56} color={colors.outlineVariant} />
            )}
          </View>
          {/* Expired stamp overlay — above heroImage */}
          {isExpired && (
            <View style={styles.expiredOverlay}>
              <View style={styles.expiredStamp}>
                <Text style={styles.expiredStampText}>{t('secondhandExpired')}</Text>
              </View>
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
            </View>
          )}
        </View>

        {/* ----- Content below image ----- */}
        <View style={styles.contentPadding}>
          {/* Title */}
          <TranslatableText
            entityType="secondhand"
            entityId={item.id}
            fieldName="title"
            sourceText={item.title}
            sourceLanguage={item.sourceLanguage}
            textStyle={styles.title}
          />

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceCurrency}>HK¥</Text>
            <Text style={styles.priceValue}>{priceValue}</Text>
          </View>

          {/* Description */}
          <TranslatableText
            entityType="secondhand"
            entityId={item.id}
            fieldName="description"
            sourceText={item.desc}
            sourceLanguage={item.sourceLanguage}
            textStyle={styles.descriptionText}
          />

          <PageTranslationToggle style={styles.translationToggle} />

          {/* Info items */}
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <ConditionIcon size={16} color="#86909C" />
              <Text style={styles.infoLabel}>{t('condition')}</Text>
              <Text style={styles.infoValue}>{getLocalizedSecondhandCondition(item.condition, t)}</Text>
            </View>
            <View style={styles.infoRow}>
              <TradeMethodIcon size={16} color="#86909C" />
              <Text style={styles.infoLabel}>{t('tradeLocation')}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.location || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <CategoryListIcon size={16} color="#86909C" />
              <Text style={styles.infoLabel}>{t('categoryLabel')}</Text>
              <Text style={styles.infoValue}>{t(item.category.toLowerCase())}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seller row */}
          <View style={styles.sellerRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSellerAvatarPress}>
              <Avatar text={item.user} uri={item.avatar} size="sm" gender={item.gender} />
            </TouchableOpacity>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName} numberOfLines={1}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
              </View>
              <Text style={styles.sellerMeta} numberOfLines={1}>
                {[sellerMeta, sellerTime].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ----- Bottom Action Bar ----- */}
      {!isOwnPost && (
        <View style={[styles.bottomBar, isListingInactive && styles.bottomBarDisabled]}>
          <TouchableOpacity
            style={styles.dmButton}
            activeOpacity={0.7}
            onPress={handleContact}
            disabled={isContactDisabled}
          >
            <Text style={styles.dmButtonText}>{t('secondhandDmSeller')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.wantButton, isWanted && styles.wantedButtonActive]}
            activeOpacity={0.7}
            onPress={handleWant}
            disabled={isWantDisabled}
          >
            <Text style={styles.wantButtonText}>
              {isWanted ? t('wanted') : t('iWant')}
            </Text>
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
              targetId: item.id,
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
        functionType="secondhand"
        functionTitle={item.title}
        functionPosterName={item.user}
        functionId={item.id}
        navigation={navigation}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
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
    paddingHorizontal: spacing.sm,
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

  /* ----- Hero Image ----- */
  heroImage: {
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImageDimmed: {
    opacity: 0.5,
  },
  heroImageTouch: {
    width: '100%',
    height: '100%',
  },
  heroImageAsset: {
    ...StyleSheet.absoluteFillObject,
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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

  /* ----- Content ----- */
  contentPadding: {
    padding: 16,
  },

  /* Title */
  title: {
    fontSize: 18,
    fontFamily: 'SourceHanSansCN-Medium',
    fontWeight: '500',
    color: '#0C1015',
    lineHeight: 21,
    marginBottom: 8,
  },

  /* Price */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 12,
  },
  priceCurrency: {
    fontSize: 12,
    fontFamily: 'DINExp-Bold',
    fontWeight: '700',
    color: '#FF2538',
    lineHeight: 27,
    letterSpacing: 0.6429,
  },
  priceValue: {
    fontSize: 19,
    fontFamily: 'DINExp-Bold',
    fontWeight: '700',
    color: '#FF2538',
    lineHeight: 27,
    letterSpacing: 1.5,
  },

  /* Description */
  descriptionText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    fontWeight: '400',
    color: '#86909C',
    lineHeight: 20,
    marginBottom: 16,
  },

  translationToggle: {
    marginBottom: 16,
  },

  /* Info items */
  infoColumn: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    fontWeight: '400',
    color: '#86909C',
    lineHeight: 20,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    fontWeight: '400',
    color: '#0C1015',
    lineHeight: 20,
    flex: 1,
    textAlign: 'right',
  },

  /* Divider */
  divider: {
    height: 0.5,
    backgroundColor: '#DEE2E5',
    marginBottom: 16,
  },

  /* Seller */
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Medium',
    fontWeight: '500',
    color: '#0C1015',
    lineHeight: 20,
    flexShrink: 1,
  },
  sellerMeta: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    fontWeight: '400',
    color: '#86909C',
    lineHeight: 17,
    marginTop: 2,
  },

  /* ----- Bottom Action Bar ----- */
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#DEE2E5',
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  dmButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C1015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmButtonText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wantButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF2538',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wantedButtonActive: {
    opacity: 0.7,
  },
  wantButtonText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    fontWeight: '700',
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
