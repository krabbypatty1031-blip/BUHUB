import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { ConditionIcon, TradeMethodIcon } from '../../components/functions/DetailInfoIcons';
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
  const strippedPrice = useMemo(() => {
    if (!item?.price) return '';
    return item.price.replace(/^HK\$?\s*|^HKD?\s*/i, '').trim();
  }, [item?.price]);

  if (!item) {
    return (
      <PageTranslationProvider>
        <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <BackIcon size={26} color="#0C1015" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.emptyContainer}>
          {isItemLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <ShoppingBagIcon size={48} color="#86909C" />
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
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
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
        {/* ----- Hero Image Carousel ----- */}
        <View style={[styles.heroImage, { width: screenWidth, height: screenWidth * 0.65 }, isListingInactive && styles.heroImageDimmed]}>
          {previewImages.length > 0 ? (
            <>
              <FlatList
                data={previewImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(uri, i) => `${uri}-${i}`}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setPreviewIndex(Math.min(Math.max(idx, 0), previewImages.length - 1));
                }}
                renderItem={({ item: uri, index }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setPreviewIndex(index);
                      setPreviewVisible(true);
                    }}
                    style={{ width: screenWidth, height: screenWidth * 0.65 }}
                  >
                    <ExpoImage
                      source={uri}
                      style={styles.heroImageAsset}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={0}
                      recyclingKey={uri}
                    />
                  </TouchableOpacity>
                )}
                getItemLayout={(_, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
              {previewImages.length > 1 && (
                <View style={styles.dotsRow}>
                  {previewImages.map((_, i) => (
                    <View key={i} style={[styles.dot, i === previewIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <ShoppingBagIcon size={56} color="#86909C" />
          )}
        </View>

        {/* ----- Content below image ----- */}
        <View style={styles.contentContainer}>
          {/* Title + Price block */}
          <View style={styles.titlePriceBlock}>
            <View style={styles.titleRow}>
              <TranslatableText
                entityType="secondhand"
                entityId={item.id}
                fieldName="title"
                sourceText={item.title}
                sourceLanguage={item.sourceLanguage}
                textStyle={styles.contentTitle}
                containerStyle={styles.titleFlex}
              />
              {isSold && (
                <View style={styles.expiredTag}>
                  <Text style={styles.expiredTagText}>{t('secondhandSold')}</Text>
                </View>
              )}
              {isExpired && (
                <View style={styles.expiredTag}>
                  <Text style={styles.expiredTagText}>{t('secondhandExpired')}</Text>
                </View>
              )}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>HK¥</Text>
              <Text style={styles.priceValue}>{strippedPrice}</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.descSection}>
            <Text style={styles.descLabel}>{t('details')}</Text>
            <TranslatableText
              entityType="secondhand"
              entityId={item.id}
              fieldName="description"
              sourceText={item.desc}
              sourceLanguage={item.sourceLanguage}
              textStyle={styles.descText}
            />
          </View>

          {/* Condition */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <ConditionIcon size={18} color="#0C1015" />
            </View>
            <View>
              <Text style={styles.infoLabel}>{t('condition')}</Text>
              <Text style={styles.infoValue}>{getLocalizedSecondhandCondition(item.condition, t)}</Text>
            </View>
          </View>

          {/* Trade method */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <TradeMethodIcon size={18} color="#0C1015" />
            </View>
            <View>
              <Text style={styles.infoLabel}>{t('tradeLocation')}</Text>
              <Text style={styles.infoValue}>{item.location || '\u2014'}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seller row */}
          <TouchableOpacity style={styles.userRow} activeOpacity={0.7} onPress={handleSellerAvatarPress}>
            <Avatar text={item.user} uri={item.avatar} size="sm" gender={item.gender} />
            <View>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
              </View>
              <Text style={styles.userMeta} numberOfLines={1}>
                {sellerMeta ? `${sellerMeta} \u00B7 ${sellerTime}` : sellerTime}
              </Text>
            </View>
          </TouchableOpacity>

          <PageTranslationToggle />
        </View>
      </ScrollView>

      {/* Bottom action bar: two buttons */}
      {!isOwnPost && (
        <View style={[styles.bottomBar, isListingInactive && styles.bottomBarDisabled]}>
          <TouchableOpacity
            style={styles.bottomBtn}
            activeOpacity={0.7}
            onPress={handleContact}
            disabled={isContactDisabled}
          >
            <Text style={styles.bottomBtnText}>{t('secondhandDmSeller')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomBtnWant, isWanted && styles.wantedButtonActive]}
            activeOpacity={0.7}
            onPress={handleWant}
            disabled={isWantDisabled}
          >
            <Text style={styles.bottomBtnText}>
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
    gap: 0,
  },

  /* ----- Hero Image ----- */
  heroImage: {
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImageDimmed: {
    opacity: 0.5,
  },
  heroImageAsset: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },

  /* ----- Expired / Sold tag ----- */
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

  /* ----- Content below image ----- */
  contentContainer: {
    padding: 16,
    gap: 24,
  },

  /* ----- Title + Price block ----- */
  titlePriceBlock: {
    gap: 6,
  },
  contentTitle: {
    fontSize: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    lineHeight: 26,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  priceCurrency: {
    fontSize: 12,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 0.6429,
  },
  priceValue: {
    fontSize: 22,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 1.5,
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

  /* ----- Bottom action bar ----- */
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  bottomBarDisabled: {
    opacity: 0.5,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#0C1015',
    alignItems: 'center',
  },
  bottomBtnWant: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#FF2538',
    alignItems: 'center',
  },
  wantedButtonActive: {
    opacity: 0.7,
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
