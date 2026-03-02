import { useRef, useCallback } from 'react';
import { type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarAnimation } from './TabBarAnimationContext';
import { layout } from '../theme/spacing';

const SCROLL_THRESHOLD = 10;

export function useScrollTabBarAnimation() {
  const { tabBarTranslateY } = useTabBarAnimation();
  const insets = useSafeAreaInsets();
  const lastOffsetY = useRef(0);
  const isTabBarVisible = useRef(true);
  const hiddenTabBarOffset = layout.bottomNavHeight + insets.bottom;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;

      // Always show tab bar at top (iOS bounce / pull-to-refresh)
      if (offsetY <= 0) {
        if (!isTabBarVisible.current) {
          tabBarTranslateY.value = withTiming(0, { duration: 250 });
          isTabBarVisible.current = true;
        }
        lastOffsetY.current = offsetY;
        return;
      }

      const delta = offsetY - lastOffsetY.current;

      if (delta > SCROLL_THRESHOLD && isTabBarVisible.current) {
        tabBarTranslateY.value = withTiming(hiddenTabBarOffset, { duration: 250 });
        isTabBarVisible.current = false;
      } else if (delta < -SCROLL_THRESHOLD && !isTabBarVisible.current) {
        tabBarTranslateY.value = withTiming(0, { duration: 250 });
        isTabBarVisible.current = true;
      }

      lastOffsetY.current = offsetY;
    },
    [hiddenTabBarOffset, tabBarTranslateY]
  );

  const show = useCallback(() => {
    tabBarTranslateY.value = withTiming(0, { duration: 250 });
    isTabBarVisible.current = true;
  }, [tabBarTranslateY]);

  return { onScroll, show };
}
