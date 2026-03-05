import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ChevronRightIcon, QuoteIcon, ShoppingBagIcon, TruckIcon, UsersIcon } from './icons';

type FunctionRefCardProps = {
  functionType: string;
  title?: string | null;
  onPress?: () => void;
};

function FunctionTypeIcon({ functionType }: { functionType: string }) {
  if (functionType === 'partner') return <UsersIcon size={11} color={colors.primary} />;
  if (functionType === 'errand') return <TruckIcon size={11} color={colors.primary} />;
  if (functionType === 'secondhand') return <ShoppingBagIcon size={11} color={colors.primary} />;
  return <QuoteIcon size={11} color={colors.primary} />;
}

export default function FunctionRefCard({ functionType, title, onPress }: FunctionRefCardProps) {
  const { t } = useTranslation();
  const isPressable = !!onPress;

  const typeLabel =
    functionType === 'partner'
      ? t('findPartner')
      : functionType === 'errand'
        ? t('errands')
        : functionType === 'secondhand'
          ? t('secondhand')
          : t('forum');

  return (
    <TouchableOpacity
      activeOpacity={isPressable ? 0.85 : 1}
      disabled={!isPressable}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.accentBar} />

      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <FunctionTypeIcon functionType={functionType} />
            </View>
            <Text style={styles.label}>{typeLabel}</Text>
          </View>
          <ChevronRightIcon size={14} color={colors.onSurfaceVariant} />
        </View>

        {!!title && (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    opacity: 0.88,
  },
  inner: {
    padding: spacing.md,
    paddingLeft: spacing.md + spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '18',
  },
  label: {
    ...typography.labelSmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  title: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 18,
  },
});
