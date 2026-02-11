import React, { useCallback } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, borderRadius, elevation } from '../../theme';
import { hapticLight } from '../../utils/haptics';
import { PlusIcon } from './icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FABProps {
  onPress: () => void;
  icon?: React.ReactNode;
}

export default function FAB({ onPress, icon }: FABProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    hapticLight();
    scale.value = withSpring(0.88, { damping: 12, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, [scale]);

  return (
    <AnimatedPressable
      style={[styles.fab, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {icon || <PlusIcon size={24} color={colors.onPrimary} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...elevation[3],
  },
});
