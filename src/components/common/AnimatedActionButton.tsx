import React, { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedActionButtonProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /**
   * Toggle source for the state-change pulse. When this value flips after the
   * first mount, the button briefly scales up to `pulsePeak` then settles back.
   * Leave `undefined` to keep press-only behaviour (equivalent to PressScaleButton).
   */
  isActive?: boolean;
  pressedScale?: number;
  pulsePeak?: number;
}

/**
 * Shared like / bookmark / favourite action button. Combines two animations
 * so users get both an immediate gesture acknowledgement and a state-change
 * confirmation:
 *   1. Press feedback — `withSpring` scales to `pressedScale` on press-in,
 *      springs back to 1 on press-out. Driven by the gesture, not state, so
 *      it fires within a frame regardless of whether the mutation has run.
 *   2. State pulse — when `isActive` flips (e.g. optimistic mutation writes
 *      liked=true into the cache), `withSequence(timing→pulsePeak, timing→1)`
 *      briefly scales up. Skipped on first mount so a freshly-loaded liked
 *      post does not pulse.
 *
 * Press scale and pulse scale compose by multiplication, so they coexist
 * without one cancelling the other.
 */
export default function AnimatedActionButton({
  style,
  isActive,
  pressedScale = 0.94,
  pulsePeak = 1.18,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedActionButtonProps) {
  const pressScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const didMountRef = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * pulseScale.value }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      pressScale.value = withSpring(pressedScale, { damping: 14, stiffness: 320 });
      onPressIn?.(event);
    },
    [onPressIn, pressedScale, pressScale],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      pressScale.value = withSpring(1, { damping: 12, stiffness: 260 });
      onPressOut?.(event);
    },
    [onPressOut, pressScale],
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (isActive === undefined) return;
    pulseScale.value = withSequence(
      withTiming(pulsePeak, { duration: 140 }),
      withTiming(1, { duration: 180 }),
    );
  }, [isActive, pulsePeak, pulseScale]);

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children}
    </AnimatedPressable>
  );
}
