import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandItem, SecondhandCategory } from '../../types';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import SegmentedControl, { type SegmentedControlOption } from '../../components/common/SegmentedControl';
import EmptyState from '../../components/common/EmptyState';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import Avatar from '../../components/common/Avatar';
import { PageTranslationProvider, PageTranslationToggle, usePageTranslation } from '../../components/common/PageTranslation';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { useExpirationTick, isExpiredNow } from '../../hooks/useExpirationTick';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { getLocalizedSecondhandCondition } from '../../utils/secondhandCondition';
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import {
  BackIcon,
  ShoppingBagIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import {
  FigmaSearchIcon26,
  FigmaCartIcon,
  FigmaMoreDotsIcon,
  FigmaFabPlusIcon,
  FigmaInfoIcon,
} from '../../components/functions/SecondhandFigmaIcons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandList'>;

const CATEGORIES: Array<{ key: SecondhandCategory | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'electronics', labelKey: 'electronics' },
  { key: 'books', labelKey: 'books' },
  { key: 'furniture', labelKey: 'furniture' },
  { key: 'other', labelKey: 'other' },
];

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

/* ── Memoized Item Card (Figma horizontal layout) ── */
const ItemCard = React.memo(function ItemCard({
  item,
  id,
  onPress,
  onAvatarPress,
  onMore,
  onImagePress,
  now,
  t,
}: {
  item: SecondhandItem;
  id: string;
  onPress: (id: string) => void;
  onAvatarPress: (item: SecondhandItem) => void;
  onMore: (item: SecondhandItem, id: string) => void;
  onImagePress: (images: string[], index: number) => void;
  now: number;
  t: (key: string) => string;
}) {
  const isSoldOrExpired = item.sold || isExpiredNow(item.expired, item.expiresAt, now);
  const primaryImage = item.images?.[0];

  return (
    <PageTranslationProvider>
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(id)}
    >
      {/* Figma: image 105x105 borderRadius:10 */}
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
        {/* Figma: condition badge top:8 left:8, bg rgba(0,0,0,0.4), 9px Medium white */}
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionBadgeText}>{getLocalizedSecondhandCondition(item.condition, t)}</Text>
        </View>
        {/* Status overlay */}
        {item.sold && (
          <View style={styles.statusOverlay}>
            <View style={styles.statusBadgeSold}>
              <Text style={styles.statusBadgeText}>{t('sold')}</Text>
            </View>
          </View>
        )}
        {isSoldOrExpired && !item.sold && (
          <View style={styles.statusOverlay}>
            <View style={styles.statusBadgeExpired}>
              <Text style={styles.statusBadgeText}>{t('secondhandExpired')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Right content — 105px matches image, seller bottom aligns with image bottom */}
      <View style={styles.cardContent}>
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
              {!isSoldOrExpired && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => onMore(item, id)}
                >
                  <FigmaMoreDotsIcon size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </PageTranslationProvider>
  );
});

export default function SecondhandListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedCategory = useSecondhandStore((s) => s.selectedCategory);
  const setCategory = useSecondhandStore((s) => s.setCategory);
  const expiredNotified = useSecondhandStore((s) => s.expiredNotified);
  const setExpiredNotified = useSecondhandStore((s) => s.setExpiredNotified);
  const currentUser = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useSecondhand(selectedCategory || undefined);
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const now = useExpirationTick(30000);
  const visibleItems = useMemo(
    () => items.filter((item) => !isExpiredNow(item.expired, item.expiresAt, now)),
    [items, now]
  );

  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return visibleItems;
    const query = searchText.trim().toLowerCase();
    return visibleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query)
    );
  }, [visibleItems, searchText]);

  useEffect(() => {
    if (items.length > 0 && !expiredNotified) {
      const hasExpired = items.some((item) => item.expired);
      if (hasExpired) {
        showSnackbar({ message: t('secondhandExpiryNotice'), type: 'info' });
        setExpiredNotified(true);
      }
    }
  }, [items, expiredNotified, showSnackbar, t, setExpiredNotified]);

  const categoryOptions = useMemo<SegmentedControlOption<SecondhandCategory | 'all'>[]>(
    () => CATEGORIES.map((cat) => ({ value: cat.key, label: t(cat.labelKey) })),
    [t]
  );

  const handleCategoryChange = useCallback(
    (key: SecondhandCategory | 'all') => {
      setCategory(key === 'all' ? null : key);
    },
    [setCategory]
  );

  const handleItemPress = useCallback(
    (id: string) => {
      navigation.navigate('SecondhandDetail', { id });
    },
    [navigation]
  );

  const [actionItem, setActionItem] = useState<{ item: SecondhandItem; id: string } | null>(null);
  const [shareSheetItem, setShareSheetItem] = useState<{ item: SecondhandItem; id: string } | null>(null);

  const handleDmSeller = useCallback(
    (item: SecondhandItem, functionId: string) => {
      if (!item.authorId || isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)) return;
      const backTo = buildChatBackTarget(navigation, 'FunctionsTab');
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          contactId: item.authorId,
          contactName: item.user,
          contactAvatar: item.avatar,
          forwardedType: 'secondhand',
          forwardedTitle: item.title,
          forwardedPosterName: item.user,
          forwardedId: functionId,
          forwardedNonce: `${Date.now()}-${functionId}-${item.authorId}`,
          forwardedRequiresConfirm: true,
          ...(backTo ? { backTo } : {}),
        },
      });
    },
    [currentUser, navigation]
  );

  const isActionItemOwnPost = useMemo(
    () =>
      actionItem ? isCurrentUserFunctionAuthor(currentUser, actionItem.item.authorId, actionItem.item.user) : false,
    [actionItem, currentUser]
  );

  const handleAvatarPress = useCallback(
    (item: SecondhandItem) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName,
        displayName: item.user,
      });
    },
    [navigation, currentUser]
  );

  const handleMore = useCallback(
    (item: SecondhandItem, id: string) => {
      setActionItem({ item, id });
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SecondhandItem }) => (
      <ItemCard
        id={item.id}
        item={item}
        onPress={handleItemPress}
        onAvatarPress={handleAvatarPress}
        onMore={handleMore}
        onImagePress={(images, index) => {
          setPreviewImages(images);
          setPreviewIndex(index);
          setPreviewVisible(true);
        }}
        now={now}
        t={t}
      />
    ),
    [handleItemPress, handleAvatarPress, handleMore, now, t]
  );

  /* Figma: disclaimer header */
  const renderHeader = useCallback(() => (
    <View style={styles.disclaimerSection}>
      <View style={styles.disclaimerTitleRow}>
        <Text style={styles.disclaimerTitle}>{t('secondhandDisclaimer')}</Text>
        <FigmaInfoIcon size={12} />
      </View>
      <Text style={styles.disclaimerSubtext}>{t('disclaimer')}</Text>
    </View>
  ), [t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Figma: top bar — back left:12, title center 18px Bold, search+cart right:16 gap:16 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhand')}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => navigation.navigate('SecondhandCart')}>
            <FigmaCartIcon size={26} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
            <FigmaSearchIcon26 size={30} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (collapsible) */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <FigmaSearchIcon26 size={18} color="#999999" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchSecondhand')}
              placeholderTextColor="#999999"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              autoFocus
            />
          </View>
        </View>
      )}

      {/* Figma: category tabs — bg:#F5F5F5, height:40, borderRadius:10 */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={categoryOptions}
          value={selectedCategory ?? 'all'}
          onChange={handleCategoryChange}
          containerHeight={40}
          activeTextColor="#111827"
          inactiveTextColor="#6B7280"
        />
      </View>

      {/* Figma: single column list, gap:16 */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        refreshing={isRefetching}
        onRefresh={refetch}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          !isLoading && !isRefetching ? (
            <EmptyState
              icon={<ShoppingBagIcon size={36} color="#999999" />}
              title={searchText.trim() ? t('noSearchResults') : t('noRelatedItems')}
            />
          ) : null
        }
      />

      {/* Figma: FAB — 56x56, bg:black, borderRadius:16, right:24 bottom:24 */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ComposeSecondhand', { category: selectedCategory || 'electronics' })}
      >
        <FigmaFabPlusIcon size={17.5} />
      </TouchableOpacity>

      {/* Action Menu */}
      <Modal
        visible={!!actionItem}
        transparent
        animationType="fade"
        onRequestClose={() => setActionItem(null)}
      >
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setActionItem(null)}
        >
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.actionHandle} />
            <TouchableOpacity
              style={styles.actionRowCenter}
              onPress={() => {
                const a = actionItem;
                setActionItem(null);
                if (a) setShareSheetItem(a);
              }}
            >
              <Text style={styles.actionText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            {isActionItemOwnPost ? (
              <TouchableOpacity
                style={styles.actionRowCenter}
                onPress={() => {
                  const a = actionItem;
                  setActionItem(null);
                  if (!a) return;
                  navigateToForumComposeSelection({
                    navigation,
                    functionType: 'secondhand',
                    functionTitle: a.item.title,
                    functionId: a.id,
                  });
                }}
              >
                <Text style={styles.actionText}>{t('forwardToForum')}</Text>
              </TouchableOpacity>
            ) : null}

            {!isActionItemOwnPost ? (
              <TouchableOpacity
                style={styles.actionRowCenter}
                onPress={() => {
                  const a = actionItem;
                  setActionItem(null);
                  if (a) handleDmSeller(a.item, a.id);
                }}
              >
                <Text style={styles.actionText}>{t('secondhandDmSeller')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      <FunctionForwardSheet
        visible={!!shareSheetItem}
        onClose={() => setShareSheetItem(null)}
        functionType="secondhand"
        functionTitle={shareSheetItem?.item.title ?? ''}
        functionPosterName={shareSheetItem?.item.user ?? ''}
        functionId={shareSheetItem?.id ?? ''}
        navigation={navigation}
      />
      <ImagePreviewModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Figma: top bar — height:62, back left:12, title center 18px Bold, right icons gap:16 right:16 */
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  /* Search */
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  /* Figma: category tabs — px:16 py:8 */
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  /* Figma: disclaimer — pl:16, pt:12, pb:16, gap:3 */
  disclaimerSection: {
    paddingLeft: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 3,
  },
  disclaimerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disclaimerTitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
  },
  disclaimerSubtext: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    width: 266,
  },

  /* Figma: item list gap:16, px:16 */
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  /* Figma: horizontal card — px:16, image+content row, gap:12 */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
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
    opacity: 0.45,
  },
  /* Figma: condition badge — left:8 top:8, bg:rgba(0,0,0,0.4), px:4 py:1, borderRadius:4, 9px Medium white */
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
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  statusBadgeSold: {
    backgroundColor: '#ED4956',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeExpired: {
    backgroundColor: '#C7C7CC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#FFFFFF',
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

  /* Figma: FAB — 56x56, bg:black, borderRadius:16, right:24 bottom:24, shadow */
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },

  /* Action Menu */
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 36,
  },
  actionHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  actionRowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
});
