import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  color?: string;
  count?: number;
  dotSize?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

export default function LoadingDots({
  color = '#000000',
  count = 3,
  dotSize = 4,
  gap = 4,
  style,
}: Props) {
  const valuesRef = useRef<Animated.Value[]>([]);

  if (valuesRef.current.length !== count) {
    valuesRef.current = Array.from({ length: count }, () => new Animated.Value(0));
  }

  useEffect(() => {
    const stagger = 120;
    const duration = 280;

    const loops = valuesRef.current.map((value, index) => {
      value.setValue(0);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(index * stagger),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, (count - index - 1) * stagger)),
        ]),
      );

      animation.start();
      return animation;
    });

    return () => {
      loops.forEach((animation) => animation.stop());
    };
  }, [count]);

  return (
    <View style={[styles.row, style]} pointerEvents="none">
      {valuesRef.current.map((value, index) => {
        const opacity = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.28, 1],
        });
        const scale = value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        });
        const translateY = value.interpolate({
          inputRange: [0, 1],
          outputRange: [1.5, -1.5],
        });

        return (
          <Animated.View
            key={`loading-dot-${index}`}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                marginRight: index === count - 1 ? 0 : gap,
                backgroundColor: color,
                opacity,
                transform: [{ translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    flexShrink: 0,
  },
});
