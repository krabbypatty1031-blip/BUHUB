import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabBarProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: any;
}

interface TabMeasurement {
  x: number;
  width: number;
}

export default function TabBar<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: TabBarProps<T>) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [measurements, setMeasurements] = useState<Map<T, TabMeasurement>>(new Map());
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Update indicator position when value changes
  useEffect(() => {
    const measurement = measurements.get(value);
    if (measurement) {
      indicatorX.value = withTiming(measurement.x, { duration: 200 });
      indicatorWidth.value = withTiming(measurement.width, { duration: 200 });

      // Auto-scroll to active tab
      scrollViewRef.current?.scrollTo({
        x: Math.max(0, measurement.x - spacing.lg),
        animated: true,
      });
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
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Tabs */}
        {options.map((option) => {
          const isActive = value === option.value;
          const isDisabled = option.disabled ?? false;
          return (
            <TouchableOpacity
              key={option.value}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => !isDisabled && onChange(option.value)}
              onLayout={(e) => handleLayout(option.value, e)}
              disabled={isDisabled}
            >
              {option.icon && (
                <View style={styles.iconWrapper}>{option.icon}</View>
              )}
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                  isDisabled && styles.tabTextDisabled,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Sliding indicator */}
        <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    position: 'relative',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabTextDisabled: {
    opacity: 0.4,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});
