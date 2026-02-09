import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { typography } from '../../theme/typography';
import { hapticLight } from '../../utils/haptics';
import { useUIStore } from '../../store/uiStore';

const SPRING_CONFIG = { damping: 20, stiffness: 240, mass: 0.8 };

export default function ConfirmModal() {
  const { t } = useTranslation();
  const modal = useUIStore((s) => s.modal);
  const hideModal = useUIStore((s) => s.hideModal);

  const backdropOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(300);
  const panelScale = useSharedValue(0.9);

  useEffect(() => {
    if (modal.visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      panelTranslateY.value = withSpring(0, SPRING_CONFIG);
      panelScale.value = withSpring(1, SPRING_CONFIG);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      panelTranslateY.value = withTiming(300, { duration: 200 });
      panelScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [modal.visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: panelTranslateY.value },
      { scale: panelScale.value },
    ],
  }));

  const handleConfirm = useCallback(() => {
    hapticLight();
    modal.onConfirm?.();
    hideModal();
  }, [modal, hideModal]);

  const handleCancel = useCallback(() => {
    modal.onCancel?.();
    hideModal();
  }, [modal, hideModal]);

  if (!modal.visible) return null;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
      </Animated.View>

      <Animated.View style={[styles.panel, panelStyle]}>
        {modal.title && (
          <Text style={styles.title}>{modal.title}</Text>
        )}
        {modal.message && (
          <Text style={styles.message}>{modal.message}</Text>
        )}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>{t('cancel') || 'Cancel'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>{t('confirm') || 'Confirm'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  panel: {
    width: '82%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  btnPressed: {
    opacity: 0.7,
  },
  confirmBtnPressed: {
    opacity: 0.85,
    backgroundColor: colors.onPrimaryContainer,
  },
});
