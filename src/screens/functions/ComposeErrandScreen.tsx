import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { ErrandCategory } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CloseIcon,
  ClockIcon,
  MapPinIcon,
  PackageIcon,
  DollarIcon,
  AlertTriangleIcon,
} from '../../components/common/icons';
import Chip from '../../components/common/Chip';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposeErrand'>;

const CATEGORIES: Array<{ key: ErrandCategory; labelKey: string }> = [
  { key: 'pickup', labelKey: 'pickup' },
  { key: 'buy', labelKey: 'buy' },
  { key: 'other', labelKey: 'other' },
];

export default function ComposeErrandScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ErrandCategory>('pickup');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [item, setItem] = useState('');

  const endTimeDisplay = useMemo(() => {
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    const h = String(end.getHours()).padStart(2, '0');
    const min = String(end.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  }, []);

  const canPost =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    from.trim().length > 0 &&
    to.trim().length > 0 &&
    item.trim().length > 0;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    navigation.replace('ErrandShare', { taskName: title });
  }, [canPost, navigation, title]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('newErrandPost')}</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text
            style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}
          >
            {t('publishBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Disclaimer ── */}
        <View style={styles.disclaimerCard}>
          <AlertTriangleIcon size={16} color={colors.onErrorContainer} />
          <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
        </View>

        {/* ── Category Selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('categoryLabel')}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.key}
                label={t(cat.labelKey)}
                selected={category === cat.key}
                onPress={() => setCategory(cat.key)}
              />
            ))}
          </View>
        </View>

        {/* ── Title & Content Card ── */}
        <View style={styles.card}>
          <TextInput
            style={styles.titleInput}
            placeholder={t('errandTitlePlaceholder')}
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.contentInput}
            placeholder={t('errandContentPlaceholder')}
            placeholderTextColor={colors.outline}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{content.length}/1000</Text>
        </View>

        {/* ── Task Details Card ── */}
        <View style={styles.card}>
          {/* Price */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <DollarIcon size={14} color={colors.primary} />{' '}
              {t('reward')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="HK$ 0"
              placeholderTextColor={colors.outline}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Item */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <PackageIcon size={14} color={colors.primary} />{' '}
              {t('itemField')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('itemPlaceholder')}
              placeholderTextColor={colors.outline}
              value={item}
              onChangeText={setItem}
              maxLength={50}
            />
          </View>
        </View>

        {/* ── Route Card ── */}
        <View style={styles.card}>
          {/* From */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.accent} />{' '}
              {t('from')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('placeholderFrom')}
              placeholderTextColor={colors.outline}
              value={from}
              onChangeText={setFrom}
              maxLength={50}
            />
          </View>

          {/* Route connector */}
          <View style={styles.routeConnector}>
            <View style={styles.routeLine} />
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
          </View>

          {/* To */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.error} />{' '}
              {t('to')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('placeholderTo')}
              placeholderTextColor={colors.outline}
              value={to}
              onChangeText={setTo}
              maxLength={50}
            />
          </View>
        </View>

        {/* ── End Time Info ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <ClockIcon size={16} color={colors.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('endsAt')}</Text>
              <Text style={styles.infoValue}>{endTimeDisplay}</Text>
            </View>
          </View>
          <Text style={styles.infoHint}>{t('errandAutoEndNotice')}</Text>
        </View>
      </ScrollView>
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
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  postBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  postBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  postBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.lg,
  },

  /* Disclaimer */
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.lg,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.onErrorContainer,
    flex: 1,
    fontWeight: '500',
  },

  /* Section */
  section: {},
  sectionLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  /* Card */
  card: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.md,
  },

  /* Title & Content */
  titleInput: {
    ...typography.titleMedium,
    color: colors.onSurface,
    padding: 0,
  },
  contentInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    minHeight: 100,
    padding: 0,
  },
  charCount: {
    ...typography.labelSmall,
    color: colors.outline,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  /* Fields */
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  fieldInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  /* Route connector */
  routeConnector: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  routeLine: {
    width: 2,
    height: 8,
    backgroundColor: colors.outlineVariant,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outline,
    marginVertical: spacing.xxs,
  },

  /* Info card */
  infoCard: {
    backgroundColor: colors.primaryContainer + '30',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  infoHint: {
    ...typography.bodySmall,
    color: colors.outline,
    marginTop: spacing.xs,
    marginLeft: spacing.xxl,
  },
});
