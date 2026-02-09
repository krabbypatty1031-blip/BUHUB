import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ReportModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export default function ReportModal({ visible, title, onClose, onSubmit }: ReportModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onSubmit(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('reportReasonPlaceholder')}
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
              style={[styles.submitBtn, !reason.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!reason.trim()}
            >
              <Text style={[styles.submitBtnText, !reason.trim() && styles.submitBtnTextDisabled]}>
                {t('submitReport')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 80,
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
