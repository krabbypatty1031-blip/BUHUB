import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { typography } from '../../theme/typography';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

interface SegmentMeasurement {
  x: number;
  width: number;
}

export default function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const [measurements, setMeasurements] = useState<Map<T, SegmentMeasurement>>(new Map());
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Update indicator position when value changes
  useEffect(() => {
    const measurement = measurements.get(value);
    if (measurement) {
      const config = { duration: 200, easing: Easing.out(Easing.ease) };
      indicatorX.value = withTiming(measurement.x, config);
      indicatorWidth.value = withTiming(measurement.width, config);
    }
  }, [value, measurements]);

  const handleLayout = (optionValue: T, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setMeasurements((prev) => {
      const newMap = new Map(prev);
      newMap.set(optionValue, { x, width });
      return newMap;
    });
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={[styles.container, style]}>
      {/* Sliding indicator */}
      <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />

      {/* Segments */}
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={styles.segment}
            activeOpacity={0.7}
            onPress={() => onChange(option.value)}
            onLayout={(e) => handleLayout(option.value, e)}
          >
            {option.icon && (
              <View style={styles.iconWrapper}>{option.icon}</View>
            )}
            <Text
              style={[
                styles.segmentText,
                isActive && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.md,
    padding: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    left: 0,
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    ...StyleSheet.create({
      shadow: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 1,
        elevation: 1,
      },
    }).shadow,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 32,
    zIndex: 1,
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
});
