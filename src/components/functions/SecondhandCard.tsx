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
import { getLocalizedFontStyle, fontFamily } from '../../theme/typography';

export interface SecondhandCardProps {
  item: SecondhandItem;
  id: string;
  displayTime?: string;
  footerMode?: 'default' | 'time-only';
  onPress: (id: string) => void;
  onAvatarPress: (item: SecondhandItem) => void;
  onMore: (item: SecondhandItem, id: string) => void;
  onImagePress: (images: string[], index: number) => void;
  now: number;
  t: (key: string) => string;
  /** Optional category label tag shown next to title in mixed lists */
  categoryLabel?: string;
}

/* ── Combined title text: registers for translation, shows condition and description when present ── */
function CardCombinedText({
  entityId,
  item,
  isExpired,
}: {
  entityId: string;
  item: SecondhandItem;
  isExpired: boolean;
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

  // When translated, replace title and description parts
  const translatedFields = pageCtx?.showTranslated
    ? pageCtx.getTranslation('secondhand', entityId)?.fields
    : undefined;

  const titlePart = translatedFields?.title ?? item.title?.trim() ?? '';
  const conditionPart = getLocalizedSecondhandCondition(item.condition, t);
  const descPart = translatedFields?.description ?? item.desc?.trim() ?? '';
  const combined = [titlePart, conditionPart, descPart].filter(Boolean).join(' | ');

  return (
    <Text
      style={[styles.itemTitle, styles.titleTextWrap, isExpired && styles.textDimmed]}
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
  displayTime,
  footerMode = 'default',
  onPress,
  onAvatarPress,
  onMore,
  onImagePress,
  now,
  t,
  categoryLabel,
}: SecondhandCardProps) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const isExpired = isExpiredNow(item.expired, item.expiresAt, now);
  const primaryImage = item.images?.[0];

  return (
    <PageTranslationProvider>
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(id)}
    >
      {/* Image 105x105 borderRadius:10 */}
      <View style={[styles.imageArea, isExpired && styles.imageAreaDimmed]}>
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
        {/* Multi-image count badge */}
        {(item.images?.length ?? 0) > 1 && (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountBadgeText}>1/{item.images!.length}</Text>
          </View>
        )}
      </View>

      {/* Right content */}
      <View style={[styles.cardContent, isExpired && styles.contentDimmed]}>
        <View style={styles.cardMain}>
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <CardCombinedText entityId={id} item={item} isExpired={isExpired} />
              <View style={styles.titleRight}>
                {categoryLabel ? (
                  <View style={styles.categoryTag}>
                    <Text style={[styles.categoryTagText, getLocalizedFontStyle(language, 'regular')]}>{categoryLabel}</Text>
                  </View>
                ) : null}
                {isExpired ? (
                  <View style={styles.expiredTag}>
                    <Text style={[styles.expiredTagText, getLocalizedFontStyle(language, 'bold')]}>{t('secondhandExpired')}</Text>
                  </View>
                ) : null}
                <PageTranslationToggle />
              </View>
            </View>
          </View>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>HK¥</Text>
              <Text style={styles.priceValue}>{item.price?.replace(/^HK\$?\s*|^HKD?\s*/i, '') || '0'}</Text>
            </View>
            <View style={styles.sellerRow}>
              {footerMode === 'time-only' ? (
                <View style={styles.sellerLeft}>
                  <Text style={styles.sellerName} numberOfLines={1}>{displayTime ?? ''}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.sellerLeft}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    onAvatarPress(item);
                  }}
                >
                  <Avatar text={item.user} uri={item.avatar} size="xxs" gender={item.gender} />
                  <Text style={[styles.sellerName, getLocalizedFontStyle(language, 'regular')]} numberOfLines={1}>{item.user}</Text>
                  {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                  {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
                </TouchableOpacity>
              )}
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
  imageCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  imageCountBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  conditionBadgeText: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: fontFamily.medium,
    color: '#FFFFFF',
  },
  categoryTag: {
    backgroundColor: '#F3F5F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  categoryTagText: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    color: '#86909C',
  },
  expiredTag: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  expiredTagText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: '#ED4956',
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
  titleBlock: {
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  /* Figma 1:1647: h:40 (2 lines max) */
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  /* Figma: 思源黑体 CN Medium, 14px, lineHeight:20, #1F1F1F */
  itemTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.medium,
    color: '#1F1F1F',
  },
  textDimmed: {
    color: '#C7C7CC',
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
    fontFamily: fontFamily.regular,
    color: '#999999',
    flexShrink: 1,
  },
});
