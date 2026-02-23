import React, { useEffect, useCallback, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useUIStore } from '../../store/uiStore';

const ENTER_DURATION = 180;
const EXIT_DURATION = 160;
const DEFAULT_DURATION = 1700;

export default function Snackbar() {
  const insets = useSafeAreaInsets();
  const snackbar = useUIStore((s) => s.snackbar);
  const hideSnackbar = useUIStore((s) => s.hideSnackbar);

  const translateY = useSharedValue(10);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (!dismissTimerRef.current) return;
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clearDismissTimer();
    hideSnackbar();
  }, [hideSnackbar, clearDismissTimer]);

  const animateOutAndDismiss = useCallback(() => {
    clearDismissTimer();

    translateY.value = withTiming(8, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    scale.value = withTiming(0.98, { duration: EXIT_DURATION });
    opacity.value = withTiming(0, { duration: EXIT_DURATION });

    dismissTimerRef.current = setTimeout(() => {
      dismiss();
    }, EXIT_DURATION + 20);
  }, [clearDismissTimer, dismiss, opacity, scale, translateY]);

  useEffect(() => {
    if (snackbar) {
      const duration = snackbar.duration || DEFAULT_DURATION;
      clearDismissTimer();

      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(opacity);

      translateY.value = 10;
      scale.value = 0.96;
      opacity.value = 0;

      translateY.value = withTiming(0, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: ENTER_DURATION });

      dismissTimerRef.current = setTimeout(() => {
        animateOutAndDismiss();
      }, duration);
    } else {
      clearDismissTimer();
      translateY.value = 10;
      scale.value = 0.96;
      opacity.value = 0;
    }

    return () => {
      clearDismissTimer();
    };
  }, [snackbar, animateOutAndDismiss, clearDismissTimer, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!snackbar) return null;

  const accentColor =
    snackbar.type === 'error'
      ? colors.error
      : snackbar.type === 'success'
      ? colors.success
      : 'rgba(255,255,255,0.72)';

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        style={[
          styles.container,
          { bottom: insets.bottom + 78 },
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={animateOutAndDismiss}
          style={styles.touchable}
        >
          <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
          <Text numberOfLines={2} style={styles.text}>
            {snackbar.message}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  touchable: {
    maxWidth: 460,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(12,12,12,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.labelLarge,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'left',
    flexShrink: 1,
  },
});
