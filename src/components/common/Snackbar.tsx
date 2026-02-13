import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../theme';
import { useUIStore } from '../../store/uiStore';

const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };

export default function Snackbar() {
  const insets = useSafeAreaInsets();
  const snackbar = useUIStore((s) => s.snackbar);
  const hideSnackbar = useUIStore((s) => s.hideSnackbar);

  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  const dismiss = useCallback(() => {
    hideSnackbar();
  }, [hideSnackbar]);

  useEffect(() => {
    if (snackbar) {
      const duration = snackbar.duration || 2000;

      // Enter (spring to 0) → hold → Exit (slide back to 60)
      translateY.value = withSequence(
        withSpring(0, SPRING_CONFIG),
        withDelay(
          duration,
          withTiming(60, { duration: 250, easing: Easing.inOut(Easing.ease) }, (finished) => {
            if (finished) runOnJS(dismiss)();
          })
        )
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(duration, withTiming(0, { duration: 250 }))
      );
    } else {
      translateY.value = 60;
      opacity.value = 0;
    }
  }, [snackbar]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!snackbar) return null;

  const bgColor =
    snackbar.type === 'error' ? colors.error :
    snackbar.type === 'success' ? colors.success :
    colors.onSurface;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 90, backgroundColor: bgColor },
        animatedStyle,
      ]}
    >
      <Text style={styles.text}>{snackbar.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
});
