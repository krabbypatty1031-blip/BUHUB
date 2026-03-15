import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { PartnerCategory } from '../../types';
import { useCreatePartner, useEditPartner } from '../../hooks/usePartners';
import { useUIStore } from '../../store/uiStore';
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
import { useAuthStore } from '../../store/authStore';
import { canPublishCommunityContent, isPublishPermissionError } from '../../utils/publishPermission';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposePartner'>;

const CATEGORIES: Array<{ key: PartnerCategory; labelKey: string }> = [
  { key: 'travel', labelKey: 'travel' },
  { key: 'food', labelKey: 'food' },
  { key: 'course', labelKey: 'course' },
  { key: 'sports', labelKey: 'sports' },
  { key: 'other', labelKey: 'other' },
];

const parseDateOrNull = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function ComposePartnerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const editId = route.params?.editId;
  const initialData = route.params?.initialData;
  const isEditMode = Boolean(editId && initialData);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.desc ?? '');
  const defaultCategory = initialData?.category ?? route.params?.category ?? 'travel';
  const [category, setCategory] = useState<PartnerCategory | null>(defaultCategory);
  const [activityTime, setActivityTime] = useState<Date | null>(
    parseDateOrNull(initialData?.time) ?? parseDateOrNull(initialData?.expiresAt)
  );
  const [deadlineTime, setDeadlineTime] = useState<Date | null>(
    parseDateOrNull(initialData?.expiresAt)
  );
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [deadlinePickerVisible, setDeadlinePickerVisible] = useState(false);

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

  // When activityTime changes, auto-set deadline = activityTime if no deadline,
  // or reset deadline if it now exceeds activityTime
  useEffect(() => {
    if (!activityTime) {
      setDeadlineTime(null);
    } else if (!deadlineTime) {
      setDeadlineTime(activityTime);
    } else if (deadlineTime.getTime() > activityTime.getTime()) {
      setDeadlineTime(activityTime);
    }
  }, [activityTime]);

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  // Keep content length rules consistent while supporting native multiline behavior.
  const handleContentChange = useCallback((text: string) => {
    setContent(enforceContentLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    category !== null &&
    activityTime !== null &&
    deadlineTime !== null;

  const user = useAuthStore((s) => s.user);
  const createPartner = useCreatePartner();
  const editPartner = useEditPartner();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isPosting, setIsPosting] = useState(false);
  const postingLockRef = React.useRef(false);

  const resolveSubmitErrorMessage = useCallback((error: unknown) => {
    const submitError = typeof error === 'object' && error
      ? error as { errorCode?: string; code?: string | number }
      : undefined;
    return isPublishPermissionError(submitError)
      ? t('hkbuEmailRequiredForPublish')
      : t(isEditMode ? 'saveFailed' : 'postFailed');
  }, [isEditMode, t]);

  const handlePost = useCallback(() => {
    if (!canPost || !user || isPosting || postingLockRef.current) return;
    if (!isEditMode && !canPublishCommunityContent(user)) {
      showSnackbar({ message: t('hkbuEmailRequiredForPublish'), type: 'error' });
      return;
    }
    postingLockRef.current = true;
    setIsPosting(true);
    const payload = {
      category: category!,
      type: t(category!),
      title: title.trim(),
      desc: content.trim(),
      time: formatDeadline(activityTime!),
      location: location.trim(),
      expiresAt: deadlineTime!.toISOString(),
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
    };

    const onError = (error: unknown) => {
      showSnackbar({ message: resolveSubmitErrorMessage(error), type: 'error' });
    };

    const onSettled = () => {
      postingLockRef.current = false;
      setIsPosting(false);
    };

    if (isEditMode && editId) {
      editPartner.mutate(
        { id: editId, post: payload },
        {
          onSuccess: (updated) => {
            showSnackbar({ message: t('saveSuccess'), type: 'success' });
            navigation.reset({
              index: 1,
              routes: [
                { name: 'FunctionsHub' },
                { name: 'MyPosts' },
              ],
            });
          },
          onError,
          onSettled,
        },
      );
      return;
    }

    createPartner.mutate(payload, {
      onSuccess: (created) => {
        navigation.replace('PartnerShare', {
          activityName: title,
          posterName: user.name,
          functionId: created.id,
        });
      },
      onError,
      onSettled,
    });
  }, [canPost, user, isPosting, category, t, title, content, activityTime, location, deadlineTime, initialData?.createdAt, isEditMode, editId, editPartner, showSnackbar, navigation, createPartner, resolveSubmitErrorMessage]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t(isEditMode ? 'editPost' : 'newPartnerPost')}</Text>
        <TouchableOpacity
          style={[styles.postBtn, (!canPost || isPosting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost || isPosting}
        >
          <Text
            style={[styles.postBtnText, (!canPost || isPosting) && styles.postBtnTextDisabled]}
          >
            {t(isEditMode ? 'save' : 'publishBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          {/* ----- Category Selector ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
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

          {/* ----- Title ----- */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                {t('titleLabel')} <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.charCount}>{getTitleCountLabel(title)}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.titleInput}
                placeholder={placeholders.title}
                placeholderTextColor={colors.outline}
                value={title}
                onChangeText={handleTitleChange}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Content ----- */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>{t('contentLabel')}</Text>
              <Text style={styles.charCount}>{getContentCountLabel(content)}</Text>
            </View>
            <View style={[styles.inputWrapper, styles.contentInputWrapper]}>
              <TextInput
                style={styles.contentInput}
                placeholder={placeholders.content}
                placeholderTextColor={colors.outline}
                value={content}
                onChangeText={handleContentChange}
                selectionColor={colors.primary}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ----- Activity Time ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('activityTime')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              activeOpacity={0.7}
              onPress={() => setActivityPickerVisible(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !activityTime && styles.selectPlaceholder,
                ]}
              >
                {activityTime
                  ? formatDeadline(activityTime)
                  : t('activityTimePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* ----- Deadline ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            {!activityTime ? (
              <Text style={styles.hintText}>{t('selectActivityFirst')}</Text>
            ) : (
              <TouchableOpacity
                style={styles.selectWrapper}
                activeOpacity={0.7}
                onPress={() => setDeadlinePickerVisible(true)}
              >
                <Text
                  style={[
                    styles.selectText,
                    !deadlineTime && styles.selectPlaceholder,
                  ]}
                >
                  {deadlineTime
                    ? formatDeadline(deadlineTime)
                    : t('deadlinePlaceholder')}
                </Text>
                <ChevronRightIcon size={18} color={colors.onSurface} />
              </TouchableOpacity>
            )}
          </View>

          {/* ----- Location ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.primary} />{' '}
              {t('locationLabel')}
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('placeholderLocation')}
                placeholderTextColor={colors.outline}
                value={location}
                onChangeText={setLocation}
                maxLength={50}
                selectionColor={colors.primary}
              />
            </View>
          </View>
        </View>

        <DateTimePickerSheet
          visible={activityPickerVisible}
          onClose={() => setActivityPickerVisible(false)}
          onConfirm={(date) => {
            setActivityTime(date);
            setActivityPickerVisible(false);
          }}
          initialDate={activityTime || undefined}
          title={t('activityTime')}
        />

        {activityTime && (
          <DateTimePickerSheet
            visible={deadlinePickerVisible}
            onClose={() => setDeadlinePickerVisible(false)}
            onConfirm={(date) => {
              if (date.getTime() > activityTime.getTime()) {
                setDeadlineTime(activityTime);
              } else {
                setDeadlineTime(date);
              }
              setDeadlinePickerVisible(false);
            }}
            initialDate={deadlineTime || activityTime}
            title={t('deadlineLabel')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
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
    marginRight: spacing.xs,
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
    paddingBottom: 100,
  },

  /* Form */
  formSection: {
    paddingHorizontal: spacing.xl,
  },
  fieldGroup: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  required: {
    color: colors.error,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    ...typography.bodySmall,
    color: colors.outline,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  /* Inputs */
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    width: '100%',
  },
  titleInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  contentInputWrapper: {
    minHeight: 48,
  },
  contentInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  fieldInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },

  /* Select */
  selectWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  selectPlaceholder: {
    color: colors.outline,
  },
  hintText: {
    ...typography.bodyMedium,
    color: colors.outline,
  },
});

