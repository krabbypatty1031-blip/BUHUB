import React, { useState, useCallback } from 'react';
import { View, StyleSheet, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface GradientCardProps {
  colors: [string, string];
  style?: ViewStyle;
  children: React.ReactNode;
}

export default function GradientCard({ colors: [c1, c2], style, children }: GradientCardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#bg)" />
        </Svg>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
