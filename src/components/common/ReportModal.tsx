import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography, elevation } from '../../theme';

export const REPORT_CATEGORIES = [
  'spam',
  'hate_speech',
  'violence',
  'harassment',
  'inappropriate',
  'other',
] as const;

interface ReportModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reasonCategory: string, reason?: string) => void;
  overlayTransparent?: boolean;
}

export default function ReportModal({
  visible,
  title,
  onClose,
  onSubmit,
  overlayTransparent = false,
}: ReportModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!category) return;
    onSubmit(category, reason.trim() || undefined);
    setCategory('');
    setReason('');
  };

  const handleClose = () => {
    setCategory('');
    setReason('');
    onClose();
  };

  const canSubmit = !!category;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavRoot}
      >
      <Pressable
        style={[styles.overlay, overlayTransparent && styles.overlayTransparent]}
        onPress={handleClose}
      >
        <Pressable style={[styles.card, overlayTransparent && styles.cardOnTransparent]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>{t('reportCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {REPORT_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, category === c && styles.categoryChipSelected]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextSelected]}>
                  {t(`reportCategory_${c}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>{t('reportReasonPlaceholder')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('reportReasonDetailPlaceholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                {t('submitReport')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTransparent: {
    backgroundColor: 'transparent',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...elevation[4],
  },
  cardOnTransparent: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginBottom: spacing.lg,
    maxHeight: 44,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelMedium,
    color: colors.onSurface,
  },
  categoryChipTextSelected: {
    color: colors.onPrimary,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 60,
    ...typography.bodyMedium,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cancelBtnText: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  submitBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  submitBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  submitBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
