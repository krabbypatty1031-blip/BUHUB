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
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CloseIcon } from '../../components/common/icons';
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
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PartnerCategory>('travel');
  const [maxPeople, setMaxPeople] = useState('');

  const canPost = title.trim().length > 0 && content.trim().length > 0;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    showSnackbar({ message: t('postSuccess'), type: 'success' });
    navigation.goBack();
  }, [canPost, showSnackbar, t, navigation]);

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
            {t('post')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder={t('partnerTitlePlaceholder')}
          placeholderTextColor={colors.outline}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Content Input */}
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

        {/* Max People */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{t('maxPeople')}</Text>
          <TextInput
            style={styles.numberInput}
            placeholder="4"
            placeholderTextColor={colors.outline}
            value={maxPeople}
            onChangeText={setMaxPeople}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        {/* Category Selector */}
        <Text style={styles.sectionLabel}>{t('category')}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  postBtnDisabled: {
    backgroundColor: colors.outlineVariant,
  },
  postBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  postBtnTextDisabled: {
    color: colors.outline,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  titleInput: {
    ...typography.titleMedium,
    color: colors.onSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  contentInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    minHeight: 160,
    marginBottom: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginRight: spacing.md,
  },
  numberInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: 80,
    textAlign: 'center',
  },
  sectionLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
