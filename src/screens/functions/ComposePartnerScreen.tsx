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
import type { PartnerCategory } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CloseIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from '../../components/common/icons';
import Chip from '../../components/common/Chip';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposePartner'>;

const CATEGORIES: Array<{ key: PartnerCategory; labelKey: string }> = [
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
  { key: 'other', labelKey: 'other' },
];

export default function ComposePartnerScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PartnerCategory | null>(null);
  const [maxPeople, setMaxPeople] = useState('');
  const [activityTime, setActivityTime] = useState('');
  const [location, setLocation] = useState('');

  const endTimeDisplay = useMemo(() => {
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    const h = String(end.getHours()).padStart(2, '0');
    const min = String(end.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  }, []);

  const canPost =
    title.trim().length > 0 &&
    category !== null &&
    activityTime.trim().length > 0;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    navigation.replace('PartnerShare', { activityName: title });
  }, [canPost, navigation, title]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('newPartnerPost')}</Text>
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
        {/* ── Category Selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('categoryLabel')} <Text style={styles.required}>*</Text>
          </Text>
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
            placeholder={t('partnerTitlePlaceholder')}
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.contentInput}
            placeholder={t('partnerContentPlaceholder')}
            placeholderTextColor={colors.outline}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{content.length}/1000</Text>
        </View>

        {/* ── Details Card ── */}
        <View style={styles.card}>
          {/* Activity Time */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('activityTime')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('activityTimePlaceholder')}
              placeholderTextColor={colors.outline}
              value={activityTime}
              onChangeText={setActivityTime}
              maxLength={50}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.primary} />{' '}
              {t('locationLabel')}
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('placeholderLocation')}
              placeholderTextColor={colors.outline}
              value={location}
              onChangeText={setLocation}
              maxLength={50}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Max People */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <UsersIcon size={14} color={colors.primary} />{' '}
              {t('maxPeople')}
            </Text>
            <View style={styles.numberInputRow}>
              <TextInput
                style={styles.numberInput}
                placeholder="4"
                placeholderTextColor={colors.outline}
                value={maxPeople}
                onChangeText={setMaxPeople}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.numberUnit}>{t('personUnit')}</Text>
            </View>
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
          <Text style={styles.infoHint}>{t('autoEndNotice')}</Text>
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
    minHeight: 120,
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
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: 80,
    textAlign: 'center',
  },
  numberUnit: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
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
