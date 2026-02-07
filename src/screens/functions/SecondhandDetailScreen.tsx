import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useSecondhand } from '../../hooks/useSecondhand';
import { useSecondhandStore } from '../../store/secondhandStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  BackIcon,
  ShoppingBagIcon,
  MapPinIcon,
  MessageIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'SecondhandDetail'>;

export default function SecondhandDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { index } = route.params;
  const { data: items } = useSecondhand();
  const wantedItems = useSecondhandStore((s) => s.wantedItems);
  const toggleWant = useSecondhandStore((s) => s.toggleWant);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const item = items?.[index];
  const isWanted = wantedItems.has(index);

  const handleContact = useCallback(() => {
    showSnackbar({ message: t('contactSent'), type: 'success' });
  }, [showSnackbar, t]);

  const handleWant = useCallback(() => {
    toggleWant(index);
  }, [toggleWant, index]);

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('secondhandDetail')}</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('secondhandDetail')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Placeholder */}
        <View style={styles.imageContainer}>
          <ShoppingBagIcon size={48} color={colors.outlineVariant} />
        </View>

        {/* Title & Price */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{item.price}</Text>
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{t(item.category)}</Text>
          </View>
          <View style={styles.conditionTag}>
            <Text style={styles.conditionTagText}>{item.condition}</Text>
          </View>
          {item.sold && (
            <View style={styles.soldTag}>
              <Text style={styles.soldTagText}>{t('sold')}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>{t('description')}</Text>
        <Text style={styles.description}>{item.desc}</Text>

        {/* Location */}
        {item.location ? (
          <View style={styles.locationRow}>
            <MapPinIcon size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        ) : null}

        {/* Seller Info */}
        <Text style={styles.sectionLabel}>{t('sellerInfo')}</Text>
        <View style={styles.sellerSection}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{item.user}</Text>
            <Text style={styles.sellerBio} numberOfLines={1}>
              {item.bio}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.wantButton, isWanted && styles.wantedButton]}
          activeOpacity={0.7}
          onPress={handleWant}
        >
          <Text style={[styles.wantButtonText, isWanted && styles.wantedButtonText]}>
            {isWanted ? t('wanted') : t('iWant')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactButton}
          activeOpacity={0.7}
          onPress={handleContact}
          disabled={item.sold}
        >
          <MessageIcon size={20} color={colors.onPrimary} />
          <Text style={styles.contactButtonText}>{t('contactSeller')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: 260,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.headlineSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  categoryTag: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    marginRight: spacing.sm,
  },
  categoryTagText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
  },
  conditionTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    marginRight: spacing.sm,
  },
  conditionTagText: {
    ...typography.labelSmall,
    color: colors.onSecondaryContainer,
  },
  soldTag: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  soldTagText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
  },
  sectionLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  locationText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.sm,
  },
  sellerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceVariant,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  sellerName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  sellerBio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.md,
  },
  wantButton: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wantedButton: {
    backgroundColor: colors.primaryContainer,
  },
  wantButtonText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  wantedButtonText: {
    color: colors.primary,
  },
  contactButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contactButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
