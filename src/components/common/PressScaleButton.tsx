import React, { useCallback } from 'react';
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
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressScaleButtonProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}

export default function PressScaleButton({
  style,
  pressedScale = 0.94,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withSpring(pressedScale, { damping: 14, stiffness: 320 });
      onPressIn?.(event);
    },
    [onPressIn, pressedScale, scale]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      onPressOut?.(event);
    },
    [onPressOut, scale]
  );

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
