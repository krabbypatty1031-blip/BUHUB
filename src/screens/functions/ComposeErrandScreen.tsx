import React, { useState, useCallback } from 'react';
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
import type { ErrandCategory } from '../../types';
import { useCreateErrand, useEditErrand } from '../../hooks/useErrands';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  ClockIcon,
  MapPinIcon,
  PackageIcon,
  DollarIcon,
  AlertTriangleIcon,
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

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposeErrand'>;

const CATEGORIES: Array<{ key: ErrandCategory; labelKey: string }> = [
  { key: 'pickup', labelKey: 'pickup' },
  { key: 'buy', labelKey: 'buy' },
  { key: 'other', labelKey: 'other' },
];

const normalizePriceInput = (value: string): string => {
  const sanitized = value.replace(/[^\d.]/g, '');
  if (!sanitized) return '';

  const [integerPart, ...fractionParts] = sanitized.split('.');
  if (fractionParts.length === 0) return integerPart;

  const fraction = fractionParts.join('').slice(0, 2);
  const safeInteger = integerPart || '0';
  return fraction.length > 0 ? `${safeInteger}.${fraction}` : `${safeInteger}.`;
};

const isValidPrice = (value: string): boolean => /^\d+(\.\d{1,2})?$/.test(value.trim());

const extractNumericPrice = (value: string | undefined): string =>
  (value ?? '').replace(/[^\d.]/g, '');

export default function ComposeErrandScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const editId = route.params?.editId;
  const initialData = route.params?.initialData;
  const isEditMode = Boolean(editId && initialData);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.desc ?? '');
  const [price, setPrice] = useState(extractNumericPrice(initialData?.price));
  const defaultCategory = initialData?.category ?? route.params?.category ?? 'pickup';
  const [category, setCategory] = useState<ErrandCategory>(defaultCategory);
  const [from, setFrom] = useState(initialData?.from ?? '');
  const [to, setTo] = useState(initialData?.to ?? '');
  const [item, setItem] = useState(initialData?.item ?? '');
  const [deadline, setDeadline] = useState<Date | null>(
    () => (initialData?.expiresAt ? new Date(initialData.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [pickerVisible, setPickerVisible] = useState(false);

  const getPlaceholders = useCallback(() => {
    switch (category) {
      case 'pickup':
        return { title: t('errandPlaceholderPickupTitle'), content: t('errandPlaceholderPickupContent') };
      case 'buy':
        return { title: t('errandPlaceholderBuyTitle'), content: t('errandPlaceholderBuyContent') };
      default:
        return { title: t('errandPlaceholderOtherTitle'), content: t('errandPlaceholderOtherContent') };
    }
  }, [category, t]);

  const placeholders = getPlaceholders();

  const handleTitleChange = useCallback((text: string) => {
    setTitle(enforceTitleLimit(text));
  }, []);

  // Keep content length rules consistent while supporting native multiline behavior.
  const handleContentChange = useCallback((text: string) => {
    setContent(enforceContentLimit(text));
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    setPrice(normalizePriceInput(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    isValidPrice(price) &&
    from.trim().length > 0 &&
    to.trim().length > 0 &&
    item.trim().length > 0 &&
    deadline !== null;

  const user = useAuthStore((s) => s.user);
  const createErrand = useCreateErrand();
  const editErrand = useEditErrand();
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
      category,
      type: t(category),
      title: title.trim(),
      desc: content.trim(),
      from: from.trim(),
      to: to.trim(),
      price: `HK$${price.trim()}`,
      item: item.trim(),
      time: formatDeadline(deadline!),
      expiresAt: deadline!.toISOString(),
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
      editErrand.mutate(
        { id: editId, errand: payload },
        {
          onSuccess: (updated) => {
            showSnackbar({ message: t('saveSuccess'), type: 'success' });
            navigation.reset({
              index: 1,
              routes: [
                { name: 'FunctionsHub' },
                { name: 'ErrandList' },
              ],
            });
          },
          onError,
          onSettled,
        },
      );
      return;
    }

    createErrand.mutate(payload, {
      onSuccess: (created) => {
        navigation.replace('ErrandShare', {
          taskName: title,
          posterName: user.name,
          functionId: created.id,
        });
      },
      onError,
      onSettled,
    });
  }, [canPost, user, isPosting, category, t, title, content, from, to, price, item, deadline, initialData?.createdAt, isEditMode, editId, editErrand, showSnackbar, navigation, createErrand, resolveSubmitErrorMessage]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t(isEditMode ? 'editPost' : 'newErrandPost')}
        onBack={() => navigation.goBack()}
        leading="close"
        titleStyle={{ fontFamily: 'SourceHanSansCN-Bold' }}
        showBottomBorder={false}
        rightAction={
          <TouchableOpacity
            style={[styles.postBtn, (!canPost || isPosting) && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost || isPosting}
          >
            <Text style={[styles.postBtnText, (!canPost || isPosting) && styles.postBtnTextDisabled]}>
              {t(isEditMode ? 'save' : 'publishBtn')}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          {/* ----- Disclaimer ----- */}
          <View style={styles.disclaimerCard}>
            <AlertTriangleIcon size={16} color={colors.onErrorContainer} />
            <Text style={styles.disclaimerText}>{t('errandDisclaimer')}</Text>
          </View>

          {/* ----- Category Selector ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('categoryLabel')}</Text>
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

          {/* ----- Price ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <DollarIcon size={14} color={colors.primary} />{' '}
              {t('reward')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder="HK$ 0"
                placeholderTextColor={colors.outline}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="numeric"
                maxLength={10}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Item ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <PackageIcon size={14} color={colors.primary} />{' '}
              {t('itemField')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('itemPlaceholder')}
                placeholderTextColor={colors.outline}
                value={item}
                onChangeText={setItem}
                maxLength={50}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- From ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.success} />{' '}
              {t('from')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('placeholderFrom')}
                placeholderTextColor={colors.outline}
                value={from}
                onChangeText={setFrom}
                maxLength={50}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* Route connector */}
          <View style={styles.routeConnector}>
            <View style={styles.routeLine} />
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
          </View>

          {/* ----- To ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <MapPinIcon size={14} color={colors.error} />{' '}
              {t('to')} <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.fieldInput}
                placeholder={t('placeholderTo')}
                placeholderTextColor={colors.outline}
                value={to}
                onChangeText={setTo}
                maxLength={50}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ----- Deadline ----- */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              <ClockIcon size={14} color={colors.primary} />{' '}
              {t('deadlineLabel')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectWrapper}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !deadline && styles.selectPlaceholder,
                ]}
              >
                {deadline ? formatDeadline(deadline) : t('deadlinePlaceholder')}
              </Text>
              <ChevronRightIcon size={18} color={colors.onSurface} />
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
    backgroundColor: colors.surface,
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

  /* Disclaimer */
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.onErrorContainer,
    flex: 1,
    fontWeight: '500',
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
});

