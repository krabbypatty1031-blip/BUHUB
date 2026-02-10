import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import type { PartnerCategory, PartnerPost } from '../../types';
import { mockPartnerPosts } from '../../data/mock/partner';
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
import AdvanceTimePickerSheet from '../../components/common/AdvanceTimePickerSheet';
import {
  enforceTitleLimit,
  getTitleCountLabel,
  enforceContentLimit,
  getContentCountLabel,
} from '../../utils/textLimit';
import { formatDeadline } from '../../utils/dateFormat';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposePartner'>;

const CATEGORIES: Array<{ key: PartnerCategory; labelKey: string }> = [
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
  { key: 'other', labelKey: 'other' },
];

const ADVANCE_OPTIONS = [
  { minutes: 0, labelKey: 'advanceSame' },
  { minutes: 30, labelKey: 'advance30m' },
  { minutes: 60, labelKey: 'advance1h' },
  { minutes: 120, labelKey: 'advance2h' },
  { minutes: 720, labelKey: 'advance12h' },
  { minutes: 1440, labelKey: 'advance24h' },
];

export default function ComposePartnerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const defaultCategory = (route.params?.category as PartnerCategory) || 'travel';
  const [category, setCategory] = useState<PartnerCategory | null>(defaultCategory);
  const [activityTime, setActivityTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [advanceMinutes, setAdvanceMinutes] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [advancePickerVisible, setAdvancePickerVisible] = useState(false);

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

  const isActivityTooSoon =
    activityTime !== null &&
    activityTime.getTime() - Date.now() < 3600 * 1000;

  const availableAdvanceOptions = useMemo(() => {
    if (!activityTime) return [];
    const diffMinutes = (activityTime.getTime() - Date.now()) / (60 * 1000);
    if (diffMinutes < 60) return [];
    return ADVANCE_OPTIONS.filter((opt) => diffMinutes >= opt.minutes);
  }, [activityTime]);

  // Reset advanceMinutes if no longer valid after activityTime change
  useEffect(() => {
    if (
      advanceMinutes !== null &&
      !availableAdvanceOptions.some((opt) => opt.minutes === advanceMinutes)
    ) {
      setAdvanceMinutes(null);
    }
  }, [availableAdvanceOptions, advanceMinutes]);

  const selectedAdvanceLabel = advanceMinutes !== null
    ? t(ADVANCE_OPTIONS.find((o) => o.minutes === advanceMinutes)?.labelKey ?? '')
    : null;

  const advancePickerOptions = useMemo(
    () => availableAdvanceOptions.map((opt) => ({ minutes: opt.minutes, label: t(opt.labelKey) })),
    [availableAdvanceOptions, t],
  );

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  const handleContentChange = useCallback((text: string) => {
    setContent(enforceContentLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    category !== null &&
    activityTime !== null &&
    !isActivityTooSoon &&
    advanceMinutes !== null;

  const user = useAuthStore((s) => s.user);

  const handlePost = useCallback(() => {
    if (!canPost || !user) return;
    const newPost: PartnerPost = {
      category: category!,
      type: t(category!),
      title: title.trim(),
      desc: content.trim(),
      time: formatDeadline(activityTime!),
      location: location.trim(),
      user: user.name,
      avatar: user.defaultAvatar || user.name.charAt(0),
      gender: user.gender,
      bio: `${user.grade} · ${user.major}`,
      expired: false,
      expiresAt: new Date(activityTime!.getTime() - (advanceMinutes ?? 0) * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockPartnerPosts.unshift(newPost);
    navigation.replace('PartnerShare', { activityName: title, posterName: user.name, index: 0 });
  }, [canPost, navigation, title, user, category, content, activityTime, location, advanceMinutes, t]);

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
          <Text style={styles.fieldLabel}>
            {t('titleLabel')} <Text style={styles.required}>*</Text>
          </Text>
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
            <TouchableOpacity
              style={styles.deadlineInput}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text
                style={[
                  styles.deadlineText,
                  !activityTime && styles.deadlinePlaceholder,
                ]}
              >
                {activityTime
                  ? formatDeadline(activityTime)
                  : t('activityTimePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.outline} />
            </TouchableOpacity>
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

          {/* Deadline (Advance Time) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            {!activityTime ? (
              <Text style={styles.hintText}>{t('selectActivityFirst')}</Text>
            ) : isActivityTooSoon ? (
              <Text style={styles.warningText}>{t('activityTooSoon')}</Text>
            ) : (
              <TouchableOpacity
                style={styles.deadlineInput}
                activeOpacity={0.7}
                onPress={() => setAdvancePickerVisible(true)}
              >
                <Text
                  style={[
                    styles.deadlineText,
                    !selectedAdvanceLabel && styles.deadlinePlaceholder,
                  ]}
                >
                  {selectedAdvanceLabel || t('deadlinePlaceholder')}
                </Text>
                <ChevronRightIcon size={18} color={colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <DateTimePickerSheet
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onConfirm={(date) => {
            setActivityTime(date);
            setPickerVisible(false);
          }}
          initialDate={activityTime || undefined}
          title={t('activityTime')}
        />

        <AdvanceTimePickerSheet
          visible={advancePickerVisible}
          onClose={() => setAdvancePickerVisible(false)}
          onConfirm={(minutes) => {
            setAdvanceMinutes(minutes);
            setAdvancePickerVisible(false);
          }}
          options={advancePickerOptions}
          initialValue={advanceMinutes ?? undefined}
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
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
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
  hintText: {
    ...typography.bodyMedium,
    color: colors.outline,
  },
  warningText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
});
