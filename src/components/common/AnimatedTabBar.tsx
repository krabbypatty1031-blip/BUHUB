import React from 'react';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { layout } from '../../theme/spacing';

export default function AnimatedTabBar(props: BottomTabBarProps) {
  const { tabBarTranslateY } = useTabBarAnimation();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: layout.bottomNavHeight + insets.bottom,
        },
        animatedStyle,
      ]}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
