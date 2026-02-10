import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../../theme';
import { hapticLight } from '../../utils/haptics';

interface IOSSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

const SWITCH_WIDTH = 51;
const SWITCH_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_PADDING = 2;
const THUMB_TRAVEL = SWITCH_WIDTH - THUMB_SIZE - THUMB_PADDING * 2;

export default function IOSSwitch({
  value,
  onValueChange,
  disabled = false,
  activeColor = colors.success,
  inactiveColor = colors.surfaceVariant,
}: IOSSwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 20,
      stiffness: 300,
    });
  }, [value]);

  const handlePress = () => {
    if (disabled) return;
    hapticLight();
    onValueChange(!value);
  };

  const trackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );
    return { backgroundColor };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const translateX = progress.value * THUMB_TRAVEL;
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: '100%',
    height: '100%',
    borderRadius: SWITCH_HEIGHT / 2,
    padding: THUMB_PADDING,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
});
