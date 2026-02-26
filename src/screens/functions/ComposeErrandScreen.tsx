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
import { useCreateErrand } from '../../hooks/useErrands';
import { useUIStore } from '../../store/uiStore';
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

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ComposeErrand'>;

const CATEGORIES: Array<{ key: ErrandCategory; labelKey: string }> = [
  { key: 'pickup', labelKey: 'pickup' },
  { key: 'buy', labelKey: 'buy' },
  { key: 'other', labelKey: 'other' },
];

export default function ComposeErrandScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const defaultCategory = (route.params?.category as ErrandCategory) || 'pickup';
  const [category, setCategory] = useState<ErrandCategory>(defaultCategory);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [item, setItem] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000),
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

  const handleContentChange = useCallback((text: string) => {
    setContent(enforceContentLimit(text));
  }, []);

  const canPost =
    title.trim().length > 0 &&
    price.trim().length > 0 &&
    from.trim().length > 0 &&
    to.trim().length > 0 &&
    item.trim().length > 0 &&
    deadline !== null;

  const user = useAuthStore((s) => s.user);
  const createErrand = useCreateErrand();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(() => {
    if (!canPost || !user || isPosting) return;
    setIsPosting(true);
    createErrand.mutate(
      {
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
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: (created) => {
          navigation.replace('ErrandShare', {
            taskName: title,
            posterName: user.name,
            functionId: created.id,
          });
        },
        onError: () => {
          showSnackbar({ message: t('postFailed') || 'Failed to post', type: 'error' });
        },
        onSettled: () => {
          setIsPosting(false);
        },
      },
    );
  }, [canPost, navigation, title, user, category, content, from, to, price, item, deadline, t, isPosting, createErrand, showSnackbar]);

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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          {/* ── Disclaimer ── */}
          <View style={styles.disclaimerCard}>
            <AlertTriangleIcon size={16} color={colors.onErrorContainer} />
            <Text style={styles.disclaimerText}>{t('disclaimer')}</Text>
          </View>

          {/* ── Category Selector ── */}
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

          {/* ── Title ── */}
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

          {/* ── Content ── */}
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
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ── Price ── */}
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
                onChangeText={setPrice}
                keyboardType="numeric"
                maxLength={10}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* ── Item ── */}
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

          {/* ── From ── */}
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

          {/* ── To ── */}
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

          {/* ── Deadline ── */}
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
    minHeight: 96,
  },
  contentInput: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 88,
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
