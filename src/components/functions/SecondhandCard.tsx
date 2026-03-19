import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { SecondhandItem } from '../../types';
import Avatar from '../common/Avatar';
import { PageTranslationProvider, PageTranslationToggle, usePageTranslation } from '../common/PageTranslation';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBagIcon,
  MaleIcon,
  FemaleIcon,
} from '../common/icons';
import { FigmaMoreDotsIcon } from './SecondhandFigmaIcons';
import { getLocalizedSecondhandCondition } from '../../utils/secondhandCondition';
import { isExpiredNow } from '../../hooks/useExpirationTick';

export interface SecondhandCardProps {
  item: SecondhandItem;
  id: string;
  onPress: (id: string) => void;
  onAvatarPress: (item: SecondhandItem) => void;
  onMore: (item: SecondhandItem, id: string) => void;
  onImagePress: (images: string[], index: number) => void;
  now: number;
  t: (key: string) => string;
  categoryColor?: string;
}

/* ── Combined title text: registers for translation, always shows condition + desc ── */
function CardCombinedText({
  entityId,
  item,
  isSoldOrExpired,
}: {
  entityId: string;
  item: SecondhandItem;
  isSoldOrExpired: boolean;
}) {
  const { t } = useTranslation();
  const pageCtx = usePageTranslation();
  const registerItem = pageCtx?.registerItem;
  const unregisterItem = pageCtx?.unregisterItem;
  const keyRef = useRef(`sh-${entityId}`);

  useEffect(() => {
    if (!registerItem || !entityId || !item.title?.trim()) return;
    registerItem(keyRef.current, {
      entityType: 'secondhand',
      entityId,
      sourceText: item.title.trim(),
      sourceLanguage: item.sourceLanguage,
    });
    return () => unregisterItem?.(keyRef.current);
  }, [registerItem, unregisterItem, entityId, item.title, item.sourceLanguage]);

  // When translated, only replace the title part; condition + desc stay as-is
  const translatedTitle = pageCtx?.showTranslated
    ? pageCtx.getTranslation('secondhand', entityId)?.fields?.title
    : undefined;

  const titlePart = translatedTitle ?? item.title?.trim() ?? '';
  const conditionPart = getLocalizedSecondhandCondition(item.condition, t);
  const descPart = item.desc?.trim() || t('noDescription');
  const combined = [titlePart, conditionPart, descPart].filter(Boolean).join(' | ');

  return (
    <Text
      style={[styles.itemTitle, styles.titleTextWrap, isSoldOrExpired && styles.textDimmed]}
      numberOfLines={2}
    >
      {combined}
    </Text>
  );
}

/* ── Memoized Secondhand Card (Figma horizontal layout) ── */
const SecondhandCard = React.memo(function SecondhandCard({
  item,
  id,
  onPress,
  onAvatarPress,
  onMore,
  onImagePress,
  now,
  t,
  categoryColor,
}: SecondhandCardProps) {
  const isSoldOrExpired = item.sold || isExpiredNow(item.expired, item.expiresAt, now);
  const primaryImage = item.images?.[0];

  return (
    <PageTranslationProvider>
    <TouchableOpacity
      style={[
        styles.card,
        categoryColor ? { borderLeftWidth: 3, borderLeftColor: categoryColor } : undefined,
      ]}
      activeOpacity={0.7}
      onPress={() => onPress(id)}
    >
      {/* Image 105x105 borderRadius:10 */}
      <View style={[styles.imageArea, isSoldOrExpired && styles.imageAreaDimmed]}>
        {primaryImage ? (
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={0.9}
            onPress={(e) => {
              e.stopPropagation();
              onImagePress(item.images ?? [primaryImage], 0);
            }}
          >
            <ExpoImage
              source={primaryImage}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={primaryImage}
            />
          </TouchableOpacity>
        ) : (
          <ShoppingBagIcon size={32} color="#C7C7CC" />
        )}
        {/* Condition badge */}
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionBadgeText}>{getLocalizedSecondhandCondition(item.condition, t)}</Text>
        </View>
      </View>

      {/* Right content */}
      <View style={[styles.cardContent, isSoldOrExpired && styles.contentDimmed]}>
        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <CardCombinedText entityId={id} item={item} isSoldOrExpired={isSoldOrExpired} />
            <PageTranslationToggle style={styles.translateToggle} />
          </View>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>HK¥</Text>
              <Text style={styles.priceValue}>{item.price?.replace(/^HK\$?\s*|^HKD?\s*/i, '') || '0'}</Text>
            </View>
            <View style={styles.sellerRow}>
              <TouchableOpacity
                style={styles.sellerLeft}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  onAvatarPress(item);
                }}
              >
                <Avatar text={item.user} uri={item.avatar} size="xxs" gender={item.gender} />
                <Text style={styles.sellerName} numberOfLines={1}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => onMore(item, id)}
              >
                <FigmaMoreDotsIcon size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      {/* Expired/Sold stamp overlay — matching PartnerCard */}
      {item.sold && (
        <View style={styles.expiredOverlay}>
          <View style={styles.expiredStamp}>
            <Text style={styles.expiredStampText}>{t('sold')}</Text>
          </View>
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
        </View>
      )}
      {isSoldOrExpired && !item.sold && (
        <View style={styles.expiredOverlay}>
          <View style={styles.expiredStamp}>
            <Text style={styles.expiredStampText}>{t('secondhandExpired')}</Text>
          </View>
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
        </View>
      )}
    </TouchableOpacity>
    </PageTranslationProvider>
  );
});

export default SecondhandCard;

const styles = StyleSheet.create({
  /* Figma: horizontal card — px:16, image+content row, gap:12 */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },

  /* Figma: image 105x105, borderRadius:10 */
  imageArea: {
    width: 105,
    height: 105,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageAreaDimmed: {
    opacity: 0.35,
  },
  contentDimmed: {
    opacity: 0.35,
  },
  /* Condition badge — left:8 top:8 */
  conditionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  conditionBadgeText: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#FFFFFF',
  },
  /* Expired/Sold stamp overlay — matching PartnerCard */
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

  /* Right content column */
  cardContent: {
    flex: 1,
  },
  /* All content fits within image height, seller bottom aligns with image bottom */
  cardMain: {
    height: 105,
    justifyContent: 'space-between',
  },
  /* Figma 1:1646: title row — gap:10 */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  /* Figma 1:1647: h:40 (2 lines max) */
  titleTextWrap: {
    flex: 1,
    height: 40,
    width: 0,
    minWidth: 0,
    flexShrink: 1,
  },
  /* Figma: 思源黑体 CN Medium, 14px, lineHeight:20, #1F1F1F */
  itemTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#1F1F1F',
  },
  textDimmed: {
    color: '#C7C7CC',
  },
  translateToggle: {
    marginTop: 0,
    alignSelf: 'flex-start',
    marginLeft: 'auto',
  },

  /* Figma 1:1651: D-DIN Exp Bold, #FF2538, gap:2, items-end */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  /* Figma 1:1652: D-DIN Exp Bold, 12px, tracking:0.6429 */
  priceCurrency: {
    fontSize: 12,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 0.6429,
  },
  /* Figma 1:1653: D-DIN Exp Bold, 19.064px, tracking:1.5, leading:27.234 */
  priceValue: {
    fontSize: 19,
    lineHeight: 27,
    fontFamily: 'DINExp-Bold',
    color: '#FF2538',
    letterSpacing: 1.5,
  },

  /* Figma 1:1654: seller row — gap:5, items-center */
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  /* Figma 1:1658: 思源黑体 CN Regular, 12px, leading:18, #999 */
  sellerName: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#999999',
    flexShrink: 1,
  },
});
