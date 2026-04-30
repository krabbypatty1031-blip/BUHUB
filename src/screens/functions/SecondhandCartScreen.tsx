import React, { useCallback, useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { SecondhandItem } from '../../types';
import { useWantedSecondhand, useWantSecondhand } from '../../hooks/useSecondhand';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { borderRadius, elevation, spacing } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import EmptyState from '../../components/common/EmptyState';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import FunctionForwardSheet from '../../components/common/FunctionForwardSheet';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import Avatar from '../../components/common/Avatar';
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import { buildChatBackTarget } from '../../utils/chatNavigation';
import { isCurrentUserFunctionAuthor } from '../../utils/functionAuthor';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  MapPinIcon,
  MoreHorizontalIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandCart'>;

type CartActionItem = {
  item: SecondhandItem;
  id: string;
};

type CartSection = {
  key: 'active' | 'inactive';
  title: string;
  data: SecondhandItem[];
};

function CartItemCard({
  item,
  onPress,
  onAvatarPress,
  onMore,
  onImagePress,
  expiredLabel,
}: {
  item: SecondhandItem;
  onPress: (id: string) => void;
  onAvatarPress: (item: SecondhandItem) => void;
  onMore: (item: SecondhandItem) => void;
  onImagePress: (images: string[], index: number) => void;
  expiredLabel: string;
}) {
  const primaryImage = item.images?.[0];
  const isExpired = item.expired;

  return (
    <PageTranslationProvider>
    <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => onPress(item.id)}>
      <View style={styles.cardImageWrap}>
        {primaryImage ? (
          <TouchableOpacity
            style={styles.cardImagePressTarget}
            activeOpacity={0.9}
            onPress={(event) => {
              event.stopPropagation();
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
          <View style={styles.cardImageFallback}>
            <ShoppingBagIcon size={28} color={colors.outline} />
          </View>
        )}
        {(item.images?.length ?? 0) > 1 ? (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountBadgeText}>{`1/${item.images!.length}`}</Text>
          </View>
        ) : null}
        {isExpired && <View style={styles.cardImageDimmer} />}
        {isExpired ? (
          <View style={[styles.statusBadge, styles.statusBadgeExpired]}>
            <Text style={styles.statusBadgeText}>{expiredLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <TranslatableText
              entityType="secondhand"
              entityId={item.id}
              fieldName="title"
              sourceText={item.title}
              sourceLanguage={item.sourceLanguage}
              textStyle={styles.cardTitle}
              numberOfLines={2}
            />
            <Text style={styles.cardPrice}>{item.price}</Text>
          </View>
          <View style={styles.cardHeaderActions}>
            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => onMore(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreHorizontalIcon size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sellerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(event) => {
              event.stopPropagation();
              onAvatarPress(item);
            }}
          >
            <Avatar text={item.user} uri={item.avatar} size="sm" gender={item.gender} />
          </TouchableOpacity>
          <Text style={styles.sellerName} numberOfLines={1}>
            {item.user}
          </Text>
          {item.location ? (
            <>
              <MapPinIcon size={14} color={colors.onSurfaceVariant} />
              <TranslatableText
                entityType="secondhand"
                entityId={item.id}
                fieldName="location"
                sourceText={item.location}
                sourceLanguage={item.sourceLanguage}
                textStyle={styles.locationText}
                containerStyle={styles.locationWrap}
                numberOfLines={1}
              />
            </>
          ) : null}
          <PageTranslationToggle style={styles.cardTranslationToggle} />
        </View>

        <View style={styles.footerRow}>
          {isExpired ? (
            <Text style={styles.expiredHint}>{expiredLabel}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
    </PageTranslationProvider>
  );
}

export default function SecondhandCartScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const { data: cartItems = [], isLoading, refetch } = useWantedSecondhand();
  const wantMutation = useWantSecondhand();

  const [actionItem, setActionItem] = useState<CartActionItem | null>(null);
  const [shareSheetItem, setShareSheetItem] = useState<CartActionItem | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const sections = useMemo<CartSection[]>(() => {
    const sorted = [...cartItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const active = sorted.filter((item) => !item.expired);
    const inactive = sorted.filter((item) => item.expired);
    const nextSections: CartSection[] = [
      { key: 'active', title: t('cartActiveSection'), data: active },
      { key: 'inactive', title: t('cartInactiveSection'), data: inactive },
    ];

    return nextSections.filter((section) => section.data.length > 0);
  }, [cartItems, t]);

  const isActionItemOwnPost = useMemo(
    () =>
      actionItem ? isCurrentUserFunctionAuthor(currentUser, actionItem.item.authorId, actionItem.item.user) : false,
    [actionItem, currentUser]
  );

  const handleItemPress = useCallback(
    (id: string) => {
      navigation.navigate('SecondhandDetail', { id });
    },
    [navigation]
  );

  const handleDmSeller = useCallback(
    (item: SecondhandItem, functionId: string) => {
      if (!item.authorId || isCurrentUserFunctionAuthor(currentUser, item.authorId, item.user)) return;
      const backTo = buildChatBackTarget(navigation, 'FunctionsTab')
        ?? {
          tab: 'FunctionsTab' as const,
          screen: 'SecondhandCart',
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
          forwardedId: functionId,
          forwardedNonce: `${Date.now()}-${functionId}-${item.authorId}`,
          forwardedRequiresConfirm: true,
          backTo,
        },
      });
    },
    [currentUser, navigation]
  );

  const handleCancelWant = useCallback(
    (id: string) => {
      wantMutation.mutate({ id, currentWanted: true });
      showSnackbar({ message: t('wantCancelled'), type: 'info' });
    },
    [showSnackbar, t, wantMutation]
  );

  const handleAvatarPress = useCallback(
    (item: SecondhandItem) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: item.userName,
        displayName: item.user,
        cachedAvatar: item.avatar,
        cachedNickname: item.user,
        cachedGender: item.gender,
      });
    },
    [navigation, currentUser]
  );

  const renderItem = useCallback(
    ({ item }: { item: SecondhandItem }) => (
      <CartItemCard
        item={item}
        onPress={handleItemPress}
        onAvatarPress={handleAvatarPress}
        onMore={(next) => setActionItem({ item: next, id: next.id })}
        onImagePress={(images, index) => {
          setPreviewImages(images);
          setPreviewIndex(index);
          setPreviewVisible(true);
        }}
        expiredLabel={t('secondhandExpired')}
      />
    ),
    [handleItemPress, handleAvatarPress, t]
  );

  return (
      <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('tabMyWants')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={<ShoppingCartIcon size={36} color={colors.onSurfaceVariant} />}
                title={t('noWantRecords')}
              />
            </View>
          ) : null
        }
      />

      <SwipeableBottomSheet visible={!!actionItem} onClose={() => setActionItem(null)}>
            {!isActionItemOwnPost ? (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  const current = actionItem;
                  setActionItem(null);
                  if (current) {
                    handleDmSeller(current.item, current.id);
                  }
                }}
              >
                <Text style={styles.actionText}>{t('secondhandDmSeller')}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const current = actionItem;
                setActionItem(null);
                if (current) {
                  setShareSheetItem(current);
                }
              }}
            >
              <Text style={styles.actionText}>{t('forwardToContact')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const current = actionItem;
                setActionItem(null);
                if (current) {
                  handleCancelWant(current.id);
                }
              }}
            >
              <Text style={styles.actionTextDanger}>{t('notWantAnymore')}</Text>
            </TouchableOpacity>
      </SwipeableBottomSheet>

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
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  sectionSpacer: {
    height: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sectionCount: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  cardImageWrap: {
    height: 180,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePressTarget: {
    ...StyleSheet.absoluteFillObject,
  },
  imageCountBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  imageCountBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontWeight: '700',
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimLight,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeSold: {
    backgroundColor: colors.error,
  },
  statusBadgeExpired: {
    backgroundColor: colors.outline,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontWeight: '700',
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardHeaderActions: {
    alignItems: 'flex-end',
  },
  cardTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTranslationToggle: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  cardPrice: {
    ...typography.titleMedium,
    color: colors.error,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    lineHeight: 22,
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sellerName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flexShrink: 0,
  },
  locationText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  locationWrap: {
    flex: 1,
    marginLeft: spacing.xxs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  expiredHint: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  actionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  actionTextDanger: {
    ...typography.bodyLarge,
    color: colors.error,
  },
});
