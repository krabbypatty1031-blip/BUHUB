import React, { useState, useCallback } from 'react';
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
  ChevronRightIcon,
} from '../../components/common/icons';
import Chip from '../../components/common/Chip';
import DateTimePickerSheet from '../../components/common/DateTimePickerSheet';
import {
  enforceTitleLimit,
  getTitleCountLabel,
  enforceContentLimit,
  getContentCountLabel,
} from '../../utils/textLimit';
import { formatDeadline } from '../../utils/dateFormat';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposePartner'>;

const CATEGORIES: Array<{ key: PartnerCategory; labelKey: string }> = [
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
  { key: 'other', labelKey: 'other' },
];

export default function ComposePartnerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const defaultCategory = (route.params?.category as PartnerCategory) || 'travel';
  const [category, setCategory] = useState<PartnerCategory | null>(defaultCategory);
  const [activityTime, setActivityTime] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(
    () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  );
  const [pickerVisible, setPickerVisible] = useState(false);

  const getPlaceholders = useCallback(() => {
    switch (category) {
      case 'travel':
        return { title: t('partnerPlaceholderTravelTitle'), content: t('partnerPlaceholderTravelContent') };
      case 'food':
        return { title: t('partnerPlaceholderFoodTitle'), content: t('partnerPlaceholderFoodContent') };
      case 'course':
        return { title: t('partnerPlaceholderCourseTitle'), content: t('partnerPlaceholderCourseContent') };
      case 'sports':
        return { title: t('partnerPlaceholderSportsTitle'), content: t('partnerPlaceholderSportsContent') };
      case 'other':
        return { title: t('partnerPlaceholderOtherTitle'), content: t('partnerPlaceholderOtherContent') };
      default:
        return { title: t('partnerTitlePlaceholder'), content: t('partnerContentPlaceholder') };
    }
  }, [category, t]);

  const placeholders = getPlaceholders();

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  const handleContentChange = useCallback((text: string) => {
    setContent(enforceContentLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    category !== null &&
    activityTime.trim().length > 0 &&
    deadline !== null;

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
            placeholder={placeholders.title}
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={handleTitleChange}
          />
          <Text style={styles.charCount}>{getTitleCountLabel(title)}</Text>
          <View style={styles.cardDivider} />
          <TextInput
            style={styles.contentInput}
            placeholder={placeholders.content}
            placeholderTextColor={colors.outline}
            value={content}
            onChangeText={handleContentChange}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{getContentCountLabel(content)}</Text>
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

          {/* Deadline */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.deadlineInput}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text
                style={[
                  styles.deadlineText,
                  !deadline && styles.deadlinePlaceholder,
                ]}
              >
                {deadline ? formatDeadline(deadline) : t('deadlinePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        <DateTimePickerSheet
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onConfirm={(date) => {
            setDeadline(date);
            setPickerVisible(false);
          }}
          initialDate={deadline || undefined}
        />
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
  /* Deadline */
  deadlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  deadlineText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  deadlinePlaceholder: {
    color: colors.outline,
  },
});
