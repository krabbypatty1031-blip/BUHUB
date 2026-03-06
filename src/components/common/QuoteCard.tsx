import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import TranslatableText from './TranslatableText';
import { ChevronRightIcon, QuoteIcon } from './icons';

type QuoteCardProps = {
  postId: string;
  content: string;
  sourceLanguage?: string | null;
  author: string;
  timeLabel: string;
  onPress?: () => void;
};

export default function QuoteCard({
  postId,
  content,
  sourceLanguage,
  author,
  timeLabel,
  onPress,
}: QuoteCardProps) {
  const { t } = useTranslation();
  const isPressable = !!onPress;

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
              <QuoteIcon size={11} color={colors.primary} />
            </View>
            <Text style={styles.label}>{t('quotePost')}</Text>
          </View>
          <ChevronRightIcon size={14} color={colors.onSurfaceVariant} />
        </View>

        <TranslatableText
          entityType="post"
          entityId={postId}
          fieldName="content"
          sourceText={content}
          sourceLanguage={sourceLanguage}
          textStyle={styles.content}
          numberOfLines={3}
        />

        <Text style={styles.meta}>
          {author} · {timeLabel}
        </Text>
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
  content: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
});
