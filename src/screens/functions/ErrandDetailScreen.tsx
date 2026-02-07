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
import { useErrands } from '../../hooks/useErrands';
import { useErrandStore } from '../../store/errandStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  BackIcon,
  DollarIcon,
  ClockIcon,
  MapPinIcon,
  PackageIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandDetail'>;

export default function ErrandDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { index } = route.params;
  const { data: errands } = useErrands();
  const toggleAccept = useErrandStore((s) => s.toggleAccept);
  const acceptedErrands = useErrandStore((s) => s.acceptedErrands);

  const errand = errands?.[index];
  const isAccepted = acceptedErrands.has(index);

  const handleAccept = useCallback(() => {
    toggleAccept(index);
  }, [toggleAccept, index]);

  if (!errand) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
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
        <Text style={styles.topBarTitle}>{t('errandDetail')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userSection}>
          <Image source={{ uri: errand.avatar }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{errand.user}</Text>
            <Text style={styles.userBio} numberOfLines={1}>
              {errand.bio}
            </Text>
          </View>
        </View>

        {/* Category Tag */}
        <View style={styles.tagRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{t(errand.category)}</Text>
          </View>
          {errand.expired && (
            <View style={styles.expiredTag}>
              <Text style={styles.expiredTagText}>{t('expired')}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{errand.title}</Text>

        {/* Content */}
        <Text style={styles.content}>{errand.desc}</Text>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <DollarIcon size={24} color={colors.primary} />
          <Text style={styles.priceLabel}>{t('reward')}</Text>
          <Text style={styles.priceValue}>{errand.price}</Text>
        </View>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <ClockIcon size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{errand.time}</Text>
          </View>
          {errand.from ? (
            <View style={styles.metaRow}>
              <MapPinIcon size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText}>
                {errand.from} → {errand.to}
              </Text>
            </View>
          ) : null}
          {errand.item ? (
            <View style={styles.metaRow}>
              <PackageIcon size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{errand.item}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Accept Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            isAccepted && styles.acceptedButton,
            errand.expired && styles.disabledButton,
          ]}
          activeOpacity={0.7}
          onPress={handleAccept}
          disabled={isAccepted || errand.expired}
        >
          <Text
            style={[
              styles.acceptButtonText,
              isAccepted && styles.acceptedButtonText,
            ]}
          >
            {isAccepted ? t('alreadyAccepted') : t('acceptErrand')}
          </Text>
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
    padding: spacing.lg,
    paddingBottom: 100,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceVariant,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  userBio: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  categoryTag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    marginRight: spacing.sm,
  },
  categoryTagText: {
    ...typography.labelSmall,
    color: colors.onSecondaryContainer,
  },
  expiredTag: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  expiredTagText: {
    ...typography.labelSmall,
    color: colors.onErrorContainer,
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  content: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  priceLabel: {
    ...typography.titleSmall,
    color: colors.onPrimaryContainer,
    marginLeft: spacing.sm,
    flex: 1,
  },
  priceValue: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  metaSection: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptedButton: {
    backgroundColor: colors.surfaceVariant,
  },
  disabledButton: {
    backgroundColor: colors.outlineVariant,
  },
  acceptButtonText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  acceptedButtonText: {
    color: colors.onSurfaceVariant,
  },
});
